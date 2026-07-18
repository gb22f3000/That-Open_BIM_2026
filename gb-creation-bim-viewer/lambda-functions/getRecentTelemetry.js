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
        const { hours = 1, sensorId } = event.queryStringParameters || {};
        const hoursAgo = parseInt(hours, 10);
        const timeThreshold = Date.now() - (hoursAgo * 60 * 60 * 1000);

        let params = {
            TableName: 'IoTSensorData',
            ScanFilterExpression: '#timestamp > :timeThreshold',
            ExpressionAttributeNames: {
                '#timestamp': 'timestamp'
            },
            ExpressionAttributeValues: {
                ':timeThreshold': timeThreshold
            },
            Limit: 100
        };

        // Filter by specific sensor if provided
        if (sensorId) {
            params.ScanFilterExpression += ' AND #sensorID = :sensorId';
            params.ExpressionAttributeNames['#sensorID'] = 'sensorID';
            params.ExpressionAttributeValues[':sensorId'] = sensorId;
        }

        const result = await dynamodb.scan(params).promise();

        // Process and format telemetry data
        const telemetryData = result.Items.map(item => {
            let payload = item.payload;
            
            // Parse payload if it's a string
            if (typeof payload === 'string') {
                try {
                    payload = JSON.parse(payload);
                } catch (e) {
                    console.warn('Failed to parse payload:', payload);
                    payload = {};
                }
            }

            return {
                sensorID: item.sensorID || item.sensor_id,
                timestamp: new Date(item.timestamp).toISOString(),
                data: {
                    temperature: payload.temperature || null,
                    humidity: payload.humidity || null,
                    doorState: payload.doorState || null,
                    lightState: payload.lightState || null
                },
                rssi: item.rssi || null,
                rawPayload: payload
            };
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort by timestamp descending

        // Group by sensor ID for easier processing
        const groupedBySensor = {};
        telemetryData.forEach(reading => {
            const sensorId = reading.sensorID;
            if (!groupedBySensor[sensorId]) {
                groupedBySensor[sensorId] = [];
            }
            groupedBySensor[sensorId].push(reading);
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                telemetry: telemetryData,
                groupedBySensor: groupedBySensor,
                totalReadings: telemetryData.length,
                timeRange: {
                    from: new Date(timeThreshold).toISOString(),
                    to: new Date().toISOString(),
                    hours: hoursAgo
                },
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('Error fetching recent telemetry:', error);
        
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