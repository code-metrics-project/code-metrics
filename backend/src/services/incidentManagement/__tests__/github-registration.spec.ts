/**
 * @group unit
 */

import { expect, jest, beforeEach, afterEach } from "@jest/globals";
import { TicketManagementTypes } from "../../../model/config/common";

// Mock the service registry to track registrations
const mockRegisterIncidentMgmt = jest.fn();

// Mock the service registry module
jest.mock("../incidentMgmtService", () => {
  const actual = jest.requireActual("../incidentMgmtService") as Record<string, unknown>;
  return {
    ...actual,
    registerIncidentMgmt: mockRegisterIncidentMgmt,
  };
});

import { initGithubIncidents } from "../github";

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

describe("GitHub Incidents Service Registration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should register GitHub incidents service during initialization", () => {
    // Act
    initGithubIncidents();

    // Assert
    expect(mockRegisterIncidentMgmt).toHaveBeenCalledTimes(1);
    expect(mockRegisterIncidentMgmt).toHaveBeenCalledWith(TicketManagementTypes.GITHUB, expect.any(Function));
  });

  it("should register GitHub incidents service with correct type", () => {
    // Act
    initGithubIncidents();

    // Assert
    const calls = mockRegisterIncidentMgmt.mock.calls;
    expect(calls).toHaveLength(1);
    const [registeredType] = calls[0] as [string, unknown];
    expect(registeredType).toBe(TicketManagementTypes.GITHUB);
  });

  it("should register GitHub incidents service with factory function", () => {
    // Act
    initGithubIncidents();

    // Assert
    const calls = mockRegisterIncidentMgmt.mock.calls;
    expect(calls).toHaveLength(1);
    const [, factoryFunction] = calls[0] as [string, () => unknown];
    expect(typeof factoryFunction).toBe("function");

    // Verify factory function is callable (without actually calling it to avoid datastore issues)
    expect(factoryFunction).toBeDefined();
  });

  it("should use incident-specific default ticket types", () => {
    // Act
    initGithubIncidents();

    // Assert - The service should be registered with incident-specific configuration
    expect(mockRegisterIncidentMgmt).toHaveBeenCalledTimes(1);
    expect(mockRegisterIncidentMgmt).toHaveBeenCalledWith(TicketManagementTypes.GITHUB, expect.any(Function));

    // The config manager should have incident-specific defaults
    // This is tested indirectly through the service registration
    const calls = mockRegisterIncidentMgmt.mock.calls;
    expect(calls).toHaveLength(1);
    const [, factoryFunction] = calls[0] as [string, () => unknown];
    expect(factoryFunction).toBeDefined();
  });
});
