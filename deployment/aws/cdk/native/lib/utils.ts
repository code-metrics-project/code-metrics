import { AttributeType } from "aws-cdk-lib/aws-dynamodb";
import { RemovalPolicy } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";

export function getRemovalPolicy(policy: string): RemovalPolicy {
  switch (policy) {
    case "DESTROY":
      return RemovalPolicy.DESTROY;
    case "RETAIN":
      return RemovalPolicy.RETAIN;
    case "SNAPSHOT":
      return RemovalPolicy.SNAPSHOT;
    default:
      throw new Error(`Invalid RemovalPolicy: ${policy}`);
  }
}

export function getLambdaRuntime(runtime: string): Runtime {
  switch (runtime) {
    case "JAVA_11":
      return Runtime.JAVA_11;
    case "JAVA_17":
      return Runtime.JAVA_17;
    case "JAVA_21":
      return Runtime.JAVA_21;
    case "NODEJS_20_X":
      return Runtime.NODEJS_20_X;
    case "NODEJS_18_X":
      return Runtime.NODEJS_18_X;
    case "NODEJS_16_X":
      console.log("[WARNING]: NODEJS_16_X Deprecated");
      return Runtime.NODEJS_16_X;
    case "PROVIDED_AL2023":
      return Runtime.PROVIDED_AL2023;
    default:
      throw new Error(`Invalid Lambda Runtime: ${runtime}`);
  }
}

export function getAttributeType(type: string): AttributeType {
  switch (type) {
    case "S":
      return AttributeType.STRING;
    case "N":
      return AttributeType.NUMBER;
    case "B":
      return AttributeType.BINARY;
    default:
      throw new Error(`Invalid AttributeType: ${type}`);
  }
}
