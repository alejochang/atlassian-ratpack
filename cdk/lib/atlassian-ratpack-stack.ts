import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecspatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecrAssets from 'aws-cdk-lib/aws-ecr-assets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as path from 'path';

export class AtlassianRatpackStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // 1. Create the VPC
        const vpc = new ec2.Vpc(this, 'AtlassianVpc', {
            maxAzs: 2, // Default is all AZs in the region
            natGateways: 1,
        });

        // 2. SQS Queue for Lambda
        const queue = sqs.Queue.fromQueueAttributes(this, 'MarketplaceQueue', {
            queueArn: 'arn:aws:sqs:us-east-1:<AWS_ACCOUNT_ID>:lambda-atlassian-standard',
            queueUrl: 'https://sqs.us-east-1.amazonaws.com/<AWS_ACCOUNT_ID>/lambda-atlassian-standard',
        });

        // 3. Lambda Function for Processing SQS Messages
        const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSQSFullAccess'),
            ],
        });

        const lambdaFunction = new lambda.Function(this, 'AtlassianMarketplaceLambda', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'dist/app.lambdaHandler', // Ensure this matches the SAM template
            code: lambda.Code.fromAsset(path.join(__dirname, '../atlassian-marketplace-lambda/dist')),
            environment: {
                QUEUE_URL: 'https://sqs.us-east-1.amazonaws.com/<AWS_ACCOUNT_ID>/lambda-atlassian-standard',
            },
            role: lambdaRole,
            vpc,
        });

        // 4. ECS Cluster for Ratpack Service
        const cluster = new ecs.Cluster(this, 'RatpackCluster', {
            vpc,
        });

        // 5. Build Docker Image for Ratpack
        const ratpackImage = new ecrAssets.DockerImageAsset(this, 'RatpackImage', {
            directory: path.join(__dirname, '../ratpack-service'),
        });

        // 6. Deploy Ratpack Service on ECS
        new ecspatterns.ApplicationLoadBalancedFargateService(this, 'RatpackService', {
            cluster,
            taskImageOptions: {
                image: ecs.ContainerImage.fromDockerImageAsset(ratpackImage),
            },
            publicLoadBalancer: true,
            desiredCount: 2,
            memoryLimitMiB: 512,
            cpu: 256,
        });

        // 7. Outputs
        new cdk.CfnOutput(this, 'LambdaFunctionName', {
            value: lambdaFunction.functionName,
            description: 'Name of the Lambda function processing SQS messages.',
        });

        new cdk.CfnOutput(this, 'EcsServiceUrl', {
            value: `http://${ratpackImage.repositoryUri}`,
            description: 'Public URL for the ECS service.',
        });
    }
}