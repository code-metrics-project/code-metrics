import { LlmProviderTypes } from "../../model/config/common";
import { getAllLlmConfig } from "../../config/configMapping";
import { verbose } from "../../utils/logger/logger";

/**
 * Service interface for LLM providers
 */
export type LlmService = {
  /**
   * Generate an executive summary from a list of changes
   */
  generateChangesSummary(changes: any[]): Promise<string>;
};

const builders: Record<string, () => LlmService> = {};
const instances: Record<string, LlmService> = {};

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
