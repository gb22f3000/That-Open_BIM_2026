/**
 * Alarm Service - Handles predictive maintenance alarm streams from mock API
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

class AlarmService {
  constructor() {
    this.apiBaseUrl = getEnvVar('VITE_SENSOR_API_BASE_URL', 'http://localhost:4000/api');
    this.eventSource = null;
    this.listeners = new Set();
    this.initialized = false;
    this.cachedAlarms = [];
  }

  async initialize() {
    if (this.initialized) return;
    await this.refreshAlarms();
    this.startStream();
    this.initialized = true;
  }

  startStream() {
    if (typeof window === 'undefined' || this.eventSource) return;

    // Cleanup on unload
    window.addEventListener('beforeunload', () => this.closeStream());

    const streamUrl = `${this.apiBaseUrl}/alarms/stream`;
    this.eventSource = new EventSource(streamUrl, { withCredentials: false });

    this.eventSource.addEventListener('alarm', (event) => {
      try {
        const alarm = JSON.parse(event.data);
        this.cachedAlarms.unshift(alarm);
        this.notifyListeners('alarm', alarm);
      } catch (error) {
        console.error('❌ Failed to parse alarm event:', error, event.data);
      }
    });

    this.eventSource.addEventListener('status', (event) => {
      try {
        const status = JSON.parse(event.data);
        this.notifyListeners('status', status);
      } catch (error) {
        console.error('❌ Failed to parse status event:', error, event.data);
      }
    });

    this.eventSource.addEventListener('connected', (event) => {
      try {
        const info = JSON.parse(event.data);
        this.notifyListeners('connected', info);
      } catch (error) {
        console.error('❌ Failed to parse connected event:', error);
      }
    });

    this.eventSource.onerror = (error) => {
      console.error('⚠️ Alarm SSE connection error:', error);
      this.notifyListeners('error', error);
    };
  }

  closeStream() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notifyListeners(eventType, payload) {
    this.listeners.forEach(listener => {
      try {
        listener(eventType, payload);
      } catch (error) {
        console.error('❌ Alarm listener error:', error);
      }
    });
  }

  async refreshAlarms() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/alarms`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      this.cachedAlarms = Array.isArray(payload?.alarms) ? payload.alarms : [];
      return this.cachedAlarms;
    } catch (error) {
      console.error('❌ Failed to fetch alarms:', error);
      return this.cachedAlarms;
    }
  }

  getCachedAlarms() {
    return this.cachedAlarms;
  }

  async pushPredictiveAlarm(alarm) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/predictive-alarms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alarm)
      });
      if (!response.ok) {
        throw new Error(`Failed to enqueue predictive alarm`);
      }
      const payload = await response.json();
      if (payload?.alarm) {
        this.cachedAlarms.unshift(payload.alarm);
      }
      return payload?.alarm ?? null;
    } catch (error) {
      console.error('❌ Error pushing predictive alarm:', error);
      return null;
    }
  }

  async acknowledgeAlarm(alarmId, acknowledgedBy = 'dashboard') {
    try {
      const response = await fetch(`${this.apiBaseUrl}/alarms/${alarmId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledgedBy })
      });
      if (!response.ok) {
        throw new Error('Failed to acknowledge alarm');
      }
      const payload = await response.json();
      const updated = payload?.alarm;
      if (updated) {
        this.cachedAlarms = this.cachedAlarms.map(alarm =>
          alarm.id === updated.id ? updated : alarm
        );
      }
      return updated;
    } catch (error) {
      console.error('❌ Error acknowledging alarm:', error);
      return null;
    }
  }
}

export default new AlarmService();
