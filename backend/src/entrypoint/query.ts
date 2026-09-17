import type { SQSEvent, SQSBatchResponse } from "aws-lambda";
import { QueryExecutor } from "../services/queryExecutor/queryExecutor";
import { DynamoResultCache } from "../services/queryResultCache/dynamoResultCache";
import { QueryService } from "../services/queryService/queryService";

/**
 * Entrypoint that executes one or more async query jobs, provided as an SQS
 * event.
 * @param event - SQS event containing query job messages.
 * @returns batch item failures for any jobs that could not be executed.
 */
export async function queryExecution(event: SQSEvent): Promise<SQSBatchResponse> {
  const cache = new DynamoResultCache();
  const executor = new QueryExecutor(new QueryService(), cache);
  const failures: { itemIdentifier: string }[] = [];
  for (const record of event.Records) {
    try {
      const { jobId, query } = JSON.parse(record.body);
      await executor.execute(jobId, query);
    } catch {
      failures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures: failures };
}
