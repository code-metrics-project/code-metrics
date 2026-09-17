import {
  AccountRecovery,
  OAuthScope,
  OAuthSettings,
  StringAttribute,
  UserPool,
  UserPoolClientIdentityProvider,
  VerificationEmailStyle,
} from "aws-cdk-lib/aws-cognito";
import { CustomResource, Duration, RemovalPolicy, Stack, StackProps, Tags } from "aws-cdk-lib";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";

import * as path from "path";

import { Construct } from "constructs";
import { Code, Function } from "aws-cdk-lib/aws-lambda";
import { Provider } from "aws-cdk-lib/custom-resources";
import { getLambdaRuntime, getRemovalPolicy } from "./utils";
import {
  addEnvironmentTags,
  getCognitoDemoUsersFile,
  getStackPrefix,
  loadCognitoDemoUsers,
  serializeCognitoDemoUsers,
  shouldApplyAwsApplicationTag,
  shouldAutoWireCognitoRedirectUrls,
} from "./config";

interface AuthStackProps extends StackProps {
  applicationTagValue: string;
  config: any;
}

export class AuthStack extends Stack {
  public readonly userPoolClientId: string;
  public readonly userPoolId: string;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    if (shouldApplyAwsApplicationTag(props.applicationTagValue)) {
      Tags.of(this).add("awsApplication", props.applicationTagValue, {
        excludeResourceTypes: ["AWS::CloudFormation::Stack"],
      });
    }
    addEnvironmentTags(this, props.config);

    const cognitoPool = new UserPool(this, `${props.config.global.name}-CognitoPool`, {
      userPoolName: `${getStackPrefix(props.config)}-CognitoPool`,
      selfSignUpEnabled: true,
      signInCaseSensitive: false,
      signInAliases: {
        email: true,
        phone: true,
      },
      autoVerify: {
        email: true,
      },
      userVerification: {
        emailSubject: `Hello from ${props.config.global.name}!`,
        emailBody: `Hello, Thanks for registering in ${props.config.global.name}! Verification code is {####}.`,
        emailStyle: VerificationEmailStyle.CODE,
      },
      standardAttributes: {
        fullname: {
          required: true,
          mutable: true,
        },
        email: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        company: new StringAttribute({ mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: AccountRecovery.EMAIL_AND_PHONE_WITHOUT_MFA,
      removalPolicy: getRemovalPolicy(props.config.auth.cognito.removalPolicy),
    });

    // When redirect URL auto-wiring is enabled (the default) the AuthWiring
    // stack owns the OAuth callback/logout URLs and points them at the deployed
    // CloudFront domain at deploy time. Declaring them here too would let CloudFormation
    // reset them on every deploy while the wiring custom resource only re-runs when its
    // own properties change.
    const oAuth: OAuthSettings = {
      flows: { authorizationCodeGrant: true },
      scopes: [OAuthScope.OPENID],
      ...(shouldAutoWireCognitoRedirectUrls(props.config)
        ? {}
        : {
            callbackUrls: props.config.auth.cognito.callbackUrls,
            logoutUrls: props.config.auth.cognito.logoutUrls,
          }),
    };

    const client = cognitoPool.addClient(`${props.config.global.name}-Client`, {
      userPoolClientName: `${getStackPrefix(props.config)}-Client`,
      oAuth,
      supportedIdentityProviders: [UserPoolClientIdentityProvider.COGNITO],
      refreshTokenValidity: Duration.minutes(60),
      idTokenValidity: Duration.minutes(30),
      accessTokenValidity: Duration.minutes(30),
    });

    this.userPoolClientId = client.userPoolClientId;
    this.userPoolId = cognitoPool.userPoolId;

    const demoUsersFile = getCognitoDemoUsersFile(props.config);

    if (demoUsersFile) {
      const demoUsers = loadCognitoDemoUsers(demoUsersFile);
      if (demoUsers.length === 0) {
        throw new Error(
          `auth.cognito.createDemoUsers points at '${demoUsersFile}' but no valid demo users were found in it`,
        );
      }

      const demoUsersJson = serializeCognitoDemoUsers(demoUsers);

      console.log(
        `[INFO] ${this.stackName} will seed Cognito demo users from ${path.resolve(
          demoUsersFile,
        )} (${demoUsers.length} user(s)).`,
      );

      const prepopulateFunction = new Function(this, `${props.config.global.name}-PrepopulateUsers`, {
        runtime: getLambdaRuntime("NODEJS_20_X"),
        handler: "index.handler",
        code: Code.fromAsset("prepopulateCognito/dist"), // Lambda directory path
        environment: {
          USER_POOL_ID: cognitoPool.userPoolId,
          DEMO_USERS: demoUsersJson,
        },
        timeout: Duration.seconds(30),
      });

      prepopulateFunction.addToRolePolicy(
        new PolicyStatement({
          actions: [
            "cognito-idp:AdminCreateUser",
            "cognito-idp:AdminSetUserPassword", // Add necessary actions
            "cognito-idp:AdminUpdateUserAttributes",
          ],
          resources: [cognitoPool.userPoolArn], // Restrict to the specific Cognito User Pool
        }),
      );

      const prepopulateProvider = new Provider(this, `${props.config.global.name}-PrepopulateProvider`, {
        onEventHandler: prepopulateFunction,
      });

      // The user list is a CloudFormation property (not just Lambda env) so
      // editing the demo users file re-runs the seeding handler on re-deploy.
      new CustomResource(this, `${props.config.global.name}-PrepopulateUsersResource`, {
        serviceToken: prepopulateProvider.serviceToken,
        properties: {
          Users: demoUsersJson,
        },
      });

      prepopulateFunction.applyRemovalPolicy(RemovalPolicy.DESTROY);
    }
  }
}
