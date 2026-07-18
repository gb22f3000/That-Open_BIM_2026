import React, { useState, useEffect, useRef } from 'react';
import Login from './components/Login.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import ControlRoomDashboard from './components/ControlRoomDashboard.jsx';
import RealTimeDashboard from './components/RealTimeDashboard.jsx';
import SensorOverlayRenderer from './components/SensorOverlayRenderer.js';
import sensorDataManager from './services/sensorDataManager.js';
import Viewer3D from './components/Viewer3D.jsx';
import ThreeDViewer from './components/ThreeDViewer.jsx';
import SensorManagement from './components/SensorManagement.jsx';
import VoiceControlPanel from './components/VoiceControlPanel.jsx';
import authService from './services/authService.js';
import { screenLog, screenSuccess, screenError } from './utils/screenLogger.js';
import '../style.css';

/**
 * Main Digital Twin Application Component
 * Integrates 3D BIM viewer with real-time sensor dashboard
 */
const DigitalTwinApp = () => {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', '3d', 'split'
  const [overlayEnabled, setOverlayEnabled] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState(null);
  
  const viewer3DRef = useRef(null);
  const sensorOverlayRef = useRef(null);

  useEffect(() => {
    sensorDataManager.initialize().catch(error => {
      console.error('Failed to initialize sensor data manager:', error);
    });
  }, []);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = () => {
      if (authService.isAuthenticated()) {
        const currentUser = authService.getCurrentUser();
        console.log('👤 App: User already authenticated:', currentUser);
        setUser(currentUser);
      } else {
        console.log('👤 App: No authenticated user found on mount');
      }
    };
    
    checkAuth();
    
    // Listen for auth changes (if authService supports it, or just poll/check)
    // For now, we rely on the initial check. 
    // If authService restores session asynchronously, we might need a listener or a retry.
    const interval = setInterval(() => {
      if (!user && authService.isAuthenticated()) {
        console.log('👤 App: Detected late auth');
        setUser(authService.getCurrentUser());
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    // Wait for the 3D viewer to be initialized from main.js
    const checkForViewer = () => {
      if (window.viewer3D && window.viewer3D.scene && window.viewer3D.camera) {
        // Attach the 3D container to our React component
        if (window.viewer3D.attachToContainer) {
          window.viewer3D.attachToContainer('viewer3d-container');
        }

        // Initialize sensor overlay system
        sensorOverlayRef.current = new SensorOverlayRenderer(
          window.viewer3D.scene,
          window.viewer3D.camera,
          window.viewer3D.renderer
        );

        // Add sensor overlay to the animation loop
        if (window.viewer3D.animationCallbacks) {
          window.viewer3D.animationCallbacks.push(() => {
            if (sensorOverlayRef.current) {
              sensorOverlayRef.current.animate();
            }
          });
        }

        // Setup click handler for sensor selection
        if (window.viewer3D.addEventListener) {
          window.viewer3D.addEventListener('click', handleSensorClick);
        }

        // Setup resize observer for 3D viewer
        const resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (window.viewer3D && window.viewer3D.world && width > 0 && height > 0) {
              window.viewer3D.world.renderer.three.setSize(width, height);
              window.viewer3D.camera.aspect = width / height;
              window.viewer3D.camera.updateProjectionMatrix();
            }
          }
        });

        if (viewer3DRef.current) {
          resizeObserver.observe(viewer3DRef.current);
        }

        // Store observer for cleanup
        window.viewer3D.resizeObserver = resizeObserver;
      } else {
        // Retry after a short delay
        setTimeout(checkForViewer, 100);
      }
    };

    checkForViewer();

    return () => {
      if (sensorOverlayRef.current) {
        sensorOverlayRef.current.dispose();
      }
      if (window.viewer3D && window.viewer3D.resizeObserver) {
        window.viewer3D.resizeObserver.disconnect();
      }
    };
  }, []);

  const handleSensorClick = (event) => {
    if (!sensorOverlayRef.current) return;

    // Get intersections from the click event
    const sensorId = sensorOverlayRef.current.getSensorAtPosition(event.intersections || []);
    
    if (sensorId) {
      setSelectedSensor(sensorId);
      
      // Highlight selected sensor
      sensorOverlayRef.current.highlightSensor(selectedSensor, false); // Clear previous
      sensorOverlayRef.current.highlightSensor(sensorId, true); // Highlight new
    } else {
      setSelectedSensor(null);
      if (selectedSensor) {
        sensorOverlayRef.current.highlightSensor(selectedSensor, false);
      }
    }
  };

  const toggleOverlay = () => {
    const newState = !overlayEnabled;
    setOverlayEnabled(newState);
    if (sensorOverlayRef.current) {
      sensorOverlayRef.current.setEnabled(newState);
    }
  };

  const toggleLabels = () => {
    const newState = !showLabels;
    setShowLabels(newState);
    if (sensorOverlayRef.current) {
      sensorOverlayRef.current.setLabelsVisible(newState);
    }
  };

  // Update BIM controls visibility when view changes
  useEffect(() => {
    if (window.viewer3D && window.viewer3D.showBIMControls) {
      const show3DControls = activeView === '3d' || activeView === 'split';
      window.viewer3D.showBIMControls(show3DControls);
    }
  }, [activeView]);

  const focusOnSensor = (sensorId) => {
    if (sensorOverlayRef.current && window.viewer3D) {
      // You can implement camera focusing logic here
      setSelectedSensor(sensorId);
      setActiveView('3d');
    }
  };

  const handleLogin = (authenticatedUser) => {
    setUser(authenticatedUser);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setActiveView('dashboard');
  };

  // Show login page if user is not authenticated
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }



  // Render role-specific dashboard with navigation wrapper
  const renderDashboard = () => {
    // For admin and control_room, show full-screen dashboard with sidebar
    if (user.role === 'admin' || user.role === 'control_room') {
      return <RoleBasedDashboardLayout user={user} onLogout={handleLogout} />;
    }

    // For other roles, use the main dashboard with 3D view
    return renderMainDashboard();
  };

  // Role-based dashboard layout component with sidebar
  const RoleBasedDashboardLayout = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const getTabsForRole = (role) => {
      if (role === 'admin') {
        return [
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'user-management', label: 'User Management', icon: '👥' },
          { id: '3d-viewer', label: '3D Viewer', icon: '🏗️' },
          { id: '3d-sensors', label: '3D + Sensors', icon: '🏗️📡' },
          { id: 'sensor-management', label: 'Sensor Management', icon: '📡' },
          { id: 'dashboard-settings', label: 'Dashboard Settings', icon: '⚙️' }
        ];
      } else if (role === 'control_room') {
        return [
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'alerts', label: 'Alert Management', icon: '🚨' },
          { id: 'work-orders', label: 'Work Orders', icon: '📋' },
          { id: '3d-viewer', label: '3D Viewer', icon: '🏗️' },
          { id: '3d-sensors', label: '3D + Sensors', icon: '🏗️📡' },
          { id: 'reports', label: 'Reports', icon: '📈' }
        ];
      }
      return [];
    };

    const tabs = getTabsForRole(user.role);

    useEffect(() => {
      const enableOverlay = activeTab === '3d-sensors';
      setOverlayEnabled(enableOverlay);
      setShowLabels(enableOverlay);
    }, [activeTab]);

    const renderTabContent = () => {
      if (user.role === 'admin') {
        switch (activeTab) {
          case 'overview':
            return <AdminOverview user={user} />;
          case 'user-management':
            return <AdminDashboard user={user} onLogout={onLogout} />;
          case '3d-viewer':
            return <Viewer3D />;
          case '3d-sensors':
            return <Viewer3D />;
          case 'sensor-management':
            return <SensorManagement user={user} />;
          case 'dashboard-settings':
            return <DashboardSettings user={user} />;
          default:
            return <AdminOverview user={user} />;
        }
      } else if (user.role === 'control_room') {
        switch (activeTab) {
          case 'overview':
            return <ControlRoomOverview user={user} />;
          case 'alerts':
            return <ControlRoomDashboard user={user} onLogout={onLogout} />;
          case 'work-orders':
            return <WorkOrdersPanel user={user} />;
          case '3d-viewer':
            return <Viewer3D />;
          case '3d-sensors':
            return <Viewer3D />;
          case 'reports':
            return <ReportsPanel user={user} />;
          default:
            return <ControlRoomOverview user={user} />;
        }
      }
    };



    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Top Navigation Bar */}
        <div style={{
          height: '60px',
          backgroundColor: user.role === 'admin' ? '#e74c3c' : '#f39c12',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          zIndex: 1000
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h1 style={{ margin: 0, fontSize: '20px' }}>
              {user.role === 'admin' ? '👑 GB Creation Admin Panel' : '🚨 GB Creation Control Room'}
            </h1>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              Welcome, {user?.name || user?.username}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              Role: {user.role.replace('_', ' ').toUpperCase()}
            </div>
            <button
              onClick={onLogout}
              style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Main Content with Sidebar */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left Sidebar */}
          <div style={{
            width: isSidebarCollapsed ? '60px' : '250px',
            backgroundColor: '#2c3e50',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid #34495e',
            transition: 'width 0.3s ease'
          }}>
            <div style={{ padding: '20px 0' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                margin: '0 20px 20px',
                borderBottom: '1px solid #34495e',
                paddingBottom: '10px'
              }}>
                {!isSidebarCollapsed && (
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '16px', 
                    color: '#ecf0f1'
                  }}>
                    Navigation
                  </h3>
                )}
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#bdc3c7',
                    cursor: 'pointer',
                    padding: '4px',
                    marginLeft: isSidebarCollapsed ? 'auto' : '0',
                    marginRight: isSidebarCollapsed ? 'auto' : '0'
                  }}
                >
                  {isSidebarCollapsed ? '➡️' : '⬅️'}
                </button>
              </div>
              
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    width: '100%',
                    padding: '15px 20px',
                    backgroundColor: activeTab === tab.id ? '#3498db' : 'transparent',
                    color: 'white',
                    border: 'none',
                    textAlign: isSidebarCollapsed ? 'center' : 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                    gap: '12px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    borderLeft: activeTab === tab.id ? '4px solid #2980b9' : '4px solid transparent'
                  }}
                  title={isSidebarCollapsed ? tab.label : ''}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab.id) {
                      e.target.style.backgroundColor = '#34495e';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab.id) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{tab.icon}</span>
                  {!isSidebarCollapsed && <span>{tab.label}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div style={{ 
            flex: 1, 
            overflow: 'auto', 
            backgroundColor: '#ecf0f1',
            position: 'relative'
          }}>
            {renderTabContent()}
          </div>
        </div>
      </div>
    );
  };

  // Placeholder components for different tabs
  const AdminOverview = ({ user }) => (
    <div style={{ padding: '30px' }}>
      <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>📊 System Overview</h2>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#e74c3c', marginBottom: '15px' }}>🏗️ System Health</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>98.5%</div>
          <p style={{ color: '#7f8c8d', margin: '5px 0 0' }}>All systems operational</p>
        </div>
        
        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#e74c3c', marginBottom: '15px' }}>👥 Active Users</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>47</div>
          <p style={{ color: '#7f8c8d', margin: '5px 0 0' }}>Currently online</p>
        </div>

        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#e74c3c', marginBottom: '15px' }}>📡 Sensors</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f39c12' }}>1,257</div>
          <p style={{ color: '#7f8c8d', margin: '5px 0 0' }}>Total monitored</p>
        </div>
      </div>

      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>📈 Recent Activity</h3>
        <div style={{ color: '#7f8c8d' }}>
          <p>• System backup completed successfully - 2 hours ago</p>
          <p>• New user account created: maintenance.engineer.05 - 4 hours ago</p>
          <p>• Sensor calibration completed for Platform A - 6 hours ago</p>
          <p>• Alert threshold updated for temperature sensors - 8 hours ago</p>
        </div>
      </div>
    </div>
  );

  const ControlRoomOverview = ({ user }) => (
    <div style={{ padding: '30px' }}>
      <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>🚨 Control Room Overview</h2>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#f39c12', marginBottom: '15px' }}>🚨 Active Alerts</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e74c3c' }}>3</div>
          <p style={{ color: '#7f8c8d', margin: '5px 0 0' }}>Require attention</p>
        </div>
        
        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#f39c12', marginBottom: '15px' }}>📋 Work Orders</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>12</div>
          <p style={{ color: '#7f8c8d', margin: '5px 0 0' }}>In progress</p>
        </div>

        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#f39c12', marginBottom: '15px' }}>🔧 Maintenance</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>8</div>
          <p style={{ color: '#7f8c8d', margin: '5px 0 0' }}>Completed today</p>
        </div>
      </div>

      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>⚡ Recent Operations</h3>
        <div style={{ color: '#7f8c8d' }}>
          <p>• Critical temperature alert acknowledged - Platform B - 15 mins ago</p>
          <p>• Work order created: Inspect HVAC system - Assigned to Amit Sharma - 30 mins ago</p>
          <p>• Emergency protocol activated - Track Section 12.4 - 1 hour ago</p>
          <p>• Maintenance completed: Signal system check - 2 hours ago</p>
        </div>
      </div>
    </div>
  );

  const SensorManagementPanel = ({ user }) => (
    <div style={{ padding: '30px' }}>
      <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>📡 Sensor Management</h2>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '30px', 
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚧</div>
        <h3 style={{ color: '#f39c12', marginBottom: '15px' }}>Under Development</h3>
        <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>
          Sensor mapping, configuration, and calibration tools will be available here.
        </p>
        <p style={{ color: '#7f8c8d' }}>
          Features: Asset-to-Sensor mapping, Threshold settings, Calibration schedules
        </p>
      </div>
    </div>
  );

  const DashboardSettings = ({ user }) => (
    <div style={{ padding: '30px' }}>
      <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>⚙️ Dashboard Settings</h2>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '30px', 
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚧</div>
        <h3 style={{ color: '#f39c12', marginBottom: '15px' }}>Under Development</h3>
        <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>
          System configuration, alert thresholds, and dashboard customization will be available here.
        </p>
        <p style={{ color: '#7f8c8d' }}>
          Features: Alert thresholds, Backup schedules, System maintenance mode
        </p>
      </div>
    </div>
  );

  const WorkOrdersPanel = ({ user }) => (
    <div style={{ padding: '30px' }}>
      <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>📋 Work Orders Management</h2>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '30px', 
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚧</div>
        <h3 style={{ color: '#f39c12', marginBottom: '15px' }}>Under Development</h3>
        <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>
          Dedicated work order creation, assignment, and tracking interface.
        </p>
        <p style={{ color: '#7f8c8d' }}>
          Features: Create orders, Assign technicians, Track progress, Generate reports
        </p>
      </div>
    </div>
  );

  const ReportsPanel = ({ user }) => (
    <div style={{ padding: '30px' }}>
      <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>📈 Reports & Analytics</h2>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '30px', 
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚧</div>
        <h3 style={{ color: '#f39c12', marginBottom: '15px' }}>Under Development</h3>
        <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>
          Comprehensive reporting and analytics dashboard for operational insights.
        </p>
        <p style={{ color: '#7f8c8d' }}>
          Features: Performance metrics, Alert trends, Maintenance reports, Export capabilities
        </p>
      </div>
    </div>
  );

  // Main 3D Dashboard (for roles that use the 3D interface)
  const renderMainDashboard = () => {
    return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navigation Bar */}
      <div style={{
        height: '60px',
        backgroundColor: '#2c3e50',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h1 style={{ margin: 0, fontSize: '20px' }}>🏗️ GB Creation Digital Twin</h1>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            {authService.getRoleDisplayName(user.role)} Dashboard
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* User Info */}
          <div style={{ fontSize: '12px', opacity: 0.9 }}>
            Welcome, {user.name}
          </div
          >

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 12px',
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            🚪 Logout
          </button>

          {/* View Toggle Buttons */}
          <div style={{ display: 'flex', backgroundColor: '#34495e', borderRadius: '6px', overflow: 'hidden' }}>
            <button
              onClick={() => setActiveView('dashboard')}
              style={{
                padding: '8px 15px',
                border: 'none',
                backgroundColor: activeView === 'dashboard' ? '#3498db' : 'transparent',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveView('3d')}
              style={{
                padding: '8px 15px',
                border: 'none',
                backgroundColor: activeView === '3d' ? '#3498db' : 'transparent',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🏗️ 3D View
            </button>
            <button
              onClick={() => setActiveView('split')}
              style={{
                padding: '8px 15px',
                border: 'none',
                backgroundColor: activeView === 'split' ? '#3498db' : 'transparent',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              📱 Split View
            </button>
          </div>

          {/* 3D Controls */}
          {(activeView === '3d' || activeView === 'split') && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {/* Sensor controls hidden for now - will be implemented later
              <button
                onClick={toggleOverlay}
                style={{
                  padding: '6px 12px',
                  backgroundColor: overlayEnabled ? '#27ae60' : '#7f8c8d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                {overlayEnabled ? '📡 Sensors ON' : '📡 Sensors OFF'}
              </button>
              
              <button
                onClick={toggleLabels}
                style={{
                  padding: '6px 12px',
                  backgroundColor: showLabels ? '#27ae60' : '#7f8c8d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                {showLabels ? '🏷️ Labels ON' : '🏷️ Labels OFF'}
              </button>
              */}
              
              <button
                onClick={() => {
                  if (window.viewer3D && window.viewer3D.toggleBIMPanel) {
                    window.viewer3D.toggleBIMPanel();
                  }
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#34495e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                ⚙️ BIM Controls
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Role-based Dashboard Content */}
        {activeView === 'dashboard' && (
          <div style={{ 
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#ecf0f1'
          }}>
            <RealTimeDashboard />
          </div>
        )}

        {/* 3D Viewer */}
        {(activeView === '3d' || activeView === 'split') && (
          <div style={{ 
            flex: activeView === 'split' ? 1 : 1,
            position: 'relative',
            minWidth: activeView === 'split' ? '50%' : '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Viewer3D />
          </div>
        )}

        {/* Split Dashboard View */}
        {activeView === 'split' && (
          <div style={{ 
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#ecf0f1',
            borderLeft: '2px solid #bdc3c7'
          }}>
            <RealTimeDashboard />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div style={{
        height: '30px',
        backgroundColor: '#34495e',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 15px',
        fontSize: '11px'
      }}>
        <div>
          Role: {authService.getRoleDisplayName(user.role)} | View: {activeView.toUpperCase()}
        </div>
        <div>
          User: {user.name} ({user.employeeId}) | {selectedSensor ? `Selected: ${selectedSensor}` : 'No Selection'}
        </div>
      </div>
    </div>
    );
  };

  // Return the appropriate dashboard based on user role
  return (
    <>
      {/* VoiceControlPanel removed to avoid conflict with Viewer3D controls */}
      {renderDashboard()}
    </>
  );
};

export default DigitalTwinApp;