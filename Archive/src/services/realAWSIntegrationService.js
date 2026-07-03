/**
 * Real AWS DynamoDB Integration Service
 * Connects to your actual IoTSensorData and IoTSensorStatus tables
 */

// Browser-safe environment variable access
const getEnvVar = (key, defaultValue) => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || defaultValue;
  }
  return defaultValue;
};

// AWS Configuration
const AWS_CONFIG = {
  region: getEnvVar('VITE_AWS_REGION', 'ap-south-1'),
  apiBaseUrl: getEnvVar('VITE_AWS_API_BASE_URL', 'https://your-api-gateway-url.amazonaws.com/prod'),
  apiKey: getEnvVar('VITE_AWS_API_KEY', ''),
  
  // DynamoDB Table Names (matching your setup)
  tables: {
    telemetry: getEnvVar('VITE_IOT_SENSOR_DATA_TABLE', 'IoTSensorData'),
    status: getEnvVar('VITE_IOT_SENSOR_STATUS_TABLE', 'IoTSensorStatus')
  }
};

class RealAWSIntegrationService {
  constructor() {
    this.initialized = false;
    this.sensors = new Map();
    this.lastUpdateTime = 0;
    this.isEnabled = getEnvVar('VITE_USE_REAL_AWS', 'false') === 'true';
  }

  /**
   * Initialize AWS API integration
   */
  async initialize() {
    if (!this.isEnabled) {
      console.log('🔧 Real AWS integration disabled, using mock data');
      return false;
    }

    try {
      console.log('🔧 Initializing Real AWS DynamoDB integration...');
      
      // Test API connectivity
      const testResponse = await this.testConnection();
      if (testResponse) {
        console.log('✅ Real AWS DynamoDB integration initialized');
        this.initialized = true;
        
        // Load initial sensor data
        await this.loadSensorData();
        return true;
      } else {
        console.warn('⚠️ AWS API connection failed, check configuration');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize Real AWS integration:', error);
      return false;
    }
  }

  /**
   * Test AWS API connectivity
   */
  async testConnection() {
    try {
      // Test by fetching recent sensor status
      const response = await this.makeAPIRequest('/sensors/status', 'GET');
      return response !== null;
    } catch (error) {
      console.error('❌ AWS connection test failed:', error);
      return false;
    }
  }

  /**
   * Make API request to AWS API Gateway
   */
  async makeAPIRequest(endpoint, method = 'GET', body = null) {
    try {
      const headers = {
        'Content-Type': 'application/json'
      };

      if (AWS_CONFIG.apiKey) {
        headers['x-api-key'] = AWS_CONFIG.apiKey;
      }

      // Add auth token if available
      const authToken = this.getAuthToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const config = {
        method,
        headers
      };

      if (body && (method === 'POST' || method === 'PUT')) {
        config.body = JSON.stringify(body);
      }

      const response = await fetch(`${AWS_CONFIG.apiBaseUrl}${endpoint}`, config);

      if (!response.ok) {
        throw new Error(`AWS API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ AWS API request error:', error);
      throw error;
    }
  }

  /**
   * Load sensor data from DynamoDB
   */
  async loadSensorData() {
    try {
      // Get latest sensor status from IoTSensorStatus table
      const statusData = await this.fetchLatestSensorStatus();
      
      // Get recent telemetry from IoTSensorData table
      const telemetryData = await this.fetchRecentTelemetry();
      
      // Process and combine the data
      this.processSensorData(statusData, telemetryData);
      
      console.log(`📡 Loaded real sensor data from AWS DynamoDB - ${this.sensors.size} sensors`);
    } catch (error) {
      console.error('❌ Error loading sensor data from AWS:', error);
      throw error;
    }
  }

  /**
   * Fetch latest sensor status from IoTSensorStatus table
   */
  async fetchLatestSensorStatus() {
    try {
      // This would call your Lambda function or API Gateway endpoint
      // that queries the IoTSensorStatus table
      const response = await this.makeAPIRequest('/sensors/status/latest', 'GET');
      return response.items || [];
    } catch (error) {
      console.error('❌ Error fetching sensor status:', error);
      return [];
    }
  }

  /**
   * Fetch recent telemetry from IoTSensorData table
   */
  async fetchRecentTelemetry(timeRange = '1h') {
    try {
      const response = await this.makeAPIRequest(`/sensors/telemetry/recent?range=${timeRange}`, 'GET');
      return response.items || [];
    } catch (error) {
      console.error('❌ Error fetching telemetry:', error);
      return [];
    }
  }

  /**
   * Process and combine status and telemetry data
   */
  processSensorData(statusData, telemetryData) {
    this.sensors.clear();

    // Group data by sensorID
    const sensorsData = new Map();

    // Process status data (like your IoTSensorStatus format)
    statusData.forEach(statusItem => {
      const payload = statusItem.payload || {};
      const sensorID = payload.sensorID || statusItem.sensorID;

      if (!sensorsData.has(sensorID)) {
        sensorsData.set(sensorID, { status: null, telemetry: [] });
      }
      
      sensorsData.get(sensorID).status = {
        sensorID: sensorID,
        timestamp: statusItem.timestamp,
        temperature: payload.temperature,
        humidity: payload.humidity,
        doorState: payload.doorState,
        lightState: payload.lightState,
        rssi: payload.rssi,
        freeHeap: payload.freeHeap,
        uptime: payload.uptime,
        timeSync: payload.timeSync,
        timestampISO: payload.timestampISO,
        lastSeen: payload.timestampISO || new Date(statusItem.timestamp * 1000).toISOString()
      };
    });

    // Process telemetry data (like your IoTSensorData format)
    telemetryData.forEach(telemetryItem => {
      const payload = telemetryItem.payload || {};
      const sensorID = payload.sensorID || telemetryItem.sensorID;

      if (!sensorsData.has(sensorID)) {
        sensorsData.set(sensorID, { status: null, telemetry: [] });
      }
      
      sensorsData.get(sensorID).telemetry.push({
        sensorID: sensorID,
        timestamp: telemetryItem.timestamp,
        dataType: payload.dataType,
        data: payload.data,
        timestampISO: payload.timestampISO,
        uptime: payload.uptime
      });
    });

    // Convert to sensor objects for the dashboard
    sensorsData.forEach((data, sensorID) => {
      const status = data.status;
      const telemetry = data.telemetry;

      // Determine if sensor is online (last seen within 5 minutes)
      const lastSeenTime = status ? new Date(status.lastSeen).getTime() : 0;
      const isOnline = (Date.now() - lastSeenTime) < 300000; // 5 minutes

      // Get asset ID from telemetry or status
      const assetID = this.getAssetIDFromData(telemetry, status);

      const sensor = {
        sensorID: sensorID,
        sensorName: this.getSensorName(sensorID, telemetry),
        sensorType: 'environmental', // Your sensor provides temp, humidity, door, light
        isOnline: isOnline,
        lastSeen: status ? status.lastSeen : new Date().toISOString(),
        zoneID: this.getZoneID(telemetry, status),
        assetID: assetID,
        position: this.getSensorPosition(assetID), // You can configure this
        
        // Current sensor readings
        currentData: {
          temperature: status ? status.temperature : null,
          humidity: status ? status.humidity : null,
          doorOpen: status ? (status.doorState === 1) : null,
          lightOn: status ? (status.lightState === 1) : null,
          rssi: status ? status.rssi : null,
          uptime: status ? status.uptime : null
        },
        
        // Thresholds (you can make these configurable)
        thresholds: {
          temperature: { min: 18, max: 28, critical: 35 },
          humidity: { min: 30, max: 70, critical: 85 },
          rssi: { min: -80, critical: -90 }
        },
        
        reportingInterval: 300, // 5 minutes based on your heartbeat
        batteryLevel: this.calculateBatteryLevel(status), // Estimate from uptime/rssi
        firmwareVersion: '1.0.0',
        
        // Additional ESP32 specific data
        freeHeap: status ? status.freeHeap : null,
        timeSync: status ? status.timeSync : false
      };

      this.sensors.set(sensorID, sensor);
    });

    this.lastUpdateTime = Date.now();
  }

  /**
   * Helper functions to extract data from your format
   */
  getAssetIDFromData(telemetry, status) {
    // Try to get assetID from telemetry first, then status
    for (const item of telemetry) {
      if (item.payload && item.payload.assetID) {
        return item.payload.assetID;
      }
    }
    return null; // You can configure asset linking
  }

  getSensorName(sensorID, telemetry) {
    // Try to get sensor name from telemetry
    for (const item of telemetry) {
      if (item.payload && item.payload.sensorName) {
        return item.payload.sensorName;
      }
    }
    return `ESP32 Sensor ${sensorID}`;
  }

  getZoneID(telemetry, status) {
    // Try to get zoneID from telemetry
    for (const item of telemetry) {
      if (item.payload && item.payload.zoneID) {
        return item.payload.zoneID;
      }
    }
    return 'Zone1'; // Default from your ESP32 code
  }

  getSensorPosition(assetID) {
    // You can configure positions based on asset ID
    const assetPositions = {
      'ASSET_DOOR_01': { x: 5.0, y: 0.0, z: 2.0 },
      'ASSET_LIGHT_01': { x: -3.2, y: 4.1, z: 3.5 },
      // Add more asset positions as needed
    };
    return assetPositions[assetID] || null;
  }

  calculateBatteryLevel(status) {
    if (!status) return 0;
    
    // Estimate battery level based on RSSI and uptime
    // This is a rough estimation - you might want to add actual battery monitoring to ESP32
    const rssiScore = Math.max(0, Math.min(100, (status.rssi + 100) * 2)); // -100 to 0 dBm -> 0 to 100%
    const uptimeHours = status.uptime / 3600;
    const batteryDrain = Math.min(20, uptimeHours * 0.1); // Rough drain estimate
    
    return Math.max(10, Math.round(rssiScore - batteryDrain));
  }

  /**
   * Fetch all sensors (main interface method)
   */
  async fetchAllSensors() {
    if (!this.initialized) {
      return [];
    }

    try {
      // Refresh data if it's older than 1 minute
      if (Date.now() - this.lastUpdateTime > 60000) {
        await this.loadSensorData();
      }

      return Array.from(this.sensors.values());
    } catch (error) {
      console.error('❌ Error fetching sensors:', error);
      return Array.from(this.sensors.values()); // Return cached data
    }
  }

  /**
   * Fetch sensor data history
   */
  async fetchSensorData(sensorID, timeRange = '1h') {
    try {
      const response = await this.makeAPIRequest(
        `/sensors/${sensorID}/history?range=${timeRange}`, 
        'GET'
      );
      
      return this.processSensorHistory(response.items || []);
    } catch (error) {
      console.error('❌ Error fetching sensor history:', error);
      return [];
    }
  }

  /**
   * Process sensor history data
   */
  processSensorHistory(historyItems) {
    return historyItems.map(item => {
      const payload = item.payload || {};
      return {
        sensorID: payload.sensorID || item.sensorID,
        timestamp: item.timestamp,
        timestampISO: payload.timestampISO || new Date(item.timestamp * 1000).toISOString(),
        temperature: payload.temperature,
        humidity: payload.humidity,
        doorOpen: payload.doorState === 1,
        lightOn: payload.lightState === 1,
        rssi: payload.rssi,
        uptime: payload.uptime
      };
    });
  }

  /**
   * Update sensor configuration
   */
  async updateSensor(sensorID, updateData) {
    try {
      const response = await this.makeAPIRequest(
        `/sensors/${sensorID}/config`, 
        'PUT', 
        updateData
      );
      
      // Update local cache
      const sensor = this.sensors.get(sensorID);
      if (sensor) {
        Object.assign(sensor, updateData);
      }
      
      console.log(`✅ Updated sensor ${sensorID} configuration`);
      return response;
    } catch (error) {
      console.error('❌ Error updating sensor:', error);
      throw error;
    }
  }

  /**
   * Link sensor to asset
   */
  async linkSensorToAsset(sensorID, assetID, position) {
    const updateData = {
      assetID: assetID,
      position: position,
      linkedAt: new Date().toISOString()
    };

    return await this.updateSensor(sensorID, updateData);
  }

  /**
   * Get sensor statistics
   */
  async getSensorStatistics() {
    const sensors = await this.fetchAllSensors();
    
    const stats = {
      totalSensors: sensors.length,
      onlineSensors: sensors.filter(s => s.isOnline).length,
      offlineSensors: sensors.filter(s => !s.isOnline).length,
      linkedSensors: sensors.filter(s => s.assetID).length,
      unlinkedSensors: sensors.filter(s => !s.assetID).length,
      sensorTypes: {},
      averageBatteryLevel: 0,
      zonesWithSensors: new Set(),
      
      // ESP32 specific stats
      averageRSSI: 0,
      sensorsWithTimeSync: sensors.filter(s => s.timeSync).length
    };

    // Calculate type distribution and averages
    let totalBattery = 0;
    let totalRSSI = 0;
    let rssiCount = 0;

    sensors.forEach(sensor => {
      stats.sensorTypes[sensor.sensorType] = (stats.sensorTypes[sensor.sensorType] || 0) + 1;
      stats.zonesWithSensors.add(sensor.zoneID);
      totalBattery += sensor.batteryLevel || 0;
      
      if (sensor.currentData && sensor.currentData.rssi) {
        totalRSSI += sensor.currentData.rssi;
        rssiCount++;
      }
    });

    if (sensors.length > 0) {
      stats.averageBatteryLevel = Math.round(totalBattery / sensors.length);
    }
    
    if (rssiCount > 0) {
      stats.averageRSSI = Math.round(totalRSSI / rssiCount);
    }

    stats.zonesWithSensors = stats.zonesWithSensors.size;

    return stats;
  }

  /**
   * Get authentication token
   */
  getAuthToken() {
    return localStorage.getItem('authToken') || '';
  }
}

// Create and export singleton instance
const realAWSIntegrationService = new RealAWSIntegrationService();

export default realAWSIntegrationService;