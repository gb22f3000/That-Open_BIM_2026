/**
 * Sensor Service - On-prem API Integration
 * Handles sensor data fetching, storage, and asset relationships via mock API
 */

const getEnvVar = (key, defaultValue) => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] ?? defaultValue;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] ?? defaultValue;
  }
  return defaultValue;
};

class SensorService {
  constructor() {
    this.apiBaseUrl = getEnvVar('VITE_SENSOR_API_BASE_URL', 'http://localhost:4000/api');
    this.assetLinksApi = getEnvVar('VITE_API_BASE_URL', this.apiBaseUrl);
    this.sensors = new Map();
    this.assetSensorLinks = new Map();
    this.sensorAssetLinks = new Map();
    this.initialized = false;
    this.lastSync = 0;
  }

  async initialize(forceRefresh = false) {
    if (this.initialized && !forceRefresh && Date.now() - this.lastSync < 10000) {
      return true;
    }

    try {
      await this.refreshSensorsFromApi();
      await this.fetchAssetSensorLinks();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize sensor service from API:', error);
      this.loadMockSensors();
      this.initialized = true;
      return false;
    }
  }

  async refreshSensorsFromApi() {
    const response = await fetch(`${this.apiBaseUrl}/sensors`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const payload = await response.json();
    const sensors = Array.isArray(payload?.sensors) ? payload.sensors : [];

    this.sensors.clear();
    sensors.forEach(sensor => {
      this.sensors.set(sensor.sensorID, {
        sensorID: sensor.sensorID,
        sensorName: sensor.sensorName ?? sensor.sensorID,
        stationID: sensor.stationID ?? 'Unknown',
        sensorType: sensor.sensorType ?? 'environmental',
        zoneID: sensor.zoneID ?? 'Zone1',
        assetID: sensor.assetID ?? '',
        isOnline: Boolean(sensor.isOnline ?? true),
        lastSeen: sensor.lastSeen ?? null,
        batteryLevel: sensor.batteryLevel ?? null,
        signalStrength: sensor.signalStrength ?? null,
        currentData: sensor.currentData ?? {},
        position: sensor.position ?? { x: 0, y: 0, z: 0 },
        settings: sensor.settings ?? {
          reportingInterval: 30000,
          alertsEnabled: true,
          thresholds: {
            temperature: { warning: 30, critical: 35 },
            humidity: { warning: 75, critical: 85 }
          }
        }
      });
    });

    this.rebuildAssetMaps();
    this.lastSync = Date.now();
    return this.getAllSensors();
  }

  rebuildAssetMaps() {
    this.assetSensorLinks.clear();
    this.sensorAssetLinks.clear();

    this.sensors.forEach(sensor => {
      if (!sensor.assetID) return;
      if (!this.assetSensorLinks.has(sensor.assetID)) {
        this.assetSensorLinks.set(sensor.assetID, []);
      }
      this.assetSensorLinks.get(sensor.assetID).push(sensor.sensorID);
      this.sensorAssetLinks.set(sensor.sensorID, sensor.assetID);
    });
  }

  async fetchAssetSensorLinks() {
    try {
      const response = await fetch(`${this.assetLinksApi}/asset-sensor-links`);
      if (response.ok) {
        const payload = await response.json();
        if (Array.isArray(payload?.links)) {
          this.assetSensorLinks.clear();
          this.sensorAssetLinks.clear();
          payload.links.forEach(({ assetID, sensorID }) => {
            if (!assetID || !sensorID) return;
            if (!this.assetSensorLinks.has(assetID)) {
              this.assetSensorLinks.set(assetID, []);
            }
            this.assetSensorLinks.get(assetID).push(sensorID);
            this.sensorAssetLinks.set(sensorID, assetID);
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ Asset link API unavailable, deriving links from sensor data');
    }

    // Ensure maps align with sensor data even if API failed
    this.sensors.forEach(sensor => {
      if (!sensor.assetID) return;
      if (!this.assetSensorLinks.has(sensor.assetID)) {
        this.assetSensorLinks.set(sensor.assetID, []);
      }
      const list = this.assetSensorLinks.get(sensor.assetID);
      if (!list.includes(sensor.sensorID)) {
        list.push(sensor.sensorID);
      }
      this.sensorAssetLinks.set(sensor.sensorID, sensor.assetID);
    });
  }

  getAllSensors() {
    return Array.from(this.sensors.values());
  }

  getSensor(sensorID) {
    return this.sensors.get(sensorID);
  }

  getSensorsForAsset(assetID) {
    const ids = this.assetSensorLinks.get(assetID) || [];
    return ids.map(id => this.sensors.get(id)).filter(Boolean);
  }

  getAssetForSensor(sensorID) {
    return this.sensorAssetLinks.get(sensorID) ?? null;
  }

  async getSensorHistory(sensorID, limit = 100) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/sensors/${sensorID}/history?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch history for ${sensorID}`);
      }
      const payload = await response.json();
      return Array.isArray(payload?.history) ? payload.history : [];
    } catch (error) {
      console.error('❌ Error fetching sensor history:', error);
      return [];
    }
  }

  async linkSensorToAsset(sensorID, assetID, position = null) {
    const updates = { assetID };
    if (position) {
      updates.position = position;
    }
    const updatedSensor = await this.updateSensor(sensorID, updates);
    if (!updatedSensor) return false;

    if (!this.assetSensorLinks.has(assetID)) {
      this.assetSensorLinks.set(assetID, []);
    }
    const list = this.assetSensorLinks.get(assetID);
    if (!list.includes(sensorID)) {
      list.push(sensorID);
    }
    this.sensorAssetLinks.set(sensorID, assetID);
    return true;
  }

  async unlinkSensorFromAsset(sensorID) {
    const updatedSensor = await this.updateSensor(sensorID, { assetID: null });
    if (!updatedSensor) return false;

    const currentAsset = this.sensorAssetLinks.get(sensorID);
    if (currentAsset && this.assetSensorLinks.has(currentAsset)) {
      const nextList = this.assetSensorLinks.get(currentAsset).filter(id => id !== sensorID);
      this.assetSensorLinks.set(currentAsset, nextList);
    }
    this.sensorAssetLinks.delete(sensorID);
    return true;
  }

  async updateSensor(sensorID, updates = {}) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/sensors/${sensorID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update sensor ${sensorID}`);
      }

      const payload = await response.json();
      const updated = payload?.sensor;
      if (updated) {
        this.sensors.set(sensorID, {
          ...this.sensors.get(sensorID),
          ...updated
        });
        if (updated.assetID) {
          this.sensorAssetLinks.set(sensorID, updated.assetID);
          if (!this.assetSensorLinks.has(updated.assetID)) {
            this.assetSensorLinks.set(updated.assetID, []);
          }
          const list = this.assetSensorLinks.get(updated.assetID);
          if (!list.includes(sensorID)) {
            list.push(sensorID);
          }
        } else {
          this.sensorAssetLinks.delete(sensorID);
        }
      }
      return this.sensors.get(sensorID);
    } catch (error) {
      console.error('❌ Error updating sensor:', error);
      return null;
    }
  }

  async updateSensorReading(sensorID, payload) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/sensors/${sensorID}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`Failed to push data for ${sensorID}`);
      }
      const data = await response.json();
      if (data?.sensor) {
        this.sensors.set(sensorID, {
          ...this.sensors.get(sensorID),
          ...data.sensor
        });
      }
      return data?.sensor ?? null;
    } catch (error) {
      console.error('❌ Error updating sensor reading:', error);
      return null;
    }
  }

  getSensorsByType(type) {
    return this.getAllSensors().filter(sensor => sensor.sensorType === type);
  }

  getOnlineSensors() {
    return this.getAllSensors().filter(sensor => sensor.isOnline);
  }

  async getSensorStatistics() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/status`);
      if (response.ok) {
        const stats = await response.json();
        return {
          total: stats.totalSensors ?? this.sensors.size,
          online: stats.onlineSensors ?? 0,
          offline: stats.offlineSensors ?? 0,
          linked: this.sensorAssetLinks.size,
          unlinked: this.sensors.size - this.sensorAssetLinks.size,
          byType: this.getAllSensors().reduce((acc, sensor) => {
            acc[sensor.sensorType] = (acc[sensor.sensorType] || 0) + 1;
            return acc;
          }, {}),
          raw: stats
        };
      }
    } catch (error) {
      console.warn('⚠️ Status endpoint not available, deriving statistics locally');
    }

    const allSensors = this.getAllSensors();
    return {
      total: allSensors.length,
      online: allSensors.filter(s => s.isOnline).length,
      offline: allSensors.filter(s => !s.isOnline).length,
      linked: this.sensorAssetLinks.size,
      unlinked: allSensors.length - this.sensorAssetLinks.size,
      byType: allSensors.reduce((acc, sensor) => {
        acc[sensor.sensorType] = (acc[sensor.sensorType] || 0) + 1;
        return acc;
      }, {})
    };
  }

  searchSensors(query) {
    if (!query || !query.trim()) {
      return this.getAllSensors();
    }
    const lower = query.toLowerCase();
    return this.getAllSensors().filter(sensor =>
      sensor.sensorID.toLowerCase().includes(lower) ||
      sensor.sensorName.toLowerCase().includes(lower) ||
      sensor.zoneID.toLowerCase().includes(lower)
    );
  }

  loadMockSensors() {
    console.warn('⚠️ Falling back to in-memory mock sensors');
    this.sensors.clear();
    const now = new Date().toISOString();
    const mockSensors = [
      {
        sensorID: 'ESP32_A1B2C3',
        sensorName: 'Temperature Sensor 1',
        sensorType: 'environmental',
        zoneID: 'Zone1',
        assetID: 'NCRTC-DM009-AYE-SAHI-STN-M3-AR-00121',
        isOnline: true,
        lastSeen: now,
        currentData: { temperature: 24.5, humidity: 62.3, doorState: 'CLOSED', lightState: 'ON' },
        position: { x: 10, y: 5, z: 15 }
      },
      {
        sensorID: 'ESP32_D4E5F6',
        sensorName: 'Door Sensor 1',
        sensorType: 'security',
        zoneID: 'Zone1',
        assetID: '',
        isOnline: false,
        lastSeen: new Date(Date.now() - 300000).toISOString(),
        currentData: { temperature: 22.1, humidity: 58.7, doorState: 'OPEN', lightState: 'OFF' },
        position: { x: -5, y: 2, z: 8 }
      }
    ];

    mockSensors.forEach(sensor => {
      this.sensors.set(sensor.sensorID, {
        ...sensor,
        settings: {
          reportingInterval: 30000,
          alertsEnabled: true,
          thresholds: {
            temperature: { warning: 30, critical: 35 },
            humidity: { warning: 75, critical: 85 }
          }
        }
      });
      if (sensor.assetID) {
        if (!this.assetSensorLinks.has(sensor.assetID)) {
          this.assetSensorLinks.set(sensor.assetID, []);
        }
        this.assetSensorLinks.get(sensor.assetID).push(sensor.sensorID);
        this.sensorAssetLinks.set(sensor.sensorID, sensor.assetID);
      }
    });
  }
}

export default new SensorService();