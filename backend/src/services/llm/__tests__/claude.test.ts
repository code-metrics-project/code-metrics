import { ClaudeLlmService } from "../claude";
import * as configMapping from "../../../config/configMapping";

// Mock the config mapping module
jest.mock("../../../config/configMapping");
const mockGetAllLlmConfig = configMapping.getAllLlmConfig as jest.MockedFunction<
  typeof configMapping.getAllLlmConfig
>;

// Mock logger to avoid console output during tests
jest.mock("../../../utils/logger/logger", () => ({
  logger: jest.fn(),
  error: jest.fn(),
  verbose: jest.fn(),
}));

describe("ClaudeLlmService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should use API key from remote config when available", () => {
      mockGetAllLlmConfig.mockReturnValue({
        type: "claude" as const,
        claude: {
          server: {
            id: "test-claude",
            apiKey: "remote-config-key",
            url: "https://api.anthropic.com",
            model: "claude-sonnet-4-5-20250929",
          },
        },
      });

      const service = new ClaudeLlmService();
      expect(service["apiKey"]).toBe("remote-config-key");
      expect(service["model"]).toBe("claude-sonnet-4-5-20250929");
      expect(service["apiUrl"]).toBe("https://api.anthropic.com/v1/messages");
    });

    it("should use custom URL from remote config", () => {
      mockGetAllLlmConfig.mockReturnValue({
        type: "claude" as const,
        claude: {
          server: {
            id: "test-claude",
            apiKey: "test-key",
            url: "https://custom-proxy.example.com",
          },
        },
      });

      const service = new ClaudeLlmService();
      expect(service["apiUrl"]).toBe("https://custom-proxy.example.com/v1/messages");
    });

    it("should use default URL when not provided in remote config", () => {
      mockGetAllLlmConfig.mockReturnValue({
        type: "claude" as const,
        claude: {
          server: {
            id: "test-claude",
            apiKey: "test-key",
          },
        },
      });

      const service = new ClaudeLlmService();
      expect(service["apiUrl"]).toBe("https://api.anthropic.com/v1/messages");
    });

    it("should use default model when not provided in remote config", () => {
      mockGetAllLlmConfig.mockReturnValue({
        type: "claude" as const,
        claude: {
          server: {
            id: "test-claude",
            apiKey: "test-key",
          },
        },
      });

      const service = new ClaudeLlmService();
      expect(service["model"]).toBe("claude-sonnet-4-5-20250929");
    });

    it("should prefer constructor parameters over remote config", () => {
      mockGetAllLlmConfig.mockReturnValue({
        type: "claude" as const,
        claude: {
          server: {
            id: "test-claude",
            apiKey: "config-key",
            url: "https://config-url.com",
            model: "claude-3-opus",
          },
        },
      });

      const service = new ClaudeLlmService("override-key", "https://override-url.com", "claude-3-haiku");
      expect(service["apiKey"]).toBe("override-key");
      expect(service["apiUrl"]).toBe("https://override-url.com/v1/messages");
      expect(service["model"]).toBe("claude-3-haiku");
    });

    it("should handle missing remote config gracefully", () => {
      mockGetAllLlmConfig.mockReturnValue(undefined);

      const service = new ClaudeLlmService();
      expect(service["apiKey"]).toBe("");
      expect(service["apiUrl"]).toBe("https://api.anthropic.com/v1/messages");
      expect(service["model"]).toBe("claude-sonnet-4-5-20250929");
    });

    it("should handle empty claude config gracefully", () => {
      mockGetAllLlmConfig.mockReturnValue({
        type: "claude" as const,
      });

      const service = new ClaudeLlmService();
      expect(service["apiKey"]).toBe("");
      expect(service["model"]).toBe("claude-sonnet-4-5-20250929");
    });
  });

  describe("sendMessage", () => {
    it("should throw error when API key is not configured", async () => {
      mockGetAllLlmConfig.mockReturnValue(undefined);

      const service = new ClaudeLlmService();
      await expect(service.sendMessage("test message")).rejects.toThrow("Claude API key not configured");
    });
  });

  describe("generateChangesSummary", () => {
    it("should return default message when no changes provided", async () => {
      mockGetAllLlmConfig.mockReturnValue({
        type: "claude" as const,
        claude: {
          server: {
            id: "test-claude",
            apiKey: "test-key",
          },
        },
      });

      const service = new ClaudeLlmService();
      const result = await service.generateChangesSummary([]);
      expect(result).toBe("No changes found for this period.");
    });
  });
});
