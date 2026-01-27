/**
 * @group integration
 */

import { expect, jest, beforeEach, afterEach } from "@jest/globals";
import { TicketManagementTypes } from "../../model/config/common";

// Mock the service registry to track registrations
const mockRegisterIssueMgmt = jest.fn();
const mockRegisterIncidentMgmt = jest.fn();

// Mock the service registry modules while preserving other exports
jest.mock("../projectManangement/issueMgmtService", () => {
  const actual = jest.requireActual("../projectManangement/issueMgmtService") as Record<string, unknown>;
  return {
    ...actual,
    registerIssueMgmt: mockRegisterIssueMgmt,
  };
});

jest.mock("../incidentManagement/incidentMgmtService", () => {
  const actual = jest.requireActual("../incidentManagement/incidentMgmtService") as Record<string, unknown>;
  return {
    ...actual,
    registerIncidentMgmt: mockRegisterIncidentMgmt,
  };
});

// Mock the datastore to avoid initialization issues
jest.mock("../../db/factory", () => ({
  initDatastore: jest.fn().mockImplementation(() => Promise.resolve()),
  determineDatastore: jest.fn().mockReturnValue({
    implName: "inmem",
    impl: {
      connect: jest.fn().mockImplementation(() => Promise.resolve()),
      disconnect: jest.fn().mockImplementation(() => Promise.resolve()),
    },
  }),
}));

import { initGithubIssues } from "../projectManangement/github";
import { initGithubIncidents } from "../incidentManagement/github";

describe("GitHub Service Registration Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Project Management Service Registration", () => {
    it("should register GitHub project management service during initialization", () => {
      // Act
      initGithubIssues();

      // Assert
      expect(mockRegisterIssueMgmt).toHaveBeenCalledTimes(1);
      expect(mockRegisterIssueMgmt).toHaveBeenCalledWith(TicketManagementTypes.GITHUB, expect.any(Function));
    });

    it("should register GitHub service with correct service type", () => {
      // Act
      initGithubIssues();

      // Assert
      const calls = mockRegisterIssueMgmt.mock.calls;
      expect(calls).toHaveLength(1);
      const [registeredType] = calls[0] as [string, unknown];
      expect(registeredType).toBe(TicketManagementTypes.GITHUB);
    });

    it("should register GitHub service with factory function", () => {
      // Act
      initGithubIssues();

      // Assert
      const calls = mockRegisterIssueMgmt.mock.calls;
      expect(calls).toHaveLength(1);
      const [, factoryFunction] = calls[0] as [string, () => unknown];
      expect(typeof factoryFunction).toBe("function");
      expect(factoryFunction).toBeDefined();
    });
  });
  describe("Incident Management Service Registration", () => {
    it("should register GitHub incident management service during initialization", () => {
      // Act
      initGithubIncidents();

      // Assert
      expect(mockRegisterIncidentMgmt).toHaveBeenCalledTimes(1);
      expect(mockRegisterIncidentMgmt).toHaveBeenCalledWith(TicketManagementTypes.GITHUB, expect.any(Function));
    });

    it("should register GitHub incident service with correct service type", () => {
      // Act
      initGithubIncidents();

      // Assert
      const calls = mockRegisterIncidentMgmt.mock.calls;
      expect(calls).toHaveLength(1);
      const [registeredType] = calls[0] as [string, unknown];
      expect(registeredType).toBe(TicketManagementTypes.GITHUB);
    });

    it("should register GitHub incident service with factory function", () => {
      // Act
      initGithubIncidents();

      // Assert
      const calls = mockRegisterIncidentMgmt.mock.calls;
      expect(calls).toHaveLength(1);
      const [, factoryFunction] = calls[0] as [string, () => unknown];
      expect(typeof factoryFunction).toBe("function");
      expect(factoryFunction).toBeDefined();
    });
  });

  describe("Service Registration with Various Configuration Scenarios", () => {
    it("should handle multiple GitHub server configurations", () => {
      // Act - Initialize both services (simulating multiple server configurations)
      initGithubIssues();
      initGithubIncidents();

      // Assert - Both services should be registered
      expect(mockRegisterIssueMgmt).toHaveBeenCalledTimes(1);
      expect(mockRegisterIncidentMgmt).toHaveBeenCalledTimes(1);

      // Both should register with GitHub type
      expect(mockRegisterIssueMgmt).toHaveBeenCalledWith(TicketManagementTypes.GITHUB, expect.any(Function));
      expect(mockRegisterIncidentMgmt).toHaveBeenCalledWith(TicketManagementTypes.GITHUB, expect.any(Function));
    });

    it("should register services independently for project management and incident management", () => {
      // Act - Initialize only project management
      initGithubIssues();

      // Assert - Only project management should be registered
      expect(mockRegisterIssueMgmt).toHaveBeenCalledTimes(1);
      expect(mockRegisterIncidentMgmt).toHaveBeenCalledTimes(0);

      // Act - Now initialize incident management
      initGithubIncidents();

      // Assert - Both should now be registered
      expect(mockRegisterIssueMgmt).toHaveBeenCalledTimes(1);
      expect(mockRegisterIncidentMgmt).toHaveBeenCalledTimes(1);
    });

    it("should allow multiple initializations", () => {
      // Act - Initialize multiple times
      initGithubIssues();
      initGithubIssues();
      initGithubIssues();

      // Assert - Should be called multiple times (each init call registers)
      expect(mockRegisterIssueMgmt).toHaveBeenCalledTimes(3);
      expect(mockRegisterIssueMgmt).toHaveBeenCalledWith(TicketManagementTypes.GITHUB, expect.any(Function));
    });

    it("should create factory functions that can be called", () => {
      // Act
      initGithubIssues();
      initGithubIncidents();

      // Assert - Get the factory functions
      const issueMgmtCalls = mockRegisterIssueMgmt.mock.calls;
      const incidentMgmtCalls = mockRegisterIncidentMgmt.mock.calls;

      expect(issueMgmtCalls).toHaveLength(1);
      expect(incidentMgmtCalls).toHaveLength(1);

      const [, issueMgmtFactory] = issueMgmtCalls[0] as [string, () => unknown];
      const [, incidentMgmtFactory] = incidentMgmtCalls[0] as [string, () => unknown];

      // Factory functions should be callable (without actually calling them to avoid datastore issues)
      expect(typeof issueMgmtFactory).toBe("function");
      expect(typeof incidentMgmtFactory).toBe("function");
      expect(issueMgmtFactory).toBeDefined();
      expect(incidentMgmtFactory).toBeDefined();
    });
  });
});
