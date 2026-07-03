# IoT Rule Troubleshooting Checklist

## 🔍 **Debug Your IoT Rule Setup**

### **Step 1: Verify Rule is Active**
1. **AWS IoT Console** → **Act** → **Rules**
2. Find your rule: `telemetry`
3. **Status**: Should show **Enabled** (not Disabled)

### **Step 2: Check Rule Configuration**
Click on your `telemetry` rule and verify:

**SQL Statement should be:**
```sql
SELECT *, timestamp() as aws_timestamp, topic(3) as sensorID_from_topic FROM 'digitaltwin/sensors/+/telemetry'
```

**DynamoDB Action should have:**
- **Table**: `IoTSensorData`
- **Partition key**: `sensorID` → `${sensorID}`
- **Sort key**: `timestamp` → `${timestamp}`
- **Sort key type**: `NUMBER`

### **Step 3: Test with MQTT Test Client**
1. **AWS IoT Console** → **Test** → **MQTT test client**
2. **Subscribe** to: `digitaltwin/sensors/+/telemetry`
3. **Check**: Are you seeing live messages from your ESP32?
4. **If NO messages**: Your ESP32 isn't sending data
5. **If YES messages**: Your IoT Rule has a problem

### **Step 4: Check CloudWatch Logs**
1. **CloudWatch** → **Log groups**
2. Look for: `/aws/iot/rule/telemetry`
3. **Recent logs** should show rule executions
4. **Errors** will show what's wrong

### **Step 5: Check IAM Role Permissions**
1. **AWS IoT Console** → **Act** → **Rules** → **telemetry**
2. **Actions** → **DynamoDB** action → Check **Role**
3. **IAM Console** → **Roles** → Your role
4. **Permissions** should include:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:PutItem"
            ],
            "Resource": "arn:aws:dynamodb:*:*:table/IoTSensorData"
        }
    ]
}
```

## 🚀 **Quick Tests**

### **Test 1: Manual MQTT Message**
1. **MQTT test client** → **Publish**
2. **Topic**: `digitaltwin/sensors/TestSensor/telemetry`
3. **Message**:
```json
{
  "sensorID": "TestSensor",
  "dataType": "test",
  "timestamp": 1234567890,
  "data": {"value": 42}
}
```
4. **Check DynamoDB**: Should see this test message

### **Test 2: ESP32 Serial Monitor**
Check your ESP32 Serial Monitor for:
```
Published to digitaltwin/sensors/Sensor01/telemetry: {...}
```

## 🔧 **Common Issues & Fixes**

### **Issue 1: Wrong Topic Pattern**
- **Problem**: Rule SQL doesn't match your topic
- **Fix**: Use exact topic: `'digitaltwin/sensors/+/telemetry'`

### **Issue 2: DynamoDB Key Mismatch**
- **Problem**: `${sensorID}` doesn't exist in your JSON
- **Fix**: Check your ESP32 JSON has `sensorID` field

### **Issue 3: IAM Role Missing**
- **Problem**: Rule can't write to DynamoDB
- **Fix**: Attach proper DynamoDB permissions to IoT role

### **Issue 4: Rule Disabled**
- **Problem**: Rule exists but isn't active
- **Fix**: Enable the rule in IoT Console

## 📊 **Expected Data Flow**
```
ESP32 → AWS IoT Core → IoT Rule → DynamoDB
  ✓         ✓           ?         ❌
```

## 🎯 **Next Steps**
1. **Check MQTT test client** - Are messages arriving?
2. **Check CloudWatch logs** - Any rule execution errors?
3. **Test with manual message** - Does rule work with test data?
4. **Verify IAM permissions** - Can rule write to DynamoDB?

Let me know what you find in each step!