#!/usr/bin/env node
import { App, Tags } from "aws-cdk-lib";
import { FrontendStack } from "../lib/frontend";
import { BackendStack } from "../lib/backend";
import { DataStoreStack } from "../lib/datastore";
import { AuthStack } from "../lib/auth";
import { AuthWiringStack } from "../lib/authWiring";
import { ApplicationStack } from "../lib/application";
import {
  applyEnvironmentOverride,
  getStackEnv,
  getStackPrefix,
  shouldAutoWireCognitoRedirectUrls,
} from "../lib/config";
import { readFileSync } from "fs";
import { parse } from "yaml";

const config = parse(readFileSync("config.yaml", "utf8"));
applyEnvironmentOverride(config);
const app = new App();
const stackEnv = getStackEnv(config);
const stackPrefix = getStackPrefix(config);

const AppStack = new ApplicationStack(app, `${stackPrefix}-AppStack`, {
  env: stackEnv,
  config: config,
});

// Would be nice to create mapping of table arns to tables and set as envvars
// we can autoconstruct if blank
let datastoreTableARNs: string[] = config.datastore.dynamodb.tableARN;
let datastoreKmsARN: string = "";
let userPoolClientId: string = config.backend.environment.CognitoClientId;
let userPoolId: string = config.backend.environment.CognitoUserPoolId;

if (Boolean(config.datastore.dynamodb.create)) {
  const datastoreStack = new DataStoreStack(app, `${stackPrefix}-Datastore`, {
    env: stackEnv,
    applicationTagValue: AppStack.applicationTagValue,
    config: config,
  });
  datastoreTableARNs = datastoreStack.tableArns;
  datastoreKmsARN = datastoreStack.tableKmsARN;
}

let authStack: AuthStack | undefined;
if (Boolean(config.auth.cognito.create)) {
  authStack = new AuthStack(app, `${stackPrefix}-Auth`, {
    env: stackEnv,
    applicationTagValue: AppStack.applicationTagValue,
    config: config,
  });
  userPoolClientId = authStack.userPoolClientId;
  userPoolId = authStack.userPoolId;
}

const backendStack = new BackendStack(app, `${stackPrefix}-Backend`, {
  env: stackEnv,
  applicationTagValue: AppStack.applicationTagValue,
  config: config,
  datastoreARNs: datastoreTableARNs,
  datastoreKmsARN: datastoreKmsARN,
  userPoolClientId: userPoolClientId,
  userPoolId: userPoolId,
});

const frontendStack = new FrontendStack(app, `${stackPrefix}-Frontend`, {
  env: stackEnv,
  applicationTagValue: AppStack.applicationTagValue,
  config: config,
  apiBaseUrl: backendStack.ApiURL || "",
});

if (authStack && shouldAutoWireCognitoRedirectUrls(config)) {
  new AuthWiringStack(app, `${stackPrefix}-AuthWiring`, {
    env: stackEnv,
    applicationTagValue: AppStack.applicationTagValue,
    config: config,
    userPoolId: authStack.userPoolId,
    userPoolClientId: authStack.userPoolClientId,
    frontendDomain: frontendStack.distributionDomainName,
  });
}
