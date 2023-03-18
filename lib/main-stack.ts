import * as cdk from "aws-cdk-lib";
import * as cloudformation from "aws-cdk-lib/aws-cloudformation";
import { Construct } from "constructs";

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define los parámetros
    const domainName = new cdk.CfnParameter(this, "DomainName", {
      type: "String",
      default: "davidhidalgo.live",
    });

    const priceClass = new cdk.CfnParameter(this, "PriceClass", {
      type: "String",
      default: "PriceClass_All",
    });

    const s3BucketName = new cdk.CfnParameter(this, "S3BucketName", {
      type: "String",
      default: "dhg-primer-reto-frontend",
    });

    const hostedDnsZoneId = new cdk.CfnParameter(this, "HostedDnsZoneId", {
      type: "String",
      default: "Z02532832CD89DPG6UEAB",
    });

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
    });
  }
}
