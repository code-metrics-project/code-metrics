const ENVIRONMENT_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function getEnvironment(config: any, environmentOverride?: string): string {
  const raw = environmentOverride ?? config?.global?.environment;

  if (raw === undefined || raw === null || String(raw).trim() === "") {
    throw new Error(
      "Missing environment: set global.environment in config.yaml (or the CODEMETRICS_ENV environment variable) to a slug such as 'prod' or 'dev'.",
    );
  }

  const environment = String(raw).trim().toLowerCase();

  if (!ENVIRONMENT_SLUG_PATTERN.test(environment)) {
    throw new Error(
      `Invalid environment '${raw}': expected a slug of lower-case letters and digits separated by single hyphens (e.g. 'prod', 'dev', 'demo-eu').`,
    );
  }

  return environment;
}

export function getStackPrefix(config: any, environmentOverride?: string): string {
  const name = config?.global?.name;

  if (!name) {
    throw new Error("Missing configuration: global.name must be set in config.yaml.");
  }

  return `${name}-${getEnvironment(config, environmentOverride)}`;
}

export function applyEnvironmentOverride(config: any, environmentOverride?: string): void {
  const environment = environmentOverride ?? process.env.CODEMETRICS_ENV;

  if (environment && String(environment).trim() !== "") {
    config.global = config.global || {};
    config.global.environment = environment;
  }
}
