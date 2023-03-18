import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class DBStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dynamoDBTableName = new cdk.CfnParameter(this, "DynamoDBTableName", {
      type: "String",
      default: "tareas",
    });

    const dynamoDBTable = new dynamodb.Table(this, "DynamoDBTable", {
      tableName: dynamoDBTableName.valueAsString,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: "idtarea",
        type: dynamodb.AttributeType.STRING,
      },
    });
  }
}
