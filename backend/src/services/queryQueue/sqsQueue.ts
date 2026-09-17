import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { QueryQueue } from "./queryQueue";
import { RawQuery } from "../../model/query";
import { getConfigItem } from "../../config/sources/source";
import { logger } from "../../utils/logger/logger";

/**
 * The SQS implementation of the query queue, used in Lambda mode. Messages are
 * consumed by the queryExecution Lambda entrypoint.
 */
export class SqsQueue implements QueryQueue {
  private sqs: SQSClient;
  private queueUrl: string;

  constructor() {
    this.queueUrl = getConfigItem("ASYNC_QUERY_QUEUE_URL");
    if (!this.queueUrl) {
      throw new Error("ASYNC_QUERY_QUEUE_URL environment variable is required for SQS queue");
    }
    this.sqs = new SQSClient({});
    logger(`Using SQS query queue: ${this.queueUrl}`);
  }

  enqueue(jobId: string, query: RawQuery): Promise<void> {
    const messageBody = JSON.stringify({ jobId, query });
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: messageBody,
    });
    return this.sqs.send(command).then(() => {});
  }

  dequeue(): Promise<null> {
    return Promise.resolve(null);
  }
}
