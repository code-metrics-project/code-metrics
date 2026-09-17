import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { AuthWiringStack } from "../lib/authWiring";

let lambdaCodeDir: string;

beforeAll(() => {
  lambdaCodeDir = fs.mkdtempSync(path.join(os.tmpdir(), "auth-wiring-code-"));
  fs.writeFileSync(path.join(lambdaCodeDir, "index.js"), "exports.handler = async () => ({});\n");
});

afterAll(() => {
  fs.rmSync(lambdaCodeDir, { recursive: true, force: true });
});

function buildStack(): AuthWiringStack {
  const app = new App();
  return new AuthWiringStack(app, "CodeMetrics-dev-AuthWiring", {
    env: { account: "123456789012", region: "eu-west-2" },
    applicationTagValue: "CodeMetrics",
    config: {
      aws: {},
      global: { name: "CodeMetrics", environment: "dev" },
      auth: { cognito: {} },
    },
    userPoolId: "eu-west-2_pool",
    userPoolClientId: "client-123",
    frontendDomain: "d1b0uhy3s30pui.cloudfront.net",
    lambdaCodePath: lambdaCodeDir,
  });
}

// Both the wiring Lambda and the Provider framework Lambda use the
// "index.handler" entry point, so disambiguate on the wiring timeout.
function findWiringFunction(stack: AuthWiringStack): any {
  const template = Template.fromStack(stack).toJSON();
  const functionResource = Object.values(template.Resources).find(
    (resource: any) =>
      resource.Type === "AWS::Lambda::Function" &&
      resource.Properties.Handler === "index.handler" &&
      resource.Properties.Timeout === 60,
  );
  if (!functionResource) {
    throw new Error("wiring Lambda function not found in template");
  }
  return functionResource as any;
}

describe("native CDK auth wiring stack", () => {
  it("creates the wiring Lambda, provider and custom resource", () => {
    const stack = buildStack();
    const template = Template.fromStack(stack);

    // The wiring Lambda plus the provider framework Lambda.
    template.resourceCountIs("AWS::Lambda::Function", 2);
    template.resourceCountIs("AWS::CloudFormation::CustomResource", 1);

    template.hasResourceProperties("AWS::Lambda::Function", {
      Handler: "index.handler",
      Runtime: "nodejs20.x",
      Timeout: 60,
      Code: Match.objectLike({ S3Bucket: Match.anyValue(), S3Key: Match.anyValue() }),
    });

    template.hasResourceProperties("AWS::CloudFormation::CustomResource", {
      ServiceToken: Match.objectLike({ "Fn::GetAtt": Match.anyValue() }),
    });
  });

  it("carries the desired redirect URLs as custom resource properties", () => {
    const template = Template.fromStack(buildStack());

    template.hasResourceProperties("AWS::CloudFormation::CustomResource", {
      UserPoolId: "eu-west-2_pool",
      UserPoolClientId: "client-123",
      CallbackUrls: ["https://d1b0uhy3s30pui.cloudfront.net/login/callback"],
      LogoutUrls: ["https://d1b0uhy3s30pui.cloudfront.net/logout"],
    });
  });

  it("scopes the Lambda role to the target Cognito user pool only", () => {
    const stack = buildStack();
    const template = Template.fromStack(stack);
    // Client actions are evaluated by Cognito against the user pool ARN (not the
    // /client/<id> child ARN), so the grant must be scoped to the pool.
    const userPoolArn = stack.resolve(
      `arn:${stack.partition}:cognito-idp:${stack.region}:${stack.account}:userpool/eu-west-2_pool`,
    );

    const policyDocuments = Object.values(template.findResources("AWS::IAM::Policy"))
      .map((policy: any) => policy.Properties.PolicyDocument)
      .filter((doc: any) => JSON.stringify(doc).includes("cognito-idp:DescribeUserPoolClient"));

    expect(policyDocuments).toHaveLength(1);
    const statement = policyDocuments[0].Statement.find(
      (entry: any) => Array.isArray(entry.Action) && entry.Action.includes("cognito-idp:UpdateUserPoolClient"),
    );
    // A single-element token array collapses to the bare resolved value.
    expect(statement).toEqual({
      Action: ["cognito-idp:DescribeUserPoolClient", "cognito-idp:UpdateUserPoolClient"],
      Effect: "Allow",
      Resource: userPoolArn,
    });
  });

  it("tags the wiring Lambda with the application and environment", () => {
    const functionResource = findWiringFunction(buildStack());

    expect(functionResource.Properties.Tags).toEqual(
      expect.arrayContaining([
        { Key: "Application", Value: "CodeMetrics" },
        { Key: "Environment", Value: "dev" },
      ]),
    );
  });

  it("destroys the wiring Lambda when the stack is deleted", () => {
    const functionResource = findWiringFunction(buildStack());

    expect(functionResource.DeletionPolicy).toBe("Delete");
  });
});
