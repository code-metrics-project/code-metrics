import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps, Tags } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Effect, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { CfnStage, CorsHttpMethod, HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { FunctionUrlAuthType, FunctionUrlCorsOptions } from "aws-cdk-lib/aws-lambda";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { getEnvironment } from "./config";

interface MockStackProps extends StackProps {
  config: any;
}

function hashDirectory(dirPath: string): string {
  const resolvedPath = path.resolve(dirPath);
  const hash = crypto.createHash("sha256");

  function visit(currentPath: string) {
    const entries = fs
      .readdirSync(currentPath, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(resolvedPath, fullPath).split(path.sep).join("/");
      hash.update(relativePath);

      if (entry.isDirectory()) {
        visit(fullPath);
      } else if (entry.isFile()) {
        hash.update(fs.readFileSync(fullPath));
      }
    }
  }

  visit(resolvedPath);
  return hash.digest("hex").slice(0, 16);
}

export class MockStack extends Stack {
  constructor(scope: Construct, id: string, props: MockStackProps) {
    super(scope, id, props);

    const configVersion = hashDirectory(props.config.mocks.lambdaAssetPath);

    Tags.of(this).add("Application", props.config.global.name);
    Tags.of(this).add("Environment", getEnvironment(props.config));

    const lambdaExecutionRole = new Role(this, `${props.config.global.name}-LambdaExecutionRole`, {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      path: "/",
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")],
    });

    lambdaExecutionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
        resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/*`],
      }),
    );

    const mockFunction = new Function(this, `${props.config.global.name}-lambda`, {
      code: Code.fromAsset(props.config.mocks.lambdaAssetPath),
      handler: "bootstrap",
      runtime: Runtime.PROVIDED_AL2023,
      description: `${props.config.global.name} Imposter Go Mock Server`,
      role: lambdaExecutionRole,
      memorySize: props.config.mocks.memorySize ?? 512,
      timeout: Duration.seconds(props.config.mocks.timeout ?? 30),
      environment: {
        IMPOSTER_CONFIG_DIR: "/var/task/config/",
        IMPOSTER_CONFIG_SCAN_RECURSIVE: "true",
        IMPOSTER_SUPPORT_LEGACY_CONFIG: "true",
        IMPOSTER_AUTO_BASE_PATH: "false",
        IMPOSTER_EXTERNAL_PLUGINS: "true",
        IMPOSTER_PLUGIN_DIR: "/var/task/plugins/",
        IMPOSTER_CONFIG_VERSION: configVersion,
      },
    });

    let url: string = "";
    if (Boolean(props.config.mocks.useAPIGW)) {
      const logGroup = new LogGroup(this, "ApiGatewayAccessLogs", {
        retention: RetentionDays.ONE_WEEK,
        removalPolicy: RemovalPolicy.DESTROY,
      });

      const httpApi = new HttpApi(this, `${props.config.global.name}`, {
        description: "API Gateway for the Mocks Lambda function",
        corsPreflight: {
          allowHeaders: ["*"],
          allowMethods: [CorsHttpMethod.ANY],
          allowOrigins: ["*"],
        },
      });

      const lambdaIntegration = new HttpLambdaIntegration("LambdaIntegration", mockFunction);

      httpApi.addRoutes({
        path: "/{proxy+}",
        methods: [HttpMethod.ANY],
        integration: lambdaIntegration,
      });
      if (httpApi.url !== undefined) {
        url = httpApi.url;
      }
      const cfnStage = httpApi.defaultStage?.node.defaultChild as CfnStage;
      cfnStage.accessLogSettings = {
        destinationArn: logGroup.logGroupArn,
        format: JSON.stringify({
          requestId: "$context.requestId",
          ip: "$context.identity.sourceIp",
          requestTime: "$context.requestTime",
          httpMethod: "$context.httpMethod",
          routeKey: "$context.routeKey",
          ctxpath: "$context.path",
          status: "$context.status",
          protocol: "$context.protocol",
          responseLength: "$context.responseLength",
          apimapping: "$context.customDomain.basePathMatched",
          interr: "$context.integration.error",
          lambdastat: "$context.integration.status",
          lambdaIntCode: "$context.integration.integrationStatus",
        }),
      };

      mockFunction.addEnvironment("IMPOSTER_SERVER_URL", httpApi.url ?? "");
    } else {
      let corsOpts: FunctionUrlCorsOptions = {
        allowedOrigins: ["*"],
      };
      const functionUrl = mockFunction.addFunctionUrl({
        authType: FunctionUrlAuthType.NONE,
        cors: corsOpts,
      });
      url = functionUrl.url;
      // IMPOSTER_SERVER_URL is not set here to avoid a circular dependency.
      // The mock scripts resolve the URL from x-forwarded-host / host headers instead.
    }

    new CfnOutput(this, "MockBaseUrl", {
      value: url,
      description: "The URL for mocks",
    });

    new CfnOutput(this, "MockLambdaName", {
      value: mockFunction.functionName,
      description: "Mock Lambda function name",
    });
  }
}
