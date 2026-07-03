/**
 * AWS API Integration for Sensor Management
 * Browser-compatible AWS integration using API Gateway endpoints
 */

// Browser-safe environment variable access
const getEnvVar = (key, defaultValue) => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || defaultValue;
  }
  return defaultValue;
};

// API Gateway Configuration
const API_BASE_URL = getEnvVar('VITE_API_BASE_URL', 'https://your-api-gateway-url/prod');

// Configuration
const CONFIG = {
  region: getEnvVar('VITE_AWS_REGION', 'ap-south-1'),
  apiTimeout: 10000, // 10 seconds
  retryAttempts: 3
};

class AWSIntegrationService {
  constructor() {
    this.initialized = false;
    this.apiKey = getEnvVar('VITE_AWS_API_KEY', '');
  }

  /**
   * Initialize AWS API integration
   */
  async initialize() {
    try {
      console.log('🔧 Initializing AWS API Gateway integration...');
      
      // Test API connectivity
      const testResponse = await this.makeAPIRequest('/health', 'GET');
      
      if (testResponse || !this.isProductionAPI()) {
        console.log('✅ AWS API Gateway integration initialized');
        this.initialized = true;
        return true;
      } else {
        console.warn('⚠️ AWS API health check failed, using mock mode');
        this.initialized = false;
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize AWS integration:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Check if we're in production mode with real API
   */
  isProductionAPI() {
    return API_BASE_URL.includes('amazonaws.com') || API_BASE_URL.includes('your-domain.com');
  }

  /**
   * Make API request with error handling and retries
   */
  async makeAPIRequest(endpoint, method = 'GET', body = null, retryCount = 0) {
    try {
      const headers = {
        'Content-Type': 'application/json'
      };

      // Add API key if available
      if (this.apiKey) {
        headers['x-api-key'] = this.apiKey;
      }

      // Add auth token if available
      const authToken = this.getAuthToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const config = {
        method,
        headers,
        timeout: CONFIG.apiTimeout
      };

      if (body && (method === 'POST' || method === 'PUT')) {
        config.body = JSON.stringify(body);
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

      if (!response.ok) {
        if (response.status >= 500 && retryCount < CONFIG.retryAttempts) {
          console.warn(`⚠️ API request failed, retrying... (${retryCount + 1}/${CONFIG.retryAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
          return this.makeAPIRequest(endpoint, method, body, retryCount + 1);
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.error('❌ Network error - API endpoint may be unreachable');
      }
      throw error;
    }
  }

  /**
   * Fetch all sensors from AWS API
   */
  async fetchAllSensors() {
    if (!this.initialized) {
      console.warn('⚠️ AWS integration not initialized, using fallback');
      return await this.getMockSensors();
    }

    try {
      const data = await this.makeAPIRequest('/sensors', 'GET');
      return data.sensors || [];
    } catch (error) {
      console.error('❌ Error fetching sensors from AWS:', error);
      console.log('🔧 Falling back to mock data');
      return await this.getMockSensors();
    }
  }

  /**
   * Load sensor configuration from JSON file
   */
  async loadSensorConfig() {
    try {
      const response = await fetch('/sensors-config.json');
      if (response.ok) {
        const config = await response.json();
        return config;
      }
    } catch (error) {
      console.warn('⚠️ Could not load sensors config, using fallback');
    }
    return null;
  }

  /**
   * Generate mock sensor data from configuration or fallback
   */
  async getMockSensors() {
    const config = await this.loadSensorConfig();
    
    if (config && config.sensors) {
      // Use configured sensors with simulated status
      const mockConfig = config.mockDataGeneration || {};
      const offlineChance = mockConfig.simulateOfflineChance || 0.1;
      
      return config.sensors
        .filter(sensor => sensor.isEnabled)
        .map(sensor => {
          const isOnline = Math.random() > offlineChance;
          const batteryLevel = this.simulateBatteryLevel(sensor);
          
          return {
            sensorID: sensor.sensorID,
            sensorName: sensor.sensorName,
            sensorType: sensor.sensorType,
            isOnline: isOnline,
            lastSeen: isOnline 
              ? new Date(Date.now() - Math.random() * 600000).toISOString() // Up to 10 minutes ago
              : new Date(Date.now() - (Math.random() * 3600000 + 600000)).toISOString(), // 10min - 1hr ago
            zoneID: sensor.zoneID,
            assetID: sensor.assetID,
            position: sensor.position,
            thresholds: sensor.thresholds,
            reportingInterval: sensor.reportingInterval,
            batteryLevel: batteryLevel,
            firmwareVersion: sensor.firmwareVersion,
            currentData: this.generateCurrentSensorData(sensor, mockConfig)
          };
        });
    }
    
    // Fallback to hard-coded sensors if config is not available
    return [
      {
        sensorID: 'DT_ESP32_001',
        sensorName: 'Temperature Sensor 1',
        sensorType: 'environmental',
        isOnline: true,
        lastSeen: new Date(Date.now() - 300000).toISOString(),
        zoneID: 'ZONE_A1',
        assetID: null,
        position: null,
        thresholds: {
          temperature: { min: 15, max: 30 },
          humidity: { min: 30, max: 70 }
        },
        reportingInterval: 300,
        batteryLevel: 85,
        firmwareVersion: '1.0.0'
      },
      {
        sensorID: 'DT_ESP32_002',
        sensorName: 'Door Sensor 1',
        sensorType: 'security',
        isOnline: false,
        lastSeen: new Date(Date.now() - 3600000).toISOString(),
        zoneID: 'ZONE_B1',
        assetID: 'ASSET_DOOR_01',
        position: { x: 5.0, y: 0.0, z: 2.0 },
        thresholds: {
          temperature: { min: 10, max: 35 },
          humidity: { min: 20, max: 80 }
        },
        reportingInterval: 600,
        batteryLevel: 72,
        firmwareVersion: '1.0.0'
      },
      {
        sensorID: 'DT_ESP32_003',
        sensorName: 'Light Sensor 1',
        sensorType: 'environmental',
        isOnline: true,
        lastSeen: new Date(Date.now() - 120000).toISOString(),
        zoneID: 'ZONE_C1',
        assetID: 'ASSET_LIGHT_01',
        position: { x: -3.2, y: 4.1, z: 3.5 },
        thresholds: {
          lightLevel: { min: 100, max: 1000 }
        },
        reportingInterval: 180,
        batteryLevel: 91,
        firmwareVersion: '1.1.0'
      }
    ];
  }

  /**
   * Simulate battery level based on sensor configuration
   */
  simulateBatteryLevel(sensor) {
    // Simulate realistic battery drain
    const hoursInService = Math.random() * 720; // 0-30 days
    const drainRate = 0.1; // 0.1% per hour
    const maxBattery = 100;
    const batteryLevel = Math.max(10, maxBattery - (hoursInService * drainRate));
    return Math.round(batteryLevel);
  }

  /**
   * Generate realistic current sensor data
   */
  generateCurrentSensorData(sensor, mockConfig) {
    const variation = mockConfig.variationRanges || {};
    const data = {};

    if (sensor.sensorType === 'environmental') {
      if (variation.temperature) {
        data.temperature = variation.temperature.base + 
          (Math.random() - 0.5) * 2 * variation.temperature.variation;
      }
      if (variation.humidity) {
        data.humidity = variation.humidity.base + 
          (Math.random() - 0.5) * 2 * variation.humidity.variation;
      }
      if (variation.lightLevel) {
        data.lightLevel = Math.max(0, variation.lightLevel.base + 
          (Math.random() - 0.5) * 2 * variation.lightLevel.variation);
      }
    }

    if (sensor.sensorType === 'security') {
      data.doorOpen = Math.random() < 0.05; // 5% chance door is open
      data.motionDetected = Math.random() < 0.1; // 10% chance motion detected
    }

    return data;
  }

  /**
   * Update sensor configuration
   */
  async updateSensor(sensorID, updateData) {
    if (!this.initialized) {
      console.warn('⚠️ AWS integration not initialized, simulating update');
      return { ...updateData, sensorID, updatedAt: new Date().toISOString() };
    }

    try {
      const data = await this.makeAPIRequest(`/sensors/${sensorID}`, 'PUT', updateData);
      console.log(`✅ Updated sensor ${sensorID} via AWS API`);
      return data;
    } catch (error) {
      console.error('❌ Error updating sensor via AWS:', error);
      console.log('🔧 Simulating update for development');
      return { ...updateData, sensorID, updatedAt: new Date().toISOString() };
    }
  }

  /**
   * Link sensor to 3D asset
   */
  async linkSensorToAsset(sensorID, assetID, position) {
    const updateData = {
      assetID,
      position,
      linkedAt: new Date().toISOString()
    };

    return await this.updateSensor(sensorID, updateData);
  }

  /**
   * Fetch real-time sensor data
   */
  async fetchSensorData(sensorID, timeRange = '1h') {
    if (!this.initialized) {
      console.warn('⚠️ AWS integration not initialized, generating mock data');
      return this.getMockSensorData(sensorID, timeRange);
    }

    try {
      const data = await this.makeAPIRequest(`/sensors/${sensorID}/data?range=${timeRange}`, 'GET');
      return data.readings || [];
    } catch (error) {
      console.error('❌ Error fetching sensor data from AWS:', error);
      return this.getMockSensorData(sensorID, timeRange);
    }
  }

  /**
   * Generate mock sensor data for development
   */
  getMockSensorData(sensorID, timeRange) {
    const readings = [];
    const endTime = new Date();
    let intervals = 60; // Default to 1 hour with 1-minute intervals

    switch (timeRange) {
      case '1h': intervals = 60; break;
      case '24h': intervals = 144; break; // 10-minute intervals
      case '7d': intervals = 168; break; // 1-hour intervals
    }

    for (let i = intervals; i >= 0; i--) {
      const timestamp = new Date(endTime.getTime() - (i * (timeRange === '1h' ? 60000 : timeRange === '24h' ? 600000 : 3600000)));
      readings.push({
        sensorID,
        timestamp: timestamp.toISOString(),
        temperature: 20 + Math.random() * 10,
        humidity: 40 + Math.random() * 30,
        doorOpen: Math.random() > 0.8,
        lightLevel: 200 + Math.random() * 600
      });
    }

    return readings;
  }

  /**
   * Get sensor statistics
   */
  async getSensorStatistics() {
    try {
      const sensors = await this.fetchAllSensors();
      
      const stats = {
        totalSensors: sensors.length,
        onlineSensors: sensors.filter(s => s.isOnline).length,
        offlineSensors: sensors.filter(s => !s.isOnline).length,
        linkedSensors: sensors.filter(s => s.assetID).length,
        unlinkedSensors: sensors.filter(s => !s.assetID).length,
        sensorTypes: {},
        averageBatteryLevel: 0,
        zonesWithSensors: new Set()
      };

      // Calculate type distribution
      sensors.forEach(sensor => {
        stats.sensorTypes[sensor.sensorType] = (stats.sensorTypes[sensor.sensorType] || 0) + 1;
        stats.zonesWithSensors.add(sensor.zoneID);
      });

      // Calculate average battery level
      if (sensors.length > 0) {
        stats.averageBatteryLevel = Math.round(
          sensors.reduce((sum, s) => sum + (s.batteryLevel || 0), 0) / sensors.length
        );
      }

      stats.zonesWithSensors = stats.zonesWithSensors.size;

      return stats;
    } catch (error) {
      console.error('❌ Error calculating sensor statistics:', error);
      return {
        totalSensors: 0,
        onlineSensors: 0,
        offlineSensors: 0,
        linkedSensors: 0,
        unlinkedSensors: 0,
        sensorTypes: {},
        averageBatteryLevel: 0,
        zonesWithSensors: 0
      };
    }
  }

  /**
   * Subscribe to real-time sensor updates via AWS IoT
   */
  async subscribeSensorUpdates(callback) {
    // This would implement AWS IoT WebSocket connection for real-time updates
    // For now, implement polling as fallback
    
    console.log('📡 Setting up real-time sensor updates...');
    
    const pollInterval = setInterval(async () => {
      try {
        const sensors = await this.fetchAllSensors();
        callback(sensors);
      } catch (error) {
        console.error('❌ Error in sensor polling:', error);
      }
    }, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(pollInterval);
      console.log('📡 Real-time sensor updates stopped');
    };
  }

  /**
   * Get authentication token for API requests
   */
  getAuthToken() {
    // Return JWT token from localStorage or session
    return localStorage.getItem('authToken') || '';
  }

  /**
   * Test AWS connection
   */
  async testConnection() {
    try {
      await this.initialize();
      const sensors = await this.fetchAllSensors();
      console.log(`✅ AWS connection successful - ${sensors.length} sensors found`);
      return true;
    } catch (error) {
      console.error('❌ AWS connection test failed:', error);
      return false;
    }
  }
}

// Create and export singleton instance
const awsIntegrationService = new AWSIntegrationService();

export default awsIntegrationService;