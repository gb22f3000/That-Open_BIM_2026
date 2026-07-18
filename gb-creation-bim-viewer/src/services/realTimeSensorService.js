/**
 * Real-time ESP32 Sensor Data Integration
 * Connects to actual ESP32 sensors via MQTT/WebSocket
 */

class RealTimeSensorService {
  constructor() {
    this.sensors = new Map();
    this.websocket = null;
    this.reconnectInterval = null;

    // Ensure connection closes when window closes
    window.addEventListener('beforeunload', () => {
      this.disconnect();
    });
  }

  /**
   * Connect to ESP32 sensors via WebSocket/MQTT
   */
  async connectToRealSensors() {
    try {
      // Connect via WebSocket to your ESP32 gateway or AWS IoT WebSocket
      const wsUrl = getEnvVar('VITE_SENSOR_WEBSOCKET_URL', 'ws://localhost:8080/sensors');
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('✅ Connected to real ESP32 sensors');
        this.clearReconnectInterval();
      };

      this.websocket.onmessage = (event) => {
        try {
          const sensorData = JSON.parse(event.data);
          this.processSensorUpdate(sensorData);
        } catch (error) {
          console.error('❌ Error parsing sensor data:', error);
        }
      };

      this.websocket.onclose = () => {
        console.warn('⚠️ WebSocket connection closed, attempting to reconnect...');
        this.startReconnectTimer();
      };

      this.websocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

    } catch (error) {
      console.error('❌ Failed to connect to real sensors:', error);
      return false;
    }
  }

  /**
   * Process real-time sensor updates
   */
  processSensorUpdate(data) {
    const sensor = {
      sensorID: data.sensorID,
      sensorName: data.sensorName || `ESP32 ${data.sensorID}`,
      sensorType: this.determineSensorType(data),
      isOnline: true,
      lastSeen: new Date().toISOString(),
      zoneID: data.zoneID || 'UNKNOWN',
      assetID: data.assetID || null,
      position: data.position || null,
      currentData: {
        temperature: data.temperature,
        humidity: data.humidity,
        doorOpen: data.doorOpen,
        lightLevel: data.lightLevel,
        batteryLevel: data.batteryLevel
      },
      thresholds: data.thresholds || this.getDefaultThresholds(data),
      reportingInterval: data.reportingInterval || 300,
      batteryLevel: data.batteryLevel || 0,
      firmwareVersion: data.firmwareVersion || '1.0.0'
    };

    this.sensors.set(data.sensorID, sensor);
    console.log(`📡 Updated sensor ${data.sensorID}:`, sensor.currentData);
  }

  /**
   * Determine sensor type based on available data
   */
  determineSensorType(data) {
    if (data.doorOpen !== undefined) return 'security';
    if (data.lightLevel !== undefined) return 'lighting';
    if (data.temperature !== undefined || data.humidity !== undefined) return 'environmental';
    return 'generic';
  }

  /**
   * Get default thresholds based on sensor type
   */
  getDefaultThresholds(data) {
    const type = this.determineSensorType(data);
    switch (type) {
      case 'environmental':
        return {
          temperature: { min: 15, max: 30, critical: 35 },
          humidity: { min: 30, max: 70, critical: 85 }
        };
      case 'lighting':
        return {
          lightLevel: { min: 100, max: 1000, critical: 50 }
        };
      case 'security':
        return {
          doorOpen: { alert: true }
        };
      default:
        return {};
    }
  }

  /**
   * Send command to ESP32 sensor
   */
  sendCommand(sensorID, command, params = {}) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      const message = {
        target: sensorID,
        command: command,
        params: params,
        timestamp: new Date().toISOString()
      };
      
      this.websocket.send(JSON.stringify(message));
      console.log(`📤 Sent command to ${sensorID}:`, message);
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send command');
    }
  }

  /**
   * Get all connected sensors
   */
  getAllSensors() {
    return Array.from(this.sensors.values());
  }

  /**
   * Auto-reconnect logic
   */
  startReconnectTimer() {
    if (this.reconnectInterval) return;
    
    this.reconnectInterval = setInterval(() => {
      console.log('🔄 Attempting to reconnect to sensors...');
      this.connectToRealSensors();
    }, 5000);
  }

  clearReconnectInterval() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  /**
   * Disconnect from sensors
   */
  disconnect() {
    this.clearReconnectInterval();
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }
}

export default RealTimeSensorService;