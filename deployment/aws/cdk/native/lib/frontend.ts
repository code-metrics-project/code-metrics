import { aws_iam as iam, CfnOutput, Duration, Stack, StackProps, Tags } from "aws-cdk-lib";
import { Construct } from "constructs";
import { BlockPublicAccess, Bucket, BucketEncryption, ObjectOwnership } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import {
  CfnDistribution,
  CfnRealtimeLogConfig,
  Distribution,
  DistributionProps,
  OriginAccessIdentity,
  PriceClass,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Stream } from "aws-cdk-lib/aws-kinesis";
import {
  addEnvironmentTags,
  buildFrontendWebConfig,
  getResourcePrefix,
  getStackPrefix,
  shouldApplyAwsApplicationTag,
} from "./config";
import { getRemovalPolicy } from "./utils";

interface FrontendStackProps extends StackProps {
  applicationTagValue: string;
  config: any;
  apiBaseUrl: string;
}

export class FrontendStack extends Stack {
  public readonly distributionDomainName: string;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    // Tagging fails: https://github.com/aws/aws-cdk/issues/31423 if using autoDeleteObjects is true
    if (
      !Boolean(props.config.frontend.s3.autoDeleteObjects) &&
      !Boolean(props.config.frontend.cloudfront.logging.autoDeleteObjects)
    ) {
      console.log(
        `[WARN] Stack Tagging disbaled for '${props.config.global.name}-Frontend' due to: https://github.com/aws/aws-cdk/issues/31423`,
      );
      if (shouldApplyAwsApplicationTag(props.applicationTagValue)) {
        Tags.of(this).add("awsApplication", props.applicationTagValue);
      }
    }
    addEnvironmentTags(this, props.config);

    // S3 Bucket for frontend hosting
    const siteBucketName = props.config.frontend.s3.bucketName || `${getResourcePrefix(props.config)}-frontend`;
    const siteBucket = new Bucket(this, siteBucketName, {
      bucketName: siteBucketName,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      versioned: false,
      removalPolicy: getRemovalPolicy(props.config.frontend.s3.removalPolicy),
      autoDeleteObjects: Boolean(props.config.frontend.s3.autoDeleteObjects),
    });

    // Create a CloudFront Origin Access Identity
    const originAccessIdentity = new OriginAccessIdentity(this, `${props.config.global.name}-CloudFrontOAI`, {
      comment: `${getStackPrefix(props.config)}-CloudFrontOAI Allows access to S3 Bucket`,
    });

    // Grant the OAI permission to read from the S3 bucket
    siteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject"],
        resources: [siteBucket.arnForObjects("*")],
        principals: [
          new iam.CanonicalUserPrincipal(originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId),
        ],
      }),
    );

    // Grant read access to the OAI
    siteBucket.grantRead(originAccessIdentity);

    let distribution: Distribution;
    let distProps: DistributionProps;

    distProps = {
      defaultBehavior: {
        origin: new S3Origin(siteBucket, {
          originAccessIdentity: originAccessIdentity,
        }),
        compress: true,
        viewerProtocolPolicy: ViewerProtocolPolicy.ALLOW_ALL,
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.seconds(0),
        },
      ],
      priceClass: PriceClass.PRICE_CLASS_ALL,
      defaultRootObject: "index.html",
      enableLogging: false,
    };

    if (
      Boolean(props.config.frontend.cloudfront.logging.enabled) &&
      !Boolean(props.config.frontend.cloudfront.logging.realtime.enabled)
    ) {
      // S3 Bucket for CloudFront logs
      const loggingBucket = new Bucket(this, `${props.config.global.name}-LoggingBucket`, {
        bucketName: `${getResourcePrefix(props.config)}-logging`,
        removalPolicy: getRemovalPolicy(props.config.frontend.cloudfront.logging.removalPolicy),
        objectOwnership: ObjectOwnership.OBJECT_WRITER, // Enable ACLs for ObjectWriter
        autoDeleteObjects: props.config.frontend.cloudfront.logging.autoDeleteObjects, // Boolean from config, no template string needed
      });

      // Grant CloudFront permission to write logs to the S3 bucket
      loggingBucket.addToResourcePolicy(
        new iam.PolicyStatement({
          actions: ["s3:PutObject"],
          resources: [`${loggingBucket.bucketArn}/*`],
          principals: [new iam.ServicePrincipal("cloudfront.amazonaws.com")],
          conditions: {
            StringEquals: {
              "AWS:SourceArn": `arn:aws:cloudfront::${this.account}:distribution/${this.region}/*`, // Specific SourceArn targeting the correct distribution
            },
          },
        }),
      );

      loggingBucket.addLifecycleRule({
        abortIncompleteMultipartUploadAfter: Duration.days(2),
      });

      distProps = {
        ...distProps,
        enableLogging: true,
        logBucket: loggingBucket,
        logFilePrefix: `${props.config.frontend.cloudfront.logging.logFilePrefix}`,
      };
    }

    distribution = new Distribution(this, `${props.config.global.name}-SiteDistribution`, distProps);
    this.distributionDomainName = distribution.distributionDomainName;

    if (Boolean(props.config.frontend.cloudfront.logging.realtime.enabled)) {
      // Create a Kinesis Data Stream for real-time logging
      const logStream = new Stream(this, `${props.config.global.name}-CloudFrontLogStream`, {
        shardCount: 1, // Adjust shard count as needed
        retentionPeriod: Duration.hours(props.config.frontend.cloudfront.logging.realtime.retentionPeriod),
      });

      // IAM Role that CloudFront will assume to write logs to the Kinesis Data Stream
      const realTimeLogRole = new iam.Role(this, `${props.config.global.name}-RealTimeLogRole`, {
        assumedBy: new iam.ServicePrincipal("cloudfront.amazonaws.com"),
      });

      // Policy to allow CloudFront to write to the Kinesis Data Stream
      realTimeLogRole.addToPolicy(
        new iam.PolicyStatement({
          actions: ["kinesis:PutRecords", "kinesis:PutRecord"],
          resources: [logStream.streamArn],
        }),
      );

      // Create a Real-Time Log Configuration
      const realTimeLogConfig = new CfnRealtimeLogConfig(this, `${props.config.global.name}-RealTimeLogConfig`, {
        fields: ["timestamp", "c-ip", "cs-method", "cs-uri-stem", "sc-status"],
        name: `${getStackPrefix(props.config)}-RealTimeLogConfig`,
        samplingRate: props.config.frontend.cloudfront.logging.realtime.samplingrate,
        endPoints: [
          {
            kinesisStreamConfig: {
              roleArn: realTimeLogRole.roleArn,
              streamArn: logStream.streamArn,
            },
            streamType: "Kinesis",
          },
        ],
      });

      // Override properties using CfnDistribution for real-time logging
      const cfnDistribution = distribution.node.defaultChild as CfnDistribution;
      cfnDistribution.addPropertyOverride(
        "DistributionConfig.DefaultCacheBehavior.RealtimeLogConfigArn",
        realTimeLogConfig.attrArn,
      );
    }

    const webConfig = buildFrontendWebConfig(props.config, props.apiBaseUrl);

    new BucketDeployment(this, `${props.config.global.name}-UploadSite`, {
      sources: [
        Source.asset(props.config.frontend.sourcePath, {
          exclude: ["config.json"],
        }),
        Source.jsonData("config.json", webConfig),
      ],
      destinationBucket: siteBucket,
      distribution: distribution,
      distributionPaths: ["/*"],
    });

    siteBucket.addLifecycleRule({
      abortIncompleteMultipartUploadAfter: Duration.days(2),
    });

    // Output the CloudFront URL
    new CfnOutput(this, "DistributionDomainName", {
      value: `https://${distribution.distributionDomainName}`,
      description: "The domain name of the CloudFront distribution",
    });
    new CfnOutput(this, "FrontendBucketname", {
      value: `s3://${siteBucket.bucketName}`,
      description: "The name of the sitebucket",
    });

    new CfnOutput(this, `apiBaseUrl`, {
      value: webConfig.apiBaseUrl,
      description: "The URL of the Lambda function",
    });
  }
}
