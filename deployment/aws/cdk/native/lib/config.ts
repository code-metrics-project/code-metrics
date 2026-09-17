import * as fs from "fs";
import * as path from "path";
import { parse as parseYaml } from "yaml";
import { Environment, Stack, Tags } from "aws-cdk-lib";

type DemoUserCredentials = {
  user: string;
  pass: string;
};

export type CognitoDemoUser = {
  username: string;
  password: string;
  email: string;
};

type WebConfig = {
  apiBaseUrl: string;
  auth: {
    required: boolean;
    provided?: DemoUserCredentials;
  };
};

export function getStackEnv(config: any): Environment | undefined {
  const account = config?.aws?.account || undefined;
  const region = config?.aws?.region || undefined;

  if (!account && !region) {
    return undefined;
  }

  return {
    account,
    region,
  };
}

export function shouldApplyAwsApplicationTag(_applicationTagValue?: string): boolean {
  // AppRegistry returns a deploy-time application tag value that resolves to a
  // resource-groups ARN. Reusing it as a generic resource tag causes CloudFormation
  // validation failures for this stack set, so native demo deployments skip it.
  return false;
}

const ENVIRONMENT_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const S3_BUCKET_NAME_MAX_LENGTH = 63;

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

export function getResourcePrefix(config: any, environmentOverride?: string): string {
  const resourcePrefix = getStackPrefix(config, environmentOverride).toLowerCase();

  if (resourcePrefix.length > S3_BUCKET_NAME_MAX_LENGTH) {
    throw new Error(
      `Resource prefix '${resourcePrefix}' exceeds ${S3_BUCKET_NAME_MAX_LENGTH} characters; choose a shorter global.name / global.environment combination.`,
    );
  }

  return resourcePrefix;
}

export function applyEnvironmentOverride(config: any, environmentOverride?: string): void {
  const environment = environmentOverride ?? process.env.CODEMETRICS_ENV;

  if (environment && String(environment).trim() !== "") {
    config.global = config.global || {};
    config.global.environment = environment;
  }
}

export function addEnvironmentTags(stack: Stack, config: any, environmentOverride?: string): void {
  const environment = getEnvironment(config, environmentOverride);

  Tags.of(stack).add("Application", config?.global?.name);
  Tags.of(stack).add("Environment", environment);
}

export function getDatastoreTablePrefix(config: any, environmentOverride?: string): string {
  return config?.datastore?.dynamodb?.tableName || getResourcePrefix(config, environmentOverride);
}

export function getConfiguredCorsOrigins(config: any): string[] {
  const configuredOrigin =
    config?.backend?.environment?.CORS_ORIGIN || config?.backend?.environment?.CORSAllowedOrigin || "*";

  if (Array.isArray(configuredOrigin)) {
    return configuredOrigin;
  }

  if (typeof configuredOrigin !== "string") {
    return ["*"];
  }

  return configuredOrigin
    .split(",")
    .map((origin: string) => origin.trim())
    .filter(Boolean);
}

export function getPrimaryCorsOrigin(config: any): string {
  return getConfiguredCorsOrigins(config)[0] || "*";
}

export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function buildFrontendWebConfig(config: any, apiBaseUrl: string): WebConfig {
  const providedCredentials = config?.frontend?.auth?.provided;
  const authConfig: WebConfig["auth"] = {
    required: Boolean(config?.auth?.cognito?.create),
  };

  if (providedCredentials?.user && providedCredentials?.pass) {
    authConfig.provided = {
      user: providedCredentials.user,
      pass: providedCredentials.pass,
    };
  }

  return {
    apiBaseUrl: normalizeBaseUrl(apiBaseUrl),
    auth: authConfig,
  };
}

export function getCognitoDemoUsersFile(config: any): string | undefined {
  const value = config?.auth?.cognito?.createDemoUsers;

  if (typeof value === "boolean") {
    if (value) {
      throw new Error(
        "auth.cognito.createDemoUsers must now be the path to a demo-users YAML file (e.g. 'demo-users.yaml'), not true — see demo-users.yaml.example",
      );
    }
    return undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const file = value.trim();
  return file === "" ? undefined : file;
}

export function loadCognitoDemoUsers(file: string): CognitoDemoUser[] {
  const resolvedPath = path.resolve(file);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Cognito demo users file not found: ${resolvedPath} (auth.cognito.createDemoUsers in config.yaml)`);
  }

  let parsed: any;
  try {
    parsed = parseYaml(fs.readFileSync(resolvedPath, "utf8"));
  } catch (error) {
    throw new Error(`Failed to parse Cognito demo users file ${resolvedPath}: ${(error as Error).message}`);
  }

  const users = parsed?.demoUsers;
  if (!Array.isArray(users)) {
    throw new Error(
      `Cognito demo users file ${resolvedPath} must define a top-level 'demoUsers' list (see demo-users.yaml.example)`,
    );
  }

  return users
    .map((user: any) => ({
      username: String(user?.username || "").trim(),
      password: String(user?.password || ""),
      email: String(user?.email || user?.username || "").trim(),
    }))
    .filter((user: CognitoDemoUser) => Boolean(user.username && user.password && user.email));
}

export function serializeCognitoDemoUsers(users: CognitoDemoUser[]): string {
  return JSON.stringify(
    users.map((user) => ({
      Username: user.username,
      Password: user.password,
      Email: user.email,
    })),
  );
}

/**
 * When true, the AuthWiring stack points the Cognito client OAuth redirect
 * URLs at the deployed CloudFront domain at deploy time. Only an explicit
 * false disables it (so checked-in configs get the behaviour by default).
 */
export function shouldAutoWireCognitoRedirectUrls(config: any): boolean {
  return config?.auth?.cognito?.autoWireRedirectUrls !== false;
}

export function getAccessTokenSecret(config: any): string {
  const secret = config?.backend?.environment?.AccessTokenSecret;

  if (secret === undefined || secret === null || String(secret).trim() === "") {
    throw new Error(
      "Missing ACCESS_TOKEN_SECRET: set backend.environment.AccessTokenSecret in config.yaml to a strong random string before deploying (do not commit real secrets).",
    );
  }

  return String(secret);
}

export function buildBackendEnvironment(
  config: any,
  runtimeValues: {
    datastoreImpl: string;
    authenticatorImpl: string;
    cognitoClientId: string;
    cognitoUserPoolId: string;
    featureDoraMetrics: boolean;
    featureLanguageSelector: boolean;
    featureMlForecasts: boolean;
    featurePredictions: boolean;
    featureTemporalCoupling: boolean;
  },
): Record<string, string> {
  return {
    ACCESS_TOKEN_SECRET: getAccessTokenSecret(config),
    ASYNC_QUERY_RESULT_TTL: String(config?.backend?.environment?.asyncQueryResultTtl ?? 3600),
    AUTHENTICATOR_IMPL: runtimeValues.authenticatorImpl,
    COGNITO_CLIENT_ID: runtimeValues.cognitoClientId,
    COGNITO_USER_POOL_ID: runtimeValues.cognitoUserPoolId,
    CONFIG_DIR: "./config",
    CORS_ORIGIN: getPrimaryCorsOrigin(config),
    DATABASE_NAME: getDatastoreTablePrefix(config),
    DATASTORE_IMPL: runtimeValues.datastoreImpl,
    FEATURE_DORA_METRICS: String(runtimeValues.featureDoraMetrics),
    FEATURE_LANGUAGE_SELECTOR: String(runtimeValues.featureLanguageSelector),
    FEATURE_ML_FORECASTS: String(runtimeValues.featureMlForecasts),
    FEATURE_PREDICTIONS: String(runtimeValues.featurePredictions),
    FEATURE_TEMPORAL_COUPLING: String(runtimeValues.featureTemporalCoupling),
    INVOCATION_MODE: config?.backend?.environment?.invocationMode || "serve-api",
    LOOKUP_CACHE_ENABLED: "true",
    SECRET_RESOLVER_IMPL: "secretsmanager",
  };
}
