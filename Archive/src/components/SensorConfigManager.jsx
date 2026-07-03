/**
 * Sensor Configuration Manager
 * Allows easy management of sensor configurations
 */

import React, { useState, useEffect } from 'react';

const SensorConfigManager = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newSensor, setNewSensor] = useState({
    sensorID: '',
    sensorName: '',
    sensorType: 'environmental',
    zoneID: 'ZONE_A1',
    isEnabled: true
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/sensors-config.json');
      if (response.ok) {
        const configData = await response.json();
        setConfig(configData);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSensor = () => {
    if (!newSensor.sensorID || !newSensor.sensorName) {
      alert('Please fill in sensor ID and name');
      return;
    }

    const sensor = {
      ...newSensor,
      thresholds: getDefaultThresholds(newSensor.sensorType),
      reportingInterval: 300,
      position: null,
      assetID: null,
      firmwareVersion: '1.0.0'
    };

    const updatedConfig = {
      ...config,
      sensors: [...config.sensors, sensor]
    };

    setConfig(updatedConfig);
    setNewSensor({
      sensorID: '',
      sensorName: '',
      sensorType: 'environmental',
      zoneID: 'ZONE_A1',
      isEnabled: true
    });

    // Here you would save to backend or local storage
    console.log('New sensor configuration:', updatedConfig);
  };

  const toggleSensor = (sensorID) => {
    const updatedConfig = {
      ...config,
      sensors: config.sensors.map(sensor =>
        sensor.sensorID === sensorID
          ? { ...sensor, isEnabled: !sensor.isEnabled }
          : sensor
      )
    };
    setConfig(updatedConfig);
  };

  const removeSensor = (sensorID) => {
    if (confirm(`Remove sensor ${sensorID}?`)) {
      const updatedConfig = {
        ...config,
        sensors: config.sensors.filter(sensor => sensor.sensorID !== sensorID)
      };
      setConfig(updatedConfig);
    }
  };

  const getDefaultThresholds = (type) => {
    switch (type) {
      case 'environmental':
        return {
          temperature: { min: 18, max: 26, critical: 32 },
          humidity: { min: 40, max: 60, critical: 80 }
        };
      case 'security':
        return {
          doorOpen: { alert: true, maxOpenTime: 300 }
        };
      case 'lighting':
        return {
          lightLevel: { min: 200, max: 800, critical: 50 }
        };
      default:
        return {};
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', color: 'var(--text-main)' }}>Loading sensor configuration...</div>;
  }

  if (!config) {
    return <div style={{ padding: '20px', color: 'var(--danger)' }}>Could not load sensor configuration.</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', color: 'var(--text-main)' }}>
      <h2 style={{ marginBottom: '20px', color: 'var(--text-main)' }}>🔧 Sensor Configuration Manager</h2>

      {/* Add New Sensor */}
      <div className="glass-panel" style={{
        padding: '20px',
        borderRadius: 'var(--radius-md)',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginTop: 0, color: 'var(--text-main)' }}>➕ Add New Sensor</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Sensor ID (e.g., DT_ESP32_006)"
            value={newSensor.sensorID}
            onChange={(e) => setNewSensor({ ...newSensor, sensorID: e.target.value })}
            style={{
              padding: '10px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-main)'
            }}
          />
          <input
            type="text"
            placeholder="Sensor Name"
            value={newSensor.sensorName}
            onChange={(e) => setNewSensor({ ...newSensor, sensorName: e.target.value })}
            style={{
              padding: '10px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-main)'
            }}
          />
          <select
            value={newSensor.sensorType}
            onChange={(e) => setNewSensor({ ...newSensor, sensorType: e.target.value })}
            style={{
              padding: '10px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-main)'
            }}
          >
            <option value="environmental">Environmental</option>
            <option value="security">Security</option>
            <option value="lighting">Lighting</option>
            <option value="generic">Generic</option>
          </select>
          <select
            value={newSensor.zoneID}
            onChange={(e) => setNewSensor({ ...newSensor, zoneID: e.target.value })}
            style={{
              padding: '10px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-main)'
            }}
          >
            {config.sensorConfiguration.zones.map(zone => (
              <option key={zone} value={zone}>{zone}</option>
            ))}
          </select>
        </div>
        <button
          onClick={addSensor}
          className="btn-modern"
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, var(--success) 0%, #059669 100%)'
          }}
        >
          ➕ Add Sensor
        </button>
      </div>

      {/* Current Sensors */}
      <div className="glass-panel" style={{
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-glass)' }}>
          <h3 style={{ margin: 0, color: 'var(--text-main)' }}>📡 Current Sensors ({config.sensors.length})</h3>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '5px' }}>
            Enabled: {config.sensors.filter(s => s.isEnabled).length} | 
            Disabled: {config.sensors.filter(s => !s.isEnabled).length}
          </div>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {config.sensors.map(sensor => (
            <div
              key={sensor.sensorID}
              style={{
                padding: '15px 20px',
                borderBottom: '1px solid var(--border-glass)',
                display: 'flex',
                alignItems: 'center',
                backgroundColor: sensor.isEnabled ? 'transparent' : 'rgba(0, 0, 0, 0.2)',
                opacity: sensor.isEnabled ? 1 : 0.7
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--text-main)' }}>
                  {sensor.sensorName}
                  <span style={{
                    marginLeft: '10px',
                    padding: '2px 6px',
                    fontSize: '12px',
                    borderRadius: '3px',
                    backgroundColor: sensor.isEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: sensor.isEnabled ? 'var(--success)' : 'var(--danger)',
                    border: `1px solid ${sensor.isEnabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                  }}>
                    {sensor.isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                  {sensor.sensorID} • {sensor.sensorType} • {sensor.zoneID}
                  {sensor.assetID && ` • Linked to ${sensor.assetID}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => toggleSensor(sensor.sensorID)}
                  className="btn-glass"
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    color: sensor.isEnabled ? 'var(--warning)' : 'var(--success)',
                    borderColor: sensor.isEnabled ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'
                  }}
                >
                  {sensor.isEnabled ? '⏸️ Disable' : '▶️ Enable'}
                </button>
                <button
                  onClick={() => removeSensor(sensor.sensorID)}
                  className="btn-glass"
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    color: 'var(--danger)',
                    borderColor: 'rgba(239, 68, 68, 0.3)'
                  }}
                >
                  🗑️ Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Config */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button
          onClick={() => {
            const dataStr = JSON.stringify(config, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'sensors-config.json';
            link.click();
          }}
          className="btn-modern"
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, var(--primary) 0%, #2563eb 100%)'
          }}
        >
          💾 Export Configuration
        </button>
      </div>
    </div>
  );
};

export default SensorConfigManager;