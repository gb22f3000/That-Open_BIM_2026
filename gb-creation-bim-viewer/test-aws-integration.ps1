# Test AWS Integration Script
# This script helps test the deployed Lambda functions and API Gateway

param(
    [string]$ApiEndpoint = "",
    [switch]$TestLocal = $false
)

$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"

Write-Host "🧪 Testing AWS Integration for Sensor Dashboard" -ForegroundColor $Green

if ($TestLocal) {
    Write-Host "🔧 Testing local development mode..." -ForegroundColor $Yellow
    
    # Check if development server is running
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5173" -Method GET -TimeoutSec 5
        Write-Host "✅ Development server is running on localhost:5173" -ForegroundColor $Green
    } catch {
        Write-Host "❌ Development server not running. Run 'npm run dev' first." -ForegroundColor $Red
    }
    
    # Test mock API endpoints
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3001/api/sensors/status" -Method GET -TimeoutSec 5
        Write-Host "✅ Mock API endpoint responding" -ForegroundColor $Green
        Write-Host "   Sensors found: $($response.sensors.Count)" -ForegroundColor $Yellow
    } catch {
        Write-Host "⚠️  Mock API not available (this is expected if using real AWS)" -ForegroundColor $Yellow
    }
} else {
    if ([string]::IsNullOrEmpty($ApiEndpoint)) {
        Write-Host "❌ Please provide API endpoint with -ApiEndpoint parameter" -ForegroundColor $Red
        Write-Host "   Example: .\test-aws-integration.ps1 -ApiEndpoint 'https://abc123.execute-api.us-east-1.amazonaws.com/prod'" -ForegroundColor $Yellow
        exit 1
    }
    
    Write-Host "🌐 Testing AWS API Gateway endpoints..." -ForegroundColor $Yellow
    Write-Host "   API Endpoint: $ApiEndpoint" -ForegroundColor $Yellow
    
    # Test latest sensor status endpoint
    try {
        Write-Host "Testing /sensors/status/latest..." -ForegroundColor $Yellow
        $response = Invoke-RestMethod -Uri "$ApiEndpoint/sensors/status/latest" -Method GET -TimeoutSec 10
        
        if ($response.success) {
            Write-Host "✅ Latest sensor status endpoint working" -ForegroundColor $Green
            Write-Host "   Total sensors: $($response.totalSensors)" -ForegroundColor $Yellow
            Write-Host "   Online sensors: $($response.onlineSensors)" -ForegroundColor $Yellow
            
            if ($response.sensors.Count -gt 0) {
                $sensor = $response.sensors[0]
                Write-Host "   Sample sensor: $($sensor.sensorID) ($($sensor.sensorName))" -ForegroundColor $Yellow
                Write-Host "   Online: $($sensor.isOnline), Last update: $($sensor.lastUpdate)" -ForegroundColor $Yellow
            }
        } else {
            Write-Host "❌ API returned error: $($response.error)" -ForegroundColor $Red
        }
    } catch {
        Write-Host "❌ Error testing latest sensor status: $($_.Exception.Message)" -ForegroundColor $Red
        Write-Host "   Check Lambda function logs in CloudWatch" -ForegroundColor $Yellow
    }
    
    # Test recent telemetry endpoint
    try {
        Write-Host "`nTesting /sensors/telemetry/recent..." -ForegroundColor $Yellow
        $response = Invoke-RestMethod -Uri "$ApiEndpoint/sensors/telemetry/recent?hours=1" -Method GET -TimeoutSec 10
        
        if ($response.success) {
            Write-Host "✅ Recent telemetry endpoint working" -ForegroundColor $Green
            Write-Host "   Total readings: $($response.totalReadings)" -ForegroundColor $Yellow
            Write-Host "   Time range: $($response.timeRange.hours) hours" -ForegroundColor $Yellow
            
            if ($response.telemetry.Count -gt 0) {
                $reading = $response.telemetry[0]
                Write-Host "   Latest reading from: $($reading.sensorID)" -ForegroundColor $Yellow
                Write-Host "     Temperature: $($reading.data.temperature)°C" -ForegroundColor $Yellow
                Write-Host "     Humidity: $($reading.data.humidity)%" -ForegroundColor $Yellow
                Write-Host "     Door: $($reading.data.doorState), Light: $($reading.data.lightState)" -ForegroundColor $Yellow
            }
        } else {
            Write-Host "❌ API returned error: $($response.error)" -ForegroundColor $Red
        }
    } catch {
        Write-Host "❌ Error testing recent telemetry: $($_.Exception.Message)" -ForegroundColor $Red
    }
    
    # Test CORS
    try {
        Write-Host "`nTesting CORS configuration..." -ForegroundColor $Yellow
        $headers = @{
            'Origin' = 'http://localhost:5173'
            'Access-Control-Request-Method' = 'GET'
            'Access-Control-Request-Headers' = 'Content-Type'
        }
        
        $response = Invoke-WebRequest -Uri "$ApiEndpoint/sensors/status/latest" -Method OPTIONS -Headers $headers -TimeoutSec 5
        
        if ($response.Headers.'Access-Control-Allow-Origin') {
            Write-Host "✅ CORS headers present" -ForegroundColor $Green
            Write-Host "   Allow-Origin: $($response.Headers.'Access-Control-Allow-Origin')" -ForegroundColor $Yellow
        } else {
            Write-Host "⚠️  CORS headers missing - this may cause browser issues" -ForegroundColor $Yellow
        }
    } catch {
        Write-Host "⚠️  Could not test CORS (this might be expected)" -ForegroundColor $Yellow
    }
}

Write-Host "`n🔍 Checking environment configuration..." -ForegroundColor $Yellow

if (Test-Path ".env") {
    $envContent = Get-Content ".env"
    $useRealAws = $envContent | Where-Object { $_ -match "VITE_USE_REAL_AWS=true" -and $_ -notmatch "^#" }
    $apiBaseUrl = $envContent | Where-Object { $_ -match "VITE_AWS_API_BASE_URL=" -and $_ -notmatch "^#" }
    
    if ($useRealAws) {
        Write-Host "✅ Real AWS integration enabled in .env" -ForegroundColor $Green
    } else {
        Write-Host "⚠️  Real AWS integration not enabled in .env" -ForegroundColor $Yellow
        Write-Host "   To enable, uncomment VITE_USE_REAL_AWS=true in .env" -ForegroundColor $Yellow
    }
    
    if ($apiBaseUrl) {
        $url = ($apiBaseUrl -split "=")[1]
        Write-Host "✅ API base URL configured: $url" -ForegroundColor $Green
    } else {
        Write-Host "⚠️  API base URL not configured in .env" -ForegroundColor $Yellow
    }
} else {
    Write-Host "❌ .env file not found" -ForegroundColor $Red
}

Write-Host "`n📋 Next steps based on test results:" -ForegroundColor $Yellow

if (-not $TestLocal -and -not [string]::IsNullOrEmpty($ApiEndpoint)) {
    Write-Host "1. If tests passed, update .env:" -ForegroundColor $Yellow
    Write-Host "   - Uncomment VITE_USE_REAL_AWS=true" -ForegroundColor $Yellow
    Write-Host "   - Set VITE_AWS_API_BASE_URL=$ApiEndpoint" -ForegroundColor $Yellow
    Write-Host "2. Run 'npm run dev' to test the dashboard with real data" -ForegroundColor $Yellow
    Write-Host "3. Verify your ESP32 is sending data to IoT Core" -ForegroundColor $Yellow
} else {
    Write-Host "1. Deploy Lambda functions using deploy-aws.ps1" -ForegroundColor $Yellow
    Write-Host "2. Run this test again with the API endpoint" -ForegroundColor $Yellow
    Write-Host "3. Configure environment variables for real AWS integration" -ForegroundColor $Yellow
}

Write-Host "`n🚀 Testing complete!" -ForegroundColor $Green