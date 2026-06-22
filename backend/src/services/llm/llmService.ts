import { LlmProviderTypes } from "../../model/config/common";
import { getAllLlmConfig } from "../../config/configMapping";
import { verbose, logger } from "../../utils/logger/logger";
import { ConnectionChecker, ConnectionCheckResult } from "../../model/remote-connection-status";

/**
 * Service interface for LLM providers
 */
export type LlmService = {
  /**
   * Generate an executive summary from a list of changes
   */
  generateChangesSummary(changes: any[], language?: string): Promise<string>;
};

const builders: Record<string, () => LlmService> = {};
const instances: Record<string, LlmService> = {};
const checkers: Record<string, ConnectionChecker> = {};

/**
 * Register an LLM provider implementation
 * @param type The LLM provider type
 * @param builder Factory function to create the LLM service instance
 */
export const registerLlm = (type: LlmProviderTypes, builder: () => LlmService) => {
  verbose(`Registered LLM implementation for: ${type}`);
  builders[type] = builder;
};

/**
 * Register a connection checker for an LLM provider type.
 * This allows checking connectivity to the remote server.
 */
export const registerLlmConnectionChecker = (type: LlmProviderTypes, checker: ConnectionChecker) => {
  verbose(`Registered LLM connection checker for: ${type}`);
  checkers[type] = checker;
};

/**
 * Check connectivity to all configured LLM servers.
 * Returns connection status for each server. Returns empty array if no LLM is configured.
 */
export const checkLlmConnections = async (): Promise<ConnectionCheckResult[]> => {
  const config = getAllLlmConfig();
  if (!config) {
    // LLM is optional, so return empty array if not configured
    return [];
  }

  const results: ConnectionCheckResult[] = [];
  const checks: Promise<ConnectionCheckResult>[] = [];

  // LLM config has a different structure - there's one server per type
  const providerType = config.type;
  const checker = checkers[providerType];

  if (checker) {
    // Get the server config for this provider type
    const serverConfig = config[providerType]?.server;
    if (serverConfig) {
      checks.push(checker(serverConfig));
    }
  }

  // Run all checks in parallel (though there's typically only one LLM provider)
  const settled = await Promise.allSettled(checks);

  for (const result of settled) {
    if (result.status === "fulfilled") {
      results.push(result.value);
    } else {
      // If a checker itself throws, log the error
      logger(`LLM connection check failed with uncaught error: ${result.reason}`);
    }
  }

  return results;
};

/**
 * Get the configured LLM service instance
 * @returns The LLM service instance for the globally configured provider
 * @throws Error if no LLM provider is configured or implementation is not registered
 */
export const getLlmService = (): LlmService => {
  const llmConfig = getAllLlmConfig();

  if (!llmConfig) {
    throw new Error("No LLM provider configured");
  }

  const type = llmConfig.type;
  let instance = instances[type];

  if (!instance) {
    const builder = builders[type];
    if (!builder) {
      throw new Error(`No implementation registered for LLM provider type: ${type}`);
    }
    instance = builder();
    instances[type] = instance;
  }

  return instance;
};
