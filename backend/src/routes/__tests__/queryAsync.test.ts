import { Request, Response } from "express";
import { QueryJobStatus } from "../../model/queryJob";

const mockEnqueue = jest.fn().mockResolvedValue(undefined);
const mockGet = jest.fn();
const mockDelete = jest.fn().mockResolvedValue(undefined);
const mockStore = jest.fn().mockResolvedValue(undefined);

jest.mock("../../services/queryQueue/queueFactory", () => ({
  provideQueryQueue: () => ({
    enqueue: mockEnqueue,
  }),
}));

jest.mock("../../services/queryResultCache/cacheFactory", () => ({
  provideQueryResultCache: () => ({
    get: mockGet,
    delete: mockDelete,
    store: mockStore,
  }),
}));

import { submitAsyncQuery, getAsyncResult } from "../queryAsync";

describe("queryAsync routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("submitAsyncQuery", () => {
    it("should return 202 with job ID and poll URL", async () => {
      const jsonSpy = jest.fn();
      const statusObj = { json: jsonSpy };
      const statusSpy = jest.fn().mockReturnValue(statusObj);

      const req = {
        body: { queryName: "test", args: {} },
      } as unknown as Request;
      const res = {
        status: statusSpy,
      } as unknown as Response;

      await submitAsyncQuery(req, res);

      expect(statusSpy).toHaveBeenCalledWith(202);
      const { jobId } = jsonSpy.mock.calls[0][0] as { jobId: string };
      expect(jobId).toEqual(expect.any(String));
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId,
          pollUrl: `/api/query/async/${jobId}`,
        }),
      );
      expect(mockStore).toHaveBeenCalledWith(
        jobId,
        expect.objectContaining({
          status: QueryJobStatus.Pending,
          query: { queryName: "test", args: {} },
        }),
      );
      expect(mockEnqueue).toHaveBeenCalledWith(jobId, { queryName: "test", args: {} });
    });

    it("should not enqueue the job when storing the pending job fails", async () => {
      mockStore.mockRejectedValueOnce(new Error("cache unavailable"));

      const req = {
        body: { queryName: "test", args: {} },
      } as unknown as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await expect(submitAsyncQuery(req, res)).rejects.toThrow("cache unavailable");
      expect(mockEnqueue).not.toHaveBeenCalled();
    });
  });

  describe("getAsyncResult", () => {
    it("should return 202 pending when the job is queued and not yet started", async () => {
      mockGet.mockResolvedValue({
        id: "job-1",
        status: QueryJobStatus.Pending,
        query: { queryName: "test", args: {} },
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      });

      const jsonSpy = jest.fn();
      const statusObj = { json: jsonSpy };
      const statusSpy = jest.fn().mockReturnValue(statusObj);

      const req = {
        params: { jobId: "job-1" },
      } as unknown as Request;
      const res = {
        status: statusSpy,
      } as unknown as Response;

      await getAsyncResult(req, res);

      expect(statusSpy).toHaveBeenCalledWith(202);
      expect(jsonSpy).toHaveBeenCalledWith({ status: QueryJobStatus.Pending });
    });

    it("should return 204 when job not found", async () => {
      mockGet.mockResolvedValue(null);

      const sendSpy = jest.fn();
      const statusObj = { send: sendSpy };
      const statusSpy = jest.fn().mockReturnValue(statusObj);

      const req = {
        params: { jobId: "non-existent" },
      } as unknown as Request;
      const res = {
        status: statusSpy,
      } as unknown as Response;

      await getAsyncResult(req, res);

      expect(statusSpy).toHaveBeenCalledWith(204);
      expect(sendSpy).toHaveBeenCalled();
    });

    it("should return 202 when job is processing", async () => {
      mockGet.mockResolvedValue({
        id: "job-1",
        status: QueryJobStatus.Processing,
        query: { queryName: "test", args: {} },
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      });

      const jsonSpy = jest.fn();
      const statusObj = { json: jsonSpy };
      const statusSpy = jest.fn().mockReturnValue(statusObj);

      const req = {
        params: { jobId: "job-1" },
      } as unknown as Request;
      const res = {
        status: statusSpy,
      } as unknown as Response;

      await getAsyncResult(req, res);

      expect(statusSpy).toHaveBeenCalledWith(202);
      expect(jsonSpy).toHaveBeenCalledWith({ status: QueryJobStatus.Processing });
    });

    it("should return 200 with result when job is completed", async () => {
      const mockResult = { workload1: {} };
      mockGet.mockResolvedValue({
        id: "job-1",
        status: QueryJobStatus.Completed,
        query: { queryName: "test", args: {} },
        result: mockResult,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      });

      const jsonSpy = jest.fn();

      const req = {
        params: { jobId: "job-1" },
      } as unknown as Request;
      const res = {
        json: jsonSpy,
      } as unknown as Response;

      await getAsyncResult(req, res);

      expect(jsonSpy).toHaveBeenCalledWith(mockResult);
      expect(mockDelete).toHaveBeenCalledWith("job-1");
    });

    it("should return 500 when job failed", async () => {
      mockGet.mockResolvedValue({
        id: "job-1",
        status: QueryJobStatus.Failed,
        query: { queryName: "test", args: {} },
        error: "Query execution failed",
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      });

      const jsonSpy = jest.fn();
      const statusObj = { json: jsonSpy };
      const statusSpy = jest.fn().mockReturnValue(statusObj);

      const req = {
        params: { jobId: "job-1" },
      } as unknown as Request;
      const res = {
        status: statusSpy,
      } as unknown as Response;

      await getAsyncResult(req, res);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({ error: "Query execution failed" });
      expect(mockDelete).toHaveBeenCalledWith("job-1");
    });
  });
});
