/**
 * Real-Time Sensor Dashboard Component
 * Updated for on-prem API driven sensor data and predictive maintenance alarms
 */

import React, { useEffect, useMemo, useState } from 'react';
import sensorService from '../services/sensorService.js';
import alarmService from '../services/alarmService.js';

const POLL_INTERVAL = 15000;

const RealTimeDashboard = () => {
  const [sensors, setSensors] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({
    apiOnline: false,
    alarmStream: false,
    lastSync: null
  });
  const [selectedSensorId, setSelectedSensorId] = useState(null);

  useEffect(() => {
    let mounted = true;
    let pollHandle;

    const loadSensors = async (initial = false) => {
      try {
        await sensorService.initialize(initial);
        if (!mounted) return;
        setSensors(sensorService.getAllSensors());
        const stats = await sensorService.getSensorStatistics();
        setStatistics(stats);
        if (stats?.raw?.systemMessage) {
          setSystemStatus(stats.raw.systemMessage);
        }
        setConnectionStatus(prev => ({
          ...prev,
          apiOnline: true,
          lastSync: new Date().toISOString()
        }));
      } catch (error) {
        console.error('❌ Sensor data refresh failed:', error);
        if (!mounted) return;
        setConnectionStatus(prev => ({
          ...prev,
          apiOnline: false
        }));
      }
    };

    const setup = async () => {
      await loadSensors(true);
      pollHandle = setInterval(() => loadSensors(false), POLL_INTERVAL);

      await alarmService.initialize();
      if (!mounted) return;
      setAlerts(alarmService.getCachedAlarms());
    };

    const unsubscribe = alarmService.subscribe((eventType, payload) => {
      if (!mounted) return;
      if (eventType === 'alarm') {
        setAlerts(prev => [payload, ...prev]);
      } else if (eventType === 'status') {
        setSystemStatus(payload);
      } else if (eventType === 'connected') {
        setConnectionStatus(prev => ({ ...prev, alarmStream: true }));
      } else if (eventType === 'error') {
        setConnectionStatus(prev => ({ ...prev, alarmStream: false }));
      }
    });

    setup();

    return () => {
      mounted = false;
      if (pollHandle) clearInterval(pollHandle);
      unsubscribe();
      alarmService.closeStream();
    };
  }, []);

  const selectedSensor = useMemo(() => {
    return sensors.find(sensor => sensor.sensorID === selectedSensorId) || null;
  }, [selectedSensorId, sensors]);

  const sensorAlerts = useMemo(() => {
    if (!selectedSensorId) return [];
    return alerts.filter(alert => alert.sensorID === selectedSensorId).slice(0, 10);
  }, [alerts, selectedSensorId]);

  const formatTimestamp = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const getSensorStatusColor = (sensor) => {
    if (!sensor?.isOnline) return '#f44336';
    return '#4caf50';
  };

  const getAlertIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'warning':
        return '🟡';
      case 'info':
      default:
        return '🔵';
    }
  };

  const acknowledgeAlert = async (alarmId) => {
    await alarmService.acknowledgeAlarm(alarmId, 'dashboard-user');
    setAlerts(alarmService.getCachedAlarms());
  };

  const triggerTestAlarm = async (sensor) => {
    await alarmService.pushPredictiveAlarm({
      sensorID: sensor.sensorID,
      severity: 'warning',
      message: `Manual test alarm triggered for ${sensor.sensorName}`,
      metadata: {
        source: 'dashboard',
        initiatedBy: 'control-room'
      }
    });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'var(--font-family)', color: 'var(--text-main)' }}>
      <div className="glass-panel" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '20px',
        borderRadius: 'var(--radius-md)'
      }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--text-main)', fontSize: '24px' }}>🏗️ GB Creation Digital Twin Dashboard</h1>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '5px' }}>
            {systemStatus ? systemStatus.message : 'Monitoring station telemetry and predictive alarms'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <StatusBadge
            label="Sensor API"
            healthy={connectionStatus.apiOnline}
            description={connectionStatus.lastSync ? `Last sync: ${formatTimestamp(connectionStatus.lastSync)}` : 'Awaiting data'}
          />
          <StatusBadge
            label="Alarm Stream"
            healthy={connectionStatus.alarmStream}
            description={connectionStatus.alarmStream ? 'Streaming' : 'Connecting...'}
          />
        </div>
      </div>

      <StatisticsStrip statistics={statistics} alerts={alerts} />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div className="glass-panel" style={{
          padding: '20px',
          borderRadius: 'var(--radius-md)'
        }}>
          <h2 style={{ marginTop: 0, color: 'var(--text-main)', fontSize: '18px', marginBottom: '20px' }}>📡 Live Sensor Data</h2>
          {sensors.length === 0 ? (
            <EmptyState
              icon="📡"
              title="No sensors connected yet"
              subtitle="Mock API will begin streaming data automatically"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sensors.map(sensor => {
                const current = sensor.currentData || {};
                return (
                  <div
                    key={sensor.sensorID}
                    className="glass-card"
                    style={{
                      padding: '15px',
                      borderLeft: `4px solid ${getSensorStatusColor(sensor)}`,
                      cursor: 'pointer',
                      backgroundColor: selectedSensorId === sensor.sensorID ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => setSelectedSensorId(sensor.sensorID)}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px'
                    }}>
                      <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--text-main)' }}>
                        {sensor.sensorName} <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 'normal' }}>({sensor.sensorID})</span>
                      </div>
                      <div style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: sensor.isOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: sensor.isOnline ? 'var(--success)' : 'var(--danger)',
                        border: `1px solid ${sensor.isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                      }}>
                        {sensor.isOnline ? 'ONLINE' : 'OFFLINE'}
                      </div>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                      gap: '10px',
                      fontSize: '14px'
                    }}>
                      {current.temperature !== undefined && (
                        <MetricBadge label="🌡️ Temp" value={`${current.temperature.toFixed(1)}°C`} />
                      )}
                      {current.humidity !== undefined && (
                        <MetricBadge label="💧 Humidity" value={`${current.humidity.toFixed(1)}%`} />
                      )}
                      {current.doorState !== undefined && (
                        <MetricBadge label="🚪 Door" value={current.doorState} />
                      )}
                      {current.lightState !== undefined && (
                        <MetricBadge label="💡 Light" value={current.lightState} />
                      )}
                      {sensor.batteryLevel !== undefined && (
                        <MetricBadge label="🔋 Battery" value={`${sensor.batteryLevel}%`} />
                      )}
                    </div>

                    <div style={{
                      marginTop: '10px',
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>Zone: {sensor.zoneID} • Last seen: {formatTimestamp(sensor.lastSeen)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerTestAlarm(sensor);
                        }}
                        className="btn-glass"
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          color: 'var(--warning)',
                          borderColor: 'rgba(245, 158, 11, 0.3)'
                        }}
                      >
                        Trigger Test Alarm
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-panel" style={{
          padding: '20px',
          borderRadius: 'var(--radius-md)'
        }}>
          <h2 style={{ marginTop: 0, color: 'var(--text-main)', fontSize: '18px', marginBottom: '20px' }}>🚨 Predictive Maintenance Alarms</h2>
          {alerts.length === 0 ? (
            <EmptyState
              icon="✅"
              title="All systems normal"
              subtitle="No active predictive maintenance alarms"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {alerts.slice(0, 10).map(alarm => (
                <div
                  key={alarm.id}
                  className="glass-card"
                  style={{
                    padding: '12px',
                    borderLeft: `4px solid ${
                      alarm.severity === 'critical'
                        ? 'var(--danger)'
                        : alarm.severity === 'warning'
                        ? 'var(--warning)'
                        : 'var(--primary)'
                    }`
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px'
                  }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-main)' }}>
                      {getAlertIcon(alarm.severity)} {alarm.sensorID}
                    </div>
                    {!alarm.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(alarm.id)}
                        className="btn-glass"
                        style={{
                          padding: '2px 6px',
                          fontSize: '10px',
                          color: 'var(--success)',
                          borderColor: 'rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        ACK
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', marginBottom: '5px', color: 'var(--text-main)' }}>
                    {alarm.message}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {formatTimestamp(alarm.timestamp)}
                    {alarm.acknowledged && ` • Acknowledged by ${alarm.acknowledgedBy ?? 'operator'}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedSensor && (
        <div className="glass-panel" style={{
          marginTop: '20px',
          padding: '20px',
          borderRadius: 'var(--radius-md)'
        }}>
          <h2 style={{ marginTop: 0, color: 'var(--text-main)', fontSize: '18px', marginBottom: '20px' }}>📊 Sensor Details: {selectedSensor.sensorName}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <h3 style={{ color: 'var(--text-main)', fontSize: '16px' }}>Current Telemetry</h3>
              <pre style={{
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                padding: '15px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                color: 'var(--text-code)',
                border: '1px solid var(--border-glass)',
                overflowX: 'auto'
              }}>
                {JSON.stringify(selectedSensor.currentData, null, 2)}
              </pre>
            </div>
            <div>
              <h3 style={{ color: 'var(--text-main)', fontSize: '16px' }}>Recent Alarms</h3>
              {sensorAlerts.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No recent alarms</div>
              ) : (
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {sensorAlerts.map(alarm => (
                    <div
                      key={alarm.id}
                      style={{
                        padding: '10px',
                        marginBottom: '8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        border: '1px solid var(--border-glass)'
                      }}
                    >
                      <div style={{ color: 'var(--text-main)' }}>{getAlertIcon(alarm.severity)} {alarm.message}</div>
                      <div style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '10px' }}>
                        {formatTimestamp(alarm.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusBadge = ({ label, healthy, description }) => (
  <div className="glass-card" style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '8px 12px',
    backgroundColor: healthy ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
    border: `1px solid ${healthy ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
    borderRadius: 'var(--radius-sm)',
    minWidth: '140px'
  }}>
    <span style={{ fontWeight: 'bold', fontSize: '13px', color: healthy ? 'var(--success)' : 'var(--danger)' }}>{label}</span>
    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{description}</span>
  </div>
);

const StatisticsStrip = ({ statistics, alerts }) => {
  const total = statistics.total ?? 0;
  const online = statistics.online ?? 0;
  const offline = statistics.offline ?? 0;
  const linked = statistics.linked ?? 0;
  const activeAlarms = alerts.filter(alarm => !alarm.acknowledged).length;
  const criticalAlarms = alerts.filter(alarm => alarm.severity === 'critical' && !alarm.acknowledged).length;

  const cards = [
    { label: 'Total Sensors', value: total, color: 'var(--primary)', border: 'var(--primary)' },
    { label: 'Online', value: online, color: 'var(--success)', border: 'var(--success)' },
    { label: 'Offline', value: offline, color: 'var(--danger)', border: 'var(--danger)' },
    { label: 'Linked', value: linked, color: 'var(--warning)', border: 'var(--warning)' },
    { label: 'Active Alarms', value: activeAlarms, color: 'var(--danger)', border: 'var(--danger)' },
    { label: 'Critical', value: criticalAlarms, color: '#b71c1c', border: '#b71c1c' }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: '15px',
      marginBottom: '25px'
    }}>
      {cards.map(card => (
        <div
          key={card.label}
          className="glass-card"
          style={{
            padding: '18px',
            textAlign: 'center',
            borderTop: `3px solid ${card.border}`
          }}
        >
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: card.color }}>
            {card.value}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{card.label}</div>
        </div>
      ))}
    </div>
  );
};

const MetricBadge = ({ label, value }) => (
  <div style={{
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: '8px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-glass)'
  }}>
    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</div>
    <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)' }}>{value}</div>
  </div>
);

const EmptyState = ({ icon, title, subtitle }) => (
  <div style={{
    textAlign: 'center',
    padding: '40px',
    color: 'var(--text-muted)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 'var(--radius-md)',
    border: '1px dashed var(--border-glass)'
  }}>
    <div style={{ fontSize: '48px', marginBottom: '10px', opacity: 0.7 }}>{icon}</div>
    <div style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{title}</div>
    <div style={{ fontSize: '14px', marginTop: '5px' }}>{subtitle}</div>
  </div>
);

export default RealTimeDashboard;