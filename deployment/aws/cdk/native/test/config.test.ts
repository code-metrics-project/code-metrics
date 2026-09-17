import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { parse } from "yaml";
import {
  applyEnvironmentOverride,
  buildBackendEnvironment,
  buildFrontendWebConfig,
  getAccessTokenSecret,
  getCognitoDemoUsersFile,
  getConfiguredCorsOrigins,
  getDatastoreTablePrefix,
  getEnvironment,
  getResourcePrefix,
  getStackEnv,
  getStackPrefix,
  loadCognitoDemoUsers,
  normalizeBaseUrl,
  serializeCognitoDemoUsers,
  shouldApplyAwsApplicationTag,
  shouldAutoWireCognitoRedirectUrls,
} from "../lib/config";

describe("native CDK config helpers", () => {
  it("returns stack env only when account or region is configured", () => {
    expect(getStackEnv({ aws: {} })).toBeUndefined();
    expect(getStackEnv({ aws: { account: "123456789012", region: "eu-west-2" } })).toEqual({
      account: "123456789012",
      region: "eu-west-2",
    });
  });

  it("uses the configured DynamoDB table prefix", () => {
    expect(getDatastoreTablePrefix({ datastore: { dynamodb: { tableName: "DemoMetrics" } } })).toBe("DemoMetrics");
  });

  it("falls back to the environment-scoped resource prefix when no table prefix is configured", () => {
    expect(getDatastoreTablePrefix({ global: { name: "CodeMetrics", environment: "dev" } })).toBe("codemetrics-dev");
    expect(getDatastoreTablePrefix({ global: { name: "CodeMetrics", environment: "prod" } })).toBe("codemetrics-prod");
  });

  it("rejects a missing environment when deriving the table prefix", () => {
    expect(() => getDatastoreTablePrefix({ global: { name: "CodeMetrics" } })).toThrow(/Missing environment/);
  });

  it("reads and normalises the environment slug", () => {
    expect(getEnvironment({ global: { environment: "prod" } })).toBe("prod");
    expect(getEnvironment({ global: { environment: "  Dev " } })).toBe("dev");
    expect(getEnvironment({ global: { environment: "Demo-EU" } })).toBe("demo-eu");
    expect(getEnvironment({ global: { environment: "PROD" } }, "dev")).toBe("dev");
  });

  it("rejects a missing environment value", () => {
    expect(() => getEnvironment({ global: { name: "CodeMetrics" } })).toThrow(/Missing environment/);
    expect(() => getEnvironment({ global: {} })).toThrow(/Missing environment/);
    expect(() => getEnvironment({})).toThrow(/Missing environment/);
    expect(() => getEnvironment({ global: { environment: "   " } })).toThrow(/Missing environment/);
  });

  it("rejects invalid environment slugs", () => {
    for (const invalid of ["prod_prod", "prod-", "-prod", "prod.", "prod!", "prod upper"]) {
      expect(() => getEnvironment({ global: { environment: invalid } })).toThrow(/Invalid environment/);
    }
  });

  it("derives stack and resource prefixes from name and environment", () => {
    const config = { global: { name: "CodeMetrics", environment: "dev" } };

    expect(getStackPrefix(config)).toBe("CodeMetrics-dev");
    expect(getResourcePrefix(config)).toBe("codemetrics-dev");
    expect(getStackPrefix({ global: { name: "CodeMetrics", environment: "prod" } })).toBe("CodeMetrics-prod");
    expect(getResourcePrefix({ global: { name: "CodeMetrics", environment: "prod" } })).toBe("codemetrics-prod");
  });

  it("rejects a missing global name when deriving the stack prefix", () => {
    expect(() => getStackPrefix({ global: { environment: "dev" } })).toThrow(/global\.name/);
  });

  it("rejects resource prefixes that are too long for S3 bucket names", () => {
    const longName = "a".repeat(70);
    expect(() => getResourcePrefix({ global: { name: longName, environment: "dev" } })).toThrow(
      /exceeds 63 characters/,
    );
  });

  it("applies the environment override onto the config", () => {
    const originalEnv = process.env.CODEMETRICS_ENV;
    delete process.env.CODEMETRICS_ENV;

    try {
      const config: any = { global: { name: "CodeMetrics" } };

      applyEnvironmentOverride(config, "dev");
      expect(config.global.environment).toBe("dev");
      expect(getStackPrefix(config)).toBe("CodeMetrics-dev");

      const nameless: any = {};
      applyEnvironmentOverride(nameless, "prod");
      expect(nameless.global.environment).toBe("prod");

      const untouched: any = { global: { name: "CodeMetrics" } };
      applyEnvironmentOverride(untouched, undefined);
      expect(untouched.global.environment).toBeUndefined();
      applyEnvironmentOverride(untouched, "   ");
      expect(untouched.global.environment).toBeUndefined();

      process.env.CODEMETRICS_ENV = "staging";
      const fromEnv: any = { global: { name: "CodeMetrics", environment: "prod" } };
      applyEnvironmentOverride(fromEnv, undefined);
      expect(fromEnv.global.environment).toBe("staging");
    } finally {
      if (originalEnv === undefined) {
        delete process.env.CODEMETRICS_ENV;
      } else {
        process.env.CODEMETRICS_ENV = originalEnv;
      }
    }
  });

  it("normalizes configured CORS origins", () => {
    expect(getConfiguredCorsOrigins({ backend: { environment: { CORSAllowedOrigin: "*" } } })).toEqual(["*"]);
    expect(
      getConfiguredCorsOrigins({
        backend: { environment: { CORS_ORIGIN: "https://demo.example.com, https://app.example.com" } },
      }),
    ).toEqual(["https://demo.example.com", "https://app.example.com"]);
  });

  it("builds frontend web config for demo auth", () => {
    expect(
      buildFrontendWebConfig(
        {
          auth: { cognito: { create: true } },
          frontend: { auth: { provided: { user: "demo@example.com", pass: "Secret123!" } } },
        },
        "https://api.example.com/",
      ),
    ).toEqual({
      apiBaseUrl: "https://api.example.com",
      auth: {
        required: true,
        provided: {
          user: "demo@example.com",
          pass: "Secret123!",
        },
      },
    });
  });

  it("builds backend environment using current backend config keys", () => {
    expect(
      buildBackendEnvironment(
        {
          backend: {
            environment: {
              AccessTokenSecret: "access-token-secret",
              CORSAllowedOrigin: "https://demo.example.com",
              invocationMode: "serve-api",
            },
          },
          datastore: {
            dynamodb: {
              tableName: "DemoMetrics",
            },
          },
        },
        {
          datastoreImpl: "dynamodb",
          authenticatorImpl: "cognito",
          cognitoClientId: "client-id",
          cognitoUserPoolId: "pool-id",
          featureDoraMetrics: true,
          featureLanguageSelector: true,
          featureMlForecasts: true,
          featurePredictions: true,
          featureTemporalCoupling: true,
        },
      ),
    ).toEqual({
      ACCESS_TOKEN_SECRET: "access-token-secret",
      ASYNC_QUERY_RESULT_TTL: "3600",
      AUTHENTICATOR_IMPL: "cognito",
      COGNITO_CLIENT_ID: "client-id",
      COGNITO_USER_POOL_ID: "pool-id",
      CONFIG_DIR: "./config",
      CORS_ORIGIN: "https://demo.example.com",
      DATABASE_NAME: "DemoMetrics",
      DATASTORE_IMPL: "dynamodb",
      FEATURE_DORA_METRICS: "true",
      FEATURE_LANGUAGE_SELECTOR: "true",
      FEATURE_ML_FORECASTS: "true",
      FEATURE_PREDICTIONS: "true",
      FEATURE_TEMPORAL_COUPLING: "true",
      INVOCATION_MODE: "serve-api",
      LOOKUP_CACHE_ENABLED: "true",
      SECRET_RESOLVER_IMPL: "secretsmanager",
    });
  });

  it("uses the configured async query result TTL in the backend environment", () => {
    const runtimeValues = {
      datastoreImpl: "dynamodb",
      authenticatorImpl: "cognito",
      cognitoClientId: "client-id",
      cognitoUserPoolId: "pool-id",
      featureDoraMetrics: true,
      featureLanguageSelector: true,
      featureMlForecasts: true,
      featurePredictions: true,
      featureTemporalCoupling: true,
    };

    expect(
      buildBackendEnvironment(
        {
          backend: {
            environment: {
              AccessTokenSecret: "access-token-secret",
              asyncQueryResultTtl: 7200,
            },
          },
          datastore: {
            dynamodb: {
              tableName: "DemoMetrics",
            },
          },
        },
        runtimeValues,
      ),
    ).toMatchObject({
      ASYNC_QUERY_RESULT_TTL: "7200",
    });
  });

  it("returns the configured access token secret", () => {
    expect(getAccessTokenSecret({ backend: { environment: { AccessTokenSecret: "s3cret" } } })).toBe("s3cret");
  });

  it.each([
    ["missing backend config", {}],
    ["missing environment key", { backend: {} }],
    ["missing AccessTokenSecret", { backend: { environment: {} } }],
    ["empty AccessTokenSecret", { backend: { environment: { AccessTokenSecret: "" } } }],
    ["blank AccessTokenSecret", { backend: { environment: { AccessTokenSecret: "   " } } }],
  ])("fails fast with %s", (_label, config) => {
    expect(() => getAccessTokenSecret(config)).toThrow(/Missing ACCESS_TOKEN_SECRET/);
  });

  it("fails fast in buildBackendEnvironment when AccessTokenSecret is not set", () => {
    expect(() =>
      buildBackendEnvironment(
        { backend: { environment: { AccessTokenSecret: "" } }, datastore: {} },
        {
          datastoreImpl: "dynamodb",
          authenticatorImpl: "cognito",
          cognitoClientId: "client-id",
          cognitoUserPoolId: "pool-id",
          featureDoraMetrics: true,
          featureLanguageSelector: true,
          featureMlForecasts: true,
          featurePredictions: true,
          featureTemporalCoupling: true,
        },
      ),
    ).toThrow(/Missing ACCESS_TOKEN_SECRET/);
  });

  it("normalizes API base URLs for generated frontend config", () => {
    expect(normalizeBaseUrl("https://api.example.com///")).toBe("https://api.example.com");
  });

  it("auto-wires Cognito redirect URLs unless explicitly disabled", () => {
    expect(shouldAutoWireCognitoRedirectUrls(undefined)).toBe(true);
    expect(shouldAutoWireCognitoRedirectUrls({ auth: { cognito: {} } })).toBe(true);
    expect(shouldAutoWireCognitoRedirectUrls({ auth: { cognito: { autoWireRedirectUrls: true } } })).toBe(true);
    expect(shouldAutoWireCognitoRedirectUrls({ auth: { cognito: { autoWireRedirectUrls: false } } })).toBe(false);
  });

  it("does not apply the AppRegistry application tag as a generic resource tag", () => {
    expect(
      shouldApplyAwsApplicationTag(
        "arn:aws:resource-groups:eu-west-2:926960811297:group/CodeMetrics/0b18vfu9ah9fok7mahia65de5h",
      ),
    ).toBe(false);
  });

  it("includes the GitHub issue and commit link datastores in the native demo config", () => {
    const configPath = join(__dirname, "..", "config.yaml");
    const config = parse(readFileSync(configPath, "utf8"));
    const tables = config.datastore.dynamodb.tables;

    expect(tables).toEqual([
      "alerts",
      "ado-issues-by-date",
      "asyncQueryResults",
      "commit-file-changes-by-day",
      "commit-prs",
      "deploy-bounds",
      "dynatrace-events",
      "earliest-commits",
      "fetch-file",
      "fetch-merge-rules",
      "github-issues",
      "issues",
      "pipeline-executions",
      "pipelines-job-names",
      "prs-by-day",
      "queries",
      "repo-changes",
      "repo-commits",
      "token_ids",
      "vcs-cache",
      "vulns",
    ]);
  });

  it("keeps Cognito demo users out of the checked-in CDK config", () => {
    const configPath = join(__dirname, "..", "config.yaml");
    const config = parse(readFileSync(configPath, "utf8"));

    // Seeding points at a git-ignored file so demo credentials never land in
    // the repo; demo-users.yaml.example documents the format instead.
    expect(getCognitoDemoUsersFile(config)).toBe("demo-users.yaml");
    const gitignore = readFileSync(join(__dirname, "..", ".gitignore"), "utf8");
    expect(gitignore).toMatch(/^demo-users\.yaml$/m);
    const example = parse(readFileSync(join(__dirname, "..", "demo-users.yaml.example"), "utf8"));
    expect(Array.isArray(example.demoUsers)).toBe(true);

    expect(config.frontend?.auth?.provided).toBeUndefined();
    expect(String(config.backend.environment.AccessTokenSecret).trim()).not.toBe("");
    expect(config.backend.memorySize).toBe(1024);
    expect(config.backend.timeout).toBe(180);
  });

  describe("Cognito demo users file helpers", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), "cm-demo-users-"));
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    function writeUsersFile(name: string, content: string): string {
      const file = join(tempDir, name);
      writeFileSync(file, content);
      return file;
    }

    it("resolves a non-blank createDemoUsers string as the users file path", () => {
      expect(getCognitoDemoUsersFile({ auth: { cognito: { createDemoUsers: "demo-users.yaml" } } })).toBe(
        "demo-users.yaml",
      );
      expect(getCognitoDemoUsersFile({ auth: { cognito: { createDemoUsers: "  my-users.yaml " } } })).toBe(
        "my-users.yaml",
      );
    });

    it("treats unset, blank, and false createDemoUsers values as seeding disabled", () => {
      expect(getCognitoDemoUsersFile({ auth: { cognito: {} } })).toBeUndefined();
      expect(getCognitoDemoUsersFile({ auth: { cognito: { createDemoUsers: "" } } })).toBeUndefined();
      expect(getCognitoDemoUsersFile({ auth: { cognito: { createDemoUsers: "   " } } })).toBeUndefined();
      expect(getCognitoDemoUsersFile({ auth: { cognito: { createDemoUsers: false } } })).toBeUndefined();
    });

    it("rejects the legacy boolean true createDemoUsers value", () => {
      expect(() => getCognitoDemoUsersFile({ auth: { cognito: { createDemoUsers: true } } })).toThrow(
        /must now be the path to a demo-users YAML file/,
      );
    });

    it("loads demo users from a YAML file with a top-level demoUsers list", () => {
      const file = writeUsersFile(
        "demo-users.yaml",
        [
          "demoUsers:",
          "  - username: admin@example.com",
          '    password: "Admin123!"',
          "    email: admin@example.com",
          "  - username: dev@example.com",
          '    password: "Devel123!"',
        ].join("\n"),
      );

      const users = loadCognitoDemoUsers(file);

      expect(users).toEqual([
        { username: "admin@example.com", password: "Admin123!", email: "admin@example.com" },
        // A missing email falls back to the username.
        { username: "dev@example.com", password: "Devel123!", email: "dev@example.com" },
      ]);
      expect(JSON.parse(serializeCognitoDemoUsers(users))).toEqual([
        { Username: "admin@example.com", Password: "Admin123!", Email: "admin@example.com" },
        { Username: "dev@example.com", Password: "Devel123!", Email: "dev@example.com" },
      ]);
    });

    it("drops incomplete demo user entries", () => {
      const file = writeUsersFile(
        "demo-users.yaml",
        [
          "demoUsers:",
          "  - username: ok@example.com",
          '    password: "Secret123!"',
          "    email: ok@example.com",
          "  - username: missing-password@example.com",
          "    email: missing-password@example.com",
        ].join("\n"),
      );

      expect(loadCognitoDemoUsers(file)).toEqual([
        { username: "ok@example.com", password: "Secret123!", email: "ok@example.com" },
      ]);
    });

    it("fails fast when the demo users file does not exist", () => {
      expect(() => loadCognitoDemoUsers(join(tempDir, "missing.yaml"))).toThrow(/Cognito demo users file not found/);
    });

    it("fails fast when the demo users file has no top-level demoUsers list", () => {
      const file = writeUsersFile("demo-users.yaml", "users: []\n");
      expect(() => loadCognitoDemoUsers(file)).toThrow(/must define a top-level 'demoUsers' list/);
    });

    it("fails fast when the demo users file is not valid YAML", () => {
      const file = writeUsersFile("demo-users.yaml", "demoUsers: [unclosed\n");
      expect(() => loadCognitoDemoUsers(file)).toThrow(/Failed to parse Cognito demo users file/);
    });
  });
});
