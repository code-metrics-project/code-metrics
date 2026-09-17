import { CustomResource, Duration, RemovalPolicy, Stack, StackProps, Tags } from "aws-cdk-lib";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Code, Function } from "aws-cdk-lib/aws-lambda";
import { Provider } from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { getLambdaRuntime } from "./utils";
import { addEnvironmentTags, getStackPrefix, shouldApplyAwsApplicationTag } from "./config";

// Paths the frontend app expects for the Cognito hosted OAuth flow
// (frontend/src/services/auth.ts and frontend/src/router/paths.ts).
const COGNITO_LOGIN_CALLBACK_PATH = "/login/callback";
const COGNITO_LOGOUT_PATH = "/logout";

interface AuthWiringStackProps extends StackProps {
  applicationTagValue: string;
  config: any;
  userPoolId: string;
  userPoolClientId: string;
  frontendDomain: string;
  /** Lambda code directory. Defaults to the checked-in built package. */
  lambdaCodePath?: string;
}

/**
 * Runs after the Frontend and Auth stacks so it can read the real CloudFront
 * domain and patch the Cognito app client's OAuth redirect URLs in place. This
 * breaks the Auth -> Frontend -> Auth reference cycle that would otherwise make
 * it impossible to point the redirect URLs at the freshly created distribution.
 * The custom resource only re-runs when its own properties (the desired URL
 * lists) change, so re-deploys are cheap no-ops.
 */
export class AuthWiringStack extends Stack {
  constructor(scope: Construct, id: string, props: AuthWiringStackProps) {
    super(scope, id, props);

    if (shouldApplyAwsApplicationTag(props.applicationTagValue)) {
      Tags.of(this).add("awsApplication", props.applicationTagValue, {
        excludeResourceTypes: ["AWS::CloudFormation::Stack"],
      });
    }
    addEnvironmentTags(this, props.config);

    const callbackUrls = [`https://${props.frontendDomain}${COGNITO_LOGIN_CALLBACK_PATH}`];
    const logoutUrls = [`https://${props.frontendDomain}${COGNITO_LOGOUT_PATH}`];

    const wiringFunction = new Function(this, `${props.config.global.name}-CognitoUrlWiring`, {
      runtime: getLambdaRuntime("NODEJS_20_X"),
      handler: "index.handler",
      code: Code.fromAsset(props.lambdaCodePath || "authWiring/dist"), // Lambda directory path
      // 60s leaves headroom for the 40MB cold start plus transient Cognito
      // retry backoff (2+4+8s) in a brand new stack.
      timeout: Duration.seconds(60),
    });

    // Cognito evaluates client actions (Describe/UpdateUserPoolClient) against
    // the user pool ARN, not the /client/<id> child ARN, so the grant must be
    // scoped to the pool.
    const userPoolArn = `arn:${this.partition}:cognito-idp:${this.region}:${this.account}:userpool/${props.userPoolId}`;
    wiringFunction.addToRolePolicy(
      new PolicyStatement({
        actions: [
          "cognito-idp:DescribeUserPoolClient",
          "cognito-idp:UpdateUserPoolClient",
        ],
        resources: [userPoolArn],
      }),
    );

    const wiringProvider = new Provider(this, `${props.config.global.name}-CognitoUrlWiringProvider`, {
      onEventHandler: wiringFunction,
    });

    new CustomResource(this, `${props.config.global.name}-CognitoUrlWiringResource`, {
      serviceToken: wiringProvider.serviceToken,
      properties: {
        UserPoolId: props.userPoolId,
        UserPoolClientId: props.userPoolClientId,
        CallbackUrls: callbackUrls,
        LogoutUrls: logoutUrls,
      },
    });

    wiringFunction.applyRemovalPolicy(RemovalPolicy.DESTROY);

    const stackPrefix = getStackPrefix(props.config);
    console.log(
      `[INFO] ${stackPrefix}-AuthWiring will set Cognito client ${props.userPoolClientId} OAuth ` +
        `callback URLs to [${callbackUrls.join(", ")}] and logout URLs to [${logoutUrls.join(", ")}] at deploy time.`,
    );
  }
}
