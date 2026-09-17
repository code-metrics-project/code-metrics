import { RawQuery } from "./query";
import { MetricsWireFormat } from "./metrics";

/**
 * The lifecycle status of an async query job.
 */
export enum QueryJobStatus {
  Pending = "pending",
  Processing = "processing",
  Completed = "completed",
  Failed = "failed",
}

/**
 * An async query job as stored in the query result cache.
 */
export type QueryJob = {
  id: string;
  status: QueryJobStatus;
  query: RawQuery;
  result?: MetricsWireFormat;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
};
