const AWS = require('aws-sdk');
const iot = new AWS.IoTData({ region: process.env.AWS_REGION || 'us-east-1' });

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS,POST,PUT',
        'Content-Type': 'application/json'
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const sensorId = event.pathParameters?.id;
        
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

        // Parse request body
        let config;
        try {
            config = JSON.parse(event.body || '{}');
        } catch (e) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Invalid JSON in request body'
                })
            };
        }

        // Validate configuration parameters
        const allowedParams = [
            'reportingInterval',
            'temperatureThreshold',
            'humidityThreshold',
            'enableAlerts',
            'sleepMode',
            'calibrationOffset'
        ];

        const validConfig = {};
        for (const [key, value] of Object.entries(config)) {
            if (allowedParams.includes(key)) {
                validConfig[key] = value;
            }
        }

        if (Object.keys(validConfig).length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'No valid configuration parameters provided',
                    allowedParams: allowedParams
                })
            };
        }

        // Prepare command payload for ESP32
        const commandPayload = {
            command: 'updateConfig',
            timestamp: Date.now(),
            config: validConfig,
            requestId: `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };

        // Publish command to IoT Core topic
        const topic = `digitaltwin/sensors/${sensorId}/commands`;
        const publishParams = {
            topic: topic,
            payload: JSON.stringify(commandPayload),
            qos: 1
        };

        await iot.publish(publishParams).promise();

        console.log(`Published config update to topic: ${topic}`, commandPayload);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Configuration update sent to sensor',
                sensorId: sensorId,
                config: validConfig,
                topic: topic,
                requestId: commandPayload.requestId,
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('Error updating sensor config:', error);
        
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