import { Stack } from "aws-cdk-lib";
import { StackProps } from "aws-cdk-lib";
import { CfnApplication } from "aws-cdk-lib/aws-servicecatalogappregistry";
import { Construct } from "constructs";
import { addEnvironmentTags, getStackPrefix } from "./config";

interface ApplicationStackProps extends StackProps {
  config: any;
}

export class ApplicationStack extends Stack {
  public readonly applicationTagValue: string;
  constructor(scope: Construct, id: string, props: ApplicationStackProps) {
    super(scope, id, props);

    addEnvironmentTags(this, props.config);

    // Create an AppRegistry application
    const myApplication = new CfnApplication(this, "CfnApplication", {
      name: getStackPrefix(props.config),
      description: `Core logic for managing ${getStackPrefix(props.config)} automatically`,
    });

    this.applicationTagValue = myApplication.attrApplicationTagValue;
  }
}
