import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger, error as logError, verbose } from "../../utils/logger/logger";
import { LlmService, registerLlm } from "./llmService";
import { LlmProviderTypes } from "../../model/config/common";
import { getAllLlmConfig } from "../../config/configMapping";

/**
 * Service for interacting with Google Gemini API
 */
export class GeminiLlmService implements LlmService {
  private apiKey: string;
  private model: string;
  private genAI: GoogleGenerativeAI | null = null;

  constructor(apiKey?: string, model?: string) {
    // Get config from remote-config.yaml
    const llmConfig = getAllLlmConfig();
    const geminiConfig = llmConfig?.gemini?.server;

    // Use provided parameters or config from remote-config.yaml
    this.apiKey = apiKey || geminiConfig?.apiKey || "";

    // Use configured model or fallback to default
    this.model = model || geminiConfig?.model || "gemini-1.5-flash";

    if (!this.apiKey) {
      logError("Gemini API key not configured. Configure in remote-config.yaml under llm.gemini.server");
    } else {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      logger(`Gemini LLM service initialized with model: ${this.model}`);
    }
  }

  /**
   * Send a message to Gemini and get a response
   */
  async sendMessage(userMessage: string): Promise<string> {
    if (!this.genAI) {
      throw new Error("Gemini API key not configured");
    }

    logger(`Calling Gemini API with model: ${this.model}`);

    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const result = await model.generateContent(userMessage);
      const response = result.response;
      const text = response.text();

      logger(`Gemini API response received`);

      return text;
    } catch (err) {
      logError("Failed to call Gemini API", err);
      throw err;
    }
  }

  /**
   * Generate an executive summary from a list of changes
   */
  async generateChangesSummary(changes: any[]): Promise<string> {
    if (changes.length === 0) {
      return "No changes found for this period.";
    }

    // Prepare a concise representation of changes for the prompt
    const changesSummary = changes
      .slice(0, 100) // Limit to first 100 changes to avoid token limits
      .map((change) => {
        const parts = [];

        if (change.links?.issueId) {
          parts.push(`[${change.links.issueType || "Issue"} ${change.links.issueId}]`);
        }
        if (change.links?.issueTitle) {
          parts.push(change.links.issueTitle);
        } else if (change.links?.prTitle) {
          parts.push(change.links.prTitle);
        } else if (change.message) {
          // Use first line of commit message
          parts.push(change.message.split("\n")[0]);
        }

        if (change.repo) {
          parts.push(`(${change.repo})`);
        }

        return parts.join(" ");
      })
      .join("\n");

    const totalChanges = changes.length;
    const hasMore = totalChanges > 100;

    const prompt = `You are analyzing software development changes from a ticketing and change management system.

Below are ${hasMore ? `the first 100 of ${totalChanges}` : totalChanges} changes made during a specific time period. Each line represents a change with its ticket ID, description, and repository.

Changes:
${changesSummary}

Please provide a concise executive summary (2-3 sentences) that:
1. Highlights the main themes or focus areas of work
2. Mentions any notable patterns (e.g., types of work: bugs, features, refactoring)
3. Keeps it high-level and suitable for stakeholders

Do not include a title. Do not list individual changes. Focus on the overall narrative.`;

    return this.sendMessage(prompt);
  }
}

/**
 * Initialize and register the Gemini LLM provider
 */
export function initGeminiLlm(): void {
  registerLlm(LlmProviderTypes.GEMINI, () => new GeminiLlmService());
  verbose("Gemini LLM provider registered");
}
