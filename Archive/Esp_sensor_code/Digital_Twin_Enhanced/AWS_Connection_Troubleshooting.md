# AWS IoT Core Connection Troubleshooting Guide

## Current Issue: ESP32 stuck connecting to AWS IoT Core

Your ESP32 is getting stuck with dots because the AWS connection is failing. Here's how to fix it:

## Quick Diagnosis Steps

### 1. Check Serial Monitor Output
Look for these specific error codes in your Serial Monitor:
- **-4 (timeout)**: Server didn't respond
- **-3 (lost)**: Network connection broken  
- **-2 (failed)**: Can't reach AWS servers
- **4 (bad credentials)**: Certificate problem
- **5 (unauthorized)**: Policy/permissions issue

### 2. Most Common Fixes

#### Fix 1: Get Your Real AWS IoT Endpoint
```cpp
// In your Arduino code, replace this line:
const char* AWS_IOT_ENDPOINT = "a2o2rnz47gsekg-ats.iot.ap-south-1.amazonaws.com";

// With your actual endpoint from AWS Console:
// 1. Go to AWS IoT Console
// 2. Click "Settings" (left sidebar)  
// 3. Copy your "Device data endpoint"
// Example: "a1b2c3d4e5f6g7-ats.iot.us-east-1.amazonaws.com"
```

#### Fix 2: Fix Certificate Format
Your certificates need exact formatting. In your Arduino code:

```cpp
// Make sure certificates look EXACTLY like this:
static const char AWS_CERT_CA[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
MIIDQTCCAimgAwIBAgITBmyfz5m/jAo54vB4ikPmljZbyjANBgkqhkiG9w0BAQsF
ADA5MQswCQYDVQQGEwJVUzEPMA0GA1UEChMGQW1hem9uMRkwFwYDVQQDExBBbWF6
... (your certificate content) ...
-----END CERTIFICATE-----
)EOF";

// NO extra spaces, NO missing dashes, NO line breaks in wrong places
```

#### Fix 3: Create Correct Thing Name
```cpp
// Replace with your actual Thing name from AWS IoT Console
const char* THING_NAME = "ESP32_DigitalTwin_Sensor";  // Must match AWS Console exactly
```

## Step-by-Step Fix Instructions

### Step 1: Get Your AWS Settings
1. **Open AWS IoT Console**: https://console.aws.amazon.com/iot/
2. **Get Endpoint**: Settings → Device data endpoint
3. **Get Thing Name**: Manage → Things → Click your thing → copy the name
4. **Get Certificates**: Manage → Things → Your thing → Security → Download all 3 certificates

### Step 2: Update Arduino Code
Replace these lines in your `Digital_Twin_AWS_IoT.ino`:

```cpp
// Line ~15-17: Replace with YOUR values
const char* AWS_IOT_ENDPOINT = "YOUR-ENDPOINT-ats.iot.YOUR-REGION.amazonaws.com";
const char* THING_NAME = "YOUR-EXACT-THING-NAME";
```

### Step 3: Fix Certificates
Copy-paste your certificates EXACTLY as downloaded:
- **Root CA**: Amazon Root CA 1  
- **Device Certificate**: `xxxxx-certificate.pem.crt`
- **Private Key**: `xxxxx-private.pem.key`

### Step 4: Check IoT Policy
Your Thing needs a policy allowing connections:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "iot:*",
      "Resource": "*"
    }
  ]
}
```

## Test Connection
After making changes:
1. **Upload code** to ESP32
2. **Open Serial Monitor** (115200 baud)
3. **Look for**: "✓ Connected to AWS IoT Core!"
4. **If still failing**: Note the exact error code

## Common Error Solutions

| Error Code | Problem | Solution |
|------------|---------|----------|
| -4 | Timeout | Check endpoint URL and internet |
| -2 | Failed | Verify WiFi and AWS endpoint |
| 4 | Bad credentials | Fix certificate format |
| 5 | Unauthorized | Check IoT policy permissions |

## Still Not Working?

If you're still getting connection errors:

1. **Check WiFi**: Make sure ESP32 connects to WiFi first
2. **Check Region**: Endpoint must match your AWS region  
3. **Check Thing Status**: Thing should be "Active" in AWS Console
4. **Check Policy**: Must be attached to your certificate
5. **Check Certificate**: Must be "Active" status

## Quick Test Commands

To verify your setup, you can test with AWS CLI:
```bash
# Test if your endpoint responds
aws iot describe-endpoint --endpoint-type iot:Data-ATS

# Test your thing exists  
aws iot describe-thing --thing-name YOUR-THING-NAME
```

The key is getting your **exact endpoint**, **exact thing name**, and **properly formatted certificates** from your AWS account.