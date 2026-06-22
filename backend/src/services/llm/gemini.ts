import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from "node-fetch";
import { logger, error as logError, verbose } from "../../utils/logger/logger";
import { LlmService, registerLlm, registerLlmConnectionChecker } from "./llmService";
import { LlmProviderTypes } from "../../model/config/common";
import { getAllLlmConfig } from "../../config/configMapping";
import { getLanguagePromptInstruction } from "./language";
import { ConnectionCheckResult } from "../../model/remote-connection-status";
import { LlmServer, RemoteServer } from "../../model/config/remote-config";

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
  async generateChangesSummary(changes: any[], language?: string): Promise<string> {
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

Do not include a title. Do not list individual changes. Focus on the overall narrative.

Suggest three actions for the user to take based on the data.`;

    const promptWithLanguage = `${prompt}\n\n${getLanguagePromptInstruction(language)}`;

    return this.sendMessage(promptWithLanguage);
  }
}

/**
 * Check connectivity to Gemini API by calling the models endpoint.
 */
const checkGeminiConnection = async (server: RemoteServer): Promise<ConnectionCheckResult> => {
  const startTime = Date.now();
  const llmServer = server as LlmServer;
  const baseUrl = llmServer.url || "https://generativelanguage.googleapis.com";
  const url = `${baseUrl}/v1beta/models`;

  if (!llmServer.apiKey) {
    return {
      id: server.id,
      category: "llm",
      type: LlmProviderTypes.GEMINI,
      url: baseUrl,
      status: "unconfigured",
      statusDetail: "No API key configured",
    };
  }

  try {
    const response = await fetch(`${url}?key=${llmServer.apiKey}`, {
      signal: AbortSignal.timeout(5000),
    });

    const responseTimeMs = Date.now() - startTime;

    if (response.ok) {
      return {
        id: server.id,
        category: "llm",
        type: LlmProviderTypes.GEMINI,
        url: baseUrl,
        status: "connected",
        responseTimeMs,
      };
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      const detail = retryAfter ? `Rate limited. Retry after ${retryAfter} seconds` : "Rate limited";
      return {
        id: server.id,
        category: "llm",
        type: LlmProviderTypes.GEMINI,
        url: baseUrl,
        status: "rateLimited",
        statusDetail: detail,
        responseTimeMs,
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        id: server.id,
        category: "llm",
        type: LlmProviderTypes.GEMINI,
        url: baseUrl,
        status: "unauthorised",
        statusDetail: `HTTP ${response.status}: ${response.statusText}`,
        responseTimeMs,
      };
    }

    return {
      id: server.id,
      category: "llm",
      type: LlmProviderTypes.GEMINI,
      url: baseUrl,
      status: "error",
      statusDetail: `HTTP ${response.status}: ${response.statusText}`,
      responseTimeMs,
    };
  } catch (err: any) {
    const responseTimeMs = Date.now() - startTime;
    return {
      id: server.id,
      category: "llm",
      type: LlmProviderTypes.GEMINI,
      url: baseUrl,
      status: "unreachable",
      statusDetail: err.name || err.code || err.message,
      responseTimeMs,
    };
  }
};

/**
 * Initialize and register the Gemini LLM provider
 */
export function initGeminiLlm(): void {
  registerLlm(LlmProviderTypes.GEMINI, () => new GeminiLlmService());
  registerLlmConnectionChecker(LlmProviderTypes.GEMINI, checkGeminiConnection);
  verbose("Gemini LLM provider registered");
}
