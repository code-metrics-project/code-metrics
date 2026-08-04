import { logger, error as logError, verbose } from "../../utils/logger/logger";
import { LlmService, registerLlm, registerLlmConnectionChecker } from "./llmService";
import { LlmProviderTypes } from "../../model/config/common";
import { getAllLlmConfig } from "../../config/configMapping";
import { getLanguagePromptInstruction } from "./language";
import { ConnectionCheckResult } from "../../model/remote-connection-status";
import { LlmServer, RemoteServer } from "../../model/config/remote-config";

export type ClaudeMessage = {
  role: "user" | "assistant";
  content: string;
}

export type ClaudeRequest = {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
}

export type ClaudeResponse = {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Service for interacting with Claude API
 */
export class ClaudeLlmService implements LlmService {
  private apiKey: string;
  private apiUrl: string;
  private model: string;

  constructor(apiKey?: string, apiUrl?: string, model?: string) {
    // Get config from remote-config.yaml
    const llmConfig = getAllLlmConfig();
    const claudeConfig = llmConfig?.claude?.server;

    // Use provided parameters or config from remote-config.yaml
    this.apiKey = apiKey || claudeConfig?.apiKey || "";

    // Use custom base URL if set (e.g., for corporate proxies)
    const baseUrl = apiUrl || claudeConfig?.url || "https://api.anthropic.com";
    this.apiUrl = `${baseUrl}/v1/messages`;

    // Use configured model or fallback to default
    this.model = model || claudeConfig?.model || "claude-sonnet-4-5-20250929";

    if (!this.apiKey) {
      logError("Claude API key not configured. Configure in remote-config.yaml under llm.claude.server");
    } else {
      logger(`Claude LLM service initialized with base URL: ${baseUrl}, model: ${this.model}`);
    }
  }

  /**
   * Send a message to Claude and get a response
   */
  async sendMessage(userMessage: string, maxTokens: number = 1024): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Claude API key not configured");
    }

    const requestBody: ClaudeRequest = {
      model: this.model,
      max_tokens: maxTokens,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    };

    logger(`Calling Claude API with model: ${this.model}`);

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as ClaudeResponse;

      if (!data.content || data.content.length === 0) {
        throw new Error("No content in Claude API response");
      }

      const text = data.content[0].text;
      logger(
        `Claude API response received: ${data.usage.input_tokens} input tokens, ${data.usage.output_tokens} output tokens`,
      );

      return text;
    } catch (err) {
      logError("Failed to call Claude API", err);
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

    return this.sendMessage(promptWithLanguage, 300);
  }
}

/**
 * Check connectivity to Claude API by calling the models endpoint.
 */
const checkClaudeConnection = async (server: RemoteServer): Promise<ConnectionCheckResult> => {
  const startTime = Date.now();
  const llmServer = server as LlmServer;
  const baseUrl = llmServer.url || "https://api.anthropic.com";
  const url = `${baseUrl}/v1/models`;

  if (!llmServer.apiKey) {
    return {
      id: server.id,
      category: "llm",
      type: LlmProviderTypes.CLAUDE,
      url: baseUrl,
      status: "unconfigured",
      statusDetail: "No API key configured",
    };
  }

  try {
    // Call the models endpoint to check connectivity
    const response = await fetch(url, {
      headers: {
        "x-api-key": llmServer.apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    const responseTimeMs = Date.now() - startTime;

    if (response.ok) {
      return {
        id: server.id,
        category: "llm",
        type: LlmProviderTypes.CLAUDE,
        url: baseUrl,
        status: "connected",
        responseTimeMs,
      };
    }

    // Handle HTTP error responses
    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      const detail = retryAfter ? `Rate limited. Retry after ${retryAfter} seconds` : "Rate limited";
      return {
        id: server.id,
        category: "llm",
        type: LlmProviderTypes.CLAUDE,
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
        type: LlmProviderTypes.CLAUDE,
        url: baseUrl,
        status: "unauthorised",
        statusDetail: `HTTP ${response.status}: ${response.statusText}`,
        responseTimeMs,
      };
    }

    return {
      id: server.id,
      category: "llm",
      type: LlmProviderTypes.CLAUDE,
      url: baseUrl,
      status: "error",
      statusDetail: `HTTP ${response.status}: ${response.statusText}`,
      responseTimeMs,
    };
  } catch (err: any) {
    const responseTimeMs = Date.now() - startTime;

    // Network errors (ECONNREFUSED, ETIMEDOUT, DNS failures, AbortError, etc.)
    return {
      id: server.id,
      category: "llm",
      type: LlmProviderTypes.CLAUDE,
      url: baseUrl,
      status: "unreachable",
      statusDetail: err.name || err.code || err.message,
      responseTimeMs,
    };
  }
};

/**
 * Initialize and register the Claude LLM provider
 */
export function initClaudeLlm(): void {
  registerLlm(LlmProviderTypes.CLAUDE, () => new ClaudeLlmService());
  registerLlmConnectionChecker(LlmProviderTypes.CLAUDE, checkClaudeConnection);
  verbose("Claude LLM provider registered");
}
