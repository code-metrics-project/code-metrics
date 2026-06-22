import { Request, Response } from "express";
import { checkRemoteConnections } from "../remoteConnections";
import { checkVcsConnections } from "../../../services/codeManagement/vcsService";
import { checkPipelineConnections } from "../../../services/pipelines/pipelinesService";
import { checkCodeAnalysisConnections } from "../../../services/codeAnalysis/codeAnalysisService";
import { checkTicketConnections } from "../../../services/tickets/ticketService";
import { checkLlmConnections } from "../../../services/llm/llmService";
import { ConnectionCheckResult } from "../../../model/remote-connection-status";

// Mock all service check functions
jest.mock("../../../services/codeManagement/vcsService");
jest.mock("../../../services/pipelines/pipelinesService");
jest.mock("../../../services/codeAnalysis/codeAnalysisService");
jest.mock("../../../services/tickets/ticketService");
jest.mock("../../../services/llm/llmService");

const mockCheckVcsConnections = checkVcsConnections as jest.MockedFunction<typeof checkVcsConnections>;
const mockCheckPipelineConnections = checkPipelineConnections as jest.MockedFunction<typeof checkPipelineConnections>;
const mockCheckCodeAnalysisConnections = checkCodeAnalysisConnections as jest.MockedFunction<typeof checkCodeAnalysisConnections>;
const mockCheckTicketConnections = checkTicketConnections as jest.MockedFunction<typeof checkTicketConnections>;
const mockCheckLlmConnections = checkLlmConnections as jest.MockedFunction<typeof checkLlmConnections>;

describe("Remote Connections Route Handler", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {};
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
  });

  it("should aggregate results from all service categories", async () => {
    const vcsResults: ConnectionCheckResult[] = [
      {
        id: "github-1",
        category: "codeManagement",
        type: "github",
        url: "https://api.github.com",
        status: "connected",
        responseTimeMs: 150,
      },
    ];

    const pipelineResults: ConnectionCheckResult[] = [
      {
        id: "jenkins-1",
        category: "pipelines",
        type: "jenkins",
        url: "https://jenkins.example.com",
        status: "connected",
        responseTimeMs: 200,
      },
    ];

    const codeAnalysisResults: ConnectionCheckResult[] = [
      {
        id: "sonar-1",
        category: "codeAnalysis",
        type: "sonar",
        url: "https://sonar.example.com",
        status: "connected",
        responseTimeMs: 180,
      },
    ];

    const ticketResults: ConnectionCheckResult[] = [
      {
        id: "jira-1",
        category: "ticketManagement",
        type: "jira",
        url: "https://jira.example.com",
        status: "connected",
        responseTimeMs: 220,
      },
    ];

    const llmResults: ConnectionCheckResult[] = [
      {
        id: "claude-1",
        category: "llm",
        type: "claude",
        url: "https://api.anthropic.com",
        status: "connected",
        responseTimeMs: 100,
      },
    ];

    mockCheckVcsConnections.mockResolvedValue(vcsResults);
    mockCheckPipelineConnections.mockResolvedValue(pipelineResults);
    mockCheckCodeAnalysisConnections.mockResolvedValue(codeAnalysisResults);
    mockCheckTicketConnections.mockResolvedValue(ticketResults);
    mockCheckLlmConnections.mockResolvedValue(llmResults);

    await checkRemoteConnections(mockRequest as Request, mockResponse as Response);

    expect(mockCheckVcsConnections).toHaveBeenCalledTimes(1);
    expect(mockCheckPipelineConnections).toHaveBeenCalledTimes(1);
    expect(mockCheckCodeAnalysisConnections).toHaveBeenCalledTimes(1);
    expect(mockCheckTicketConnections).toHaveBeenCalledTimes(1);
    expect(mockCheckLlmConnections).toHaveBeenCalledTimes(1);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        results: expect.arrayContaining([
          ...vcsResults,
          ...pipelineResults,
          ...codeAnalysisResults,
          ...ticketResults,
          ...llmResults,
        ]),
        checkedAt: expect.any(String),
      }),
    );
  });

  it("should include timestamp in ISO format", async () => {
    mockCheckVcsConnections.mockResolvedValue([]);
    mockCheckPipelineConnections.mockResolvedValue([]);
    mockCheckCodeAnalysisConnections.mockResolvedValue([]);
    mockCheckTicketConnections.mockResolvedValue([]);
    mockCheckLlmConnections.mockResolvedValue([]);

    const beforeCall = new Date().toISOString();
    await checkRemoteConnections(mockRequest as Request, mockResponse as Response);
    const afterCall = new Date().toISOString();

    const response = jsonMock.mock.calls[0][0];
    expect(response.checkedAt).toBeDefined();
    expect(response.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(response.checkedAt >= beforeCall).toBe(true);
    expect(response.checkedAt <= afterCall).toBe(true);
  });

  it("should return empty results array when no services are configured", async () => {
    mockCheckVcsConnections.mockResolvedValue([]);
    mockCheckPipelineConnections.mockResolvedValue([]);
    mockCheckCodeAnalysisConnections.mockResolvedValue([]);
    mockCheckTicketConnections.mockResolvedValue([]);
    mockCheckLlmConnections.mockResolvedValue([]);

    await checkRemoteConnections(mockRequest as Request, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        results: [],
        checkedAt: expect.any(String),
      }),
    );
  });

  it("should handle mixed connection statuses", async () => {
    const mixedResults: ConnectionCheckResult[] = [
      {
        id: "server-1",
        category: "codeManagement",
        type: "github",
        url: "https://api.github.com",
        status: "connected",
        responseTimeMs: 150,
      },
      {
        id: "server-2",
        category: "pipelines",
        type: "jenkins",
        url: "https://jenkins.example.com",
        status: "unreachable",
        statusDetail: "ECONNREFUSED",
        responseTimeMs: 5000,
      },
      {
        id: "server-3",
        category: "ticketManagement",
        type: "jira",
        url: "https://jira.example.com",
        status: "unauthorised",
        statusDetail: "HTTP 401: Unauthorized",
        responseTimeMs: 200,
      },
      {
        id: "server-4",
        category: "codeAnalysis",
        type: "sonar",
        status: "unconfigured",
        statusDetail: "No URL configured for this server",
      },
      {
        id: "server-5",
        category: "llm",
        type: "claude",
        url: "https://api.anthropic.com",
        status: "rateLimited",
        statusDetail: "Rate limited. Retry after 60 seconds",
        responseTimeMs: 180,
      },
    ];

    mockCheckVcsConnections.mockResolvedValue([mixedResults[0]]);
    mockCheckPipelineConnections.mockResolvedValue([mixedResults[1]]);
    mockCheckCodeAnalysisConnections.mockResolvedValue([mixedResults[3]]);
    mockCheckTicketConnections.mockResolvedValue([mixedResults[2]]);
    mockCheckLlmConnections.mockResolvedValue([mixedResults[4]]);

    await checkRemoteConnections(mockRequest as Request, mockResponse as Response);

    const response = jsonMock.mock.calls[0][0];
    expect(response.results).toHaveLength(5);
    expect(response.results).toEqual(expect.arrayContaining(mixedResults));
  });

  it("should execute all checks in parallel", async () => {
    const executionOrder: string[] = [];

    mockCheckVcsConnections.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      executionOrder.push("vcs");
      return [];
    });

    mockCheckPipelineConnections.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      executionOrder.push("pipelines");
      return [];
    });

    mockCheckCodeAnalysisConnections.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      executionOrder.push("codeAnalysis");
      return [];
    });

    mockCheckTicketConnections.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
      executionOrder.push("tickets");
      return [];
    });

    mockCheckLlmConnections.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      executionOrder.push("llm");
      return [];
    });

    const startTime = Date.now();
    await checkRemoteConnections(mockRequest as Request, mockResponse as Response);
    const totalTime = Date.now() - startTime;

    // If running in parallel, total time should be ~50ms (longest delay)
    // If running sequentially, it would be 150ms (sum of all delays)
    // Allow some margin for test execution overhead
    expect(totalTime).toBeLessThan(100);
  });
});
