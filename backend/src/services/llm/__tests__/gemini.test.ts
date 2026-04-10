import { GeminiLlmService } from "../gemini";
import * as configMapping from "../../../config/configMapping";
import { LlmProviderTypes } from "../../../model/config/common";

// Mock the config mapping module
jest.mock("../../../config/configMapping");
const mockGetAllLlmConfig = configMapping.getAllLlmConfig as jest.MockedFunction<typeof configMapping.getAllLlmConfig>;

// Mock logger to avoid console output during tests
jest.mock("../../../utils/logger/logger", () => ({
  logger: jest.fn(),
  error: jest.fn(),
  verbose: jest.fn(),
}));

// Mock Google Generative AI
jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn(),
  })),
}));

describe("GeminiLlmService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should use API key from remote config when available", () => {
      mockGetAllLlmConfig.mockReturnValue({
        type: LlmProviderTypes.GEMINI,
        gemini: {
          server: {
            id: "test-gemini",
            apiKey: "remote-config-key",
            model: "gemini-1.5-pro",
          },
        },
      });

      const service = new GeminiLlmService();
      expect(service["apiKey"]).toBe("remote-config-key");
      expect(service["model"]).toBe("gemini-1.5-pro");
    });

    it("should use default model when not provided in remote config", () => {
      mockGetAllLlmConfig.mockReturnValue({
        type: LlmProviderTypes.GEMINI,
        gemini: {
          server: {
            id: "test-gemini",
            apiKey: "test-key",
          },
        },
      });

      const service = new GeminiLlmService();
      expect(service["model"]).toBe("gemini-1.5-flash");
    });

    it("should prefer constructor parameters over remote config", () => {
      mockGetAllLlmConfig.mockReturnValue({
        type: LlmProviderTypes.GEMINI,
        gemini: {
          server: {
            id: "test-gemini",
            apiKey: "config-key",
            model: "gemini-1.5-flash",
          },
        },
      });

      const service = new GeminiLlmService("override-key", "gemini-1.5-pro");
      expect(service["apiKey"]).toBe("override-key");
      expect(service["model"]).toBe("gemini-1.5-pro");
    });

    it("should handle missing remote config gracefully", () => {
      mockGetAllLlmConfig.mockReturnValue(undefined);

      const service = new GeminiLlmService();
      expect(service["apiKey"]).toBe("");
      expect(service["model"]).toBe("gemini-1.5-flash");
      expect(service["genAI"]).toBeNull();
    });

    it("should handle empty gemini config gracefully", () => {
      mockGetAllLlmConfig.mockReturnValue({
        type: LlmProviderTypes.GEMINI,
      });

      const service = new GeminiLlmService();
      expect(service["apiKey"]).toBe("");
      expect(service["model"]).toBe("gemini-1.5-flash");
      expect(service["genAI"]).toBeNull();
    });

    it("should initialize Google AI when API key is provided", () => {
      mockGetAllLlmConfig.mockReturnValue({
        type: LlmProviderTypes.GEMINI,
        gemini: {
          server: {
            id: "test-gemini",
            apiKey: "valid-key",
          },
        },
      });

      const service = new GeminiLlmService();
      expect(service["genAI"]).not.toBeNull();
    });
  });

  describe("sendMessage", () => {
    it("should throw error when API key is not configured", async () => {
      mockGetAllLlmConfig.mockReturnValue(undefined);

      const service = new GeminiLlmService();
      await expect(service.sendMessage("test message")).rejects.toThrow("Gemini API key not configured");
    });
  });

  describe("generateChangesSummary", () => {
    it("should return default message when no changes provided", async () => {
      mockGetAllLlmConfig.mockReturnValue({
        type: LlmProviderTypes.GEMINI,
        gemini: {
          server: {
            id: "test-gemini",
            apiKey: "test-key",
          },
        },
      });

      const service = new GeminiLlmService();
      const result = await service.generateChangesSummary([]);
      expect(result).toBe("No changes found for this period.");
    });

    it("should include locale-code language instruction in generated prompt", async () => {
      mockGetAllLlmConfig.mockReturnValue({
        type: LlmProviderTypes.GEMINI,
        gemini: {
          server: {
            id: "test-gemini",
            apiKey: "test-key",
          },
        },
      });

      const service = new GeminiLlmService();
      const sendMessageSpy = jest.spyOn(service, "sendMessage").mockResolvedValue("Résumé");

      await service.generateChangesSummary(
        [{ repo: "repo-a", message: "Fix issue", links: { issueId: "PROJ-1", issueType: "Bug" } }],
        "fr-FR",
      );

      expect(sendMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Respond in the language indicated by this BCP-47 locale code: "fr".'),
      );
    });
  });
});
