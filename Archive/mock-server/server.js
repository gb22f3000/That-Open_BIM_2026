import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const PORT = process.env.MOCK_SERVER_PORT ? Number(process.env.MOCK_SERVER_PORT) : 4000;
const API_PREFIX = '/api';

const app = express();
app.use(cors());
app.use(express.json());

// Debug Logging Endpoint
const LOG_FILE = path.join(process.cwd(), 'client-debug.log');

// Clear log file on startup
try {
  fs.writeFileSync(LOG_FILE, `[SERVER START] Logging started at ${new Date().toISOString()}\n`);
} catch (e) {
  console.error('Failed to init log file:', e);
}

app.post('/api/log', (req, res) => {
  const { message, type, timestamp } = req.body;
  const logLine = `[${timestamp || new Date().toISOString()}] [${type || 'INFO'}] ${message}\n`;
  
  // Write to file
  fs.appendFile(LOG_FILE, logLine, (err) => {
    if (err) console.error('Failed to write to log file:', err);
  });
  
  // Also print to server console
  console.log(`[CLIENT-LOG] ${logLine.trim()}`);
  
  res.status(200).send({ success: true });
});

const sensors = new Map();
const sensorHistory = new Map();
const alarms = [];
const statusEvents = [];
const alarmClients = new Set();
const MAX_HISTORY = 500;
const MAX_ALARMS = 200;
const STATION_ID = 'Sahibabad';

const SENSOR_TEMPLATES = [
  {
    sensorID: 'ESP32_ZONE1',
    sensorName: 'Zone 1 - Environmental Sensor',
    sensorType: 'environmental',
    zoneID: 'Zone1',
    assetID: 'NCRTC-DM009-AYE-SAHI-STN-M3-AR-00121',
    tags: ['temperature', 'humidity']
  },
  {
    sensorID: 'ESP32_ZONE1_SECURITY',
    sensorName: 'Zone 1 - Entry Security',
    sensorType: 'security',
    zoneID: 'Zone1',
    assetID: 'NCRTC-DM009-AYE-SAHI-STN-M3-PI-00121',
    tags: ['door', 'light']
  },
  {
    sensorID: 'ESP32_ZONE2',
    sensorName: 'Zone 2 - Environmental Sensor',
    sensorType: 'environmental',
    zoneID: 'Zone2',
    assetID: 'NCRTC-DM009-AYE-SAHI-STN-M3-ST-00121',
    tags: ['temperature', 'humidity']
  }
];

const randomInRange = (min, max, decimals = 1) => {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
};

const bootstrapSensors = () => {
  SENSOR_TEMPLATES.forEach(template => {
    const baseReading = {
      temperature: randomInRange(22, 28),
      humidity: randomInRange(45, 65),
      doorState: Math.random() > 0.8 ? 'OPEN' : 'CLOSED',
      lightState: Math.random() > 0.4 ? 'ON' : 'OFF'
    };

    sensors.set(template.sensorID, {
      ...template,
      stationID: STATION_ID,
      isOnline: true,
      lastSeen: new Date().toISOString(),
      batteryLevel: randomInRange(65, 95, 0),
      signalStrength: randomInRange(-65, -40, 0),
      currentData: baseReading,
      lastTelemetry: baseReading,
      settings: {
        reportingInterval: 30000,
        alertsEnabled: true,
        thresholds: {
          temperature: { warning: 30, critical: 35 },
          humidity: { warning: 75, critical: 85 }
        }
      }
    });

    sensorHistory.set(template.sensorID, []);
  });
};

const persistSensorReading = (sensorID, payload, source = 'mock-generator') => {
  const history = sensorHistory.get(sensorID);
  if (!history) return;

  history.push({
    timestamp: new Date().toISOString(),
    payload,
    source
  });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
};

const broadcastEvent = (eventName, data) => {
  const message = `event: ${eventName}` + `\ndata: ${JSON.stringify(data)}\n\n`;
  alarmClients.forEach(client => {
    try {
      client.write(message);
    } catch (error) {
      console.error('Error writing to SSE client:', error);
    }
  });
};

const createStatusEvent = (message, level = 'info') => {
  const status = {
    id: randomUUID(),
    message,
    level,
    timestamp: new Date().toISOString()
  };
  statusEvents.push(status);
  if (statusEvents.length > MAX_ALARMS) {
    statusEvents.splice(0, statusEvents.length - MAX_ALARMS);
  }
  broadcastEvent('status', status);
  return status;
};

const createPredictiveAlarm = ({ sensorID, severity, message, type = 'predictive-maintenance', metadata = {} }) => {
  const alarm = {
    id: randomUUID(),
    sensorID,
    severity,
    message,
    type,
    metadata,
    acknowledged: false,
    timestamp: new Date().toISOString()
  };
  alarms.unshift(alarm);
  if (alarms.length > MAX_ALARMS) {
    alarms.splice(MAX_ALARMS);
  }
  broadcastEvent('alarm', alarm);
  return alarm;
};

const generateSensorTick = () => {
  sensors.forEach((sensor, sensorID) => {
    const drift = {
      temperature: randomInRange(-0.4, 0.6),
      humidity: randomInRange(-1.2, 1.2)
    };

    const nextReading = {
      temperature: Math.min(Math.max(sensor.currentData.temperature + drift.temperature, 20), 40),
      humidity: Math.min(Math.max(sensor.currentData.humidity + drift.humidity, 35), 95),
      doorState: sensor.sensorType === 'security' && Math.random() > 0.95 ? (sensor.currentData.doorState === 'OPEN' ? 'CLOSED' : 'OPEN') : sensor.currentData.doorState,
      lightState: sensor.sensorType === 'security' && Math.random() > 0.7 ? (sensor.currentData.lightState === 'ON' ? 'OFF' : 'ON') : sensor.currentData.lightState
    };

    const update = {
      ...sensor,
      currentData: nextReading,
      lastTelemetry: nextReading,
      lastSeen: new Date().toISOString()
    };

    sensors.set(sensorID, update);
    persistSensorReading(sensorID, nextReading, 'auto');
  });
};

const periodicAlarmGenerator = () => {
  const sensorIDs = Array.from(sensors.keys());
  if (sensorIDs.length === 0) return;

  const targetSensor = sensorIDs[Math.floor(Math.random() * sensorIDs.length)];
  const sensor = sensors.get(targetSensor);

  const severityRoll = Math.random();
  let severity = 'info';
  if (severityRoll > 0.8) severity = 'critical';
  else if (severityRoll > 0.5) severity = 'warning';

  const alarm = createPredictiveAlarm({
    sensorID: targetSensor,
    severity,
    message: `${sensor.sensorName} reported ${severity} condition from predictive model`,
    metadata: {
      station: sensor.stationID,
      predictedFailure: severity === 'critical',
      recommendedAction: severity === 'critical' ? 'Dispatch maintenance crew immediately' : 'Schedule inspection'
    }
  });

  createStatusEvent(`Predictive alarm generated for ${sensor.sensorName}`, severity === 'critical' ? 'critical' : 'warning');
  return alarm;
};

bootstrapSensors();

setInterval(generateSensorTick, 15000);
setInterval(periodicAlarmGenerator, 45000);
setInterval(() => {
  const healthMessage = `System heartbeat at ${new Date().toLocaleTimeString()}`;
  createStatusEvent(healthMessage, 'info');
}, 60000);

app.get(`${API_PREFIX}/health`, (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get(`${API_PREFIX}/sensors`, (_req, res) => {
  const list = Array.from(sensors.values()).map(sensor => ({
    ...sensor,
    historyLength: sensorHistory.get(sensor.sensorID)?.length || 0
  }));
  res.json({ sensors: list, station: STATION_ID, updatedAt: new Date().toISOString() });
});

app.get(`${API_PREFIX}/sensors/:sensorID`, (req, res) => {
  const { sensorID } = req.params;
  if (!sensors.has(sensorID)) {
    res.status(404).json({ error: `Sensor ${sensorID} not found` });
    return;
  }
  res.json({ sensor: sensors.get(sensorID) });
});

app.get(`${API_PREFIX}/sensors/:sensorID/history`, (req, res) => {
  const { sensorID } = req.params;
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  if (!sensors.has(sensorID)) {
    res.status(404).json({ error: `Sensor ${sensorID} not found` });
    return;
  }
  const history = sensorHistory.get(sensorID) || [];
  res.json({
    sensorID,
    history: history.slice(-limit)
  });
});

app.post(`${API_PREFIX}/sensors/:sensorID/data`, (req, res) => {
  const { sensorID } = req.params;
  const payload = req.body;
  if (!sensors.has(sensorID)) {
    res.status(404).json({ error: `Sensor ${sensorID} not found` });
    return;
  }
  const sensor = sensors.get(sensorID);
  const updated = {
    ...sensor,
    currentData: {
      temperature: payload.temperature ?? sensor.currentData.temperature,
      humidity: payload.humidity ?? sensor.currentData.humidity,
      doorState: payload.doorState ?? sensor.currentData.doorState,
      lightState: payload.lightState ?? sensor.currentData.lightState
    },
    lastTelemetry: payload,
    lastSeen: new Date().toISOString()
  };
  sensors.set(sensorID, updated);
  persistSensorReading(sensorID, payload, 'api');
  res.json({ success: true, sensor: updated });
});

app.patch(`${API_PREFIX}/sensors/:sensorID`, (req, res) => {
  const { sensorID } = req.params;
  const updates = req.body || {};

  if (!sensors.has(sensorID)) {
    res.status(404).json({ error: `Sensor ${sensorID} not found` });
    return;
  }

  const sensor = sensors.get(sensorID);
  const previousAsset = sensor.assetID;
  const updated = {
    ...sensor,
    sensorName: updates.sensorName ?? sensor.sensorName,
    sensorType: updates.sensorType ?? sensor.sensorType,
    zoneID: updates.zoneID ?? sensor.zoneID,
    assetID: updates.assetID === undefined ? sensor.assetID : updates.assetID,
  position: updates.position ? { ...(sensor.position || {}), ...updates.position } : (sensor.position || { x: 0, y: 0, z: 0 }),
  settings: updates.settings ? { ...(sensor.settings || {}), ...updates.settings } : (sensor.settings || {}),
    metadata: updates.metadata ? { ...(sensor.metadata || {}), ...updates.metadata } : sensor.metadata
  };

  sensors.set(sensorID, updated);

  if (updates.assetID !== undefined && previousAsset !== updates.assetID) {
    const statusMessage = updates.assetID
      ? `${sensor.sensorName} linked to asset ${updates.assetID}`
      : `${sensor.sensorName} unlinked from asset ${previousAsset ?? 'none'}`;
    createStatusEvent(statusMessage, 'info');
  }

  res.json({ success: true, sensor: updated });
});

app.get(`${API_PREFIX}/status`, (_req, res) => {
  const now = Date.now();
  let online = 0;
  let offline = 0;

  sensors.forEach(sensor => {
    const lastSeen = new Date(sensor.lastSeen).getTime();
    if (now - lastSeen < 60000) online += 1;
    else offline += 1;
  });

  res.json({
    totalSensors: sensors.size,
    onlineSensors: online,
    offlineSensors: offline,
    activeAlarms: alarms.filter(a => !a.acknowledged).length,
    lastAlarm: alarms[0] || null,
    systemMessage: statusEvents[statusEvents.length - 1] || null,
    timestamp: new Date().toISOString()
  });
});

app.get(`${API_PREFIX}/asset-sensor-links`, (_req, res) => {
  const links = [];
  sensors.forEach(sensor => {
    if (sensor.assetID) {
      links.push({ assetID: sensor.assetID, sensorID: sensor.sensorID });
    }
  });

  res.json({ links, count: links.length, updatedAt: new Date().toISOString() });
});

app.get(`${API_PREFIX}/alarms`, (_req, res) => {
  res.json({ alarms, count: alarms.length, updatedAt: new Date().toISOString() });
});

app.post(`${API_PREFIX}/predictive-alarms`, (req, res) => {
  const { sensorID, severity = 'warning', message, metadata = {} } = req.body || {};
  if (!sensorID || !sensors.has(sensorID)) {
    res.status(400).json({ error: 'Valid sensorID is required' });
    return;
  }
  if (!message) {
    res.status(400).json({ error: 'Alarm message is required' });
    return;
  }
  const alarm = createPredictiveAlarm({ sensorID, severity, message, metadata, type: 'predictive-maintenance' });
  res.status(201).json({ success: true, alarm });
});

app.post(`${API_PREFIX}/alarms/:alarmID/acknowledge`, (req, res) => {
  const { alarmID } = req.params;
  const alarm = alarms.find(a => a.id === alarmID);
  if (!alarm) {
    res.status(404).json({ error: 'Alarm not found' });
    return;
  }
  alarm.acknowledged = true;
  alarm.acknowledgedBy = req.body?.acknowledgedBy || 'system';
  alarm.acknowledgedAt = new Date().toISOString();
  res.json({ success: true, alarm });
});

app.get(`${API_PREFIX}/alarms/stream`, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientID = randomUUID();
  alarmClients.add(res);

  res.write(`event: connected\ndata: ${JSON.stringify({ clientID, timestamp: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    alarmClients.delete(res);
  });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`Mock Sensor API Server running on http://localhost:${PORT}${API_PREFIX}`);
});
