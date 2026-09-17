import * as fs from "fs";
import * as path from "path";
import { CfnOutput, Duration, Stack, StackProps, Tags } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Code, Function, FunctionUrlAuthType, HttpMethod as FunctionUrlHttpMethod } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Effect, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { CorsHttpMethod, HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import {
  addEnvironmentTags,
  buildBackendEnvironment,
  getConfiguredCorsOrigins,
  getStackPrefix,
  shouldApplyAwsApplicationTag,
} from "./config";
import { getLambdaRuntime } from "./utils";

export const syncBundledBackendConfig = (backendSourcePath: string): void => {
  const bundledConfigPath = path.resolve(backendSourcePath, "config");
  const stagedConfigPath = path.resolve(backendSourcePath, "..", "config", "api");

  if (!fs.existsSync(stagedConfigPath) || !fs.statSync(stagedConfigPath).isDirectory()) {
    return;
  }

  fs.mkdirSync(bundledConfigPath, { recursive: true });

  for (const entry of fs.readdirSync(stagedConfigPath, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue;
    }

    fs.copyFileSync(path.join(stagedConfigPath, entry.name), path.join(bundledConfigPath, entry.name));
  }
};

interface BackendStackProps extends StackProps {
  applicationTagValue: string;
  config: any;
  userPoolClientId: string;
  userPoolId: string;
  datastoreARNs: string[];
  datastoreKmsARN: string;
}

export class BackendStack extends Stack {
  public readonly functionARN: string;
  public readonly ApiURL: string | undefined;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    if (shouldApplyAwsApplicationTag(props.applicationTagValue)) {
      Tags.of(this).add("awsApplication", props.applicationTagValue, {
        excludeResourceTypes: ["AWS::CloudFormation::Stack"],
      });
    }
    addEnvironmentTags(this, props.config);

    this.ApiURL = "";

    let datastoreImpl = props.config.backend.environment.datastoreImpl;
    let authenticatorImpl = props.config.backend.environment.authenticatorImpl;
    const cognitoClientId = props.userPoolClientId;
    const cognitoUserPoolId = props.userPoolId;
    const featureConfig = props.config.backend.features || {};

    if (Boolean(props.config.datastore.dynamodb.create)) {
      datastoreImpl = "dynamodb";
    }

    if (Boolean(props.config.auth.cognito.create)) {
      authenticatorImpl = "cognito";
    }

    // IAM Roles for Lambda Execution (API Lambda + async query processing Lambda)
    const createLambdaExecutionRole = (roleName: string): Role => {
      const role = new Role(this, roleName, {
        assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
        path: "/",
        managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")],
      });

      // Custom policies
      role.addToPolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
          resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/*`],
        }),
      );

      role.addToPolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["secretsmanager:GetSecretValue"],
          resources: [`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${getStackPrefix(props.config)}/*`],
        }),
      );

      if (props.datastoreKmsARN) {
        role.addToPolicy(
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["kms:Decrypt", "kms:Encrypt", "kms:GenerateDataKey", "kms:DescribeKey"],
            resources: [props.datastoreKmsARN],
          }),
        );
      }

      return role;
    };

    const lambdaExecutionRole = createLambdaExecutionRole(`${props.config.global.name}-LambdaExecutionRole`);

    // Lambda function
    syncBundledBackendConfig(props.config.backend.sourcePath);

    const lambdaTimeoutSeconds = props.config.backend.timeout ?? 180;
    const backendEnvironment = buildBackendEnvironment(props.config, {
      datastoreImpl,
      authenticatorImpl,
      cognitoClientId,
      cognitoUserPoolId,
      featureDoraMetrics: Boolean(featureConfig.dora),
      featureLanguageSelector: Boolean(featureConfig.languageSelector),
      featureMlForecasts: Boolean(featureConfig.mlForecasts),
      featurePredictions: Boolean(featureConfig.predictions),
      featureTemporalCoupling: Boolean(featureConfig.temporalCoupling),
    });

    const backendFunction = new Function(this, `${props.config.global.name}-lambda`, {
      code: Code.fromAsset(props.config.backend.sourcePath),
      handler: `${props.config.backend.handler}`,
      runtime: getLambdaRuntime(props.config.backend.runtime),
      description: `${props.config.global.name} Lambda`,
      role: lambdaExecutionRole,
      memorySize: props.config.backend.memorySize ?? 1024,
      timeout: Duration.seconds(lambdaTimeoutSeconds),
      environment: backendEnvironment,
    });

    // Async query processing: the API Lambda enqueues queries to SQS and a
    // dedicated Lambda consumes the queue and executes them (same code asset,
    // INVOCATION_MODE=execute-query).
    const queryQueue = new Queue(this, `${props.config.global.name}-async-query-queue`, {
      visibilityTimeout: Duration.seconds(lambdaTimeoutSeconds),
      retentionPeriod: Duration.days(1),
    });

    const queryLambdaExecutionRole = createLambdaExecutionRole(`${props.config.global.name}-QueryLambdaExecutionRole`);

    const queryFunction = new Function(this, `${props.config.global.name}-query-lambda`, {
      code: Code.fromAsset(props.config.backend.sourcePath),
      handler: `${props.config.backend.handler}`,
      runtime: getLambdaRuntime(props.config.backend.runtime),
      description: `${props.config.global.name} async query processing Lambda`,
      role: queryLambdaExecutionRole,
      memorySize: props.config.backend.memorySize ?? 1024,
      timeout: Duration.seconds(lambdaTimeoutSeconds),
      environment: {
        ...backendEnvironment,
        INVOCATION_MODE: "execute-query",
      },
    });

    queryQueue.grantSendMessages(backendFunction);
    backendFunction.addEnvironment("ASYNC_QUERY_QUEUE_URL", queryQueue.queueUrl);
    queryFunction.addEventSource(new SqsEventSource(queryQueue));

    if (Boolean(props.config.datastore.dynamodb.create)) {
      // Both Lambdas run the same backend code and may read/write (and, with
      // DATASTORE_AUTO_CREATE, manage) the same set of DynamoDB tables.
      for (const role of [lambdaExecutionRole, queryLambdaExecutionRole]) {
        role.addToPolicy(
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["dynamodb:ListTables"],
            resources: ["*"],
          }),
        );

        role.addToPolicy(
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              "dynamodb:CreateTable",
              "dynamodb:DeleteItem",
              "dynamodb:DescribeTable",
              "dynamodb:DescribeTimeToLive",
              "dynamodb:GetItem",
              "dynamodb:PutItem",
              "dynamodb:Scan",
              "dynamodb:UpdateTimeToLive",
            ],
            resources: props.datastoreARNs,
          }),
        );
      }

      // Import the DynamoDB table from another stack
      for (var tblARN of props.datastoreARNs) {
        const table = Table.fromTableArn(this, `${tblARN}-ImportedTable`, tblARN);

        table.grantReadWriteData(backendFunction);
        table.grantReadWriteData(queryFunction);
      }
    }

    if (Boolean(props.config.frontend.cloudfront.useAPIGW)) {
      const httpApi = new HttpApi(this, `${props.config.global.name}-APIGW`, {
        description: "API Gateway for the backend Lambda function",
        corsPreflight: {
          allowHeaders: ["Content-Type", "Authorization"],
          allowMethods: [CorsHttpMethod.ANY],
          allowOrigins: getConfiguredCorsOrigins(props.config),
        },
      });

      const lambdaIntegration = new HttpLambdaIntegration("LambdaIntegration", backendFunction);

      httpApi.addRoutes({
        path: "/api/{proxy+}", // Define your path
        methods: [HttpMethod.ANY], // You can add other methods like POST, PUT, etc.
        integration: lambdaIntegration,
      });
      this.ApiURL = httpApi.url || "";
    } else {
      const functionUrl = backendFunction.addFunctionUrl({
        authType: FunctionUrlAuthType.NONE,
        cors: {
          allowedOrigins: getConfiguredCorsOrigins(props.config),
          allowedMethods: [
            FunctionUrlHttpMethod.GET,
            FunctionUrlHttpMethod.POST,
            FunctionUrlHttpMethod.PUT,
            FunctionUrlHttpMethod.PATCH,
            FunctionUrlHttpMethod.DELETE,
            FunctionUrlHttpMethod.OPTIONS,
          ],
          allowedHeaders: ["*"],
        },
      });
      this.ApiURL = functionUrl.url;
    }

    this.functionARN = backendFunction.functionArn;

    new CfnOutput(this, "BackendLambdaName", {
      value: backendFunction.functionName,
      description: "Backend Lambda function name",
    });

    new CfnOutput(this, "AsyncQueryQueueUrl", {
      value: queryQueue.queueUrl,
      description: "SQS queue URL for async query processing",
    });

    new CfnOutput(this, "QueryProcessingLambdaName", {
      value: queryFunction.functionName,
      description: "Async query processing Lambda function name",
    });
  }
}
