import React, { useState, useEffect } from 'react';
import authService from '../services/authService.js';

/**
 * NCRTC Digital Twin Login Component
 * Handles user authentication with role-based access
 */
const LoginPage = ({ onLoginSuccess }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDemo, setSelectedDemo] = useState('');

  // Demo accounts for easy testing
  const demoAccounts = [
    {
      role: 'admin',
      username: 'admin@ncrtc.in',
      password: 'admin123',
      name: 'System Administrator',
      description: 'Full system access, user management, system settings'
    },
    {
      role: 'control_room',
      username: 'control@ncrtc.in',
      password: 'control123',
      name: 'Control Room Operator - Rajesh Kumar',
      description: 'Alert management, work order creation, emergency controls'
    },
    {
      role: 'maintenance',
      username: 'maintenance@ncrtc.in',
      password: 'maint123',
      name: 'Maintenance Engineer - Amit Sharma',
      description: 'Work order execution, asset maintenance, field operations'
    },
    {
      role: 'safety',
      username: 'safety@ncrtc.in',
      password: 'safety123',
      name: 'Safety Officer - Priya Singh',
      description: 'Incident management, safety protocols, compliance'
    },
    {
      role: 'viewer',
      username: 'viewer@ncrtc.in',
      password: 'viewer123',
      name: 'Guest Viewer',
      description: 'Read-only access to basic system overview'
    }
  ];

  useEffect(() => {
    // Check if user is already logged in
    if (authService.isAuthenticated()) {
      onLoginSuccess(authService.getCurrentUser());
    }
  }, [onLoginSuccess]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleDemoSelect = (demo) => {
    setSelectedDemo(demo.role);
    setCredentials({
      username: demo.username,
      password: demo.password
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!credentials.username || !credentials.password) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const user = await authService.login(credentials.username, credentials.password);
      onLoginSuccess(user);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    const icons = {
      admin: '👑',
      control_room: '🚨',
      maintenance: '🔧',
      safety: '⚖️',
      viewer: '👁️'
    };
    return icons[role] || '👤';
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: '#e74c3c',
      control_room: '#3498db',
      maintenance: '#f39c12',
      safety: '#27ae60',
      viewer: '#95a5a6'
    };
    return colors[role] || '#333';
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
              disabled={isLoading}
              className="btn-modern"
              style={{
                width: '100%',
                padding: '14px',
                background: isLoading ? 'var(--text-muted)' : 'linear-gradient(135deg, var(--primary) 0%, #2563eb 100%)',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? (
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
            {demoAccounts.map((demo, index) => (
              <div
                key={index}
                onClick={() => handleDemoSelect(demo)}
                className="glass-card"
                style={{
                  padding: '20px',
                  border: selectedDemo === demo.role ? `2px solid ${getRoleColor(demo.role)}` : '1px solid var(--border-glass)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backgroundColor: selectedDemo === demo.role ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontSize: '24px' }}>
                    {getRoleIcon(demo.role)}
                  </span>
                  <div>
                    <div style={{
                      fontWeight: 'bold',
                      color: getRoleColor(demo.role),
                      fontSize: '16px'
                    }}>
                      {demo.name}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      marginTop: '2px'
                    }}>
                      {demo.username}
                    </div>
                  </div>
                </div>
                <div style={{
                  fontSize: '13px',
                  color: 'var(--text-main)',
                  lineHeight: '1.4'
                }}>
                  {demo.description}
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

export default LoginPage;