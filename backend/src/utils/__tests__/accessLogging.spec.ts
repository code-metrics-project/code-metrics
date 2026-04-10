import { describe, it, expect, afterEach } from "@jest/globals";
import { areAccessLogsEnabled } from "../accessLogging";

const ORIGINAL_LOG_ACCESS_LOGS = process.env.LOG_ACCESS_LOGS;

describe("Access logging configuration", () => {
  afterEach(() => {
    if (ORIGINAL_LOG_ACCESS_LOGS === undefined) {
      delete process.env.LOG_ACCESS_LOGS;
    } else {
      process.env.LOG_ACCESS_LOGS = ORIGINAL_LOG_ACCESS_LOGS;
    }
  });

  it("defaults to enabled when LOG_ACCESS_LOGS is not set", () => {
    delete process.env.LOG_ACCESS_LOGS;

    expect(areAccessLogsEnabled()).toBe(true);
  });

  it("returns false when LOG_ACCESS_LOGS=false", () => {
    process.env.LOG_ACCESS_LOGS = "false";

    expect(areAccessLogsEnabled()).toBe(false);
  });

  it("returns true when LOG_ACCESS_LOGS=true", () => {
    process.env.LOG_ACCESS_LOGS = "true";

    expect(areAccessLogsEnabled()).toBe(true);
  });
});
