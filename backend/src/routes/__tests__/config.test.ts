import { Request, Response } from "express";
import * as configMapping from "../../config/configMapping";
import * as config from "../../config/config";
import { fetchBootstrap, fetchConfig } from "../config";
import { BootstrapConfig, SystemConfig } from "../../model/config/system-config";
import { Features, listActiveFeatures, type FeatureConfig } from "../../utils/features";
import { getAuthenticator } from "../../auth/auth";
import { isLicensed } from "../../license/validate";
import { getEnvConfigItem } from "../../config/sources/source";

// Mock dependencies
jest.mock("../../config/configMapping");
jest.mock("../../config/config", () => ({
  CONFIG_CACHE_TTL_MS: 45000,
  getConfig: jest.fn(),
  hasConfig: jest.fn(),
  hasWorkloads: jest.fn(),
}));
jest.mock("../../utils/features");
jest.mock("../../utils/repos");
jest.mock("../../services/codeManagement/vcsService");
jest.mock("../../auth/auth");
jest.mock("../../license/validate");
jest.mock("../../config/sources/source");

const mockGetAllLlmConfig = configMapping.getAllLlmConfig as jest.MockedFunction<typeof configMapping.getAllLlmConfig>;
const mockListWorkloads = configMapping.listWorkloads as jest.MockedFunction<typeof configMapping.listWorkloads>;
const mockGetVcsBranches = configMapping.getVcsBranches as jest.MockedFunction<typeof configMapping.getVcsBranches>;
const mockGetAllTicketPriorities = configMapping.getAllTicketPriorities as jest.MockedFunction<
  typeof configMapping.getAllTicketPriorities
>;
const mockListAllTagPairs = configMapping.listAllTagPairs as jest.MockedFunction<typeof configMapping.listAllTagPairs>;
const mockGetConfig = config.getConfig as jest.MockedFunction<typeof config.getConfig>;
const mockHasConfig = config.hasConfig as jest.MockedFunction<typeof config.hasConfig>;
const mockHasWorkloads = config.hasWorkloads as jest.MockedFunction<typeof config.hasWorkloads>;
const mockListActiveFeatures = listActiveFeatures as jest.MockedFunction<typeof listActiveFeatures>;
const mockGetAuthenticator = getAuthenticator as jest.MockedFunction<typeof getAuthenticator>;
const mockIsLicensed = isLicensed as jest.MockedFunction<typeof isLicensed>;
const mockGetEnvConfigItem = getEnvConfigItem as jest.MockedFunction<typeof getEnvConfigItem>;
const activeFeatures: FeatureConfig = {
  [Features.dora]: false,
  [Features.languageSelector]: false,
  [Features.mlForecasts]: false,
  [Features.predictions]: false,
  [Features.temporalCoupling]: false,
};

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
    mockGetConfig.mockReturnValue({ metadata: { name: "CodeMetrics", version: "2.0" } });
    mockHasConfig.mockReturnValue(true);
    mockHasWorkloads.mockReturnValue(true);
    mockListActiveFeatures.mockReturnValue(activeFeatures);
    mockGetAuthenticator.mockReturnValue({
      loginUrl: undefined,
    } as ReturnType<typeof getAuthenticator>);
    mockIsLicensed.mockResolvedValue(true);
    mockGetEnvConfigItem.mockReturnValue(undefined);

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

  describe("fetchBootstrap", () => {
    it("includes backend config cache TTL so clients can align polling when lazy load is enabled by default", async () => {
      const bootstrapResponse = {
        json: jsonSpy,
      } as Partial<Response<BootstrapConfig>>;

      await fetchBootstrap(mockRequest as Request, bootstrapResponse as Response<BootstrapConfig>);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          configCacheTtlMs: 45000,
        }),
      );
    });

    it("returns zero cache TTL when lazy load is disabled", async () => {
      const bootstrapResponse = {
        json: jsonSpy,
      } as Partial<Response<BootstrapConfig>>;

      mockGetEnvConfigItem.mockImplementation((key: string) => {
        if (key === "LAZY_LOAD_CONFIG_DISABLED") return "true";
        return undefined;
      });

      await fetchBootstrap(mockRequest as Request, bootstrapResponse as Response<BootstrapConfig>);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          configCacheTtlMs: 0,
        }),
      );
    });
  });
});
