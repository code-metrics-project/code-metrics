import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { AuthStack } from "../lib/auth";

function buildConfig(cognito: Record<string, any> = {}) {
  return {
    aws: {},
    global: { name: "CodeMetrics", environment: "dev" },
    auth: {
      cognito: {
        create: true,
        createDemoUsers: false,
        removalPolicy: "DESTROY",
        callbackUrls: ["https://myapp.com/home"],
        logoutUrls: ["https://myapp.com/logout"],
        ...cognito,
      },
    },
  };
}

function clientProperties(stack: AuthStack): Record<string, any> {
  const template = Template.fromStack(stack).toJSON();
  const client = Object.values(template.Resources).find(
    (resource: any) => resource.Type === "AWS::Cognito::UserPoolClient",
  ) as any;
  return client.Properties;
}

describe("native CDK auth stack redirect URL handling", () => {
  it("leaves the OAuth redirect URLs to the wiring stack by default", () => {
    const app = new App();
    const stack = new AuthStack(app, "CodeMetrics-dev-Auth", {
      config: buildConfig(),
      applicationTagValue: "CodeMetrics",
    });

    const props = clientProperties(stack);

    // No configured URLs may reach the template: the AuthWiring stack owns
    // them at deploy time and a static value here would be reset on redeploy.
    expect(JSON.stringify(props)).not.toContain("myapp.com");
    // The CDK placeholder is deliberate: it is static across deploys, so
    // CloudFormation never clobbers the URLs the wiring stack applied.
    expect(props.CallbackURLs).toEqual(["https://example.com"]);
    expect(props.LogoutURLs).toBeUndefined();
  });

  it("treats an explicit autoWireRedirectUrls true the same as the default", () => {
    const app = new App();
    const stack = new AuthStack(app, "CodeMetrics-dev-Auth", {
      config: buildConfig({ autoWireRedirectUrls: true }),
      applicationTagValue: "CodeMetrics",
    });

    const props = clientProperties(stack);

    expect(JSON.stringify(props)).not.toContain("myapp.com");
    expect(props.CallbackURLs).toEqual(["https://example.com"]);
    expect(props.LogoutURLs).toBeUndefined();
  });

  it("uses the configured redirect URLs when auto-wiring is disabled", () => {
    const app = new App();
    const stack = new AuthStack(app, "CodeMetrics-dev-Auth", {
      config: buildConfig({ autoWireRedirectUrls: false }),
      applicationTagValue: "CodeMetrics",
    });

    const props = clientProperties(stack);

    expect(props.CallbackURLs).toEqual(["https://myapp.com/home"]);
    expect(props.LogoutURLs).toEqual(["https://myapp.com/logout"]);
  });
});

describe("native CDK auth stack demo user seeding", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "cm-auth-demo-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function writeUsersFile(content: string): string {
    const file = join(tempDir, "demo-users.yaml");
    writeFileSync(file, content);
    return file;
  }

  function customResources(stack: AuthStack): Record<string, any> {
    return Template.fromStack(stack).findResources("AWS::CloudFormation::CustomResource");
  }

  function lambdaFunctions(stack: AuthStack): Record<string, any> {
    return Template.fromStack(stack).findResources("AWS::Lambda::Function");
  }

  it("creates no prepopulate resources when seeding is disabled", () => {
    const app = new App();
    const stack = new AuthStack(app, "CodeMetrics-dev-Auth", {
      config: buildConfig({ createDemoUsers: false }),
      applicationTagValue: "CodeMetrics",
    });

    expect(Object.keys(customResources(stack))).toHaveLength(0);
    expect(Object.keys(lambdaFunctions(stack))).toHaveLength(0);
  });

  it("creates the prepopulate Lambda and custom resource from the demo users file", () => {
    const file = writeUsersFile(
      [
        "demoUsers:",
        "  - username: admin@example.com",
        '    password: "Admin123!"',
        "    email: admin@example.com",
      ].join("\n"),
    );

    const app = new App();
    const stack = new AuthStack(app, "CodeMetrics-dev-Auth", {
      config: buildConfig({ createDemoUsers: file }),
      applicationTagValue: "CodeMetrics",
    });

    const custom = customResources(stack);
    expect(Object.keys(custom)).toHaveLength(1);
    const resource = Object.values(custom)[0] as any;
    // The user list is a CloudFormation property (not just Lambda env) so
    // editing the demo users file re-runs the seeding handler on re-deploy.
    expect(resource.Properties.Users).toBe(
      JSON.stringify([{ Username: "admin@example.com", Password: "Admin123!", Email: "admin@example.com" }]),
    );

    const prepopulateFunction = Object.values(lambdaFunctions(stack)).find((fn: any) =>
      String(fn.Properties?.Environment?.Variables?.DEMO_USERS || "").includes("admin@example.com"),
    ) as any;
    expect(prepopulateFunction).toBeDefined();
    expect(prepopulateFunction.Properties.Environment.Variables.DEMO_USERS).toBe(resource.Properties.Users);
  });

  it("rejects the legacy boolean true createDemoUsers value", () => {
    const app = new App();
    expect(
      () =>
        new AuthStack(app, "CodeMetrics-dev-Auth", {
          config: buildConfig({ createDemoUsers: true }),
          applicationTagValue: "CodeMetrics",
        }),
    ).toThrow(/must now be the path to a demo-users YAML file/);
  });

  it("fails fast when the demo users file has no valid users", () => {
    const file = writeUsersFile("demoUsers: []\n");
    const app = new App();
    expect(
      () =>
        new AuthStack(app, "CodeMetrics-dev-Auth", {
          config: buildConfig({ createDemoUsers: file }),
          applicationTagValue: "CodeMetrics",
        }),
    ).toThrow(/no valid demo users were found/);
  });
});
