import { QueryWorker } from "../queryWorker";
import { QueryQueue, QueryJobMessage } from "../../queryQueue/queryQueue";
import { QueryExecutor } from "../../queryExecutor/queryExecutor";
import { RawQuery } from "../../../model/query";

describe("QueryWorker", () => {
  let mockQueue: Partial<QueryQueue>;
  let mockExecutor: Partial<QueryExecutor>;
  let worker: QueryWorker;

  beforeEach(() => {
    mockQueue = {
      enqueue: jest.fn(),
      dequeue: jest.fn(),
    };
    mockExecutor = {
      execute: jest.fn(),
    };
    worker = new QueryWorker(mockQueue as QueryQueue, mockExecutor as QueryExecutor);
  });

  it("should process messages from the queue", async () => {
    const query: RawQuery = { queryName: "test", args: {} };
    const message: QueryJobMessage = { jobId: "job-1", query };
    (mockQueue.dequeue as jest.Mock).mockResolvedValueOnce(message);
    (mockQueue.dequeue as jest.Mock).mockResolvedValueOnce(null);

    (mockExecutor.execute as jest.Mock).mockResolvedValue(undefined);

    worker.start();
    await new Promise((resolve) => setTimeout(resolve, 50));
    worker.stop();

    expect(mockExecutor.execute).toHaveBeenCalledWith("job-1", query);
  });

  it("should stop processing when stopped", async () => {
    (mockQueue.dequeue as jest.Mock).mockResolvedValue({ jobId: "job-1", query: { queryName: "test", args: {} } });
    worker.start();
    worker.stop();
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockExecutor.execute).not.toHaveBeenCalled();
  });

  it("should continue on error", async () => {
    (mockQueue.dequeue as jest.Mock).mockResolvedValueOnce({ jobId: "job-1", query: { queryName: "test", args: {} } });
    (mockQueue.dequeue as jest.Mock).mockResolvedValueOnce(null);
    (mockExecutor.execute as jest.Mock).mockRejectedValueOnce(new Error("Execution failed"));

    worker.start();
    await new Promise((resolve) => setTimeout(resolve, 50));
    worker.stop();

    expect(mockExecutor.execute).toHaveBeenCalled();
  });

  describe("concurrency", () => {
    const makeDelayedExecute = (track: { inFlight: number; maxInFlight: number }) => {
      (mockExecutor.execute as jest.Mock).mockImplementation(async () => {
        track.inFlight++;
        track.maxInFlight = Math.max(track.maxInFlight, track.inFlight);
        await new Promise((resolve) => setTimeout(resolve, 25));
        track.inFlight--;
      });
    };

    const makeDequeue = (jobIds: string[]) => {
      (mockQueue.dequeue as jest.Mock).mockImplementation(async () => {
        const jobId = jobIds.shift();
        return jobId ? { jobId, query: { queryName: "test", args: {} } } : null;
      });
    };

    it("should execute up to N jobs concurrently", async () => {
      const track = { inFlight: 0, maxInFlight: 0 };
      makeDequeue(["job-1", "job-2", "job-3", "job-4"]);
      makeDelayedExecute(track);

      const concurrentWorker = new QueryWorker(mockQueue as QueryQueue, mockExecutor as QueryExecutor, 2);
      concurrentWorker.start();
      await new Promise((resolve) => setTimeout(resolve, 200));
      concurrentWorker.stop();

      expect(mockExecutor.execute).toHaveBeenCalledTimes(4);
      expect(track.maxInFlight).toBeGreaterThanOrEqual(2);
    });

    it("should clamp concurrency below 1 to a single worker", async () => {
      const track = { inFlight: 0, maxInFlight: 0 };
      makeDequeue(["job-1", "job-2", "job-3"]);
      makeDelayedExecute(track);

      const clampedWorker = new QueryWorker(mockQueue as QueryQueue, mockExecutor as QueryExecutor, 0);
      clampedWorker.start();
      await new Promise((resolve) => setTimeout(resolve, 200));
      clampedWorker.stop();

      expect(mockExecutor.execute).toHaveBeenCalledTimes(3);
      expect(track.maxInFlight).toBe(1);
    });
  });
});
