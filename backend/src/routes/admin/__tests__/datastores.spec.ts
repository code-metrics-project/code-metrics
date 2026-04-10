import { Request, Response } from "express";
import { listDatastores, datastoreExists, countDatastoreItems, emptyDatastore } from "../datastores";
import { DatastoreAdmin } from "../../../db/api";

// Mock the factory module
const mockProvideDatastoreAdmin = jest.fn();
jest.mock("../../../db/factory", () => ({
  provideDatastoreAdmin: () => mockProvideDatastoreAdmin(),
}));

// Mock logger to suppress output
jest.mock("../../../utils/logger/logger", () => ({
  logger: jest.fn(),
  error: jest.fn(),
  verbose: jest.fn(),
  warn: jest.fn(),
}));

const mockRes = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.sendStatus = jest.fn().mockReturnValue(res);
  return res;
};

const mockReq = (query: Record<string, string> = {}, body: Record<string, any> = {}): Request =>
  ({ query, body } as unknown as Request);

describe("Admin Datastores Routes", () => {
  let mockAdmin: jest.Mocked<DatastoreAdmin>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdmin = {
      listCollections: jest.fn(),
      collectionExists: jest.fn(),
      countItems: jest.fn(),
      emptyCollection: jest.fn(),
    };
    mockProvideDatastoreAdmin.mockReturnValue(mockAdmin);
  });

  describe("listDatastores", () => {
    it("should return list of collections", async () => {
      mockAdmin.listCollections.mockResolvedValue(["col1", "col2"]);
      const req = mockReq();
      const res = mockRes();

      await listDatastores(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ collections: ["col1", "col2"] });
    });

    it("should return 500 when admin is not available", async () => {
      mockProvideDatastoreAdmin.mockReturnValue(undefined);
      const req = mockReq();
      const res = mockRes();

      await listDatastores(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("should return 500 on error", async () => {
      mockAdmin.listCollections.mockRejectedValue(new Error("db error"));
      const req = mockReq();
      const res = mockRes();

      await listDatastores(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("datastoreExists", () => {
    it("should return exists=true for existing collection", async () => {
      mockAdmin.collectionExists.mockResolvedValue(true);
      const req = mockReq({ name: "myCol" });
      const res = mockRes();

      await datastoreExists(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ name: "myCol", exists: true });
    });

    it("should return exists=false for non-existent collection", async () => {
      mockAdmin.collectionExists.mockResolvedValue(false);
      const req = mockReq({ name: "missing" });
      const res = mockRes();

      await datastoreExists(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ name: "missing", exists: false });
    });

    it("should return 400 when name parameter is missing", async () => {
      const req = mockReq();
      const res = mockRes();

      await datastoreExists(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 500 when admin is not available", async () => {
      mockProvideDatastoreAdmin.mockReturnValue(undefined);
      const req = mockReq({ name: "myCol" });
      const res = mockRes();

      await datastoreExists(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("should return 500 on error", async () => {
      mockAdmin.collectionExists.mockRejectedValue(new Error("db error"));
      const req = mockReq({ name: "myCol" });
      const res = mockRes();

      await datastoreExists(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("countDatastoreItems", () => {
    it("should return count for a collection", async () => {
      mockAdmin.countItems.mockResolvedValue(42);
      const req = mockReq({ name: "myCol" });
      const res = mockRes();

      await countDatastoreItems(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ name: "myCol", count: 42 });
    });

    it("should return 400 when name parameter is missing", async () => {
      const req = mockReq();
      const res = mockRes();

      await countDatastoreItems(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 500 when admin is not available", async () => {
      mockProvideDatastoreAdmin.mockReturnValue(undefined);
      const req = mockReq({ name: "myCol" });
      const res = mockRes();

      await countDatastoreItems(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("should return 500 on error", async () => {
      mockAdmin.countItems.mockRejectedValue(new Error("db error"));
      const req = mockReq({ name: "myCol" });
      const res = mockRes();

      await countDatastoreItems(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("emptyDatastore", () => {
    it("should empty a collection and return 204", async () => {
      mockAdmin.emptyCollection.mockResolvedValue(undefined);
      const req = mockReq({}, { name: "myCol" });
      const res = mockRes();

      await emptyDatastore(req, res);

      expect(mockAdmin.emptyCollection).toHaveBeenCalledWith("myCol");
      expect(res.sendStatus).toHaveBeenCalledWith(204);
    });

    it("should return 400 when name parameter is missing", async () => {
      const req = mockReq({}, {});
      const res = mockRes();

      await emptyDatastore(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 500 when admin is not available", async () => {
      mockProvideDatastoreAdmin.mockReturnValue(undefined);
      const req = mockReq({}, { name: "myCol" });
      const res = mockRes();

      await emptyDatastore(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("should return 500 on error", async () => {
      mockAdmin.emptyCollection.mockRejectedValue(new Error("db error"));
      const req = mockReq({}, { name: "myCol" });
      const res = mockRes();

      await emptyDatastore(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
