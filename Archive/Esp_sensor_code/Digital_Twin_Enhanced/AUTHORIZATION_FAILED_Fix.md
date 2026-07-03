# AUTHORIZATION_FAILED - Fix Guide

## 🎯 **Your Exact Problem Identified**

AWS Event Log shows:
```json
{
  "eventType": "connect_failed",
  "connectFailureReason": "AUTHORIZATION_FAILED",
  "clientId": "ESP32_DigitalTwin_Sensor",
  "principalIdentifier": "d1a8fe9a89100c0cb971a42b2b3eca070ae8302b2e66585c02bb65526311c758"
}
```

**Good News**: Your ESP32 is successfully reaching AWS IoT Core!
**Problem**: Your certificate/policy setup has authorization issues.

## 🔧 **Step-by-Step Fix**

### Step 1: Check IoT Policy
1. **AWS IoT Console** → **Secure** → **Policies**
2. Find your policy (likely named after your Thing)
3. **Edit** the policy to this:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iot:Connect",
        "iot:Publish",
        "iot:Subscribe",
        "iot:Receive"
      ],
      "Resource": [
        "arn:aws:iot:*:*:client/ESP32_DigitalTwin_Sensor",
        "arn:aws:iot:*:*:topic/digitaltwin/sensors/*",
        "arn:aws:iot:*:*:topicfilter/digitaltwin/sensors/*"
      ]
    }
  ]
}
```

### Step 2: Verify Certificate Attachment
1. **AWS IoT Console** → **Manage** → **Things**
2. Click **ESP32_DigitalTwin_Sensor**
3. Go to **Security** tab
4. Make sure you see:
   - ✅ **Certificate** (Status: Active)
   - ✅ **Policy attached** to the certificate

### Step 3: Check Certificate Status
1. Click on your **Certificate**
2. Verify:
   - **Status**: Must be **ACTIVE** (not Inactive/Revoked)
   - **Policies**: Your policy should be listed and attached

### Step 4: Fix Client ID Match
Your Arduino code MUST use the exact client ID:
```cpp
const char* THING_NAME = "ESP32_DigitalTwin_Sensor";  // Must match exactly
```

## 🚨 **Most Likely Issues**

### Issue 1: Policy Too Restrictive
**Problem**: Your policy doesn't allow the `iot:Connect` action
**Fix**: Use the policy JSON above

### Issue 2: Certificate Not Attached to Policy
**Problem**: Certificate exists but policy isn't attached
**Fix**: 
1. Go to certificate → **Policies** tab
2. **Attach** your policy to the certificate

### Issue 3: Wrong Resource ARNs
**Problem**: Policy allows connection but to wrong resources
**Fix**: Make sure ARNs match your actual AWS account/region

## 🔍 **Quick Verification Steps**

### Check Your Setup:
1. **Thing Name**: `ESP32_DigitalTwin_Sensor` ✓
2. **Client ID in Code**: Must match Thing name exactly
3. **Certificate**: Active status
4. **Policy**: Attached to certificate
5. **Policy Permissions**: Allows `iot:Connect` action

### Test Connection:
After fixing policy:
1. **Upload** updated code to ESP32
2. **Check Serial Monitor** for: "✓ Connected to AWS IoT Core!"
3. **AWS Console** → **Test** → **MQTT test client** → Subscribe to `digitaltwin/sensors/+/data`

## 📋 **Policy Template for Your Thing**

Replace this policy (customize region/account if needed):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "iot:Connect",
      "Resource": "arn:aws:iot:ap-south-1:*:client/ESP32_DigitalTwin_Sensor"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iot:Publish",
        "iot:Subscribe",
        "iot:Receive"
      ],
      "Resource": [
        "arn:aws:iot:ap-south-1:*:topic/digitaltwin/sensors/*",
        "arn:aws:iot:ap-south-1:*:topicfilter/digitaltwin/sensors/*"
      ]
    }
  ]
}
```

## ✅ **ISSUE RESOLVED - SUCCESS!**

**Result after applying the permissive policy:**
1. **Serial Monitor**: "✓ Connected to AWS IoT Core!" ✅
2. **AWS CloudWatch**: `connect_success` events ✅
3. **MQTT Test Client**: Receiving sensor data ✅
4. **DynamoDB**: Sensor data being automatically saved ✅

## 📊 **Working Configuration**
- **IoT Policy**: Permissive policy allowing all IoT actions
- **IoT Rule**: `telemetry` rule with SQL: `SELECT *, timestamp() as aws_timestamp FROM 'digitaltwin/sensors/+/telemetry'`
- **DynamoDB Table**: `IoTSensorData` receiving real-time sensor data
- **Data Flow**: ESP32 → AWS IoT Core → IoT Rule → DynamoDB (all working!)

**The authorization failure was resolved by using a permissive IoT policy.**