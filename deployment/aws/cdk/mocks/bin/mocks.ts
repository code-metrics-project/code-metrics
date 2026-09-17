#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { MockStack } from "../lib/mocks-stack";
import { applyEnvironmentOverride, getStackPrefix } from "../lib/config";
import { readFileSync } from "fs";
import { parse } from "yaml";

type AwsEnvironment = { account?: string; region?: string };

function getStackEnv(config: any): AwsEnvironment | undefined {
  const account = config?.aws?.account || undefined;
  const region = config?.aws?.region || undefined;

  if (!account && !region) {
    return undefined;
  }

  return { account, region };
}

const config = parse(readFileSync("config.yaml", "utf8"));
applyEnvironmentOverride(config);
const stackName = getStackPrefix(config);

const app = new cdk.App();
new MockStack(app, stackName, {
  env: getStackEnv(config),
  config: config,
});
