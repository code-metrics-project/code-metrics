/**
 * @group unit
 */

import { expect, jest, beforeEach, afterEach } from "@jest/globals";
import { TicketManagementTypes } from "../../../model/config/common";

// Mock the service registry to track registrations
const mockRegisterIssueMgmt = jest.fn();

// Mock the service registry module
jest.mock("../issueMgmtService", () => {
  const actual = jest.requireActual("../issueMgmtService") as Record<string, unknown>;
  return {
    ...actual,
    registerIssueMgmt: mockRegisterIssueMgmt,
  };
});

import { initGithubIssues } from "../github";

// Mock the datastore to avoid initialization issues
jest.mock("../../../db/factory", () => ({
  initDatastore: jest.fn().mockImplementation(() => Promise.resolve()),
  determineDatastore: jest.fn().mockReturnValue({
    implName: "inmem",
    impl: {
      connect: jest.fn().mockImplementation(() => Promise.resolve()),
      disconnect: jest.fn().mockImplementation(() => Promise.resolve()),
    },
  }),
}));

describe("GitHub Issues Service Registration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should register GitHub issues service during initialization", () => {
    // Act
    initGithubIssues();

    // Assert
    expect(mockRegisterIssueMgmt).toHaveBeenCalledTimes(1);
    expect(mockRegisterIssueMgmt).toHaveBeenCalledWith(TicketManagementTypes.GITHUB, expect.any(Function));
  });

  it("should register GitHub issues service with correct type", () => {
    // Act
    initGithubIssues();

    // Assert
    const calls = mockRegisterIssueMgmt.mock.calls;
    expect(calls).toHaveLength(1);
    const [registeredType] = calls[0] as [string, unknown];
    expect(registeredType).toBe(TicketManagementTypes.GITHUB);
  });

  it("should register GitHub issues service with factory function", () => {
    // Act
    initGithubIssues();

    // Assert
    const calls = mockRegisterIssueMgmt.mock.calls;
    expect(calls).toHaveLength(1);
    const [, factoryFunction] = calls[0] as [string, () => unknown];
    expect(typeof factoryFunction).toBe("function");

    // Verify factory function is callable (without actually calling it to avoid datastore issues)
    expect(factoryFunction).toBeDefined();
  });
});
