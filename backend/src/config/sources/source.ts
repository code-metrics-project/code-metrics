/**
 * Configuration utility that abstracts access to configuration values.
 * Currently uses process.env but can be extended to support other sources
 * like config files, remote configuration services, etc.
 */

export interface ConfigSource {
  get(key: string): string | undefined;
}

export class ProcessEnvConfigSource implements ConfigSource {
  get(key: string): string | undefined {
    return process.env[key];
  }
}

// Future config sources can be added here
// class FileConfigSource implements ConfigSource { ... }
// class RemoteConfigSource implements ConfigSource { ... }

let configSources: ConfigSource[] = [new ProcessEnvConfigSource()];

/**
 * Get a configuration item value. Checks configuration sources in order
 * and returns the first non-undefined value found.
 *
 * @param key The configuration key to retrieve
 * @param defaultValue Optional default value if key is not found
 * @returns The configuration value or undefined if not found and no default provided
 */
export function getConfigItem(key: string, defaultValue?: string): string | undefined {
  for (const source of configSources) {
    const value = source.get(key);
    if (value !== undefined) {
      return value;
    }
  }
  return defaultValue;
}

/**
 * Get a configuration item as a number
 *
 * @param key The configuration key to retrieve
 * @param defaultValue Optional default value if key is not found or cannot be parsed
 * @returns The configuration value as a number or undefined
 */
export function getConfigItemAsNumber(key: string, defaultValue?: number): number | undefined {
  const value = getConfigItem(key);
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get a configuration item as a boolean
 *
 * @param key The configuration key to retrieve
 * @param defaultValue Optional default value if key is not found
 * @returns The configuration value as a boolean
 */
export function getConfigItemAsBoolean(key: string, defaultValue: boolean = false): boolean {
  const value = getConfigItem(key);
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
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
