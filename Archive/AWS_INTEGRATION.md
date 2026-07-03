# AWS IoT Integration Guide

This guide explains how to set up AWS IoT integration for the Digital Twin Dashboard.

## Architecture Overview

```
ESP32 Sensors → AWS IoT Core → DynamoDB → API Gateway → React Dashboard
```

## AWS Services Used

1. **AWS IoT Core**: MQTT broker for real-time sensor data
2. **DynamoDB**: NoSQL database for sensor data and configuration
3. **API Gateway**: REST API for dashboard communication
4. **Lambda Functions**: Data processing and API endpoints

## DynamoDB Table Structure

### Sensors Table (`dt-sensors`)
```json
{
  "sensorID": "DT_ESP32_001",          // Partition Key
  "sensorName": "Temperature Sensor 1",
  "sensorType": "environmental",
  "isOnline": true,
  "lastSeen": "2024-01-15T10:30:00Z",
  "zoneID": "ZONE_A1",
  "assetID": "ASSET_001",              // Linked 3D asset
  "position": {
    "x": 10.5,
    "y": 5.2,
    "z": 2.1
  },
  "thresholds": {
    "temperature": { "min": 15, "max": 30 },
    "humidity": { "min": 30, "max": 70 }
  },
  "reportingInterval": 300,            // seconds
  "batteryLevel": 85,
  "firmwareVersion": "1.0.0"
}
```

### Sensor Data Table (`dt-sensor-data`)
```json
{
  "sensorID": "DT_ESP32_001",          // Partition Key
  "timestamp": "2024-01-15T10:30:00Z", // Sort Key
  "temperature": 23.5,
  "humidity": 65.2,
  "doorOpen": false,
  "lightLevel": 450,
  "batteryVoltage": 3.7
}
```

## Setup Instructions

### 1. AWS IoT Core Setup

1. Create IoT Thing for each ESP32 sensor
2. Generate certificates and keys
3. Create IoT policy for sensor access
4. Set up IoT rules to route data to DynamoDB

### 2. DynamoDB Setup

Create tables with the following configurations:

```bash
# Sensors table
aws dynamodb create-table \
  --table-name dt-sensors \
  --attribute-definitions \
    AttributeName=sensorID,AttributeType=S \
  --key-schema \
    AttributeName=sensorID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Sensor data table
aws dynamodb create-table \
  --table-name dt-sensor-data \
  --attribute-definitions \
    AttributeName=sensorID,AttributeType=S \
    AttributeName=timestamp,AttributeType=S \
  --key-schema \
    AttributeName=sensorID,KeyType=HASH \
    AttributeName=timestamp,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST
```

### 3. API Gateway Setup

Create REST API with endpoints:
- `GET /sensors` - List all sensors
- `GET /sensors/{id}` - Get sensor details
- `PUT /sensors/{id}` - Update sensor configuration
- `GET /sensors/{id}/data` - Get sensor data history

### 4. Lambda Functions

Create Lambda functions for:
- Sensor CRUD operations
- Data aggregation and statistics
- Real-time data processing

### 5. ESP32 Configuration

Update ESP32 code with:
```cpp
// AWS IoT Configuration
const char* AWS_IOT_ENDPOINT = "your-endpoint.iot.region.amazonaws.com";
const char* WIFI_SSID = "your-wifi-ssid";
const char* WIFI_PASSWORD = "your-wifi-password";

// Device certificates (stored in SPIFFS or hardcoded)
const char* DEVICE_CERTIFICATE = "-----BEGIN CERTIFICATE-----\n...";
const char* DEVICE_PRIVATE_KEY = "-----BEGIN RSA PRIVATE KEY-----\n...";
const char* ROOT_CA = "-----BEGIN CERTIFICATE-----\n...";
```

## Dashboard Configuration

1. Copy `.env.example` to `.env`
2. Configure AWS settings:

```env
REACT_APP_USE_AWS=true
REACT_APP_AWS_REGION=ap-south-1
REACT_APP_API_BASE_URL=https://your-api-gateway-url/prod
```

## Development vs Production

### Development Mode
- Set `REACT_APP_USE_AWS=false`
- Uses mock data for testing
- No AWS credentials required

### Production Mode
- Set `REACT_APP_USE_AWS=true`
- Configure API Gateway endpoint
- Use IAM roles for security
- Enable CORS for dashboard domain

## Security Best Practices

1. **Never expose AWS credentials in browser**
2. **Use API Gateway with proper authentication**
3. **Implement rate limiting**
4. **Use HTTPS for all communications**
5. **Rotate IoT certificates regularly**

## Monitoring and Logging

1. **CloudWatch Logs**: Monitor Lambda function execution
2. **IoT Device Defender**: Monitor device behavior
3. **X-Ray Tracing**: Debug API Gateway and Lambda
4. **DynamoDB Metrics**: Monitor database performance

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Configure API Gateway CORS settings
   - Add dashboard domain to allowed origins

2. **Authentication Failures**
   - Check IoT certificates and policies
   - Verify API Gateway authentication

3. **DynamoDB Access Denied**
   - Check IAM roles and policies
   - Verify table permissions

4. **Real-time Updates Not Working**
   - Check IoT rules configuration
   - Verify WebSocket connections

### Debug Steps

1. Check browser developer console
2. Monitor CloudWatch logs
3. Test API endpoints directly
4. Verify IoT message routing

## Cost Optimization

1. **Use DynamoDB On-Demand pricing** for variable workloads
2. **Implement data retention policies** to reduce storage costs
3. **Use appropriate Lambda memory settings**
4. **Monitor IoT message volumes**

## Future Enhancements

1. **Real-time WebSocket integration**
2. **Advanced analytics and machine learning**
3. **Mobile app integration**
4. **Edge computing with AWS IoT Greengrass**