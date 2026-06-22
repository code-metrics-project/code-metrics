/**
 * Configuration utility that abstracts access to configuration values.
 * Supports sources such as process.env and can be extended to support others
 * like config files, remote configuration services, git, etc.
 */
import { verbose } from "../../utils/logger/logger";

export type ConfigSource = {
  get(key: string): string | undefined;
};

/**
 * In-memory override config source for programmatic overrides.
 */
export class OverrideConfigSource implements ConfigSource {
  private overrides: Record<string, string> = {};

  set(key: string, value: string): void {
    this.overrides[key] = value;
  }

  get(key: string): string | undefined {
    return this.overrides[key];
  }
}

/**
 * Configuration source that reads from `process.env`.
 */
export class ProcessEnvConfigSource implements ConfigSource {
  get(key: string): string | undefined {
    return process.env[key];
  }
}

const overrides = new OverrideConfigSource();

// Sources are processed in order, first match wins
let configSources: ConfigSource[] = [overrides, new ProcessEnvConfigSource()];

/**
 * Get a configuration item value. Checks configuration sources in order
 * and returns the first non-undefined value found.
 *
 * @param key The configuration key to retrieve
 * @param defaultValue Optional default value if key is not found
 * @returns The configuration value or undefined if not found and no default provided
 */
export function getEnvConfigItem(key: string, defaultValue?: string): string | undefined {
  for (const source of configSources) {
    const value = source.get(key);
    if (value !== undefined) {
      return value;
    }
  }
  return defaultValue;
}

/**
 * Get an environment configuration item as a number
 *
 * @param key The configuration key to retrieve
 * @param defaultValue Default value if key is not found or cannot be parsed
 * @returns The configuration value as a number
 */
export function getEnvConfigItemAsNumber(key: string, defaultValue: number) {
  const value = getEnvConfigItem(key);
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get an environment configuration item as a boolean
 *
 * @param key The configuration key to retrieve
 * @param defaultValue Optional default value if key is not found
 * @returns The configuration value as a boolean
 */
export function getEnvConfigItemAsBoolean(key: string, defaultValue: boolean = false): boolean {
  const value = getEnvConfigItem(key);
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === "true";
}

/**
 * Override an environment configuration item value programmatically.
 * This takes highest precedence over other sources.
 * @param key
 * @param value
 */
export function overrideEnvConfigItem(key: string, value: string): void {
  verbose("Overriding env config item", key, value);
  overrides.set(key, value);
}

/**
 * Set the configuration sources in priority order
 *
 * @param sources Array of configuration sources to use
 */
export function setConfigSources(sources: ConfigSource[]): void {
  configSources = sources;
}

/**
 * Add a configuration source to the beginning of the list (highest priority)
 *
 * @param source Configuration source to add
 */
export function addConfigSource(source: ConfigSource): void {
  configSources.unshift(source);
}
