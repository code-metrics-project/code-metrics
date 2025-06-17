import path from "path";
import fs, { readFile } from "fs/promises";
import { logger, verbose } from "../utils/logger/logger";
import { ConfigHolder } from "../model/config/common";
import yaml from "js-yaml";
import _merge from "lodash/merge";
import { resolveAllSecrets } from "./secrets";
import { polyfillLegacyConfig } from "./polyfills";
import { RemoteConfigWrapper } from "../model/config/remote-config";
import { Workload, WorkloadConfigWrapper } from "../model/config/workload-config";
import { ConfigVersion, VersionedConfig } from "../model/config/base";
import { StageConfigWrapper } from "../model/config/pipeline-config";
import { redactAndRenderAsJson } from "../utils/logger/redact";

let cachedConfig: ConfigHolder;

export const clearCachedConfig = () => (cachedConfig = null);

export const getConfig = (): ConfigHolder => {
  if (!cachedConfig) {
    throw new Error("No configuration has been loaded - call loadConfig() first");
  }
  return cachedConfig;
};

export const loadConfig = async (overrides?: {
  dir?: string;
  remoteConfig?: RemoteConfigWrapper;
  workloadConfig?: WorkloadConfigWrapper;
  pipelineConfig?: StageConfigWrapper;
}) => {
  const configDirs = getConfigDirs(overrides?.dir);
  logger(`Loading from configuration dir: ${configDirs}`);

  const loadedConfig: ConfigHolder = {
    // (optional) file in app dir
    metadata: await readConfig([__dirname], "metadata", { required: false }, { name: "code-metrics-backend", version: "dev" }),

    // files in config dir
    remoteConfigs:
      overrides?.remoteConfig ??
      (await readConfig(configDirs, "remote-config", { required: true, resolveSecrets: true })),

    workloadConfigs:
      overrides?.workloadConfig ??
      (await readConfig(configDirs, "workload-config", { required: true, resolveSecrets: true })),

    pipelineConfigs:
      overrides?.pipelineConfig ??
      (await readConfig(configDirs, "pipeline-config", { required: false, resolveSecrets: true }, { stages: [] })),
  };
  cachedConfig = applyDefaults(polyfillLegacyConfig(loadedConfig));

  logger(`Loaded version ${cachedConfig.metadata.version}`);
  verbose(`Remote Configuration: ${redactAndRenderAsJson(cachedConfig.remoteConfigs)}`);
  verbose(`Workload Configuration: ${redactAndRenderAsJson(cachedConfig.workloadConfigs)}`);
  verbose(`Pipeline Configuration: ${redactAndRenderAsJson(cachedConfig.pipelineConfigs)}`);
};

/**
 * Get the configuration directories from the environment variable or use the default. Multiple
 * directories can be specified as a comma separated list.
 * @param dir
 */
export const getConfigDirs = (dir?: string): string[] => {
  const d = dir ?? process.env.CONFIG_DIR ?? process.cwd();
  return d.split(",").map((d) => d.trim()).filter((d) => d.length > 0);
};

/**
 * Discover config files with the specified prefix in the given directory.
 * @param dirs paths to directories containing the config files
 * @param filePrefix the prefix such as `remote-config` or 'workload-config', i.e. without a file extension
 * @return an array of fully qualified paths, e.g. `/path/to/config.yaml`
 */
const discoverConfig = async (dirs: string[], filePrefix: string): Promise<string[]> => {
  const extensions = [".yaml", ".yml", ".json"];
  const configFiles: string[] = []

  for (const dir of dirs) {
    const configs = (await fs.readdir(dir)).filter((f) => {
      return f.startsWith(filePrefix) && extensions.some((ext) => f.endsWith(ext));
    }).map((f) => {
      return path.join(dir, f)
    });
    configFiles.push(...configs);
  }

  verbose(`Discovered ${configFiles.length} config file(s) with prefix '${filePrefix}' in ${dirs}`, configFiles);

  if (!configFiles.length) {
    throw new Error(`No file named '${filePrefix}' with extensions: ${extensions} in '${dirs}'`);
  }
  return configFiles;
};

/**
 * Performs a merge of the `config` objects into a single object.
 * There is a special case for handling top level properties of
 * type array. When an array is encountered with the same property
 * name its contents are merged.
 * 
 * If the configs themselves are arrays, they are concatenated.
 * @param configs
 */
export const mergeConfigs = <T>(configs: T[]): T => {
  if (!configs.length) {
    return <T>{};
  }
  
  // Handle case where configs themselves are arrays
  if (Array.isArray(configs[0])) {
    // Create a properly typed array result using type assertion
    let result = [...(configs[0] as unknown as any[])] as any[];
    for (let i = 1; i < configs.length; i++) {
      // Use proper type assertions to ensure TypeScript knows these are arrays
      result = [...result, ...(configs[i] as unknown as any[])];
    }
    return result as unknown as T;
  }
  
  const merged = configs[0];
  for (let i = 1; i < configs.length; i++) {
    const config = configs[i];
    for (const propName in config) {
      const prop = config[propName];
      if (Array.isArray(prop)) {
        let arr: any[] = merged[propName] as [];
        if (!arr) {
          arr = [];
          merged[propName] = arr as T[Extract<keyof T, string>];
        }
        arr.push(...prop);
      } else {
        merged[propName] = _merge(merged[propName], prop);
      }
    }
  }
  return merged;
};

/**
 * Read all configuration files with the specified prefix in the given directory. Multiple configuration
 * files discovered will be merged into a single object in the order they are discovered.
 * @param dirs paths to directories containing the config files
 * @param configFilePrefix the prefix such as `remote-config` or 'workload-config', i.e. without a file extension
 * @param options
 * @param defaultValue
 */
export const readConfig = async <T>(
  dirs: string[],
  configFilePrefix: string,
  options: { required: boolean; resolveSecrets?: boolean },
  defaultValue: any = null,
): Promise<T> => {
  try {
    const configs: T[] = [];
    for (const configFile of await discoverConfig(dirs, configFilePrefix)) {
      try {
        logger(`Loading config file: ${configFile}`);
        const raw = await readFile(configFile);
        const resolved = options.resolveSecrets ? await resolveAllSecrets(raw.toString()) : raw.toString();
        const config = yaml.load(resolved);
        configs.push(config);
      } catch (e) {
        throw new Error(`Error reading config file: ${configFile}: ${e}`);
      }
    }
    return mergeConfigs(configs);
  } catch (e) {
    const errMsg = `Failed to read '${configFilePrefix}' config file in ${dirs}`;
    if (options.required) {
      throw Error(`${errMsg}: ${e}`);
    } else {
      verbose(errMsg);
      return defaultValue;
    }
  }
};

const applyDefaults = (loadedConfig: ConfigHolder): ConfigHolder => {
  const config = loadedConfig;
  config.workloadConfigs.workloads.forEach((workload) => {
    applyWorkloadDefaults(config, workload);
  });
  return config;
};

const applyWorkloadDefaults = (config: ConfigHolder, workload: Workload) => {
  const remoteTicketMgmt = config.remoteConfigs.ticketManagement;

  const workloadProjectMgmt = workload.projectManagement;
  const projectMgmtDefaults = remoteTicketMgmt[workloadProjectMgmt.type]?.servers.find((s) => s.id === workloadProjectMgmt.serverId)?.defaults;
  _merge(workloadProjectMgmt, projectMgmtDefaults);

  const workloadIncidentMgmt = workload.incidents;
  const incidentMgmtDefaults = remoteTicketMgmt[workloadIncidentMgmt.type]?.servers.find((s) => s.id === workloadIncidentMgmt.serverId)?.defaults;
  _merge(workloadIncidentMgmt, incidentMgmtDefaults);
};

/**
 * Determine the version of the configuration object.
 * @param config
 */
export const determineConfigVersion = (config: Partial<VersionedConfig>): ConfigVersion => {
  const version = config.version || ConfigVersion.V1_0;
  verbose(`Determined config version: ${version}`, config);
  return version;
};
