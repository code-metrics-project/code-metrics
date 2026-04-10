import fetch from "node-fetch";
import { logger, error as logError, verbose } from "../../utils/logger/logger";
import { LlmService, registerLlm } from "./llmService";
import { LlmProviderTypes } from "../../model/config/common";
import { getAllLlmConfig } from "../../config/configMapping";
import { getLanguagePromptInstruction } from "./language";

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

Do not include a title. Do not list individual changes. Focus on the overall narrative.`;

    const promptWithLanguage = `${prompt}\n\n${getLanguagePromptInstruction(language)}`;

    return this.sendMessage(promptWithLanguage, 300);
  }
}

/**
 * Initialize and register the Claude LLM provider
 */
export function initClaudeLlm(): void {
  registerLlm(LlmProviderTypes.CLAUDE, () => new ClaudeLlmService());
  verbose("Claude LLM provider registered");
}
