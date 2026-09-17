import { Table, TableEncryption } from "aws-cdk-lib/aws-dynamodb";
import { Key } from "aws-cdk-lib/aws-kms";
import { Construct } from "constructs";
import { Stack, StackProps, Tags } from "aws-cdk-lib";
import { getAttributeType, getRemovalPolicy } from "./utils";
import { addEnvironmentTags, getDatastoreTablePrefix, shouldApplyAwsApplicationTag } from "./config";

interface DataStoreStackProps extends StackProps {
  applicationTagValue: string;
  config: any;
}

export class DataStoreStack extends Stack {
  public readonly tableArns: string[];
  public readonly tableKmsARN: string;

  constructor(scope: Construct, id: string, props: DataStoreStackProps) {
    super(scope, id, props);

    if (shouldApplyAwsApplicationTag(props.applicationTagValue)) {
      Tags.of(this).add("awsApplication", props.applicationTagValue, {
        excludeResourceTypes: ["AWS::CloudFormation::Stack"],
      });
    }
    addEnvironmentTags(this, props.config);

    // Create a KMS key for DynamoDB encryption
    const dynamoDbKmsKey = new Key(this, `${props.config.global.name}-table-kmskey`, {
      enableKeyRotation: true,
      removalPolicy: getRemovalPolicy(props.config.datastore.dynamodb.removalPolicy),
    });

    this.tableArns = [];
    for (var tbl of props.config.datastore.dynamodb.tables) {
      const table = new Table(this, `${props.config.global.name}_${tbl}`, {
        tableName: `${getDatastoreTablePrefix(props.config)}_${tbl}`,
        partitionKey: {
          name: props.config.datastore.dynamodb.partitionKey.name,
          type: getAttributeType(props.config.datastore.dynamodb.partitionKey.type),
        },
        encryption: TableEncryption.CUSTOMER_MANAGED,
        encryptionKey: dynamoDbKmsKey,
        removalPolicy: getRemovalPolicy(props.config.datastore.dynamodb.removalPolicy),
      });
      this.tableArns.push(table.tableArn);
    }

    this.tableKmsARN = dynamoDbKmsKey.keyArn;
  }
}
