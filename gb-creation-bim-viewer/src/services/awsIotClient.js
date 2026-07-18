import mqtt from 'mqtt';

/**
 * AWS IoT WebSocket MQTT Client for Real-time Sensor Data
 * This connects to your AWS IoT Core and subscribes to sensor topics
 */
class AWSIoTClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.subscribers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    
    // AWS IoT Configuration - Replace with your actual values
    this.config = {
      endpoint: 'wss://a2o2rnz47gsekg-ats.iot.ap-south-1.amazonaws.com/mqtt',
      region: 'ap-south-1',
      clientId: 'DigitalTwin_Dashboard_' + Math.random().toString(36).substr(2, 9),
      
      // Topics to subscribe to
      topics: {
        telemetry: 'digitaltwin/sensors/+/telemetry',
        status: 'digitaltwin/sensors/+/status',
        commands: 'digitaltwin/sensors/+/commands'
      }
    };
  }

  /**
   * Connect to AWS IoT Core using WebSocket
   */
  connect() {
    console.log('🔌 Connecting to AWS IoT Core...');
    
    // Ensure connection closes when window closes
    window.addEventListener('beforeunload', () => {
      if (this.client) {
        this.client.end(true); // Force close
      }
    });

    try {
      // For demo purposes, we'll use anonymous connection
      // In production, implement AWS Cognito authentication
      this.client = mqtt.connect(this.config.endpoint, {
        clientId: this.config.clientId,
        clean: true,
        connectTimeout: 30000,
        reconnectPeriod: 5000,
        protocol: 'wss'
      });

      this.client.on('connect', () => {
        console.log('✅ Connected to AWS IoT Core');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Subscribe to all sensor topics
        Object.values(this.config.topics).forEach(topic => {
          this.client.subscribe(topic, (err) => {
            if (err) {
              console.error(`❌ Failed to subscribe to ${topic}:`, err);
            } else {
              console.log(`📡 Subscribed to ${topic}`);
            }
          });
        });
      });

      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });

      this.client.on('error', (error) => {
        console.error('❌ AWS IoT Connection Error:', error);
        this.isConnected = false;
      });

      this.client.on('offline', () => {
        console.warn('⚠️ AWS IoT Client Offline');
        this.isConnected = false;
      });

      this.client.on('reconnect', () => {
        this.reconnectAttempts++;
        console.log(`🔄 Reconnecting to AWS IoT (attempt ${this.reconnectAttempts})`);
      });

    } catch (error) {
      console.error('💥 Failed to connect to AWS IoT:', error);
    }
  }

  /**
   * Handle incoming MQTT messages
   */
  handleMessage(topic, message) {
    try {
      const data = JSON.parse(message.toString());
      const sensorId = this.extractSensorId(topic);
      
      console.log(`📥 Received from ${sensorId}:`, data);
      
      // Determine message type based on topic
      let messageType = 'unknown';
      if (topic.includes('/telemetry')) {
        messageType = 'telemetry';
      } else if (topic.includes('/status')) {
        messageType = 'status';
      } else if (topic.includes('/commands')) {
        messageType = 'commands';
      }

      // Notify all subscribers
      this.notifySubscribers({
        type: messageType,
        sensorId,
        topic,
        data,
        timestamp: new Date(),
        isRealTime: true
      });

    } catch (error) {
      console.error('❌ Error parsing message:', error, message.toString());
    }
  }

  /**
   * Extract sensor ID from MQTT topic
   */
  extractSensorId(topic) {
    // digitaltwin/sensors/Sensor01/telemetry -> Sensor01
    const parts = topic.split('/');
    return parts[2] || 'unknown';
  }

  /**
   * Subscribe to sensor data updates
   */
  subscribe(callback) {
    const id = Date.now() + Math.random();
    this.subscribers.set(id, callback);
    
    return () => {
      this.subscribers.delete(id);
    };
  }

  /**
   * Notify all subscribers of new data
   */
  notifySubscribers(sensorData) {
    this.subscribers.forEach(callback => {
      try {
        callback(sensorData);
      } catch (error) {
        console.error('❌ Error in subscriber callback:', error);
      }
    });
  }

  /**
   * Send command to specific sensor
   */
  sendCommand(sensorId, command) {
    if (!this.isConnected) {
      console.error('❌ Not connected to AWS IoT');
      return false;
    }

    const topic = `digitaltwin/sensors/${sensorId}/commands`;
    const payload = JSON.stringify({
      command,
      timestamp: new Date().toISOString(),
      source: 'dashboard'
    });

    this.client.publish(topic, payload, (err) => {
      if (err) {
        console.error(`❌ Failed to send command to ${sensorId}:`, err);
      } else {
        console.log(`📤 Command sent to ${sensorId}:`, command);
      }
    });

    return true;
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      clientId: this.config.clientId,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Disconnect from AWS IoT
   */
  disconnect() {
    if (this.client) {
      this.client.end();
      this.isConnected = false;
      console.log('🔌 Disconnected from AWS IoT');
    }
  }
}

// Create singleton instance
const awsIotClient = new AWSIoTClient();

export default awsIotClient;