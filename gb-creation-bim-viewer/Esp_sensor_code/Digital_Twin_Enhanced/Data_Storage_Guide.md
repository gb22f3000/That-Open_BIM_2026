# Where Is Your ESP32 Data Being Saved?

## 🔍 **Current Status: Data NOT Permanently Stored**

Your ESP32 is successfully sending data to these AWS IoT Core topics:
- `digitaltwin/sensors/Sensor01/telemetry` - Sensor readings
- `digitaltwin/sensors/Sensor01/status` - Device health data

**However**: AWS IoT Core is just a **message broker** - it receives and forwards messages but **doesn't store them permanently**.

## 📊 **Where You Can See Your Data Right Now**

### 1. AWS IoT Core Test Client (Live Data Only)
1. **AWS IoT Console** → **Test** → **MQTT test client**
2. **Subscribe** to: `digitaltwin/sensors/+/telemetry`
3. **Subscribe** to: `digitaltwin/sensors/+/status`
4. You'll see live data as it arrives (but it disappears)

### 2. CloudWatch Logs (Temporary)
- AWS IoT Core may log some activity to CloudWatch
- **Retention**: Usually 7-30 days
- **Location**: CloudWatch → Logs → `/aws/iot/` log groups

## ✅ **DATA STORAGE IS NOW WORKING!**

Your ESP32 sensor data is being automatically saved to AWS DynamoDB!

### ✅ Current Working Setup:
- **DynamoDB Table**: `IoTSensorData`
- **IoT Rule**: `telemetry` 
- **SQL Statement**: `SELECT *, timestamp() as aws_timestamp FROM 'digitaltwin/sensors/+/telemetry'`
- **Data Flow**: ESP32 → AWS IoT Core → IoT Rule → DynamoDB

### 📊 **Your Data Structure in DynamoDB:**
```json
{
  "sensorID": "Sensor01",
  "timestamp": 940353,
  "aws_timestamp": 1727387910890,
  "dataType": "doorState",
  "zoneID": "Zone1", 
  "assetID": "",
  "sensorName": "ESP32 Sensor",
  "data": {
    "state": true
  }
}
```

### Option 2: AWS IoT Rules → S3 (For Analytics)
**Store data files for analysis**

### Option 3: AWS IoT Rules → CloudWatch (For Monitoring)
**Create metrics and dashboards**

### Option 4: AWS IoT Rules → Lambda (For Processing)
**Process data and store in multiple places**

## 🚀 **Quick Setup: Save Data to DynamoDB**

### Step 1: Create DynamoDB Table
1. **AWS Console** → **DynamoDB** → **Create table**
2. **Table name**: `SensorData`
3. **Partition key**: `sensorID` (String)
4. **Sort key**: `timestamp` (Number)
5. **Create table**

### ✅ Step 2: IoT Rule Created Successfully
1. **AWS IoT Console** → **Act** → **Rules**
2. **Rule name**: `telemetry` ✅
3. **SQL statement** (tested and working):
```sql
SELECT *, timestamp() as aws_timestamp FROM 'digitaltwin/sensors/+/telemetry'
```
4. **DynamoDB Action**:
   - Table: `IoTSensorData` ✅
   - Partition key: `sensorID` → `${sensorID}` ✅
   - Sort key: `timestamp` → `${timestamp}` ✅
   - Sort key type: `NUMBER` ✅

### ✅ Step 3: Data Storage Verified
1. ESP32 automatically sending data every few seconds ✅
2. **DynamoDB** → **Tables** → **IoTSensorData** → **Explore table items** ✅
3. **Result**: Sensor data successfully being saved! ✅

## 📈 **What You'll Get in DynamoDB:**

```json
{
  "sensorID": "Sensor01",
  "timestamp": 940353,
  "aws_timestamp": 1727387910890,
  "dataType": "doorState",
  "zoneID": "Zone1",
  "assetID": "",
  "sensorName": "ESP32 Sensor",
  "data": {
    "state": true
  }
}
```

## 🔧 **Alternative: Local Database**

If you want to keep data local, I can help you set up:
1. **SQLite database** on your computer
2. **Node.js server** to receive ESP32 data
3. **Web dashboard** to view stored data

## 📊 **Dashboard Options**

Once data is stored, you can create:
1. **AWS QuickSight** - Professional dashboards
2. **CloudWatch Dashboards** - Real-time monitoring  
3. **Custom Web App** - Full control
4. **Grafana** - Open source visualization

## 🎯 **Next Steps**

**Choose your storage method:**
1. **Cloud Storage** (DynamoDB) - Set up IoT Rules
2. **Local Storage** - I'll help create a local server
3. **Both** - Hybrid approach

Which storage option would you prefer? I can help you set up whichever one you choose!