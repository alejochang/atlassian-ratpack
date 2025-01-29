# **CDK Deployment 🚀**

## **Step 1: Prerequisites**
Ensure the following are installed:
1. **AWS CLI**: [Install AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
2. **AWS CDK CLI**:
   ```bash
   npm install -g aws-cdk
   ```
3. **Node.js** (v18 or later): [Install Node.js](https://nodejs.org/)
4. **Java JDK 11+**: For the Ratpack service
5. **Docker**: For building and deploying containers.

---

## **Step 2: Project Structure**
The project should have the following structure:
```
atlassian-ratpack-cdk/
│
├── cdk/
│   ├── bin/
│   │   └── cdk.ts                       # CDK entry file
│   ├── lib/
│   │   └── atlassian-ratpack-stack.ts   # CDK stack for both services
│   ├── cdk.json
│   └── package.json  
├── atlassian-marketplace-lambda/   # Lambda service code
│   ├── app.ts                      # Lambda function code
│   ├── package.json
│   ├── tsconfig.json
│   ├── dist/                       # Compiled output for Lambda (created after build)
│   └── template.yaml               # SAM template for Lambda
├── ratpack-service/                # Ratpack service code
│   ├── Dockerfile                  # Dockerfile for Ratpack service
└── └── build/libs/ratpack-service.jar  # JAR file for Ratpack service
                    
```

---

## **Step 3: Prepare the Lambda Function**
1. **Build the Lambda Function**:
   Navigate to `atlassian-marketplace-lambda/` and run:
   ```bash
   npm install
   npm run build
   ```

   This will compile `app.ts` into `dist/app.js`.

2. **Validate the SAM Template**:
   Ensure `template.yaml` is pointing to the correct handler:
   ```yaml
   Handler: dist/app.lambdaHandler
   ```

---

## **Step 4: Build the Ratpack Service**
1. Navigate to the `ratpack-service/` directory and build the JAR file:
   ```bash
   ./gradlew clean build
   ```

2. Ensure the JAR file exists at:
   ```
   ratpack-service/build/libs/ratpack-service.jar
   ```

3. Test the Docker build locally:
   ```bash
   docker build -t ratpack-service .
   ```

---

## **Step 5: Deploy Using CDK**
1. **Bootstrap Your AWS Environment** (if not already done):
   ```bash
   cdk bootstrap aws://<AWS_ACCOUNT_ID>/<AWS_REGION>
   ```

2. **Deploy the CDK Stack**:
   ```bash
   cdk deploy
   ```

---

## **Step 6: Deploy the Lambda Manually**
Navigate to the **`atlassian-marketplace-lambda/`** directory and:
1. **Build the Lambda**:
   ```bash
   npm run build
   ```
2. **Deploy Using SAM**:
   ```bash
   sam build
   sam deploy --guided
   ```

During deployment:
- Set **SQS ARN** to `arn:aws:sqs:us-east-1:<AWS_ACCOUNT_ID>:lambda-atlassian-standard`.

---

## **Step 7: Test and Verify**
### **Test Ratpack Service**
1. Retrieve the **public ALB URL** from the `cdk deploy` output.
2. Test the Ratpack service using Postman or curl:
   ```bash
   curl http://<ALB_URL>
   ```

### **Test Lambda with SQS**
1. Send a test message to SQS:
   ```bash
   aws sqs send-message \
     --queue-url https://sqs.us-east-1.amazonaws.com/<AWS_ACCOUNT_ID>/lambda-atlassian-standard \
     --message-body '{"addon":"com.adaptavist.cloud.search"}'
   ```

2. Check Lambda logs:
   ```bash
   sam logs --name AtlassianMarketplaceLambda --stack-name atlassian-marketplace-stack --tail
   ```

---