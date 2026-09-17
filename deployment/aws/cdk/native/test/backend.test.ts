import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { BackendStack, syncBundledBackendConfig } from "../lib/backend";

function buildBackendAsyncConfig(backendSourcePath: string): any {
  return {
    global: { name: "CodeMetrics", environment: "dev" },
    backend: {
      sourcePath: backendSourcePath,
      handler: "index.handler",
      runtime: "NODEJS_20_X",
      timeout: 180,
      environment: {
        datastoreImpl: "",
        authenticatorImpl: "",
        AccessTokenSecret: "secret",
        CORSAllowedOrigin: "*",
        invocationMode: "serve-api",
        asyncQueryResultTtl: 3600,
      },
      features: {},
    },
    datastore: {
      dynamodb: {
        create: true,
        tableName: "CodeMetrics",
      },
    },
    auth: {
      cognito: {
        create: false,
      },
    },
    frontend: {
      cloudfront: {
        useAPIGW: false,
      },
    },
  };
}

describe("native backend asset sync", () => {
  it("copies staged api config into the bundled backend config directory", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "native-backend-sync-"));
    const backendSourcePath = path.join(tempRoot, "dist", "codemetrics-api");
    const bundledConfigPath = path.join(backendSourcePath, "config");
    const stagedConfigPath = path.join(tempRoot, "dist", "config", "api");

    fs.mkdirSync(bundledConfigPath, { recursive: true });
    fs.mkdirSync(stagedConfigPath, { recursive: true });

    fs.writeFileSync(path.join(bundledConfigPath, "workload-config.yaml"), "workloads:\n  - id: athena\n");
    fs.writeFileSync(path.join(stagedConfigPath, "workload-config.yaml"), "workloads:\n  - id: gaia\n");
    fs.writeFileSync(path.join(stagedConfigPath, "remote-config.yaml"), "ticketManagement: {}\n");

    syncBundledBackendConfig(backendSourcePath);

    expect(fs.readFileSync(path.join(bundledConfigPath, "workload-config.yaml"), "utf8")).toContain("id: gaia");
    expect(fs.readFileSync(path.join(bundledConfigPath, "remote-config.yaml"), "utf8")).toContain(
      "ticketManagement: {}",
    );

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("does nothing when the staged api config directory is absent", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "native-backend-sync-missing-"));
    const backendSourcePath = path.join(tempRoot, "dist", "codemetrics-api");
    const bundledConfigPath = path.join(backendSourcePath, "config");

    fs.mkdirSync(bundledConfigPath, { recursive: true });
    fs.writeFileSync(path.join(bundledConfigPath, "workload-config.yaml"), "workloads:\n  - id: gaia\n");

    syncBundledBackendConfig(backendSourcePath);

    expect(fs.readFileSync(path.join(bundledConfigPath, "workload-config.yaml"), "utf8")).toContain("id: gaia");

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
});

describe("native backend IAM", () => {
  it("grants ListTables so the admin datastore screen can enumerate DynamoDB tables", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "native-backend-stack-"));
    const backendSourcePath = path.join(tempRoot, "dist", "codemetrics-api");

    fs.mkdirSync(path.join(backendSourcePath, "config"), { recursive: true });
    fs.writeFileSync(
      path.join(backendSourcePath, "index.js"),
      "exports.handler = async () => ({ statusCode: 200, body: 'ok' });\n",
    );

    const app = new App();
    const stack = new BackendStack(app, "CodeMetrics-Backend-Test", {
      config: {
        global: { name: "CodeMetrics", environment: "dev" },
        backend: {
          sourcePath: backendSourcePath,
          handler: "index.handler",
          runtime: "NODEJS_20_X",
          environment: {
            datastoreImpl: "",
            authenticatorImpl: "",
            AccessTokenSecret: "secret",
            CORSAllowedOrigin: "*",
            invocationMode: "serve-api",
          },
          features: {},
        },
        datastore: {
          dynamodb: {
            create: true,
            tableName: "CodeMetrics",
          },
        },
        auth: {
          cognito: {
            create: false,
          },
        },
        frontend: {
          cloudfront: {
            useAPIGW: false,
          },
        },
      },
      applicationTagValue: "CodeMetrics",
      datastoreARNs: ["arn:aws:dynamodb:eu-west-2:123456789012:table/CodeMetrics_vcs-cache"],
      datastoreKmsARN: "",
      userPoolClientId: "",
      userPoolId: "",
    });

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: "dynamodb:ListTables",
            Effect: "Allow",
            Resource: "*",
          }),
        ]),
      },
    });

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("uses backend memorySize and timeout from config", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "native-backend-sizing-"));
    const backendSourcePath = path.join(tempRoot, "dist", "codemetrics-api");

    fs.mkdirSync(path.join(backendSourcePath, "config"), { recursive: true });
    fs.writeFileSync(
      path.join(backendSourcePath, "index.js"),
      "exports.handler = async () => ({ statusCode: 200, body: 'ok' });\n",
    );

    const app = new App();
    const stack = new BackendStack(app, "CodeMetrics-Backend-Sizing-Test", {
      config: {
        global: { name: "CodeMetrics", environment: "dev" },
        backend: {
          sourcePath: backendSourcePath,
          handler: "index.handler",
          runtime: "NODEJS_20_X",
          memorySize: 2048,
          timeout: 60,
          environment: {
            datastoreImpl: "",
            authenticatorImpl: "",
            AccessTokenSecret: "secret",
            CORSAllowedOrigin: "*",
            invocationMode: "serve-api",
          },
          features: {},
        },
        datastore: {
          dynamodb: {
            create: false,
          },
        },
        auth: {
          cognito: {
            create: false,
          },
        },
        frontend: {
          cloudfront: {
            useAPIGW: false,
          },
        },
      },
      applicationTagValue: "CodeMetrics",
      datastoreARNs: [],
      datastoreKmsARN: "",
      userPoolClientId: "",
      userPoolId: "",
    });

    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      MemorySize: 2048,
      Timeout: 60,
    });

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
});

describe("native backend async query wiring", () => {
  it("creates an SQS queue and a dedicated execute-query Lambda wired to it", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "native-backend-async-"));
    const backendSourcePath = path.join(tempRoot, "dist", "codemetrics-api");

    fs.mkdirSync(path.join(backendSourcePath, "config"), { recursive: true });
    fs.writeFileSync(
      path.join(backendSourcePath, "index.js"),
      "exports.handler = async () => ({ statusCode: 200, body: 'ok' });\n",
    );

    const app = new App();
    const stack = new BackendStack(app, "CodeMetrics-Backend-Async-Test", {
      config: buildBackendAsyncConfig(backendSourcePath),
      applicationTagValue: "CodeMetrics",
      datastoreARNs: [
        "arn:aws:dynamodb:eu-west-2:123456789012:table/CodeMetrics_vcs-cache",
        "arn:aws:dynamodb:eu-west-2:123456789012:table/CodeMetrics_asyncQueryResults",
      ],
      datastoreKmsARN: "",
      userPoolClientId: "",
      userPoolId: "",
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::SQS::Queue", {
      VisibilityTimeout: 180,
      MessageRetentionPeriod: 86400,
    });

    template.hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: Match.objectLike({
          INVOCATION_MODE: "execute-query",
          ASYNC_QUERY_RESULT_TTL: "3600",
        }),
      },
    });

    const templateJson = template.toJSON();
    const resourceEntries = Object.entries(templateJson.Resources) as [string, any][];
    const [queueLogicalId] = resourceEntries.find(([, resource]) => resource.Type === "AWS::SQS::Queue")!;
    const [queryLogicalId, queryFunction] = resourceEntries.find(
      ([, resource]) =>
        resource.Type === "AWS::Lambda::Function" &&
        resource.Properties.Environment?.Variables?.INVOCATION_MODE === "execute-query",
    )!;
    const [, apiFunction] = resourceEntries.find(
      ([, resource]) =>
        resource.Type === "AWS::Lambda::Function" &&
        resource.Properties.Environment?.Variables?.INVOCATION_MODE === "serve-api",
    )!;
    expect(queryFunction).toBeDefined();
    expect(apiFunction).toBeDefined();
    expect(queryFunction.Properties.Environment.Variables.ASYNC_QUERY_QUEUE_URL).toBeUndefined();

    // Ref of an SQS queue resource resolves to the queue URL
    expect(apiFunction.Properties.Environment.Variables.ASYNC_QUERY_QUEUE_URL).toEqual({
      Ref: queueLogicalId,
    });

    const [, mapping] = resourceEntries.find(([, resource]) => resource.Type === "AWS::Lambda::EventSourceMapping")!;
    expect(mapping.Properties.EventSourceArn).toEqual({ "Fn::GetAtt": [queueLogicalId, "Arn"] });
    // Ref of a Lambda function resource resolves to the function ARN
    expect(mapping.Properties.FunctionName).toEqual({ Ref: queryLogicalId });

    const policyStatements = JSON.stringify(
      Object.values(templateJson.Resources)
        .filter((resource: any) => resource.Type === "AWS::IAM::Policy")
        .map((resource: any) => resource.Properties.PolicyDocument),
    );
    expect(policyStatements).toContain("sqs:SendMessage");
    expect(policyStatements).toContain("sqs:ReceiveMessage");
    expect(policyStatements).toContain("arn:aws:dynamodb:eu-west-2:123456789012:table/CodeMetrics_asyncQueryResults");

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
});
