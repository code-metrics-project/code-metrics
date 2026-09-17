import { QueryQueue, QueryJobMessage } from "./queryQueue";
import { RawQuery } from "../../model/query";
import { logger } from "../../utils/logger/logger";

class QueueChannel {
  private queue: QueryJobMessage[] = [];
  private waiting: ((value: QueryJobMessage | null) => void)[] = [];

  push(message: QueryJobMessage): void {
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!;
      resolve(message);
    } else {
      this.queue.push(message);
    }
  }

  async pop(): Promise<QueryJobMessage | null> {
    if (this.queue.length > 0) {
      return this.queue.shift()!;
    }
    return new Promise<QueryJobMessage | null>((resolve) => {
      this.waiting.push(resolve);
    });
  }
}

/**
 * The in-process implementation of the query queue, used in server and desktop
 * modes.
 */
export class InProcessQueue implements QueryQueue {
  private channel = new QueueChannel();

  constructor() {
    logger(`Using in-process query queue`);
  }

  enqueue(jobId: string, query: RawQuery): Promise<void> {
    this.channel.push({ jobId, query });
    return Promise.resolve();
  }

  dequeue(): Promise<QueryJobMessage | null> {
    return this.channel.pop();
  }
}
