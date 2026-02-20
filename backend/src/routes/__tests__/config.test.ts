import { Request, Response } from "express";
import * as configMapping from "../../config/configMapping";
import * as config from "../../config/config";
import { fetchConfig } from "../config";
import { SystemConfig } from "../../model/config/system-config";

// Mock dependencies
jest.mock("../../config/configMapping");
jest.mock("../../config/config");
jest.mock("../../utils/features");
jest.mock("../../utils/repos");
jest.mock("../../services/codeManagement/vcsService");
jest.mock("../../auth/auth");
jest.mock("../../license/validate");
jest.mock("../../config/sources/source");

const mockGetAllLlmConfig = configMapping.getAllLlmConfig as jest.MockedFunction<
  typeof configMapping.getAllLlmConfig
>;
const mockListWorkloads = configMapping.listWorkloads as jest.MockedFunction<
  typeof configMapping.listWorkloads
>;
const mockGetVcsBranches = configMapping.getVcsBranches as jest.MockedFunction<
  typeof configMapping.getVcsBranches
>;
const mockGetAllTicketPriorities = configMapping.getAllTicketPriorities as jest.MockedFunction<
  typeof configMapping.getAllTicketPriorities
>;
const mockListAllTagPairs = configMapping.listAllTagPairs as jest.MockedFunction<
  typeof configMapping.listAllTagPairs
>;

describe("config routes", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response<SystemConfig>>;
  let jsonSpy: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockListWorkloads.mockReturnValue([]);
    mockGetVcsBranches.mockReturnValue([]);
    mockGetAllTicketPriorities.mockReturnValue([]);
    mockListAllTagPairs.mockReturnValue({});

    mockRequest = {};
    jsonSpy = jest.fn();
    mockResponse = {
      json: jsonSpy,
    };
  });

  describe("fetchConfig", () => {
    it("should include llmEnabled as true when Claude is configured", async () => {
      mockGetAllLlmConfig.mockReturnValue({
        type: "claude" as const,
        claude: {
          server: {
            id: "test-claude",
            apiKey: "test-key",
          },
        },
      });

      await fetchConfig(mockRequest as Request, mockResponse as Response<SystemConfig>);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          llmEnabled: true,
        }),
      );
    });

    it("should include llmEnabled as true when Gemini is configured", async () => {
      mockGetAllLlmConfig.mockReturnValue({
        type: "gemini" as const,
        gemini: {
          server: {
            id: "test-gemini",
            apiKey: "test-key",
          },
        },
      });

      await fetchConfig(mockRequest as Request, mockResponse as Response<SystemConfig>);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          llmEnabled: true,
        }),
      );
    });

    it("should include llmEnabled as true when both Claude and Gemini are configured", async () => {
      mockGetAllLlmConfig.mockReturnValue({
        type: "claude" as const,
        claude: {
          server: {
            id: "test-claude",
            apiKey: "test-key",
          },
        },
        gemini: {
          server: {
            id: "test-gemini",
            apiKey: "test-key",
          },
        },
      });

      await fetchConfig(mockRequest as Request, mockResponse as Response<SystemConfig>);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          llmEnabled: true,
        }),
      );
    });

    it("should include llmEnabled as false when LLM config is undefined", async () => {
      mockGetAllLlmConfig.mockReturnValue(undefined);

      await fetchConfig(mockRequest as Request, mockResponse as Response<SystemConfig>);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          llmEnabled: false,
        }),
      );
    });

    it("should include llmEnabled as false when LLM config has no server", async () => {
      mockGetAllLlmConfig.mockReturnValue({
        type: "claude" as const,
        claude: {},
      });

      await fetchConfig(mockRequest as Request, mockResponse as Response<SystemConfig>);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          llmEnabled: false,
        }),
      );
    });

    it("should include llmEnabled as false when only provider type is set without servers", async () => {
      mockGetAllLlmConfig.mockReturnValue({
        type: "claude" as const,
      });

      await fetchConfig(mockRequest as Request, mockResponse as Response<SystemConfig>);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          llmEnabled: false,
        }),
      );
    });

    it("should include all expected system config fields", async () => {
      mockGetAllLlmConfig.mockReturnValue(undefined);
      mockGetVcsBranches.mockReturnValue(["main", "develop"]);
      mockGetAllTicketPriorities.mockReturnValue(["High", "Medium", "Low"]);
      mockListAllTagPairs.mockReturnValue({ environment: ["prod", "dev"] });

      await fetchConfig(mockRequest as Request, mockResponse as Response<SystemConfig>);

      expect(jsonSpy).toHaveBeenCalledWith({
        branches: ["main", "develop"],
        issuePriorities: ["High", "Medium", "Low"],
        tags: { environment: ["prod", "dev"] },
        workloads: [],
        llmEnabled: false,
      });
    });
  });
});
