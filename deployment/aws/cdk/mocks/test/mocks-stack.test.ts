import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { MockStack } from "../lib/mocks-stack";

const repoRoot = path.resolve(__dirname, "..", "..", "..", "..", "..");

function createLambdaAssetDir(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mocks-lambda-"));
  const configDir = path.join(tmpDir, "config");
  fs.mkdirSync(configDir);
  fs.writeFileSync(path.join(tmpDir, "bootstrap"), "mock-binary");
  fs.writeFileSync(path.join(configDir, "github-config.yaml"), "plugin: rest\n");
  return tmpDir;
}

function buildConfig(overrides: Partial<any> = {}) {
  return {
    aws: {
      region: "eu-west-2",
      account: "123456789012",
      ...(overrides.aws ?? {}),
    },
    global: {
      name: "CodeMetricsMock",
      environment: "prod",
      ...(overrides.global ?? {}),
    },
    mocks: {
      lambdaAssetPath: createLambdaAssetDir(),
      useAPIGW: true,
      memorySize: 512,
      timeout: 30,
      ...(overrides.mocks ?? {}),
    },
  };
}

function createTemplate(overrides: Partial<any> = {}) {
  const app = new App();
  const stack = new MockStack(app, "MocksStack", {
    config: buildConfig(overrides),
  });

  return Template.fromStack(stack);
}

describe("mock CDK stack", () => {
  it("creates a lambda-backed HTTP API with the Go custom runtime", () => {
    const template = createTemplate();

    template.resourceCountIs("AWS::ApiGatewayV2::Api", 1);
    template.resourceCountIs("AWS::ApiGatewayV2::Integration", 1);
    template.resourceCountIs("AWS::ApiGatewayV2::Route", 1);

    template.hasResourceProperties("AWS::Lambda::Function", {
      Handler: "bootstrap",
      Runtime: "provided.al2023",
      MemorySize: 512,
      Environment: {
        Variables: {
          IMPOSTER_CONFIG_DIR: "/var/task/config/",
          IMPOSTER_CONFIG_SCAN_RECURSIVE: "true",
          IMPOSTER_SUPPORT_LEGACY_CONFIG: "true",
          IMPOSTER_AUTO_BASE_PATH: "false",
          IMPOSTER_EXTERNAL_PLUGINS: "true",
          IMPOSTER_PLUGIN_DIR: "/var/task/plugins/",
          IMPOSTER_CONFIG_VERSION: Match.anyValue(),
          IMPOSTER_SERVER_URL: Match.anyValue(),
        },
      },
    });

    template.hasOutput("MockBaseUrl", {
      Value: Match.anyValue(),
    });
  });

  it("does not create an S3 bucket for config", () => {
    const template = createTemplate();
    template.resourceCountIs("AWS::S3::Bucket", 0);
  });

  it("tags resources with the configured environment", () => {
    const template = createTemplate({ global: { environment: "dev" } });

    template.hasResourceProperties("AWS::IAM::Role", {
      Tags: Match.arrayWith([
        { Key: "Application", Value: "CodeMetricsMock" },
        { Key: "Environment", Value: "dev" },
      ]),
    });
  });

  it("synthesises the MockBaseUrl output from an environment-scoped stack id", () => {
    const app = new App();
    const stack = new MockStack(app, "CodeMetricsMock-dev", {
      config: buildConfig({ global: { environment: "dev" } }),
    });

    const template = Template.fromStack(stack);
    template.hasOutput("MockBaseUrl", {
      Value: Match.anyValue(),
    });
  });

  it("fails fast when global.environment is missing", () => {
    expect(() => createTemplate({ global: { environment: undefined } })).toThrow(/Missing environment/);
  });

  it("fails fast when global.environment is not a valid slug", () => {
    expect(() => createTemplate({ global: { environment: "Dev Env!" } })).toThrow(/Invalid environment/);
  });

  it("creates a lambda function URL instead of API Gateway when disabled", () => {
    const template = createTemplate({
      mocks: {
        useAPIGW: false,
      },
    });

    template.resourceCountIs("AWS::ApiGatewayV2::Api", 0);
    template.resourceCountIs("AWS::Lambda::Url", 1);
    template.hasResourceProperties("AWS::Lambda::Url", {
      AuthType: "NONE",
      Cors: {
        AllowOrigins: ["*"],
      },
    });
  });

  it("sets IMPOSTER_SERVER_URL when using API Gateway", () => {
    const template = createTemplate({ mocks: { useAPIGW: true } });

    template.hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          IMPOSTER_SERVER_URL: Match.anyValue(),
        },
      },
    });
  });

  it("does not set IMPOSTER_SERVER_URL for function URL mode to avoid circular dependency", () => {
    const template = createTemplate({ mocks: { useAPIGW: false } });

    template.hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          IMPOSTER_SERVER_URL: Match.absent(),
        },
      },
    });
  });

  it("uses custom memory and timeout from config", () => {
    const template = createTemplate({
      mocks: {
        memorySize: 1024,
        timeout: 60,
      },
    });

    template.hasResourceProperties("AWS::Lambda::Function", {
      MemorySize: 1024,
      Timeout: 60,
    });
  });

  it("scopes Lambda log IAM to the stack account and region tokens", () => {
    const template = createTemplate({
      aws: {
        region: "",
        account: "",
      },
    });

    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
            Resource: {
              "Fn::Join": [
                "",
                ["arn:aws:logs:", { Ref: "AWS::Region" }, ":", { Ref: "AWS::AccountId" }, ":log-group:/aws/lambda/*"],
              ],
            },
          }),
        ]),
      },
    });
  });

  it("changes the config version when lambda asset contents change", () => {
    const firstAssetDir = createLambdaAssetDir();
    const secondAssetDir = createLambdaAssetDir();
    fs.writeFileSync(
      path.join(secondAssetDir, "config", "extra.yaml"),
      "plugin: rest\nresources:\n  - path: /example\n",
    );

    const firstTemplate = createTemplate({
      mocks: { lambdaAssetPath: firstAssetDir },
    }).toJSON();

    const secondTemplate = createTemplate({
      mocks: { lambdaAssetPath: secondAssetDir },
    }).toJSON();

    const findFunction = (tpl: any) =>
      Object.values(tpl.Resources).find(
        (resource: any) => resource.Type === "AWS::Lambda::Function" && resource.Properties?.Handler === "bootstrap",
      ) as any;

    expect(findFunction(firstTemplate).Properties.Environment.Variables.IMPOSTER_CONFIG_VERSION).not.toEqual(
      findFunction(secondTemplate).Properties.Environment.Variables.IMPOSTER_CONFIG_VERSION,
    );

    fs.rmSync(firstAssetDir, { recursive: true, force: true });
    fs.rmSync(secondAssetDir, { recursive: true, force: true });
  });

  it("fails fast when the lambda asset directory does not exist", () => {
    expect(() =>
      createTemplate({
        mocks: {
          lambdaAssetPath: path.join(repoRoot, "missing-lambda-directory"),
        },
      }),
    ).toThrow();
  });
});
