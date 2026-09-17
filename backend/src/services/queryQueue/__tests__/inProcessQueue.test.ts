import { InProcessQueue } from "../inProcessQueue";
import { RawQuery } from "../../../model/query";

describe("InProcessQueue", () => {
  let queue: InProcessQueue;

  beforeEach(() => {
    queue = new InProcessQueue();
  });

  it("should enqueue and dequeue a message", async () => {
    const query: RawQuery = { queryName: "test", args: {} };
    await queue.enqueue("job-1", query);
    const message = await queue.dequeue();
    expect(message).toEqual({ jobId: "job-1", query });
  });

  it("should maintain FIFO order", async () => {
    const query1: RawQuery = { queryName: "test1", args: {} };
    const query2: RawQuery = { queryName: "test2", args: {} };
    await queue.enqueue("job-1", query1);
    await queue.enqueue("job-2", query2);

    const msg1 = await queue.dequeue();
    const msg2 = await queue.dequeue();

    expect(msg1?.jobId).toBe("job-1");
    expect(msg2?.jobId).toBe("job-2");
  });

  it("should support concurrent enqueue/dequeue", async () => {
    const query: RawQuery = { queryName: "test", args: {} };

    const dequeuePromise = queue.dequeue();
    await queue.enqueue("job-1", query);

    const message = await dequeuePromise;
    expect(message).toEqual({ jobId: "job-1", query });
  });

  it("should handle multiple messages in a batch", async () => {
    const queries: RawQuery[] = [
      { queryName: "test1", args: {} },
      { queryName: "test2", args: {} },
      { queryName: "test3", args: {} },
    ];

    for (let i = 0; i < queries.length; i++) {
      await queue.enqueue(`job-${i}`, queries[i]);
    }

    for (let i = 0; i < queries.length; i++) {
      const message = await queue.dequeue();
      expect(message?.jobId).toBe(`job-${i}`);
      expect(message?.query).toEqual(queries[i]);
    }
  });
});
