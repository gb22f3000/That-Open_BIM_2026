const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS,POST,PUT',
        'Content-Type': 'application/json'
    };

    try {
        const sensorId = event.pathParameters?.id;
        const { hours = 24, limit = 500 } = event.queryStringParameters || {};
        
        if (!sensorId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Sensor ID is required'
                })
            };
        }

        const hoursAgo = parseInt(hours, 10);
        const limitNum = parseInt(limit, 10);
        const timeThreshold = Date.now() - (hoursAgo * 60 * 60 * 1000);

        // Query telemetry data for specific sensor
        const telemetryParams = {
            TableName: 'IoTSensorData',
            ScanFilterExpression: '#sensorID = :sensorId AND #timestamp > :timeThreshold',
            ExpressionAttributeNames: {
                '#sensorID': 'sensorID',
                '#timestamp': 'timestamp'
            },
            ExpressionAttributeValues: {
                ':sensorId': sensorId,
                ':timeThreshold': timeThreshold
            },
            Limit: limitNum
        };

        const telemetryResult = await dynamodb.scan(telemetryParams).promise();

        // Query status data for specific sensor
        const statusParams = {
            TableName: 'IoTSensorStatus',
            ScanFilterExpression: '#sensorID = :sensorId AND #timestamp > :timeThreshold',
            ExpressionAttributeNames: {
                '#sensorID': 'sensorID',
                '#timestamp': 'timestamp'
            },
            ExpressionAttributeValues: {
                ':sensorId': sensorId,
                ':timeThreshold': timeThreshold
            },
            Limit: 100
        };

        const statusResult = await dynamodb.scan(statusParams).promise();

        // Process telemetry data
        const telemetryHistory = telemetryResult.Items.map(item => {
            let payload = item.payload;
            
            if (typeof payload === 'string') {
                try {
                    payload = JSON.parse(payload);
                } catch (e) {
                    payload = {};
                }
            }

            return {
                timestamp: new Date(item.timestamp).toISOString(),
                temperature: payload.temperature || null,
                humidity: payload.humidity || null,
                doorState: payload.doorState || null,
                lightState: payload.lightState || null,
                rssi: item.rssi || null
            };
        }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); // Sort chronologically

        // Process status data
        const statusHistory = statusResult.Items.map(item => ({
            timestamp: new Date(item.timestamp).toISOString(),
            status: item.status || 'online',
            rssi: item.rssi || null,
            uptime: item.uptime || null,
            freeHeap: item.freeHeap || null
        })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Calculate statistics
        const stats = {
            telemetryCount: telemetryHistory.length,
            statusCount: statusHistory.length,
            timeRange: {
                from: new Date(timeThreshold).toISOString(),
                to: new Date().toISOString(),
                hours: hoursAgo
            }
        };

        // Calculate temperature/humidity averages if available
        const tempReadings = telemetryHistory.filter(t => t.temperature !== null).map(t => t.temperature);
        const humidityReadings = telemetryHistory.filter(t => t.humidity !== null).map(t => t.humidity);

        if (tempReadings.length > 0) {
            stats.temperature = {
                average: tempReadings.reduce((a, b) => a + b, 0) / tempReadings.length,
                min: Math.min(...tempReadings),
                max: Math.max(...tempReadings),
                readings: tempReadings.length
            };
        }

        if (humidityReadings.length > 0) {
            stats.humidity = {
                average: humidityReadings.reduce((a, b) => a + b, 0) / humidityReadings.length,
                min: Math.min(...humidityReadings),
                max: Math.max(...humidityReadings),
                readings: humidityReadings.length
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                sensorId: sensorId,
                telemetryHistory: telemetryHistory,
                statusHistory: statusHistory,
                statistics: stats,
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('Error fetching sensor history:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};