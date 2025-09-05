import path from "path";
import * as fs from "fs";

/**
 * A simple log queue that writes log entries to a file asynchronously.
 */
export class LogQueue {
  private queue: string[] = [];
  private isProcessing = false;
  private writeStream: fs.WriteStream | null = null;

  constructor(logFilePath: string | undefined) {
    if (logFilePath) {
      try {
        const logDir = path.dirname(logFilePath);
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }

        this.writeStream = fs.createWriteStream(logFilePath, { flags: "a" });
        console.log(`Log file initialised at ${logFilePath}`);
      } catch (err) {
        console.error(`Failed to initialise log file: ${err}`);
      }
    }
  }

  // Add a log entry to the queue and process if not already processing
  enqueue(logEntry: string): void {
    if (!this.writeStream) {
      return;
    }

    this.queue.push(logEntry);

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0 || !this.writeStream) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;

    try {
      const entry = this.queue.shift();
      if (entry) {
        await new Promise<void>((resolve, reject) => {
          if (!this.writeStream) {
            reject(new Error("Write stream is null"));
            return;
          }

          this.writeStream.write(entry, (err) => {
            if (err) {
              console.error(`Failed to write to log file: ${err}`);
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
    } catch (err) {
      console.error(`Error processing log queue: ${err}`);
    } finally {
      // Process next entry or stop if queue is empty
      process.nextTick(() => this.processQueue());
    }
  }

  // Close the write stream
  close(): void {
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }
  }
}
