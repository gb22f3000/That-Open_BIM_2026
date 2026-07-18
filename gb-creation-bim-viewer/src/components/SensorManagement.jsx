import React, { useState, useEffect } from 'react';
import sensorService from '../services/sensorService.js';
import ModalOverlay from './ModalOverlay.jsx';

/**
 * Sensor Management Component
 * Allows admins to manage sensors, link them to assets, and configure settings
 */
const SensorManagement = ({ selectedAsset, onAssetSelect }) => {
  const [sensors, setSensors] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [showSensorModal, setShowSensorModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sensorStats, setSensorStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSensors();
  }, []);

  const loadSensors = async () => {
    setLoading(true);
    try {
      await sensorService.initialize();
      const allSensors = sensorService.getAllSensors();
      const stats = await sensorService.getSensorStatistics();
      
      setSensors(allSensors);
      setSensorStats(stats);
    } catch (error) {
      console.error('Error loading sensors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSensors = sensors.filter(sensor => {
    const matchesSearch = !searchQuery || 
      sensor.sensorID.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sensor.sensorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sensor.zoneID.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
      (filterType === 'online' && sensor.isOnline) ||
      (filterType === 'offline' && !sensor.isOnline) ||
      (filterType === 'linked' && sensor.assetID) ||
      (filterType === 'unlinked' && !sensor.assetID) ||
      sensor.sensorType === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const handleSensorEdit = (sensor) => {
    setSelectedSensor(sensor);
    setShowSensorModal(true);
  };

  const handleLinkToAsset = (sensor) => {
    setSelectedSensor(sensor);
    setShowLinkModal(true);
  };

  const handleUnlinkFromAsset = async (sensor) => {
    if (window.confirm(`Unlink sensor ${sensor.sensorID} from its current asset?`)) {
      const success = await sensorService.unlinkSensorFromAsset(sensor.sensorID);
      if (success) {
        loadSensors();
      }
    }
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📡</div>
        <div>Loading sensors...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-main)' }}>
      {/* Header with Statistics */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ margin: '0 0 20px 0', color: 'var(--text-main)' }}>📡 Sensor Management</h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div className="glass-card" style={{
            padding: '15px',
            textAlign: 'center',
            borderTop: '2px solid var(--primary)'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)' }}>
              {sensorStats.total || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Sensors</div>
          </div>
          
          <div className="glass-card" style={{
            padding: '15px',
            textAlign: 'center',
            borderTop: '2px solid var(--success)'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)' }}>
              {sensorStats.online || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Online</div>
          </div>
          
          <div className="glass-card" style={{
            padding: '15px',
            textAlign: 'center',
            borderTop: '2px solid var(--danger)'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--danger)' }}>
              {sensorStats.offline || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Offline</div>
          </div>
          
          <div className="glass-card" style={{
            padding: '15px',
            textAlign: 'center',
            borderTop: '2px solid var(--warning)'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning)' }}>
              {sensorStats.linked || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Linked to Assets</div>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="glass-panel" style={{
        padding: '20px',
        borderRadius: 'var(--radius-md)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search sensors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: '1',
              minWidth: '200px',
              padding: '10px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              color: 'var(--text-main)'
            }}
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '10px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              color: 'var(--text-main)'
            }}
          >
            <option value="all">All Sensors</option>
            <option value="online">Online Only</option>
            <option value="offline">Offline Only</option>
            <option value="linked">Linked to Assets</option>
            <option value="unlinked">Unlinked</option>
            <option value="environmental">Environmental</option>
            <option value="security">Security</option>
            <option value="safety">Safety</option>
          </select>
          <button
            onClick={loadSensors}
            className="btn-modern"
            style={{
              padding: '10px 15px',
              background: 'linear-gradient(135deg, var(--primary) 0%, #2563eb 100%)',
              fontSize: '14px'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Sensors List */}
      <div className="glass-panel" style={{
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '15px 20px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderBottom: '1px solid var(--border-glass)',
          fontWeight: 'bold',
          display: 'grid',
          gridTemplateColumns: '1fr 120px 100px 150px 120px 200px',
          gap: '15px',
          alignItems: 'center',
          color: 'var(--text-muted)',
          fontSize: '12px',
          textTransform: 'uppercase'
        }}>
          <div>Sensor Info</div>
          <div>Status</div>
          <div>Type</div>
          <div>Linked Asset</div>
          <div>Last Seen</div>
          <div>Actions</div>
        </div>

        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {filteredSensors.map(sensor => (
            <div
              key={sensor.sensorID}
              style={{
                padding: '15px 20px',
                borderBottom: '1px solid var(--border-glass)',
                display: 'grid',
                gridTemplateColumns: '1fr 120px 100px 150px 120px 200px',
                gap: '15px',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
              className="hover:bg-white/5"
              onClick={() => handleSensorEdit(sensor)}
            >
              {/* Sensor Info */}
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-main)' }}>
                  {sensor.sensorName}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {sensor.sensorID}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', opacity: 0.7 }}>
                  Zone: {sensor.zoneID}
                </div>
              </div>

              {/* Status */}
              <div>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  backgroundColor: sensor.isOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: sensor.isOnline ? 'var(--success)' : 'var(--danger)',
                  border: `1px solid ${sensor.isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}>
                  {sensor.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Type */}
              <div style={{ fontSize: '12px', textTransform: 'capitalize', color: 'var(--text-main)' }}>
                {sensor.sensorType}
              </div>

              {/* Linked Asset */}
              <div style={{ fontSize: '12px' }}>
                {sensor.assetID ? (
                  <span style={{
                    padding: '2px 6px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    borderRadius: '3px',
                    fontSize: '10px',
                    color: 'var(--primary)',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}>
                    {sensor.assetID.split('-').pop()}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', opacity: 0.5 }}>
                    Not linked
                  </span>
                )}
              </div>

              {/* Last Seen */}
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {formatLastSeen(sensor.lastSeen)}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSensorEdit(sensor);
                  }}
                  className="btn-glass"
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    color: 'var(--primary)',
                    borderColor: 'rgba(59, 130, 246, 0.3)'
                  }}
                  title="Edit Sensor"
                >
                  ✏️
                </button>
                
                {sensor.assetID ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnlinkFromAsset(sensor);
                    }}
                    className="btn-glass"
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      color: 'var(--danger)',
                      borderColor: 'rgba(239, 68, 68, 0.3)'
                    }}
                    title="Unlink from Asset"
                  >
                    🔓
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLinkToAsset(sensor);
                    }}
                    className="btn-glass"
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      color: 'var(--success)',
                      borderColor: 'rgba(16, 185, 129, 0.3)'
                    }}
                    title="Link to Asset"
                  >
                    🔗
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredSensors.length === 0 && (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: 'var(--text-muted)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px', opacity: 0.5 }}>📡</div>
            <div>No sensors found matching your criteria</div>
          </div>
        )}
      </div>

      {/* Sensor Edit Modal */}
      {showSensorModal && selectedSensor && (
        <SensorEditModal
          sensor={selectedSensor}
          onClose={() => {
            setShowSensorModal(false);
            setSelectedSensor(null);
          }}
          onSave={async (updates) => {
            const success = await sensorService.updateSensor(selectedSensor.sensorID, updates);
            if (success) {
              setShowSensorModal(false);
              setSelectedSensor(null);
              loadSensors();
            }
          }}
        />
      )}

      {/* Asset Link Modal */}
      {showLinkModal && selectedSensor && (
        <AssetLinkModal
          sensor={selectedSensor}
          onClose={() => {
            setShowLinkModal(false);
            setSelectedSensor(null);
          }}
          onLink={async (assetID, position) => {
            const success = await sensorService.linkSensorToAsset(
              selectedSensor.sensorID, 
              assetID, 
              position
            );
            if (success) {
              setShowLinkModal(false);
              setSelectedSensor(null);
              loadSensors();
            }
          }}
        />
      )}
    </div>
  );
};

/**
 * Sensor Edit Modal Component
 */
const SensorEditModal = ({ sensor, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    sensorName: sensor.sensorName || '',
    sensorType: sensor.sensorType || 'environmental',
    zoneID: sensor.zoneID || '',
    assetID: sensor.assetID || '',
    tempThresholdMin: sensor.settings?.tempThreshold?.min || 15,
    tempThresholdMax: sensor.settings?.tempThreshold?.max || 35,
    tempThresholdCritical: sensor.settings?.tempThreshold?.critical || 40,
    humiThresholdMin: sensor.settings?.humiThreshold?.min || 30,
    humiThresholdMax: sensor.settings?.humiThreshold?.max || 70,
    humiThresholdCritical: sensor.settings?.humiThreshold?.critical || 85,
    reportingInterval: sensor.settings?.reportingInterval || 30000,
    alertsEnabled: sensor.settings?.alertsEnabled !== false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      sensorName: formData.sensorName,
      sensorType: formData.sensorType,
      zoneID: formData.zoneID,
      assetID: formData.assetID,
      settings: {
        tempThreshold: {
          min: parseFloat(formData.tempThresholdMin),
          max: parseFloat(formData.tempThresholdMax),
          critical: parseFloat(formData.tempThresholdCritical)
        },
        humiThreshold: {
          min: parseFloat(formData.humiThresholdMin),
          max: parseFloat(formData.humiThresholdMax),
          critical: parseFloat(formData.humiThresholdCritical)
        },
        reportingInterval: parseInt(formData.reportingInterval),
        alertsEnabled: formData.alertsEnabled
      }
    });
  };

  return (
    <ModalOverlay onClose={onClose} width="600px">
      <div style={{
        borderBottom: '1px solid var(--border-glass)',
        marginBottom: '20px',
        paddingBottom: '12px'
      }}>
        <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Edit Sensor: {sensor.sensorID}</h3>
      </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '15px' }}>
            {/* Basic Settings */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '12px' }}>
                Sensor Name:
              </label>
              <input
                type="text"
                value={formData.sensorName}
                onChange={(e) => setFormData(prev => ({ ...prev, sensorName: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)'
                }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Sensor Type:
                </label>
                <select
                  value={formData.sensorType}
                  onChange={(e) => setFormData(prev => ({ ...prev, sensorType: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-main)'
                  }}
                >
                  <option value="environmental">Environmental</option>
                  <option value="security">Security</option>
                  <option value="safety">Safety</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Zone ID:
                </label>
                <input
                  type="text"
                  value={formData.zoneID}
                  onChange={(e) => setFormData(prev => ({ ...prev, zoneID: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
            </div>

            {/* Threshold Settings */}
            <div>
              <h4 style={{ margin: '10px 0', color: 'var(--text-main)', fontSize: '14px' }}>Temperature Thresholds (°C)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Min:</label>
                  <input
                    type="number"
                    value={formData.tempThresholdMin}
                    onChange={(e) => setFormData(prev => ({ ...prev, tempThresholdMin: e.target.value }))}
                    style={{ width: '100%', padding: '6px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}
                  />
                </div>
                <div>
                  <label style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Max:</label>
                  <input
                    type="number"
                    value={formData.tempThresholdMax}
                    onChange={(e) => setFormData(prev => ({ ...prev, tempThresholdMax: e.target.value }))}
                    style={{ width: '100%', padding: '6px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}
                  />
                </div>
                <div>
                  <label style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Critical:</label>
                  <input
                    type="number"
                    value={formData.tempThresholdCritical}
                    onChange={(e) => setFormData(prev => ({ ...prev, tempThresholdCritical: e.target.value }))}
                    style={{ width: '100%', padding: '6px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ margin: '10px 0', color: 'var(--text-main)', fontSize: '14px' }}>Humidity Thresholds (%)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Min:</label>
                  <input
                    type="number"
                    value={formData.humiThresholdMin}
                    onChange={(e) => setFormData(prev => ({ ...prev, humiThresholdMin: e.target.value }))}
                    style={{ width: '100%', padding: '6px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}
                  />
                </div>
                <div>
                  <label style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Max:</label>
                  <input
                    type="number"
                    value={formData.humiThresholdMax}
                    onChange={(e) => setFormData(prev => ({ ...prev, humiThresholdMax: e.target.value }))}
                    style={{ width: '100%', padding: '6px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}
                  />
                </div>
                <div>
                  <label style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Critical:</label>
                  <input
                    type="number"
                    value={formData.humiThresholdCritical}
                    onChange={(e) => setFormData(prev => ({ ...prev, humiThresholdCritical: e.target.value }))}
                    style={{ width: '100%', padding: '6px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>
            </div>

            {/* Other Settings */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Reporting Interval (ms):
                </label>
                <input
                  type="number"
                  value={formData.reportingInterval}
                  onChange={(e) => setFormData(prev => ({ ...prev, reportingInterval: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-main)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', paddingTop: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.alertsEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, alertsEnabled: e.target.checked }))}
                  />
                  Enable Alerts
                </label>
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-glass)'
          }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-glass"
              style={{
                padding: '10px 20px',
                color: 'var(--text-muted)',
                borderColor: 'var(--border-glass)'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-modern"
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, var(--primary) 0%, #2563eb 100%)'
              }}
            >
              Save Changes
            </button>
          </div>
        </form>
    </ModalOverlay>
  );
};

/**
 * Asset Link Modal Component
 */
const AssetLinkModal = ({ sensor, onClose, onLink }) => {
  const [selectedAssetID, setSelectedAssetID] = useState('');
  const [position, setPosition] = useState({
    x: sensor.position?.x || 0,
    y: sensor.position?.y || 0,
    z: sensor.position?.z || 0
  });

  // Mock available assets - you can replace this with actual asset data
  const availableAssets = [
    'NCRTC-DM009-AYE-SAHI-STN-M3-AR-00121',
    'NCRTC-DM009-AYE-SAHI-STN-M3-PI-00121',
    'NCRTC-DM009-AYE-SAHI-STN-M3-ST-00121',
    'NCRTC-DM009-AYE-SAHI-STN-M3-ST-00122',
    'NCRTC-DM009-AYE-SAHI-STN-M3-ST-00124'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedAssetID) {
      onLink(selectedAssetID, position);
    }
  };

  return (
    <ModalOverlay onClose={onClose} width="500px">
        <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-main)' }}>Link Sensor to Asset</h3>
        
        <div style={{ marginBottom: '15px', color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-main)' }}>Sensor:</strong> {sensor.sensorName} ({sensor.sensorID})
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '12px' }}>
              Select Asset:
            </label>
            <select
              value={selectedAssetID}
              onChange={(e) => setSelectedAssetID(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)'
              }}
              required
            >
              <option value="">-- Select an Asset --</option>
              {availableAssets.map(assetID => (
                <option key={assetID} value={assetID}>
                  {assetID.split('-').pop()} ({assetID})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '12px' }}>
              Position in 3D Space:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: '12px' }}>X:</label>
                <input
                  type="number"
                  step="0.1"
                  value={position.x}
                  onChange={(e) => setPosition(prev => ({ ...prev, x: parseFloat(e.target.value) || 0 }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Y:</label>
                <input
                  type="number"
                  step="0.1"
                  value={position.y}
                  onChange={(e) => setPosition(prev => ({ ...prev, y: parseFloat(e.target.value) || 0 }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Z:</label>
                <input
                  type="number"
                  step="0.1"
                  value={position.z}
                  onChange={(e) => setPosition(prev => ({ ...prev, z: parseFloat(e.target.value) || 0 }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-glass"
              style={{
                padding: '10px 20px',
                color: 'var(--text-muted)',
                borderColor: 'var(--border-glass)'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-modern"
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, var(--success) 0%, #059669 100%)'
              }}
            >
              Link Sensor
            </button>
          </div>
        </form>
    </ModalOverlay>
  );
};

export default SensorManagement;