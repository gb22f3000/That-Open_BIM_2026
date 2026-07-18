/**
 * Sensor Data Manager (On-Prem API Edition)
 * Consolidates sensor snapshots and predictive alarms for dashboard consumers
 */

import sensorService from './sensorService.js';
import alarmService from './alarmService.js';

class SensorDataManager {
  constructor() {
    this.sensors = new Map();
    this.alerts = new Map();
    this.subscribers = new Map();
    this.statistics = {
      totalSensors: 0,
      onlineSensors: 0,
      offlineSensors: 0,
      criticalAlerts: 0,
      totalAlerts: 0,
      lastUpdate: null
    };
    this.initialized = false;
    this.pollInterval = 15000;
    this.pollHandle = null;
  }

  async initialize() {
    if (this.initialized) return;

    // Ensure polling stops when window closes
    window.addEventListener('beforeunload', () => {
      this.stopPolling();
    });

    await this.refreshFromApi();
    await alarmService.initialize();
    alarmService.getCachedAlarms().forEach(alarm => this.storeAlarm(alarm));
    alarmService.subscribe((eventType, payload) => {
      if (eventType === 'alarm') {
        this.storeAlarm(payload);
        this.notifySubscribers('alertCreated', payload);
      } else if (eventType === 'status') {
        this.notifySubscribers('statusUpdate', payload);
      }
    });

    this.startPolling();
    this.initialized = true;
  }

  startPolling() {
    if (this.pollHandle) return;
    this.pollHandle = setInterval(() => {
      this.refreshFromApi().catch(error => console.error('Sensor poll failed:', error));
    }, this.pollInterval);
  }

  stopPolling() {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }

  async refreshFromApi(force = false) {
    await sensorService.initialize(force);
    const list = sensorService.getAllSensors();
    this.sensors.clear();
    list.forEach(sensor => {
      this.sensors.set(sensor.sensorID, {
        id: sensor.sensorID,
        name: sensor.sensorName,
        type: sensor.sensorType,
        zoneId: sensor.zoneID,
        assetId: sensor.assetID,
        status: sensor.isOnline ? 'online' : 'offline',
        lastUpdate: sensor.lastSeen ? new Date(sensor.lastSeen) : new Date(),
        currentValues: {
          temperature: sensor.currentData?.temperature,
          humidity: sensor.currentData?.humidity,
          doorState: sensor.currentData?.doorState === 'OPEN',
          lightState: sensor.currentData?.lightState === 'ON'
        },
        history: [],
        alerts: []
      });
    });

    this.recalculateStatistics();
    this.notifySubscribers('sensorUpdate', { sensors: this.getAllSensors() });
  }

  storeAlarm(alarm) {
    this.alerts.set(alarm.id, alarm);
    this.recalculateStatistics();
  }

  recalculateStatistics() {
    const sensors = this.getAllSensors();
    const alerts = this.getActiveAlerts();

    this.statistics = {
      totalSensors: sensors.length,
      onlineSensors: sensors.filter(sensor => sensor.status === 'online').length,
      offlineSensors: sensors.filter(sensor => sensor.status === 'offline').length,
      totalAlerts: this.alerts.size,
      criticalAlerts: alerts.filter(alert => alert.severity === 'critical').length,
      lastUpdate: new Date()
    };
  }

  getAllSensors() {
    return Array.from(this.sensors.values());
  }

  getActiveAlerts() {
    return Array.from(this.alerts.values()).filter(alert => !alert.acknowledged);
  }

  getStatistics() {
    return {
      ...this.statistics,
      lastUpdate: this.statistics.lastUpdate ? this.statistics.lastUpdate.toISOString() : null
    };
  }

  async acknowledgeAlert(alertId, acknowledgedBy = 'dashboard-user') {
    const updated = await alarmService.acknowledgeAlarm(alertId, acknowledgedBy);
    if (updated) {
      this.alerts.set(updated.id, updated);
      this.recalculateStatistics();
      this.notifySubscribers('alertAcknowledge', updated);
    }
  }

  processSensorData(sensorMessage) {
    // Compatibility method for legacy integrations (e.g., real AWS service)
    const { sensorId, data, timestamp } = sensorMessage;
    const sensor = this.sensors.get(sensorId) || {
      id: sensorId,
      name: data.sensorName || sensorId,
      type: data.sensorType || 'environmental',
      zoneId: data.zoneId || 'Unknown',
      assetId: data.assetId || '',
      status: 'online',
      lastUpdate: new Date(),
      currentValues: {},
      history: [],
      alerts: []
    };

    sensor.status = 'online';
    sensor.lastUpdate = timestamp ? new Date(timestamp) : new Date();

    if (!sensor.history) sensor.history = [];
    sensor.history.push({ timestamp: sensor.lastUpdate, data });
    if (sensor.history.length > 100) sensor.history.shift();

    sensor.currentValues = {
      ...sensor.currentValues,
      ...data.currentValues
    };

    this.sensors.set(sensorId, sensor);
    this.recalculateStatistics();
    this.notifySubscribers('sensorUpdate', { sensorId, sensor, updateType: sensorMessage.type });
  }

  subscribe(callback) {
    const token = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    this.subscribers.set(token, callback);
    return () => {
      this.subscribers.delete(token);
    };
  }

  notifySubscribers(eventType, payload) {
    this.subscribers.forEach(callback => {
      try {
        callback(eventType, payload);
      } catch (error) {
        console.error('SensorDataManager subscriber error:', error);
      }
    });
  }

  checkSensorHealth() {
    const now = Date.now();
    const offlineThreshold = 5 * 60 * 1000;

    this.sensors.forEach(sensor => {
      if (!sensor.lastUpdate) return;
      if (now - sensor.lastUpdate.getTime() > offlineThreshold) {
        sensor.status = 'offline';
      }
    });

    this.recalculateStatistics();
  }
}

const sensorDataManager = new SensorDataManager();

// Global health check interval with cleanup
const healthCheckInterval = setInterval(() => sensorDataManager.checkSensorHealth(), 60000);
window.addEventListener('beforeunload', () => clearInterval(healthCheckInterval));

export default sensorDataManager;