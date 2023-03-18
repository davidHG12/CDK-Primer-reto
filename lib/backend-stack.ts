import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
//import * as core from "aws-cdk-lib/core";
import { Construct } from "constructs";

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
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
    //table.grantReadWriteData(lambdaPost);

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

    /* const integrationCORS = new apigateway.Integration({
      type: apigateway.IntegrationType.MOCK,
      options: {
        integrationResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Headers":
                "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
              "method.response.header.Access-Control-Allow-Methods":
                "'GET,OPTIONS'",
              "method.response.header.Access-Control-Allow-Origin": "'*'",
            },
          },
        ],
        passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
        requestTemplates: { "application/json": '{"statusCode": 200}}' },
      },
    });

    // Define the Tareas Method (CORS)
    const tareasMethodCORS = new apigateway.Method(this, "TareasMethodCORS", {
      httpMethod: "OPTIONS",
      resource: tareasResource,
      integration: integrationCORS,
      options: {
        authorizationType: apigateway.AuthorizationType.NONE,
        methodResponses: [
          {
            statusCode: "200",
            responseModels: {
              "application/json": apigateway.Model.EMPTY_MODEL,
            },
            responseParameters: {
              "method.response.header.Access-Control-Allow-Headers": false,
              "method.response.header.Access-Control-Allow-Methods": false,
              "method.response.header.Access-Control-Allow-Origin": false,
            },
          },
        ],
      },
    }); */

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

    /* const integrationCORS2 = new apigateway.Integration({
      type: apigateway.IntegrationType.MOCK,
      options: {
        integrationResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Headers":
                "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
              "method.response.header.Access-Control-Allow-Methods":
                "'GET,POST,PATCH,DELETE,OPTIONS'",
              "method.response.header.Access-Control-Allow-Origin": "'*'",
            },
          },
        ],
        passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
        requestTemplates: { "application/json": '{"statusCode": 200}}' },
      },
    });

    const tareaMethodCORS = new apigateway.Method(this, "TareaMethodCORS", {
      httpMethod: "OPTIONS",
      resource: tareaResource,
      integration: integrationCORS2,
      options: {
        authorizationType: apigateway.AuthorizationType.NONE,
        methodResponses: [
          {
            statusCode: "200",
            responseModels: {
              "application/json": apigateway.Model.EMPTY_MODEL,
            },
            responseParameters: {
              "method.response.header.Access-Control-Allow-Headers": false,
              "method.response.header.Access-Control-Allow-Methods": false,
              "method.response.header.Access-Control-Allow-Origin": false,
            },
          },
        ],
      },
    }); */

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
