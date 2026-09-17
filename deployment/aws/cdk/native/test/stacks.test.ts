import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { ApplicationStack } from "../lib/application";
import { AuthStack } from "../lib/auth";
import { BackendStack } from "../lib/backend";
import { DataStoreStack } from "../lib/datastore";
import { FrontendStack } from "../lib/frontend";

const createdDirs: string[] = [];

function createAssetDir(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "native-stack-assets-"));
  createdDirs.push(tempDir);
  fs.writeFileSync(path.join(tempDir, "index.html"), "<html></html>\n");
  return tempDir;
}

function buildFrontendConfig({ loggingEnabled = false } = {}): any {
  return {
    sourcePath: createAssetDir(),
    indexDocument: "index.html",
    s3: {
      autoDeleteObjects: false,
      removalPolicy: "DESTROY",
    },
    cloudfront: {
      useAPIGW: false,
      logging: {
        enabled: loggingEnabled,
        autoDeleteObjects: false,
        removalPolicy: "DESTROY",
        logFilePrefix: "cloudfront-logs/",
        realtime: { enabled: false },
      },
    },
  };
}

function buildConfig(overrides: Record<string, any> = {}) {
  return {
    aws: {},
    global: {
      name: "CodeMetrics",
      environment: "dev",
    },
    frontend: buildFrontendConfig(),
    backend: {
      handler: "index.handler",
      sourcePath: createAssetDir(),
      runtime: "NODEJS_20_X",
      memorySize: 1024,
      timeout: 180,
      features: {},
      environment: {
        AccessTokenSecret: "secret",
        CORSAllowedOrigin: "*",
        invocationMode: "serve-api",
        datastoreImpl: "",
        authenticatorImpl: "",
        CognitoClientId: "",
        CognitoUserPoolId: "",
      },
    },
    datastore: {
      dynamodb: {
        create: true,
        tables: ["alerts", "vcs-cache"],
        tableARN: [],
        partitionKey: { name: "CacheKey", type: "S" },
        arn: "",
        removalPolicy: "DESTROY",
      },
    },
    auth: {
      cognito: {
        create: true,
        createDemoUsers: false,
        removalPolicy: "DESTROY",
        callbackUrls: ["https://myapp.com/home"],
        logoutUrls: ["https://myapp.com/logout"],
      },
    },
    ...overrides,
  };
}

afterAll(() => {
  for (const dir of createdDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("native CDK datastore stack", () => {
  it("names DynamoDB tables from the environment-scoped resource prefix", () => {
    const app = new App();
    const stack = new DataStoreStack(app, "CodeMetrics-dev-Datastore", {
      config: buildConfig(),
      applicationTagValue: "CodeMetrics",
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::DynamoDB::Table", { TableName: "codemetrics-dev_alerts" });
    template.hasResourceProperties("AWS::DynamoDB::Table", { TableName: "codemetrics-dev_vcs-cache" });
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "codemetrics-dev_alerts",
      Tags: Match.arrayWith([
        { Key: "Application", Value: "CodeMetrics" },
        { Key: "Environment", Value: "dev" },
      ]),
    });
  });

  it("keeps an explicit datastore table prefix override", () => {
    const config = buildConfig({
      datastore: {
        dynamodb: {
          create: true,
          tableName: "CustomPrefix",
          tables: ["alerts"],
          tableARN: [],
          partitionKey: { name: "CacheKey", type: "S" },
          arn: "",
          removalPolicy: "DESTROY",
        },
      },
    });
    const app = new App();
    const stack = new DataStoreStack(app, "CodeMetrics-dev-Datastore", {
      config,
      applicationTagValue: "CodeMetrics",
    });

    Template.fromStack(stack).hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "CustomPrefix_alerts",
    });
  });
});

describe("native CDK auth stack", () => {
  it("names the Cognito pool and client with the stack prefix", () => {
    const app = new App();
    const stack = new AuthStack(app, "CodeMetrics-dev-Auth", {
      config: buildConfig(),
      applicationTagValue: "CodeMetrics",
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::Cognito::UserPool", {
      UserPoolName: "CodeMetrics-dev-CognitoPool",
    });
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      ClientName: "CodeMetrics-dev-Client",
    });
    template.hasResourceProperties("AWS::Cognito::UserPool", {
      UserPoolTags: Match.objectLike({ Environment: "dev" }),
    });
  });
});

describe("native CDK application stack", () => {
  it("registers the AppRegistry application under the stack prefix", () => {
    const app = new App();
    const stack = new ApplicationStack(app, "CodeMetrics-dev-AppStack", { config: buildConfig() });

    Template.fromStack(stack).hasResourceProperties("AWS::ServiceCatalogAppRegistry::Application", {
      Name: "CodeMetrics-dev",
    });
  });
});

describe("native CDK backend stack", () => {
  it("scopes Secrets Manager access and DynamoDB tables to the environment", () => {
    const app = new App();
    const stack = new BackendStack(app, "CodeMetrics-dev-Backend", {
      config: buildConfig(),
      applicationTagValue: "CodeMetrics",
      datastoreARNs: ["arn:aws:dynamodb:eu-west-2:123456789012:table/codemetrics-dev_alerts"],
      datastoreKmsARN: "",
      userPoolClientId: "client-id",
      userPoolId: "pool-id",
    });
    const template = Template.fromStack(stack).toJSON();

    const lambdaFunction = Object.values(template.Resources).find(
      (resource: any) => resource.Type === "AWS::Lambda::Function",
    ) as any;
    expect(lambdaFunction.Properties.Environment.Variables.DATABASE_NAME).toBe("codemetrics-dev");

    const policyDocuments = Object.values(template.Resources)
      .filter((resource: any) => resource.Type === "AWS::IAM::Policy")
      .map((resource: any) => resource.Properties.PolicyDocument);
    const policyStatements = JSON.stringify(policyDocuments);

    expect(policyStatements).toContain("secret:CodeMetrics-dev/*");
    expect(policyStatements).not.toContain("secret:CodeMetrics/*");

    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Tags: Match.arrayWith([{ Key: "Environment", Value: "dev" }]),
    });
  });
});

describe("native CDK frontend stack", () => {
  it("derives the frontend bucket name from the environment", () => {
    const app = new App();
    const stack = new FrontendStack(app, "CodeMetrics-dev-Frontend", {
      config: buildConfig(),
      applicationTagValue: "CodeMetrics",
      apiBaseUrl: "https://api.example.com",
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketName: "codemetrics-dev-frontend",
      Tags: Match.arrayWith([{ Key: "Environment", Value: "dev" }]),
    });
    template.resourceCountIs("AWS::S3::Bucket", 1);
  });

  it("honours an explicit frontend bucket name override", () => {
    const frontend = buildFrontendConfig();
    frontend.s3.bucketName = "custom-override-bucket";
    const app = new App();
    const stack = new FrontendStack(app, "CodeMetrics-dev-Frontend", {
      config: buildConfig({ frontend }),
      applicationTagValue: "CodeMetrics",
      apiBaseUrl: "https://api.example.com",
    });

    Template.fromStack(stack).hasResourceProperties("AWS::S3::Bucket", {
      BucketName: "custom-override-bucket",
    });
  });

  it("derives the CloudFront logging bucket name from the environment", () => {
    const app = new App();
    const stack = new FrontendStack(app, "CodeMetrics-dev-Frontend", {
      config: buildConfig({ frontend: buildFrontendConfig({ loggingEnabled: true }) }),
      applicationTagValue: "CodeMetrics",
      apiBaseUrl: "https://api.example.com",
    });
    const template = Template.fromStack(stack);

    template.resourceCountIs("AWS::S3::Bucket", 2);
    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketName: "codemetrics-dev-logging",
    });
  });
});

describe("native CDK environment validation", () => {
  it("fails fast for every stack when global.environment is missing", () => {
    const config: any = buildConfig();
    delete config.global.environment;
    const app = new App();

    expect(() => new ApplicationStack(app, "CodeMetrics-AppStack", { config })).toThrow(
      /Missing environment/,
    );
    expect(
      () =>
        new DataStoreStack(app, "CodeMetrics-Datastore", {
          config,
          applicationTagValue: "CodeMetrics",
        }),
    ).toThrow(/Missing environment/);
    expect(
      () => new AuthStack(app, "CodeMetrics-Auth", { config, applicationTagValue: "CodeMetrics" }),
    ).toThrow(/Missing environment/);
    expect(
      () =>
        new BackendStack(app, "CodeMetrics-Backend", {
          config,
          applicationTagValue: "CodeMetrics",
          datastoreARNs: [],
          datastoreKmsARN: "",
          userPoolClientId: "",
          userPoolId: "",
        }),
    ).toThrow(/Missing environment/);
    expect(
      () =>
        new FrontendStack(app, "CodeMetrics-Frontend", {
          config,
          applicationTagValue: "CodeMetrics",
          apiBaseUrl: "https://api.example.com",
        }),
    ).toThrow(/Missing environment/);
  });

  it("fails fast when the backend access token secret is not set", () => {
    const config: any = buildConfig();
    config.backend.environment.AccessTokenSecret = "";
    const app = new App();

    expect(
      () =>
        new BackendStack(app, "CodeMetrics-Backend-NoSecret", {
          config,
          applicationTagValue: "CodeMetrics",
          datastoreARNs: [],
          datastoreKmsARN: "",
          userPoolClientId: "",
          userPoolId: "",
        }),
    ).toThrow(/Missing ACCESS_TOKEN_SECRET/);
  });
});
