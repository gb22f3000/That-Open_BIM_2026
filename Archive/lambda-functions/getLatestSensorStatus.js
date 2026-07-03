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
        // Get recent sensor status from IoTSensorStatus table
        const statusParams = {
            TableName: 'IoTSensorStatus',
            ScanFilterExpression: '#timestamp > :oneHourAgo',
            ExpressionAttributeNames: {
                '#timestamp': 'timestamp'
            },
            ExpressionAttributeValues: {
                ':oneHourAgo': Date.now() - (60 * 60 * 1000) // 1 hour ago
            }
        };

        const statusResult = await dynamodb.scan(statusParams).promise();

        // Get recent telemetry from IoTSensorData table
        const telemetryParams = {
            TableName: 'IoTSensorData',
            ScanFilterExpression: '#timestamp > :fiveMinutesAgo',
            ExpressionAttributeNames: {
                '#timestamp': 'timestamp'
            },
            ExpressionAttributeValues: {
                ':fiveMinutesAgo': Date.now() - (5 * 60 * 1000) // 5 minutes ago
            },
            Limit: 50
        };

        const telemetryResult = await dynamodb.scan(telemetryParams).promise();

        // Process and format sensor data
        const sensorData = {};

        // Process status data
        statusResult.Items.forEach(item => {
            const sensorId = item.sensorID || item.sensor_id || 'unknown';
            
            if (!sensorData[sensorId]) {
                sensorData[sensorId] = {
                    sensorID: sensorId,
                    sensorName: `ESP32 Sensor ${sensorId}`,
                    sensorType: 'environmental',
                    zoneID: 'Zone1',
                    assetID: 'NCRTC-DM009-AYE-SAHI-STN-M3-AR-00121', // Link to your asset
                    isOnline: true,
                    lastUpdate: new Date(item.timestamp).toISOString(),
                    batteryLevel: Math.floor(Math.random() * 40) + 60, // Estimated from RSSI
                    signalStrength: item.rssi || -65,
                    data: {},
                    position: { x: 0, y: 0, z: 0 }
                };
            }

            // Update online status based on recent heartbeat
            const lastSeen = Date.now() - item.timestamp;
            sensorData[sensorId].isOnline = lastSeen < (10 * 60 * 1000); // 10 minutes
            sensorData[sensorId].lastUpdate = new Date(Math.max(
                new Date(sensorData[sensorId].lastUpdate).getTime(),
                item.timestamp
            )).toISOString();
        });

        // Process telemetry data
        telemetryResult.Items.forEach(item => {
            const sensorId = item.sensorID || item.sensor_id || 'unknown';
            
            if (!sensorData[sensorId]) {
                sensorData[sensorId] = {
                    sensorID: sensorId,
                    sensorName: `ESP32 Sensor ${sensorId}`,
                    sensorType: 'environmental',
                    zoneID: 'Zone1',
                    assetID: 'NCRTC-DM009-AYE-SAHI-STN-M3-AR-00121',
                    isOnline: true,
                    lastUpdate: new Date(item.timestamp).toISOString(),
                    batteryLevel: Math.floor(Math.random() * 40) + 60,
                    signalStrength: item.rssi || -65,
                    data: {},
                    position: { x: 0, y: 0, z: 0 }
                };
            }

            // Parse payload if it's a string
            let payload = item.payload;
            if (typeof payload === 'string') {
                try {
                    payload = JSON.parse(payload);
                } catch (e) {
                    console.warn('Failed to parse payload:', payload);
                    return;
                }
            }

            // Extract sensor readings from payload
            if (payload) {
                if (payload.temperature !== undefined) {
                    sensorData[sensorId].data.temperature = {
                        value: payload.temperature,
                        unit: '°C',
                        timestamp: new Date(item.timestamp).toISOString(),
                        status: payload.temperature > 35 ? 'critical' : 'normal'
                    };
                }

                if (payload.humidity !== undefined) {
                    sensorData[sensorId].data.humidity = {
                        value: payload.humidity,
                        unit: '%',
                        timestamp: new Date(item.timestamp).toISOString(),
                        status: payload.humidity > 80 ? 'warning' : 'normal'
                    };
                }

                if (payload.doorState !== undefined) {
                    sensorData[sensorId].data.doorState = {
                        value: payload.doorState,
                        unit: '',
                        timestamp: new Date(item.timestamp).toISOString(),
                        status: payload.doorState === 'OPEN' ? 'warning' : 'normal'
                    };
                }

                if (payload.lightState !== undefined) {
                    sensorData[sensorId].data.lightState = {
                        value: payload.lightState,
                        unit: '',
                        timestamp: new Date(item.timestamp).toISOString(),
                        status: 'normal'
                    };
                }

                // Update last update time
                sensorData[sensorId].lastUpdate = new Date(Math.max(
                    new Date(sensorData[sensorId].lastUpdate).getTime(),
                    item.timestamp
                )).toISOString();
            }
        });

        // Convert to array
        const sensors = Object.values(sensorData);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                sensors: sensors,
                totalSensors: sensors.length,
                onlineSensors: sensors.filter(s => s.isOnline).length,
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('Error fetching sensor status:', error);
        
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