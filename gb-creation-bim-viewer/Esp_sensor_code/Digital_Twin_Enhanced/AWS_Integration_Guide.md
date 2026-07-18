# ESP32 to AWS Integration Guide

## Overview
This guide shows you how to connect your ESP32 Digital Twin sensor to AWS cloud services. You have two main options:

1. **AWS IoT Core (MQTT)** - Most secure, bidirectional communication
2. **AWS API Gateway + Lambda (HTTP/HTTPS)** - Simpler setup, unidirectional

## Option 1: AWS IoT Core Setup (Recommended)

### 1. AWS Console Setup

#### A. Create an IoT Thing
1. Go to AWS IoT Core console
2. Navigate to "Manage" → "Things"
3. Click "Create thing"
4. Choose "Create single thing"
5. Name: `ESP32_DigitalTwin_Sensor`
6. Create the thing

#### B. Create and Download Certificates
1. In the thing details, go to "Certificates"
2. Click "Create certificate"
3. Download:
   - Device certificate (xxx-certificate.pem.crt)
   - Private key (xxx-private.pem.key)
   - Amazon Root CA 1 (from AWS documentation)

#### C. Create IoT Policy
1. Go to "Secure" → "Policies"
2. Create policy named `ESP32DigitalTwinPolicy`
3. Policy document (tested and working):
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

**Note**: This is a permissive policy for testing. For production, use more restrictive permissions.

#### D. Attach Policy to Certificate
1. Go to certificate details
2. Click "Attach policy"
3. Select `ESP32DigitalTwinPolicy`

### 2. ESP32 Code Setup

#### A. Install Required Libraries
In Arduino IDE, install:
- `PubSubClient` by Nick O'Leary
- `ArduinoJson` by Benoit Blanchon
- `WiFiClientSecure`

#### B. Update Certificate Information
1. Open `Digital_Twin_AWS_IoT.ino`
2. Replace the certificate constants:

```cpp
const char* AWS_IOT_ENDPOINT = "your-endpoint.iot.region.amazonaws.com";

const char AWS_CERT_CA[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
[Paste Amazon Root CA 1 certificate content here]
-----END CERTIFICATE-----
)EOF";

const char AWS_CERT_CRT[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
[Paste your device certificate content here]
-----END CERTIFICATE-----
)EOF";

const char AWS_CERT_PRIVATE[] PROGMEM = R"EOF(
-----BEGIN RSA PRIVATE KEY-----
[Paste your private key content here]
-----END RSA PRIVATE KEY-----
)EOF";
```

#### C. Find Your IoT Endpoint
1. In AWS IoT Core console, go to "Settings"
2. Copy the "Endpoint" URL
3. Update `AWS_IOT_ENDPOINT` in your code

### 3. MQTT Topics Structure
Your sensor will use these topics:
- **Telemetry**: `digitaltwin/sensors/{sensorID}/telemetry`
- **Status**: `digitaltwin/sensors/{sensorID}/status`
- **Commands**: `digitaltwin/sensors/{sensorID}/commands`

---

## Option 2: AWS API Gateway + Lambda Setup (Simpler)

### 1. AWS Lambda Function

#### A. Create Lambda Function
1. Go to AWS Lambda console
2. Create function: `digital-twin-sensor-handler`
3. Runtime: Node.js 18.x or Python 3.9
4. Paste this code (Node.js):

```javascript
exports.handler = async (event) => {
    console.log('Received sensor data:', JSON.stringify(event, null, 2));
    
    const response = {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-API-Key',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify({
            message: 'Sensor data received successfully',
            timestamp: new Date().toISOString(),
            sensorId: event.sensorId || 'unknown'
        })
    };
    
    // Here you can:
    // 1. Store data in DynamoDB
    // 2. Send to CloudWatch
    // 3. Trigger other AWS services
    // 4. Send notifications
    
    return response;
};
```

#### B. Create API Gateway
1. Go to API Gateway console
2. Create REST API
3. Create resources:
   - `/sensors` (POST)
   - `/sensor-data` (POST)
   - `/sensors/{sensorId}/heartbeat` (POST)

4. For each resource:
   - Method: POST
   - Integration: Lambda Function
   - Select your Lambda function
   - Enable CORS

#### C. Deploy API
1. Click "Deploy API"
2. Stage: `prod`
3. Note the Invoke URL

### 2. ESP32 Setup for API Gateway
1. Use `Digital_Twin_AWS_API.ino`
2. Update the endpoint:
```cpp
String AWS_API_ENDPOINT = "https://your-api-id.execute-api.region.amazonaws.com/prod";
```

---

## Configuration Steps

### 1. Hardware Setup
- Connect DHT22 to pin 4
- Connect LDR to pin 13
- Connect door sensor to pin 19
- Connect config switch to pin 25

### 2. Initial Configuration
1. Upload the code to ESP32
2. Press and hold config switch for 3 seconds
3. Connect to WiFi: `ESP32_DigitalTwin`
4. Go to 192.168.4.1
5. Configure:
   - WiFi credentials
   - AWS settings
   - Sensor information

### 3. Testing
1. Monitor Serial console
2. Check AWS CloudWatch logs
3. Verify data in AWS IoT Core test client or API Gateway logs

---

## Data Format

### Sensor Data Structure
```json
{
  "sensorId": "ESP32_ABC123",
  "dataType": "tempAndHumi",
  "timestamp": 123456789,
  "zoneId": "Zone1",
  "assetId": "BIM_ASSET_001",
  "data": {
    "temperature": 25.6,
    "humidity": 60.2
  }
}
```

### Heartbeat Structure
```json
{
  "sensorId": "ESP32_ABC123",
  "timestamp": 123456789,
  "uptime": 3600,
  "freeHeap": 180000,
  "rssi": -45,
  "temperature": 25.6,
  "humidity": 60.2,
  "doorState": 0,
  "lightState": 1
}
```

---

## Troubleshooting

### Common Issues
1. **Certificate errors**: Ensure certificates are properly formatted
2. **Connection timeout**: Check AWS endpoint URL
3. **Policy errors**: Verify IoT policy allows required actions
4. **Memory issues**: ESP32 may run out of memory with large certificates

### Serial Monitor Messages
- `AWS IoT Connected!` - Successful connection
- `AWS IoT Timeout!` - Connection failed
- `Published to topic` - Data sent successfully

### AWS Console Monitoring
1. **IoT Core**: Monitor in "Test" section
2. **CloudWatch**: Check Lambda logs
3. **API Gateway**: Monitor in "Stages" logs

---

## Security Best Practices

1. **Use proper certificates** (not self-signed in production)
2. **Rotate certificates** regularly
3. **Limit IoT policy** to minimum required permissions
4. **Use API Keys** for API Gateway
5. **Enable CloudTrail** for audit logging
6. **Monitor unusual activity** in CloudWatch

---

## ✅ COMPLETED SETUP

### **Working Configuration**
- **ESP32**: Successfully connected to AWS IoT Core
- **Data Storage**: DynamoDB table `IoTSensorData` receiving sensor data
- **IoT Rule**: `telemetry` rule processing all telemetry messages
- **Topics**: `digitaltwin/sensors/{sensorID}/telemetry` and `/status`

### **Verified Components**
- ✅ WiFi connection working
- ✅ AWS IoT Core authentication successful  
- ✅ MQTT publishing functional
- ✅ IoT Rule SQL processing data correctly
- ✅ DynamoDB storage active and receiving data

## Next Steps

1. **✅ Data Storage**: DynamoDB integration complete
2. **Visualization**: Connect to QuickSight or Grafana dashboard
3. **Alerts**: Set up CloudWatch alarms for sensor thresholds
4. **Fleet Management**: Use AWS IoT Device Management for multiple sensors
5. **OTA Updates**: Implement firmware updates via AWS IoT Jobs

## Cost Estimation

### AWS IoT Core
- Messages: $1.00 per million messages
- Device connectivity: $0.08 per million connection-minutes

### API Gateway + Lambda
- API calls: $3.50 per million requests
- Lambda: $0.20 per 1M requests + compute time

For typical sensor usage (1 message/minute), monthly cost: ~$0.50-$2.00