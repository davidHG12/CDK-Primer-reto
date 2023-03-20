import * as cdk from "aws-cdk-lib";
import { aws_s3 as s3 } from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as iam from "aws-cdk-lib/aws-iam";
import { RemovalPolicy } from "aws-cdk-lib";

import { Construct } from "constructs";

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const DOMAIN_NAME = new cdk.CfnParameter(this, "DomainName", {
      type: "String",
      default: "davidhidalgo.live",
    });

    const S3_BUCKET_NAME = new cdk.CfnParameter(this, "S3BucketName", {
      type: "String",
      default: "dhg-primer-reto-frontend",
    });

    const HOSTED_DNS_ZONE_ID = new cdk.CfnParameter(this, "HostedDnsZoneId", {
      type: "String",
      default: "Z02532832CD89DPG6UEAB",
    });

    const certificate = new acm.CfnCertificate(this, "Certificate", {
      domainName: "davidhidalgo.live",
      validationMethod: "DNS",
      domainValidationOptions: [
        {
          domainName: "davidhidalgo.live",
          hostedZoneId: HOSTED_DNS_ZONE_ID.valueAsString,
        },
      ],
    });

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      "TheCloudFrontOriginAccessIdentity",
      {
        comment: `CloudFront OAI for ${DOMAIN_NAME.valueAsString}`,
      }
    );

    const distributionConfigProperty: cloudfront.CfnDistribution.DistributionConfigProperty =
      {
        aliases: [DOMAIN_NAME.valueAsString],
        defaultCacheBehavior: {
          targetOriginId: "the-s3-bucket",
          viewerProtocolPolicy: "allow-all",
          compress: true,
          forwardedValues: {
            queryString: false,
          },
        },
        defaultRootObject: "index.html",
        customErrorResponses: [
          {
            errorCode: 403,
            errorCachingMinTtl: 300,
            responseCode: 404,
            responsePagePath: "/404.html",
          },
        ],
        enabled: true,
        /*         customOrigin: {
          dnsName: 'dnsName',
          originProtocolPolicy: 'originProtocolPolicy',
          originSslProtocols: ['originSslProtocols'],
        }, */
        httpVersion: "http2",
        origins: [
          {
            domainName: `${S3_BUCKET_NAME.valueAsString}.s3.amazonaws.com`,
            id: "the-s3-bucket",
            s3OriginConfig: {
              originAccessIdentity: `origin-access-identity/cloudfront/${originAccessIdentity.originAccessIdentityName}`,
            },
          },
        ],
        priceClass: "PriceClass_All",
        viewerCertificate: {
          acmCertificateArn: certificate.ref,
          minimumProtocolVersion: "TLSv1",
          sslSupportMethod: "sni-only",
        },
      };

    // Create a CloudFront distribution
    const distribution = new cloudfront.CfnDistribution(
      this,
      "TheCloudFrontDistribution",
      {
        distributionConfig: distributionConfigProperty,
        tags: [
          {
            key: "Domain",
            value: DOMAIN_NAME.valueAsString,
          },
        ],
      }
    );

    const BucketEncryptionProperty: s3.CfnBucket.BucketEncryptionProperty = {
      serverSideEncryptionConfiguration: [
        {
          serverSideEncryptionByDefault: {
            sseAlgorithm: "AES256",
          },
        },
      ],
    };

    // Create an S3 bucket
    const bucket = new s3.CfnBucket(this, "TheBucket", {
      bucketName: S3_BUCKET_NAME.valueAsString,
      bucketEncryption: BucketEncryptionProperty,
      tags: [
        {
          key: "Domain",
          value: DOMAIN_NAME.valueAsString,
        },
      ],
    });

    const bucketPolicy = new iam.PolicyStatement({
      actions: ["s3:GetObject"],
      effect: iam.Effect.ALLOW,
      resources: [`arn:aws:s3:::${S3_BUCKET_NAME.valueAsString}/*`],
      principals: [
        new iam.CanonicalUserPrincipal(
          originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId
        ),
      ],
    });

    const bucketPolicyJson = {
      Version: "2012-10-17",
      Statement: [bucketPolicy.toJSON()],
    };

    const theBucketPolicy = new s3.CfnBucketPolicy(this, "TheBucketPolicy", {
      bucket: S3_BUCKET_NAME.valueAsString,
      policyDocument: bucketPolicyJson,
    });

    // Create a Route 53 record set
    const recordSetGroup = new route53.CfnRecordSetGroup(this, "DNS", {
      hostedZoneId: HOSTED_DNS_ZONE_ID.valueAsString,
      recordSets: [
        {
          name: DOMAIN_NAME.valueAsString,
          type: route53.RecordType.A,
          aliasTarget: {
            hostedZoneId: "Z2FDTNDATAQYW2",
            dnsName: distribution.attrDomainName,
            evaluateTargetHealth: false,
          },
        },
      ],
    });
  }
}
