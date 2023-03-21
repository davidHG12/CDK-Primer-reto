import * as cdk from "aws-cdk-lib";
import * as cloudformation from "aws-cdk-lib/aws-cloudformation";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as route53 from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";

class DBStack extends cdk.NestedStack {
  constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
    super(scope, id, props);

    const dynamoDBTableName = new cdk.CfnParameter(this, "DynamoDBTableName", {
      type: "String",
      default: "tareas",
    });

    const dynamoDBTable = new dynamodb.CfnTable(this, "DynamoDBTable", {
      tableName: dynamoDBTableName.valueAsString,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      attributeDefinitions: [
        {
          attributeName: "idtarea",
          attributeType: "S",
        },
      ],
      keySchema: [
        {
          attributeName: "idtarea",
          keyType: "HASH",
        },
      ],
    });
  }
}

class BackendStack extends cdk.NestedStack {
  constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
    super(scope, id, props);

    const lambdaGetAllName = new cdk.CfnParameter(this, "LambdaGetAllName", {
      type: "String",
      default: "get-tareas",
    });

    const lambdaGetName = new cdk.CfnParameter(this, "LambdaGetName", {
      type: "String",
      default: "get-tarea",
    });

    const lambdaPostName = new cdk.CfnParameter(this, "LambdaPostName", {
      type: "String",
      default: "post-tarea",
    });

    const lambdaPatchName = new cdk.CfnParameter(this, "LambdaPatchName", {
      type: "String",
      default: "patch-tarea",
    });

    const lambdaDeleteName = new cdk.CfnParameter(this, "LambdaDeleteName", {
      type: "String",
      default: "delete-tarea",
    });

    const dynamoDBTableName = new cdk.CfnParameter(this, "DynamoDBTableName", {
      type: "String",
      default: "tareas",
    });

    const apiName = new cdk.CfnParameter(this, "APIName", {
      type: "String",
      default: "TareasAPI",
    });

    const environmentName = new cdk.CfnParameter(this, "EnvironmentName", {
      type: "String",
      default: "api",
    });

    const role = new iam.Role(this, "IAMRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:TagResource",
          "dynamodb:UntagResource",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:GetItem",
          "dynamodb:Scan",
          "dynamodb:Query",
          "dynamodb:UpdateItem",
          "logs:CreateLogStream",
          "logs:CreateLogGroup",
          "logs:PutLogEvents",
        ],
        resources: ["*"],
      })
    );

    const bucketName = "dhg-primer-reto-lambdas";
    const theBucket = s3.Bucket.fromBucketName(this, "TheBucket", bucketName);

    const lambdaGetAll = new lambda.Function(this, "LambdaGetAllFunction", {
      functionName: lambdaGetAllName.valueAsString,
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromBucket(theBucket, "Lambdas/get-tareas.zip"),
      handler: "lambdas/get-tareas.handler",
      role: role,
      environment: {
        TABLE_NAME: dynamoDBTableName.valueAsString,
      },
    });

    const lambdaGet = new lambda.Function(this, "LambdaGetFunction", {
      functionName: lambdaGetName.valueAsString,
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromBucket(theBucket, "Lambdas/get-tarea.zip"),
      handler: "lambdas/get-tarea.handler",
      role: role,
      environment: {
        TABLE_NAME: dynamoDBTableName.valueAsString,
      },
    });

    const lambdaPost = new lambda.Function(this, "LambdaPostFunction", {
      functionName: lambdaPostName.valueAsString,
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromBucket(theBucket, "Lambdas/post-tarea.zip"),
      handler: "lambdas/post-tarea.handler",
      role: role,
      environment: {
        TABLE_NAME: dynamoDBTableName.valueAsString,
      },
    });

    const lambdaPatch = new lambda.Function(this, "LambdaPatchFunction", {
      functionName: lambdaPatchName.valueAsString,
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromBucket(theBucket, "Lambdas/patch-tarea.zip"),
      handler: "lambdas/patch-tarea.handler",
      role: role,
      environment: {
        TABLE_NAME: dynamoDBTableName.valueAsString,
      },
    });

    const lambdaDelete = new lambda.Function(this, "LambdaDeleteFunction", {
      functionName: lambdaDeleteName.valueAsString,
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromBucket(theBucket, "Lambdas/patch-tarea.zip"),
      handler: "lambdas/delete-tarea.handler",
      role: role,
      environment: {
        TABLE_NAME: dynamoDBTableName.valueAsString,
      },
    });

    const restApi = new apigateway.RestApi(this, "MyRestApi", {
      restApiName: apiName.valueAsString,
      deploy: false,
    });

    const tareasResource = new apigateway.Resource(this, "TareasResource", {
      parent: restApi.root,
      pathPart: "tareas",
      defaultCorsPreflightOptions: {
        allowOrigins: ["*"],
        allowMethods: ["GET", "OPTIONS"],
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date,Authorization",
          "X-Api-Key",
          "X-Amz-Security-Token",
        ],
      },
    });

    const integrationGetAll = new apigateway.Integration({
      type: apigateway.IntegrationType.AWS_PROXY,
      integrationHttpMethod: "POST",
      options: {
        integrationResponses: [{ statusCode: "200" }],
      },
      uri: `arn:aws:apigateway:${
        cdk.Stack.of(this).region
      }:lambda:path/2015-03-31/functions/${
        lambdaGetAll.functionArn
      }/invocations`,
    });

    const tareasMethodGet = new apigateway.Method(this, "TareasMethodGET", {
      httpMethod: "GET",
      resource: tareasResource,
      integration: integrationGetAll,
      options: {
        authorizationType: apigateway.AuthorizationType.NONE,
        methodResponses: [{ statusCode: "200" }],
      },
    });

    const tareaResource = new apigateway.Resource(this, "TareaResource", {
      parent: restApi.root,
      pathPart: "tarea",
      defaultCorsPreflightOptions: {
        allowOrigins: ["*"],
        allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date,Authorization",
          "X-Api-Key",
          "X-Amz-Security-Token",
        ],
      },
    });

    const integrationGet = new apigateway.Integration({
      type: apigateway.IntegrationType.AWS_PROXY,
      integrationHttpMethod: "POST",
      options: {
        integrationResponses: [{ statusCode: "200" }],
      },
      uri: `arn:aws:apigateway:${
        cdk.Stack.of(this).region
      }:lambda:path/2015-03-31/functions/${lambdaGet.functionArn}/invocations`,
    });

    const tareaMethodGet = new apigateway.Method(this, "TareaMethodGET", {
      httpMethod: "GET",
      resource: tareaResource,
      integration: integrationGet,
      options: {
        authorizationType: apigateway.AuthorizationType.NONE,
        methodResponses: [{ statusCode: "200" }],
      },
    });

    const integrationPost = new apigateway.Integration({
      type: apigateway.IntegrationType.AWS_PROXY,
      integrationHttpMethod: "POST",
      options: {
        integrationResponses: [{ statusCode: "200" }],
      },
      uri: `arn:aws:apigateway:${
        cdk.Stack.of(this).region
      }:lambda:path/2015-03-31/functions/${lambdaPost.functionArn}/invocations`,
    });

    const tareaMethodPost = new apigateway.Method(this, "TareasMethoPost", {
      httpMethod: "POST",
      resource: tareaResource,
      integration: integrationPost,
      options: {
        authorizationType: apigateway.AuthorizationType.NONE,
        methodResponses: [{ statusCode: "200" }],
      },
    });

    const integrationPatch = new apigateway.Integration({
      type: apigateway.IntegrationType.AWS_PROXY,
      integrationHttpMethod: "POST",
      options: {
        integrationResponses: [{ statusCode: "200" }],
      },
      uri: `arn:aws:apigateway:${
        cdk.Stack.of(this).region
      }:lambda:path/2015-03-31/functions/${
        lambdaPatch.functionArn
      }/invocations`,
    });

    const tareaMethodPatch = new apigateway.Method(this, "TareasMethodPatch", {
      httpMethod: "PATCH",
      resource: tareaResource,
      integration: integrationPatch,
      options: {
        authorizationType: apigateway.AuthorizationType.NONE,
        methodResponses: [{ statusCode: "200" }],
      },
    });

    const integrationDelete = new apigateway.Integration({
      type: apigateway.IntegrationType.AWS_PROXY,
      integrationHttpMethod: "POST",
      options: {
        integrationResponses: [{ statusCode: "200" }],
      },
      uri: `arn:aws:apigateway:${
        cdk.Stack.of(this).region
      }:lambda:path/2015-03-31/functions/${
        lambdaDelete.functionArn
      }/invocations`,
    });

    const tareaMethodDelete = new apigateway.Method(
      this,
      "TareasMethodDelete",
      {
        httpMethod: "DELETE",
        resource: tareaResource,
        integration: integrationDelete,
        options: {
          authorizationType: apigateway.AuthorizationType.NONE,
          methodResponses: [{ statusCode: "200" }],
        },
      }
    );

    const deployment = new apigateway.Deployment(this, "APIGatewayDeployment", {
      api: restApi,
      description: "Infra Deployment",
      retainDeployments: false,
    });

    const stage = new apigateway.Stage(this, "APIGatewayStage", {
      deployment: deployment,
      stageName: environmentName.valueAsString,
    });

    const apiGatewayPermissionGetAll = new lambda.CfnPermission(
      this,
      "APIGatewayPermissionGetAll",
      {
        action: "lambda:InvokeFunction",
        functionName: lambdaGetAll.functionArn,
        principal: "apigateway.amazonaws.com",
      }
    );

    const apiGatewayPermissionGet = new lambda.CfnPermission(
      this,
      "APIGatewayPermissionGet",
      {
        action: "lambda:InvokeFunction",
        functionName: lambdaGet.functionArn,
        principal: "apigateway.amazonaws.com",
      }
    );
    const apiGatewayPermissionPost = new lambda.CfnPermission(
      this,
      "APIGatewayPermissionPost",
      {
        action: "lambda:InvokeFunction",
        functionName: lambdaPost.functionArn,
        principal: "apigateway.amazonaws.com",
      }
    );
    const apiGatewayPermissionPatch = new lambda.CfnPermission(
      this,
      "APIGatewayPermissionPatch",
      {
        action: "lambda:InvokeFunction",
        functionName: lambdaPatch.functionArn,
        principal: "apigateway.amazonaws.com",
      }
    );
    const apiGatewayPermissionDelete = new lambda.CfnPermission(
      this,
      "APIGatewayPermissionDelete",
      {
        action: "lambda:InvokeFunction",
        functionName: lambdaDelete.functionArn,
        principal: "apigateway.amazonaws.com",
      }
    );
  }
}

class FrontendStack extends cdk.NestedStack {
  constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
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

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dbstack = new DBStack(this, "DBStack");
    const backstack = new BackendStack(this, "BackendStack");
    const frontstack = new FrontendStack(this, "FrontendStack");
  }
}
/* 
// Define los stacks hijas
const frontendStack = new cloudformation.CfnStack(this, "FrontendStack", {
  templateUrl:
    "https://dhg-primer-reto-templates.s3.amazonaws.com/Templates/templateFront.yaml",
  parameters: {
    DomainName: domainName.valueAsString,
    PriceClass: priceClass.valueAsString,
    S3BucketName: s3BucketName.valueAsString,
    HostedDnsZoneId: hostedDnsZoneId.valueAsString,
  },
});

const backendStack = new cloudformation.CfnStack(this, "BackendStack", {
  templateUrl:
    "https://dhg-primer-reto-templates.s3.amazonaws.com/Templates/templateApp.yaml",
  parameters: {
    LambdaGetAllName: lambdaGetAllName.valueAsString,
    LambdaGetName: lambdaGetName.valueAsString,
    LambdaPostName: lambdaPostName.valueAsString,
    LambdaPatchName: lambdaPatchName.valueAsString,
    LambdaDeleteName: lambdaDeleteName.valueAsString,
    DynamoDBTableName: dynamoDBTableName.valueAsString,
    APIName: apiName.valueAsString,
    EnvironmentName: environmentName.valueAsString,
  },
});

const DBStack = new cloudformation.CfnStack(this, "DBStack", {
  templateUrl:
    "https://dhg-primer-reto-templates.s3.amazonaws.com/Templates/templateData.yaml",
  parameters: {
    DynamoDBTableName: dynamoDBTableName.valueAsString,
  },
}); */
