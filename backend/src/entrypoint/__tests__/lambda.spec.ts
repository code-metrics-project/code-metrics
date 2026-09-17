/**
 * @group unit
 *
 * Unit tests for the Lambda environment detection in entrypoint/lambda.ts.
 *
 * detectIfLambda reads LAMBDA_TASK_ROOT directly from process.env (intentionally
 * bypassing the config sources) and, when running under Lambda, points
 * CONFIG_DIR at <task root>/config via overrideConfigItem.
 */
import { expect, jest, beforeEach, afterEach, describe, it } from "@jest/globals";

const mockOverrideConfigItem = jest.fn();
const mockVerbose = jest.fn();
const mockWarn = jest.fn();

jest.mock("../../config/sources/source", () => ({
  getConfigItem: jest.fn(),
  overrideConfigItem: mockOverrideConfigItem,
}));

jest.mock("../../utils/logger/logger", () => ({
  logger: jest.fn(),
  verbose: mockVerbose,
  warn: mockWarn,
}));

jest.mock("../startup", () => ({
  startup: jest.fn(),
}));

import { detectIfLambda } from "../lambda";

describe("detectIfLambda", () => {
  const originalTaskRoot = process.env.LAMBDA_TASK_ROOT;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.LAMBDA_TASK_ROOT;
  });

  afterEach(() => {
    if (originalTaskRoot === undefined) {
      delete process.env.LAMBDA_TASK_ROOT;
    } else {
      process.env.LAMBDA_TASK_ROOT = originalTaskRoot;
    }
  });

  it("reports Lambda and overrides CONFIG_DIR to the task root config folder", () => {
    process.env.LAMBDA_TASK_ROOT = "/var/task";

    expect(detectIfLambda()).toBe(true);
    expect(mockOverrideConfigItem).toHaveBeenCalledTimes(1);
    expect(mockOverrideConfigItem).toHaveBeenCalledWith("CONFIG_DIR", "/var/task/config");
  });

  it("reports non-Lambda and does not override CONFIG_DIR when LAMBDA_TASK_ROOT is missing", () => {
    expect(detectIfLambda()).toBe(false);
    expect(mockOverrideConfigItem).not.toHaveBeenCalled();
  });

  it("reports non-Lambda and does not override CONFIG_DIR when LAMBDA_TASK_ROOT is empty", () => {
    process.env.LAMBDA_TASK_ROOT = "";

    expect(detectIfLambda()).toBe(false);
    expect(mockOverrideConfigItem).not.toHaveBeenCalled();
  });
});
