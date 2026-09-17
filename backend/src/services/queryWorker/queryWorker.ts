import { QueryQueue } from "../queryQueue/queryQueue";
import { QueryExecutor } from "../queryExecutor/queryExecutor";
import { logger } from "../../utils/logger/logger";

/**
 * Drains the query queue, executing async query jobs with up to the configured
 * concurrency.
 */
export class QueryWorker {
  private running = false;

  constructor(
    private queue: QueryQueue,
    private executor: QueryExecutor,
    private concurrency = 1,
  ) {}

  start(): void {
    this.running = true;
    const workerCount = Math.max(1, Math.floor(this.concurrency));
    logger(`Async query worker started (concurrency: ${workerCount})`);
    for (let i = 0; i < workerCount; i++) {
      void this.processLoop();
    }
  }

  stop(): void {
    this.running = false;
    logger("Async query worker stopped");
  }

  private async processLoop(): Promise<void> {
    if (!this.running) return;

    try {
      const message = await this.queue.dequeue();
      if (!this.running) return;
      if (message) {
        await this.executor.execute(message.jobId, message.query);
      }
      if (!this.running) return;
      await new Promise((resolve) => setImmediate(resolve));
      this.processLoop();
    } catch (e) {
      logger(`Error in query worker: ${e}`);
      if (this.running) {
        await new Promise((resolve) => setImmediate(resolve));
        this.processLoop();
      }
    }
  }
}
