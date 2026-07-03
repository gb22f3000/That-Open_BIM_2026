import React, { useState, useEffect } from 'react';

/**
 * Dashboard Settings Component
 * System Settings, Alert Thresholds, Preferences
 */
const DashboardSettings = () => {
  const [systemSettings, setSystemSettings] = useState({
    alertThresholds: {
      temperature: { min: 5, max: 30, critical: 35 },
      humidity: { min: 20, max: 80, critical: 90 }
    },
    backupSchedule: '0 2 * * *',
    sessionTimeout: 8,
    maintenanceMode: false,
    notificationSettings: {
      emailAlerts: true,
      smsAlerts: false,
      pushNotifications: true
    },
    displaySettings: {
      theme: 'light',
      language: 'en',
      refreshInterval: 5000,
      showGridLines: true
    }
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('ncrtc_system_settings');
      if (savedSettings) {
        setSystemSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleUpdateSettings = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage (in production, this would be an API call)
      localStorage.setItem('ncrtc_system_settings', JSON.stringify(systemSettings));
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('System settings updated successfully!');
    } catch (error) {
      alert('Error updating settings: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (window.confirm('Are you sure you want to reset all settings to default values?')) {
      setSystemSettings({
        alertThresholds: {
          temperature: { min: 5, max: 30, critical: 35 },
          humidity: { min: 20, max: 80, critical: 90 }
        },
        backupSchedule: '0 2 * * *',
        sessionTimeout: 8,
        maintenanceMode: false,
        notificationSettings: {
          emailAlerts: true,
          smsAlerts: false,
          pushNotifications: true
        },
        displaySettings: {
          theme: 'light',
          language: 'en',
          refreshInterval: 5000,
          showGridLines: true
        }
      });
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-main)' }}>
      
      {/* Header */}
      <div className="glass-panel" style={{ 
        marginBottom: '30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        borderRadius: 'var(--radius-md)'
      }}>
        <h1 style={{ margin: 0, color: 'var(--text-main)', fontSize: '24px' }}>⚙️ Dashboard Settings</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={resetToDefaults}
            className="btn-glass"
            style={{
              padding: '10px 20px',
              color: 'var(--danger)',
              borderColor: 'var(--danger)',
              fontSize: '14px'
            }}
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleUpdateSettings}
            disabled={isSaving}
            className="btn-modern"
            style={{
              padding: '10px 20px',
              background: isSaving ? 'var(--text-muted)' : 'linear-gradient(135deg, var(--success) 0%, #059669 100%)',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        
        {/* Alert Thresholds */}
        <div className="glass-card" style={{ 
          padding: '25px',
          borderTop: '2px solid var(--danger)'
        }}>
          <h2 style={{ margin: '0 0 20px 0', color: 'var(--danger)', fontSize: '18px' }}>🚨 Alert Thresholds</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: 'var(--text-main)', marginBottom: '15px' }}>Temperature Settings (°C)</h4>
            
            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ color: 'var(--text-muted)' }}>Minimum Safe Temperature:</label>
              <input
                type="number"
                value={systemSettings.alertThresholds.temperature.min}
                onChange={(e) => setSystemSettings(prev => ({
                  ...prev,
                  alertThresholds: {
                    ...prev.alertThresholds,
                    temperature: {
                      ...prev.alertThresholds.temperature,
                      min: parseFloat(e.target.value)
                    }
                  }
                }))}
                style={{
                  padding: '6px 10px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-sm)',
                  width: '80px',
                  color: 'var(--text-main)'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ color: 'var(--text-muted)' }}>Maximum Safe Temperature:</label>
              <input
                type="number"
                value={systemSettings.alertThresholds.temperature.max}
                onChange={(e) => setSystemSettings(prev => ({
                  ...prev,
                  alertThresholds: {
                    ...prev.alertThresholds,
                    temperature: {
                      ...prev.alertThresholds.temperature,
                      max: parseFloat(e.target.value)
                    }
                  }
                }))}
                style={{
                  padding: '6px 10px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-sm)',
                  width: '80px',
                  color: 'var(--text-main)'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ color: 'var(--text-muted)' }}>Critical Temperature:</label>
              <input
                type="number"
                value={systemSettings.alertThresholds.temperature.critical}
                onChange={(e) => setSystemSettings(prev => ({
                  ...prev,
                  alertThresholds: {
                    ...prev.alertThresholds,
                    temperature: {
                      ...prev.alertThresholds.temperature,
                      critical: parseFloat(e.target.value)
                    }
                  }
                }))}
                style={{
                  padding: '6px 10px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-sm)',
                  width: '80px',
                  color: 'var(--text-main)'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: 'var(--text-main)', marginBottom: '15px' }}>Humidity Settings (%)</h4>
            
            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ color: 'var(--text-muted)' }}>Minimum Safe Humidity:</label>
              <input
                type="number"
                value={systemSettings.alertThresholds.humidity.min}
                onChange={(e) => setSystemSettings(prev => ({
                  ...prev,
                  alertThresholds: {
                    ...prev.alertThresholds,
                    humidity: {
                      ...prev.alertThresholds.humidity,
                      min: parseFloat(e.target.value)
                    }
                  }
                }))}
                style={{
                  padding: '6px 10px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-sm)',
                  width: '80px',
                  color: 'var(--text-main)'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ color: 'var(--text-muted)' }}>Maximum Safe Humidity:</label>
              <input
                type="number"
                value={systemSettings.alertThresholds.humidity.max}
                onChange={(e) => setSystemSettings(prev => ({
                  ...prev,
                  alertThresholds: {
                    ...prev.alertThresholds,
                    humidity: {
                      ...prev.alertThresholds.humidity,
                      max: parseFloat(e.target.value)
                    }
                  }
                }))}
                style={{
                  padding: '6px 10px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-sm)',
                  width: '80px',
                  color: 'var(--text-main)'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ color: 'var(--text-muted)' }}>Critical Humidity:</label>
              <input
                type="number"
                value={systemSettings.alertThresholds.humidity.critical}
                onChange={(e) => setSystemSettings(prev => ({
                  ...prev,
                  alertThresholds: {
                    ...prev.alertThresholds,
                    humidity: {
                      ...prev.alertThresholds.humidity,
                      critical: parseFloat(e.target.value)
                    }
                  }
                }))}
                style={{
                  padding: '6px 10px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-sm)',
                  width: '80px',
                  color: 'var(--text-main)'
                }}
              />
            </div>
          </div>
        </div>

        {/* System Configuration */}
        <div className="glass-card" style={{ 
          padding: '25px',
          borderTop: '2px solid var(--primary)'
        }}>
          <h2 style={{ margin: '0 0 20px 0', color: 'var(--primary)', fontSize: '18px' }}>🔧 System Configuration</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
              Session Timeout (hours):
            </label>
            <input
              type="number"
              min="1"
              max="24"
              value={systemSettings.sessionTimeout}
              onChange={(e) => setSystemSettings(prev => ({
                ...prev,
                sessionTimeout: parseInt(e.target.value)
              }))}
              style={{
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-sm)',
                width: '100px',
                color: 'var(--text-main)'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
              Backup Schedule (Cron):
            </label>
            <input
              type="text"
              value={systemSettings.backupSchedule}
              onChange={(e) => setSystemSettings(prev => ({
                ...prev,
                backupSchedule: e.target.value
              }))}
              style={{
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-sm)',
                width: '200px',
                color: 'var(--text-main)'
              }}
              placeholder="0 2 * * *"
            />
            <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: '5px', opacity: 0.7 }}>
              Default: Daily at 2:00 AM
            </small>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--text-main)' }}>
              <input
                type="checkbox"
                checked={systemSettings.maintenanceMode}
                onChange={(e) => setSystemSettings(prev => ({
                  ...prev,
                  maintenanceMode: e.target.checked
                }))}
                style={{ marginRight: '10px', transform: 'scale(1.2)' }}
              />
              <span style={{ fontWeight: 'bold' }}>Enable Maintenance Mode</span>
            </label>
            <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: '5px', marginLeft: '30px', opacity: 0.7 }}>
              Prevents normal users from accessing the system
            </small>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="glass-card" style={{ 
          padding: '25px',
          borderTop: '2px solid var(--warning)'
        }}>
          <h2 style={{ margin: '0 0 20px 0', color: 'var(--warning)', fontSize: '18px' }}>🔔 Notification Settings</h2>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--text-main)' }}>
              <input
                type="checkbox"
                checked={systemSettings.notificationSettings.emailAlerts}
                onChange={(e) => setSystemSettings(prev => ({
                  ...prev,
                  notificationSettings: {
                    ...prev.notificationSettings,
                    emailAlerts: e.target.checked
                  }
                }))}
                style={{ marginRight: '10px', transform: 'scale(1.2)' }}
              />
              <span>Email Alerts</span>
            </label>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--text-main)' }}>
              <input
                type="checkbox"
                checked={systemSettings.notificationSettings.smsAlerts}
                onChange={(e) => setSystemSettings(prev => ({
                  ...prev,
                  notificationSettings: {
                    ...prev.notificationSettings,
                    smsAlerts: e.target.checked
                  }
                }))}
                style={{ marginRight: '10px', transform: 'scale(1.2)' }}
              />
              <span>SMS Alerts</span>
            </label>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--text-main)' }}>
              <input
                type="checkbox"
                checked={systemSettings.notificationSettings.pushNotifications}
                onChange={(e) => setSystemSettings(prev => ({
                  ...prev,
                  notificationSettings: {
                    ...prev.notificationSettings,
                    pushNotifications: e.target.checked
                  }
                }))}
                style={{ marginRight: '10px', transform: 'scale(1.2)' }}
              />
              <span>Push Notifications</span>
            </label>
          </div>
        </div>

        {/* Display Settings */}
        <div className="glass-card" style={{ 
          padding: '25px',
          borderTop: '2px solid var(--accent)'
        }}>
          <h2 style={{ margin: '0 0 20px 0', color: 'var(--accent)', fontSize: '18px' }}>🎨 Display Settings</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
              Theme:
            </label>
            <select
              value={systemSettings.displaySettings.theme}
              onChange={(e) => setSystemSettings(prev => ({
                ...prev,
                displaySettings: {
                  ...prev.displaySettings,
                  theme: e.target.value
                }
              }))}
              style={{
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-sm)',
                width: '150px',
                color: 'var(--text-main)'
              }}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
              Language:
            </label>
            <select
              value={systemSettings.displaySettings.language}
              onChange={(e) => setSystemSettings(prev => ({
                ...prev,
                displaySettings: {
                  ...prev.displaySettings,
                  language: e.target.value
                }
              }))}
              style={{
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-sm)',
                width: '150px',
                color: 'var(--text-main)'
              }}
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="es">Spanish</option>
            </select>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
              Refresh Interval (ms):
            </label>
            <input
              type="number"
              min="1000"
              max="60000"
              step="1000"
              value={systemSettings.displaySettings.refreshInterval}
              onChange={(e) => setSystemSettings(prev => ({
                ...prev,
                displaySettings: {
                  ...prev.displaySettings,
                  refreshInterval: parseInt(e.target.value)
                }
              }))}
              style={{
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-sm)',
                width: '120px',
                color: 'var(--text-main)'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--text-main)' }}>
              <input
                type="checkbox"
                checked={systemSettings.displaySettings.showGridLines}
                onChange={(e) => setSystemSettings(prev => ({
                  ...prev,
                  displaySettings: {
                    ...prev.displaySettings,
                    showGridLines: e.target.checked
                  }
                }))}
                style={{ marginRight: '10px', transform: 'scale(1.2)' }}
              />
              <span>Show Grid Lines</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSettings;