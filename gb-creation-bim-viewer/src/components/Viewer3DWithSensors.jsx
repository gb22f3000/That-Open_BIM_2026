/**
 * Enhanced Viewer3D with Sensor Integration
 * Supports sensor-asset linking, 3D sensor visualization, and double-click asset selection
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import sensorService from '../services/sensorService.js';

// Component removed during architecture update. Use `Viewer3D` instead.
export default function Viewer3DWithSensors() {
  if (import.meta.env.DEV) {
    console.warn('Viewer3DWithSensors has been removed. Use Viewer3D instead.');
  }
  return null;
}

/**
 * Asset-Sensor Link Modal
 */
const AssetSensorLinkModal = ({ asset, sensors, onClose, onLink }) => {
  const [selectedSensorID, setSelectedSensorID] = useState('');
  const [position, setPosition] = useState(asset.position || { x: 0, y: 0, z: 0 });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedSensorID) {
      onLink(selectedSensorID, asset.assetID, position);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        width: '500px',
        padding: '20px'
      }}>
        <h3 style={{ margin: '0 0 20px 0' }}>🔗 Link Sensor to Asset</h3>
        
        <div style={{ marginBottom: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
          <strong>Selected Asset:</strong><br />
          {asset.modelName}<br />
          <small style={{ color: '#666' }}>ID: {asset.assetID}</small><br />
          <small style={{ color: '#666' }}>
            Position: X:{asset.position.x.toFixed(1)}, Y:{asset.position.y.toFixed(1)}, Z:{asset.position.z.toFixed(1)}
          </small>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Select Sensor to Link:
            </label>
            <select
              value={selectedSensorID}
              onChange={(e) => setSelectedSensorID(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
              required
            >
              <option value="">-- Select a Sensor --</option>
              {sensors.map(sensor => (
                <option key={sensor.sensorID} value={sensor.sensorID}>
                  {sensor.sensorName} ({sensor.sensorID}) - {sensor.isOnline ? '🟢 Online' : '🔴 Offline'}
                </option>
              ))}
            </select>
            {sensors.length === 0 && (
              <small style={{ color: '#999', fontStyle: 'italic' }}>
                No unlinked sensors available
              </small>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
              Sensor Position in 3D Space:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label>X:</label>
                <input
                  type="number"
                  step="0.1"
                  value={position.x}
                  onChange={(e) => setPosition(prev => ({ ...prev, x: parseFloat(e.target.value) || 0 }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div>
                <label>Y:</label>
                <input
                  type="number"
                  step="0.1"
                  value={position.y}
                  onChange={(e) => setPosition(prev => ({ ...prev, y: parseFloat(e.target.value) || 0 }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div>
                <label>Z:</label>
                <input
                  type="number"
                  step="0.1"
                  value={position.z}
                  onChange={(e) => setPosition(prev => ({ ...prev, z: parseFloat(e.target.value) || 0 }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedSensorID}
              style={{
                padding: '10px 20px',
                background: selectedSensorID ? '#28a745' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedSensorID ? 'pointer' : 'not-allowed'
              }}
            >
              🔗 Link Sensor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};