#!/bin/bash

# AWS Lambda Deployment Script for Sensor Dashboard
# This script automates the deployment of Lambda functions and API Gateway setup

set -e

# Configuration - Update these values
AWS_REGION="us-east-1"
ACCOUNT_ID=""  # Your AWS Account ID
ROLE_NAME="lambda-dynamodb-sensor-role"
API_NAME="sensor-dashboard-api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting AWS Lambda deployment for Sensor Dashboard${NC}"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo -e "${RED}❌ AWS CLI not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Get account ID if not provided
if [ -z "$ACCOUNT_ID" ]; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    echo -e "${YELLOW}📋 Using AWS Account ID: $ACCOUNT_ID${NC}"
fi

# Function to create IAM role
create_iam_role() {
    echo -e "${YELLOW}📝 Creating IAM role: $ROLE_NAME${NC}"
    
    # Trust policy
    cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    # Create role
    aws iam create-role --role-name $ROLE_NAME --assume-role-policy-document file://trust-policy.json || echo "Role may already exist"
    
    # Attach basic execution role
    aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    
    # Create custom policy for DynamoDB and IoT
    cat > dynamodb-iot-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:UpdateItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/IoTSensorData",
        "arn:aws:dynamodb:*:*:table/IoTSensorStatus",
        "arn:aws:dynamodb:*:*:table/IoTSensorData/index/*",
        "arn:aws:dynamodb:*:*:table/IoTSensorStatus/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "iot:Publish"
      ],
      "Resource": "arn:aws:iot:*:*:topic/digitaltwin/sensors/*/commands"
    }
  ]
}
EOF

    aws iam put-role-policy --role-name $ROLE_NAME --policy-name SensorDashboardPolicy --policy-document file://dynamodb-iot-policy.json
    
    echo -e "${GREEN}✅ IAM role created successfully${NC}"
    sleep 10  # Wait for role to propagate
}

# Function to deploy a Lambda function
deploy_lambda_function() {
    local function_name=$1
    local handler_code=$2
    
    echo -e "${YELLOW}📦 Deploying Lambda function: $function_name${NC}"
    
    # Create deployment directory
    mkdir -p lambda-temp
    cd lambda-temp
    
    # Write the handler code
    echo "$handler_code" > index.js
    
    # Create deployment package
    zip -r function.zip index.js
    
    # Deploy to AWS
    aws lambda create-function \
        --function-name $function_name \
        --runtime nodejs18.x \
        --role arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME \
        --handler index.handler \
        --zip-file fileb://function.zip \
        --timeout 30 \
        --region $AWS_REGION || \
    aws lambda update-function-code \
        --function-name $function_name \
        --zip-file fileb://function.zip \
        --region $AWS_REGION
    
    cd ..
    rm -rf lambda-temp
    
    echo -e "${GREEN}✅ Lambda function $function_name deployed${NC}"
}

# Function to create API Gateway
create_api_gateway() {
    echo -e "${YELLOW}🌐 Creating API Gateway: $API_NAME${NC}"
    
    # Create REST API
    API_ID=$(aws apigateway create-rest-api --name $API_NAME --query 'id' --output text 2>/dev/null || aws apigateway get-rest-apis --query "items[?name=='$API_NAME'].id" --output text)
    
    if [ -z "$API_ID" ]; then
        echo -e "${RED}❌ Failed to create or find API Gateway${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ API Gateway created with ID: $API_ID${NC}"
    
    # Get root resource ID
    ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[?path==`/`].id' --output text)
    
    # Create resources and methods (simplified version)
    echo -e "${YELLOW}📋 Setting up API Gateway resources...${NC}"
    
    # Create /sensors resource
    SENSORS_ID=$(aws apigateway create-resource --rest-api-id $API_ID --parent-id $ROOT_ID --path-part sensors --query 'id' --output text 2>/dev/null || aws apigateway get-resources --rest-api-id $API_ID --query "items[?pathPart=='sensors'].id" --output text)
    
    # Create /status resource
    STATUS_ID=$(aws apigateway create-resource --rest-api-id $API_ID --parent-id $SENSORS_ID --path-part status --query 'id' --output text 2>/dev/null || aws apigateway get-resources --rest-api-id $API_ID --query "items[?pathPart=='status'].id" --output text)
    
    # Create /latest resource
    LATEST_ID=$(aws apigateway create-resource --rest-api-id $API_ID --parent-id $STATUS_ID --path-part latest --query 'id' --output text 2>/dev/null || aws apigateway get-resources --rest-api-id $API_ID --query "items[?pathPart=='latest'].id" --output text)
    
    # Create GET method and integration for /sensors/status/latest
    aws apigateway put-method --rest-api-id $API_ID --resource-id $LATEST_ID --http-method GET --authorization-type NONE --no-api-key-required 2>/dev/null || true
    
    aws apigateway put-integration \
        --rest-api-id $API_ID \
        --resource-id $LATEST_ID \
        --http-method GET \
        --type AWS_PROXY \
        --integration-http-method POST \
        --uri arn:aws:apigateway:$AWS_REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$AWS_REGION:$ACCOUNT_ID:function:getLatestSensorStatus/invocations 2>/dev/null || true
    
    # Grant API Gateway permission to invoke Lambda
    aws lambda add-permission \
        --function-name getLatestSensorStatus \
        --statement-id api-gateway-invoke-$(date +%s) \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:$AWS_REGION:$ACCOUNT_ID:$API_ID/*/*" 2>/dev/null || true
    
    # Deploy API
    aws apigateway create-deployment --rest-api-id $API_ID --stage-name prod
    
    echo -e "${GREEN}✅ API Gateway deployed successfully${NC}"
    echo -e "${GREEN}🔗 API Endpoint: https://$API_ID.execute-api.$AWS_REGION.amazonaws.com/prod${NC}"
    
    # Update .env file
    if [ -f ".env" ]; then
        sed -i.bak "s|VITE_AWS_API_BASE_URL=.*|VITE_AWS_API_BASE_URL=https://$API_ID.execute-api.$AWS_REGION.amazonaws.com/prod|" .env
        echo -e "${GREEN}✅ Updated .env file with API endpoint${NC}"
    fi
}

# Main deployment process
main() {
    echo -e "${GREEN}🎯 Starting deployment process...${NC}"
    
    # Check if aws-lambda-functions.js exists
    if [ ! -f "aws-lambda-functions.js" ]; then
        echo -e "${RED}❌ aws-lambda-functions.js not found. Please run this script from the project root directory.${NC}"
        exit 1
    fi
    
    # Create IAM role
    create_iam_role
    
    # Extract and deploy Lambda functions
    echo -e "${YELLOW}📤 Extracting Lambda functions from aws-lambda-functions.js...${NC}"
    
    # Deploy getLatestSensorStatus function
    GET_LATEST_CODE=$(sed -n '/exports\.getLatestSensorStatus = async/,/^};$/p' aws-lambda-functions.js)
    deploy_lambda_function "getLatestSensorStatus" "$GET_LATEST_CODE"
    
    # Note: For a complete deployment, you would extract and deploy all functions
    # This is a simplified version focusing on the main function
    
    # Create API Gateway
    create_api_gateway
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${YELLOW}📋 Next steps:${NC}"
    echo -e "1. Update your .env file with VITE_USE_REAL_AWS=true"
    echo -e "2. Test the API endpoint: https://$API_ID.execute-api.$AWS_REGION.amazonaws.com/prod/sensors/status/latest"
    echo -e "3. Run 'npm run dev' to test the integration"
    
    # Cleanup
    rm -f trust-policy.json dynamodb-iot-policy.json
}

# Run main function
main "$@"