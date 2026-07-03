import React, { useState, useEffect } from 'react';
import authService from '../services/authService.js';
import { screenLog, screenError } from '../utils/screenLogger.js';

/**
 * Login Component for NCRTC Digital Twin System
 * Provides role-based authentication for different user types
 */
const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);


  // DEBUG: Track component lifecycle
  useEffect(() => {
    console.log('🎨 Login component MOUNTED');
    console.log('  Props:', { onLogin: typeof onLogin });
    console.log('  authService.isAuthenticated():', authService.isAuthenticated());
    console.log('  authService.currentUser:', authService.currentUser);
    
    return () => {
      console.log('🎨 Login component UNMOUNTED');
    };
  }, []);

  // console.log('🎨 Login component rendered');
  // console.log('  authService.isAuthenticated():', authService.isAuthenticated());
  // console.log('  authService.currentUser:', authService.currentUser);
  // console.log('  URL:', window.location.href);
  
  // Add visible debug info
  const debugStyle = {
    position: 'fixed',
    top: '10px',
    right: '10px',
    background: 'red',
    color: 'white',
    padding: '10px',
    zIndex: 9999,
    fontSize: '12px',
    maxWidth: '300px'
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    screenLog(`Attempting login for user: ${credentials.username}`);

    try {
      const user = await authService.login(credentials.username, credentials.password);
      screenLog(`Login successful for role: ${user.role}`, 'success');
      onLogin(user);
    } catch (err) {
      screenError(`Login failed: ${err.message}`);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role) => {
    // Hardcoded demo credentials to avoid method dependency issues
    const demoCredentials = {
      'admin': { username: 'admin@ncrtc.in', password: 'admin123' },
      'control_room': { username: 'control@ncrtc.in', password: 'control123' },
      'maintenance': { username: 'maintenance@ncrtc.in', password: 'maint123' },
      'safety': { username: 'safety@ncrtc.in', password: 'safety123' },
      'viewer': { username: 'viewer@ncrtc.in', password: 'viewer123' }
    };
    
    const userCred = demoCredentials[role];
    if (userCred) {
      setCredentials({
        username: userCred.username,
        password: userCred.password
      });
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-darker)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'var(--font-family)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* EMERGENCY DEBUG: Show if somehow authenticated */}
      {authService.isAuthenticated() && (
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          right: '10px',
          backgroundColor: '#ff0000',
          color: 'white',
          padding: '20px',
          zIndex: 9999,
          fontSize: '18px',
          fontWeight: 'bold',
          border: '3px solid yellow'
        }}>
          🚨 EMERGENCY: User is authenticated when login page is showing!<br/>
          This should NEVER happen. Check console logs.<br/>
          authService.currentUser: {JSON.stringify(authService.currentUser)}<br/>
          URL: {window.location.href}
        </div>
      )}
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)`,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        pointerEvents: 'none'
      }} />

      <div className="login-container" style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1200px',
        display: 'grid',
        gridTemplateColumns: 'minmax(400px, 1fr) 2fr',
        gap: '40px',
        alignItems: 'start'
      }}>

        {/* Login Form */}
        <div className="glass-panel" style={{
          borderRadius: 'var(--radius-lg)',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }}>
          {/* NCRTC Header */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '10px',
              filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))'
            }}>🏗️</div>
            <h1 style={{
              margin: 0,
              fontSize: '28px',
              color: 'var(--text-main)',
              fontWeight: 'bold',
              letterSpacing: '1px'
            }}>
              NBIM
            </h1>
            <p style={{
              margin: '8px 0 0 0',
              color: 'var(--text-muted)',
              fontSize: '14px'
            }}>
              NaMo Bharat BIM Tool
            </p>
            <p style={{
              margin: '5px 0 0 0',
              color: 'var(--text-muted)',
              fontSize: '12px',
              fontStyle: 'italic',
              opacity: 0.7
            }}>
              Made by Rishabh Gautam
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: 'var(--text-main)',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                Username / Email
              </label>
              <input
                type="text"
                name="username"
                value={credentials.username}
                onChange={handleInputChange}
                placeholder="Enter your username"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '14px',
                  color: 'var(--text-main)',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary)';
                  e.target.style.background = 'rgba(0, 0, 0, 0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-glass)';
                  e.target.style.background = 'rgba(0, 0, 0, 0.2)';
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: 'var(--text-main)',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                Password
              </label>
              <input
                type="password"
                name="password"
                value={credentials.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '14px',
                  color: 'var(--text-main)',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary)';
                  e.target.style.background = 'rgba(0, 0, 0, 0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-glass)';
                  e.target.style.background = 'rgba(0, 0, 0, 0.2)';
                }}
              />
            </div>

            {error && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--danger)',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '14px',
                marginBottom: '20px',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-modern"
              style={{
                width: '100%',
                padding: '14px',
                background: loading ? 'var(--text-muted)' : 'linear-gradient(135deg, var(--primary) 0%, #2563eb 100%)',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Logging in...
                </>
              ) : (
                <>
                  🔐 Login to Dashboard
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div style={{
            textAlign: 'center',
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-glass)',
            fontSize: '12px',
            color: 'var(--text-muted)'
          }}>
            <p>NBIM System v1.0</p>
            <p>Secure Access • Real-time Monitoring • Role-based Dashboards</p>
            <p>© 2025 Rishabh Gautam</p>
          </div>
        </div>

        {/* Demo Accounts Panel */}
        <div className="glass-panel" style={{
          borderRadius: 'var(--radius-lg)',
          padding: '30px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }}>
          <h2 style={{
            margin: '0 0 20px 0',
            color: 'var(--text-main)',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            🎯 Role Based Access Accounts
          </h2>
          
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '14px',
            marginBottom: '25px',
            lineHeight: '1.5'
          }}>
            Click on any role below to automatically fill login credentials and experience different dashboard views:
          </p>

          <div style={{
            display: 'grid',
            gap: '15px'
          }}>
            {[
              { role: 'admin', name: 'System Administrator', icon: '👨‍💻', desc: 'Full access to all systems, user management, and global settings.' },
              { role: 'control_room', name: 'Control Room Operator', icon: '🖥️', desc: 'Real-time monitoring, alarm handling, and operational controls.' },
              { role: 'maintenance', name: 'Maintenance Engineer', icon: '🔧', desc: 'Equipment status, work orders, and predictive maintenance.' },
              { role: 'safety', name: 'Safety Officer', icon: '🦺', desc: 'Safety compliance, emergency protocols, and incident reporting.' },
              { role: 'viewer', name: 'Guest Viewer', icon: '👀', desc: 'Read-only access to public dashboards and 3D visualization.' }
            ].map((demo, index) => (
              <div
                key={index}
                onClick={() => handleDemoLogin(demo.role)}
                className="glass-card"
                style={{
                  padding: '20px',
                  border: '1px solid var(--border-glass)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-glass)';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontSize: '24px' }}>
                    {demo.icon}
                  </span>
                  <div>
                    <div style={{
                      fontWeight: 'bold',
                      color: 'var(--primary)',
                      fontSize: '16px'
                    }}>
                      {demo.name}
                    </div>
                  </div>
                </div>
                <div style={{
                  fontSize: '13px',
                  color: 'var(--text-main)',
                  lineHeight: '1.4'
                }}>
                  {demo.desc}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '25px',
            padding: '15px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-glass)'
          }}>
            <strong>🔒 Security Note:</strong> These demo accounts are for testing purposes only. 
            In production, all passwords would be securely hashed and stored with proper encryption.
          </div>
        </div>


      </div>

      {/* Add CSS animation for loading spinner */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @media (max-width: 900px) {
            .login-container {
              grid-template-columns: 1fr !important;
              max-width: 500px !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Login;