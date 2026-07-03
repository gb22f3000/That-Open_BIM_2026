/**
 * AWS Lambda Functions for Digital Twin Sensor Data API
 * Deploy these to AWS Lambda and connect to API Gateway
 */

// Lambda Function 1: Get Latest Sensor Status
exports.getLatestSensorStatus = async (event) => {
    const AWS = require('aws-sdk');
    const dynamodb = new AWS.DynamoDB.DocumentClient();
    
    const tableName = process.env.IOT_SENSOR_STATUS_TABLE || 'IoTSensorStatus';
    
    try {
        // Query to get latest status for each sensor
        const params = {
            TableName: tableName,
            ScanIndexForward: false, // Most recent first
            Limit: 50 // Adjust based on number of sensors
        };
        
        const result = await dynamodb.scan(params).promise();
        
        // Group by sensorID and get the latest for each
        const latestBySensor = {};
        result.Items.forEach(item => {
            const sensorID = item.payload?.sensorID || item.sensorID;
            if (!latestBySensor[sensorID] || item.timestamp > latestBySensor[sensorID].timestamp) {
                latestBySensor[sensorID] = item;
            }
        });
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key'
            },
            body: JSON.stringify({
                items: Object.values(latestBySensor),
                count: Object.keys(latestBySensor).length
            })
        };
    } catch (error) {
        console.error('Error fetching sensor status:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Failed to fetch sensor status',
                message: error.message
            })
        };
    }
};

// Lambda Function 2: Get Recent Telemetry Data
exports.getRecentTelemetry = async (event) => {
    const AWS = require('aws-sdk');
    const dynamodb = new AWS.DynamoDB.DocumentClient();
    
    const tableName = process.env.IOT_SENSOR_DATA_TABLE || 'IoTSensorData';
    const timeRange = event.queryStringParameters?.range || '1h';
    
    try {
        // Calculate time range
        const now = Math.floor(Date.now() / 1000);
        let startTime = now;
        
        switch (timeRange) {
            case '1h': startTime = now - 3600; break;
            case '24h': startTime = now - 86400; break;
            case '7d': startTime = now - 604800; break;
            default: startTime = now - 3600;
        }
        
        const params = {
            TableName: tableName,
            FilterExpression: '#timestamp >= :startTime',
            ExpressionAttributeNames: {
                '#timestamp': 'timestamp'
            },
            ExpressionAttributeValues: {
                ':startTime': startTime
            },
            ScanIndexForward: false,
            Limit: 1000
        };
        
        const result = await dynamodb.scan(params).promise();
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key'
            },
            body: JSON.stringify({
                items: result.Items || [],
                count: result.Count,
                timeRange: timeRange
            })
        };
    } catch (error) {
        console.error('Error fetching telemetry:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Failed to fetch telemetry data',
                message: error.message
            })
        };
    }
};

// Lambda Function 3: Get Sensor History for specific sensor
exports.getSensorHistory = async (event) => {
    const AWS = require('aws-sdk');
    const dynamodb = new AWS.DynamoDB.DocumentClient();
    
    const sensorID = event.pathParameters?.sensorId;
    const timeRange = event.queryStringParameters?.range || '1h';
    
    if (!sensorID) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'sensorId is required'
            })
        };
    }
    
    try {
        // Calculate time range
        const now = Math.floor(Date.now() / 1000);
        let startTime = now;
        
        switch (timeRange) {
            case '1h': startTime = now - 3600; break;
            case '24h': startTime = now - 86400; break;
            case '7d': startTime = now - 604800; break;
            default: startTime = now - 3600;
        }
        
        // Query both tables for this sensor
        const statusTableName = process.env.IOT_SENSOR_STATUS_TABLE || 'IoTSensorStatus';
        const dataTableName = process.env.IOT_SENSOR_DATA_TABLE || 'IoTSensorData';
        
        const statusParams = {
            TableName: statusTableName,
            KeyConditionExpression: 'sensorID = :sensorID AND #timestamp >= :startTime',
            ExpressionAttributeNames: {
                '#timestamp': 'timestamp'
            },
            ExpressionAttributeValues: {
                ':sensorID': sensorID,
                ':startTime': startTime
            },
            ScanIndexForward: false
        };
        
        const dataParams = {
            TableName: dataTableName,
            KeyConditionExpression: 'sensorID = :sensorID AND #timestamp >= :startTime',
            ExpressionAttributeNames: {
                '#timestamp': 'timestamp'
            },
            ExpressionAttributeValues: {
                ':sensorID': sensorID,
                ':startTime': startTime
            },
            ScanIndexForward: false
        };
        
        const [statusResult, dataResult] = await Promise.all([
            dynamodb.query(statusParams).promise(),
            dynamodb.query(dataParams).promise()
        ]);
        
        // Combine and sort by timestamp
        const allItems = [
            ...(statusResult.Items || []),
            ...(dataResult.Items || [])
        ].sort((a, b) => b.timestamp - a.timestamp);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key'
            },
            body: JSON.stringify({
                sensorID: sensorID,
                items: allItems,
                statusCount: statusResult.Count,
                dataCount: dataResult.Count,
                timeRange: timeRange
            })
        };
    } catch (error) {
        console.error('Error fetching sensor history:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Failed to fetch sensor history',
                message: error.message
            })
        };
    }
};

// Lambda Function 4: Update Sensor Configuration
exports.updateSensorConfig = async (event) => {
    const AWS = require('aws-sdk');
    const dynamodb = new AWS.DynamoDB.DocumentClient();
    
    const sensorID = event.pathParameters?.sensorId;
    
    if (!sensorID) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'sensorId is required'
            })
        };
    }
    
    try {
        const updateData = JSON.parse(event.body);
        
        // Store sensor configuration in a separate table or send command to IoT Core
        const configTableName = process.env.SENSOR_CONFIG_TABLE || 'SensorConfigurations';
        
        const params = {
            TableName: configTableName,
            Key: { sensorID: sensorID },
            UpdateExpression: 'SET #config = :config, #updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#config': 'configuration',
                '#updatedAt': 'updatedAt'
            },
            ExpressionAttributeValues: {
                ':config': updateData,
                ':updatedAt': new Date().toISOString()
            },
            ReturnValues: 'ALL_NEW'
        };
        
        const result = await dynamodb.update(params).promise();
        
        // Optionally send command to IoT Core to update sensor settings
        if (updateData.thresholds || updateData.reportingInterval) {
            await sendConfigUpdateToSensor(sensorID, updateData);
        }
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key'
            },
            body: JSON.stringify({
                sensorID: sensorID,
                updated: result.Attributes
            })
        };
    } catch (error) {
        console.error('Error updating sensor config:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Failed to update sensor configuration',
                message: error.message
            })
        };
    }
};

// Helper function to send configuration updates to sensor via AWS IoT Core
async function sendConfigUpdateToSensor(sensorID, config) {
    const AWS = require('aws-sdk');
    const iotdata = new AWS.IotData({
        endpoint: process.env.IOT_ENDPOINT
    });
    
    const topic = `digitaltwin/sensors/${sensorID}/commands`;
    const message = {
        command: 'updateConfig',
        sensorID: sensorID,
        config: config,
        timestamp: new Date().toISOString()
    };
    
    const params = {
        topic: topic,
        qos: 1,
        payload: JSON.stringify(message)
    };
    
    try {
        await iotdata.publish(params).promise();
        console.log(`Configuration update sent to sensor ${sensorID}`);
    } catch (error) {
        console.error('Error sending config to sensor:', error);
        // Don't throw error - config is saved even if sensor update fails
    }
}

// Lambda Function 5: API Gateway OPTIONS handler for CORS
exports.corsHandler = async (event) => {
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
            'Access-Control-Max-Age': '86400'
        },
        body: ''
    };
};