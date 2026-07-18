# AWS Lambda Deployment Script for Sensor Dashboard (PowerShell)
# This script automates the deployment of Lambda functions and API Gateway setup

param(
    [string]$AwsRegion = "us-east-1",
    [string]$AccountId = "",
    [string]$RoleName = "lambda-dynamodb-sensor-role",
    [string]$ApiName = "sensor-dashboard-api"
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"

Write-Host "🚀 Starting AWS Lambda deployment for Sensor Dashboard" -ForegroundColor $Green

# Check if AWS CLI is configured
try {
    $null = aws sts get-caller-identity 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "AWS CLI not configured"
    }
} catch {
    Write-Host "❌ AWS CLI not configured. Please run 'aws configure' first." -ForegroundColor $Red
    exit 1
}

# Get account ID if not provided
if ([string]::IsNullOrEmpty($AccountId)) {
    $AccountId = aws sts get-caller-identity --query Account --output text
    Write-Host "📋 Using AWS Account ID: $AccountId" -ForegroundColor $Yellow
}

# Function to create IAM role
function Create-IAMRole {
    Write-Host "📝 Creating IAM role: $RoleName" -ForegroundColor $Yellow
    
    # Trust policy
    $trustPolicy = @"
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
"@
    
    $trustPolicy | Out-File -FilePath "trust-policy.json" -Encoding UTF8
    
    # Create role (ignore error if exists)
    aws iam create-role --role-name $RoleName --assume-role-policy-document file://trust-policy.json 2>$null
    
    # Attach basic execution role
    aws iam attach-role-policy --role-name $RoleName --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
    
    # Create custom policy for DynamoDB and IoT
    $customPolicy = @"
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
"@
    
    $customPolicy | Out-File -FilePath "dynamodb-iot-policy.json" -Encoding UTF8
    aws iam put-role-policy --role-name $RoleName --policy-name SensorDashboardPolicy --policy-document file://dynamodb-iot-policy.json
    
    Write-Host "✅ IAM role created successfully" -ForegroundColor $Green
    Start-Sleep -Seconds 10  # Wait for role to propagate
}

# Function to deploy a Lambda function
function Deploy-LambdaFunction {
    param(
        [string]$FunctionName,
        [string]$FilePath
    )
    
    Write-Host "📦 Deploying Lambda function: $FunctionName" -ForegroundColor $Yellow
    
    # Create deployment directory
    $tempDir = "lambda-temp-$FunctionName"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    
    # Copy the function file
    Copy-Item $FilePath "$tempDir\index.js"
    
    # Create deployment package
    Push-Location $tempDir
    Compress-Archive -Path "index.js" -DestinationPath "function.zip" -Force
    Pop-Location
    
    # Deploy to AWS (create or update)
    $createResult = aws lambda create-function --function-name $FunctionName --runtime nodejs18.x --role "arn:aws:iam::${AccountId}:role/$RoleName" --handler index.handler --zip-file "fileb://$tempDir/function.zip" --timeout 30 --region $AwsRegion 2>$null
    
    if ($LASTEXITCODE -ne 0) {
        # Function exists, update it
        aws lambda update-function-code --function-name $FunctionName --zip-file "fileb://$tempDir/function.zip" --region $AwsRegion
    }
    
    # Cleanup
    Remove-Item -Recurse -Force $tempDir
    
    Write-Host "✅ Lambda function $FunctionName deployed" -ForegroundColor $Green
}

# Function to create API Gateway
function Create-APIGateway {
    Write-Host "🌐 Creating API Gateway: $ApiName" -ForegroundColor $Yellow
    
    # Create or get existing REST API
    $apiId = aws apigateway get-rest-apis --query "items[?name=='$ApiName'].id" --output text
    
    if ([string]::IsNullOrEmpty($apiId) -or $apiId -eq "None") {
        $createResult = aws apigateway create-rest-api --name $ApiName --query 'id' --output text
        $apiId = $createResult
    }
    
    if ([string]::IsNullOrEmpty($apiId)) {
        Write-Host "❌ Failed to create or find API Gateway" -ForegroundColor $Red
        exit 1
    }
    
    Write-Host "✅ API Gateway ID: $apiId" -ForegroundColor $Green
    
    # Get root resource ID
    $rootId = aws apigateway get-resources --rest-api-id $apiId --query 'items[?path==`/`].id' --output text
    
    Write-Host "📋 Setting up API Gateway resources..." -ForegroundColor $Yellow
    
    # Create /sensors resource
    $sensorsResult = aws apigateway get-resources --rest-api-id $apiId --query "items[?pathPart=='sensors'].id" --output text 2>$null
    if ([string]::IsNullOrEmpty($sensorsResult) -or $sensorsResult -eq "None") {
        $sensorsId = aws apigateway create-resource --rest-api-id $apiId --parent-id $rootId --path-part sensors --query 'id' --output text
    } else {
        $sensorsId = $sensorsResult
    }
    
    # Create /status resource
    $statusResult = aws apigateway get-resources --rest-api-id $apiId --query "items[?pathPart=='status'].id" --output text 2>$null
    if ([string]::IsNullOrEmpty($statusResult) -or $statusResult -eq "None") {
        $statusId = aws apigateway create-resource --rest-api-id $apiId --parent-id $sensorsId --path-part status --query 'id' --output text
    } else {
        $statusId = $statusResult
    }
    
    # Create /latest resource
    $latestResult = aws apigateway get-resources --rest-api-id $apiId --query "items[?pathPart=='latest'].id" --output text 2>$null
    if ([string]::IsNullOrEmpty($latestResult) -or $latestResult -eq "None") {
        $latestId = aws apigateway create-resource --rest-api-id $apiId --parent-id $statusId --path-part latest --query 'id' --output text
    } else {
        $latestId = $latestResult
    }
    
    # Create GET method and integration for /sensors/status/latest
    aws apigateway put-method --rest-api-id $apiId --resource-id $latestId --http-method GET --authorization-type NONE --no-api-key-required 2>$null
    
    $integrationUri = "arn:aws:apigateway:${AwsRegion}:lambda:path/2015-03-31/functions/arn:aws:lambda:${AwsRegion}:${AccountId}:function:getLatestSensorStatus/invocations"
    aws apigateway put-integration --rest-api-id $apiId --resource-id $latestId --http-method GET --type AWS_PROXY --integration-http-method POST --uri $integrationUri 2>$null
    
    # Grant API Gateway permission to invoke Lambda
    $statementId = "api-gateway-invoke-$(Get-Date -Format 'yyyyMMddHHmmss')"
    $sourceArn = "arn:aws:execute-api:${AwsRegion}:${AccountId}:${apiId}/*/*"
    aws lambda add-permission --function-name getLatestSensorStatus --statement-id $statementId --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn $sourceArn 2>$null
    
    # Deploy API
    aws apigateway create-deployment --rest-api-id $apiId --stage-name prod
    
    Write-Host "✅ API Gateway deployed successfully" -ForegroundColor $Green
    $apiEndpoint = "https://$apiId.execute-api.$AwsRegion.amazonaws.com/prod"
    Write-Host "🔗 API Endpoint: $apiEndpoint" -ForegroundColor $Green
    
    # Update .env file
    if (Test-Path ".env") {
        $envContent = Get-Content ".env"
        $newEnvContent = $envContent -replace "VITE_AWS_API_BASE_URL=.*", "VITE_AWS_API_BASE_URL=$apiEndpoint"
        $newEnvContent | Set-Content ".env"
        Write-Host "✅ Updated .env file with API endpoint" -ForegroundColor $Green
    }
    
    return $apiEndpoint
}

# Main deployment process
Write-Host "🎯 Starting deployment process..." -ForegroundColor $Green

# Check if lambda-functions directory exists
if (-not (Test-Path "lambda-functions")) {
    Write-Host "❌ lambda-functions directory not found. Please run this script from the project root directory." -ForegroundColor $Red
    exit 1
}

# Create IAM role
Create-IAMRole

# Deploy Lambda functions
Deploy-LambdaFunction -FunctionName "getLatestSensorStatus" -FilePath "lambda-functions\getLatestSensorStatus.js"
Deploy-LambdaFunction -FunctionName "getRecentTelemetry" -FilePath "lambda-functions\getRecentTelemetry.js"
Deploy-LambdaFunction -FunctionName "getSensorHistory" -FilePath "lambda-functions\getSensorHistory.js"
Deploy-LambdaFunction -FunctionName "updateSensorConfig" -FilePath "lambda-functions\updateSensorConfig.js"

# Create API Gateway
$apiEndpoint = Create-APIGateway

Write-Host "🎉 Deployment completed successfully!" -ForegroundColor $Green
Write-Host "📋 Next steps:" -ForegroundColor $Yellow
Write-Host "1. Update your .env file with VITE_USE_REAL_AWS=true"
Write-Host "2. Test the API endpoint: $apiEndpoint/sensors/status/latest"
Write-Host "3. Run 'npm run dev' to test the integration"

# Cleanup
Remove-Item -Path "trust-policy.json" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "dynamodb-iot-policy.json" -Force -ErrorAction SilentlyContinue

Write-Host "🚀 Ready to connect to your real ESP32 sensor data!" -ForegroundColor $Green