import React, { useState, useEffect } from 'react';
import authService from '../services/authService.js';
import sensorDataManager from '../services/sensorDataManager.js';
import DashboardSettings from './DashboardSettings';
import SensorManagement from './SensorManagement.jsx';
import ModalOverlay from './ModalOverlay.jsx';

/**
 * Admin Dashboard - Full System Management
 * User Management, System Settings, Reports, Audit Logs
 */
const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [systemSettings, setSystemSettings] = useState({
    alertThresholds: {
      temperature: { min: 5, max: 30, critical: 35 },
      humidity: { min: 20, max: 80, critical: 90 }
    },
    backupSchedule: '0 2 * * *',
    sessionTimeout: 8,
    maintenanceMode: false
  });
  const [activeTab, setActiveTab] = useState('users');
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    role: 'viewer',
    department: '',
    employeeId: ''
  });
  const [statistics, setStatistics] = useState({});

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      await sensorDataManager.initialize();
      if (!mounted) return;
      loadDashboardData();
    };

    setup();
    return () => {
      mounted = false;
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      const usersList = authService.getAllUsers();
      const logs = authService.getAuditLogs();
      const stats = sensorDataManager.getStatistics();
      
      setUsers(usersList);
      setAuditLogs(logs.slice(-50)); // Last 50 logs
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await authService.createUser(newUser);
      setShowAddUser(false);
      setNewUser({
        username: '',
        password: '',
        name: '',
        role: 'viewer',
        department: '',
        employeeId: ''
      });
      loadDashboardData();
    } catch (error) {
      alert('Error creating user: ' + error.message);
    }
  };

  const handleToggleUser = async (username) => {
    try {
      const user = users.find(u => u.username === username);
      await authService.updateUser(username, { isActive: !user.isActive });
      loadDashboardData();
    } catch (error) {
      alert('Error updating user: ' + error.message);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser({
      username: user.username,
      name: user.name,
      role: user.role,
      department: user.department,
      employeeId: user.employeeId,
      password: '' // Don't pre-fill password for security
    });
    setShowEditUser(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        name: editingUser.name,
        role: editingUser.role,
        department: editingUser.department,
        employeeId: editingUser.employeeId
      };
      
      // Only include password if it was changed
      if (editingUser.password && editingUser.password.trim() !== '') {
        updateData.password = editingUser.password;
      }
      
      await authService.updateUser(editingUser.username, updateData);
      setShowEditUser(false);
      setEditingUser(null);
      loadDashboardData();
    } catch (error) {
      alert('Error updating user: ' + error.message);
    }
  };

  const handleDeleteUser = async (username) => {
    if (username === 'admin') {
      alert('Cannot delete the admin user!');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      try {
        await authService.deleteUser(username);
        loadDashboardData();
      } catch (error) {
        alert('Error deleting user: ' + error.message);
      }
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-main)' }}>

      {/* Header */}
      <div className="glass-panel" style={{ 
        marginBottom: '30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        borderRadius: 'var(--radius-md)'
      }}>
        <h1 style={{ margin: 0, color: 'var(--text-main)', fontSize: '24px' }}>🎛️ Admin Dashboard</h1>
        <div style={{ 
          fontSize: '14px',
          color: 'var(--text-muted)',
          textAlign: 'right'
        }}>
          <div>Total Users: <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{users.length}</span></div>
          <div>Active Sessions: <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>{users.filter(u => u.isActive).length}</span></div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        marginBottom: '30px',
        borderBottom: '1px solid var(--border-glass)'
      }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              padding: '12px 25px',
              background: activeTab === 'users' ? 'linear-gradient(180deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%)' : 'transparent',
              color: activeTab === 'users' ? 'var(--primary)' : 'var(--text-muted)',
              border: 'none',
              borderBottom: activeTab === 'users' ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'users' ? '600' : 'normal',
              transition: 'all 0.3s ease'
            }}
          >
            👥 User Management
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '12px 25px',
              background: activeTab === 'settings' ? 'linear-gradient(180deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%)' : 'transparent',
              color: activeTab === 'settings' ? 'var(--primary)' : 'var(--text-muted)',
              border: 'none',
              borderBottom: activeTab === 'settings' ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'settings' ? '600' : 'normal',
              transition: 'all 0.3s ease'
            }}
          >
            ⚙️ Dashboard Settings
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <>
          {/* System Statistics */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div className="glass-card" style={{ 
          padding: '20px', 
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary)', fontSize: '14px', textTransform: 'uppercase' }}>Total Users</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-main)' }}>
            {users.length}
          </div>
        </div>

        <div className="glass-card" style={{ 
          padding: '20px', 
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--success)', fontSize: '14px', textTransform: 'uppercase' }}>Active Sessions</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-main)' }}>
            {users.filter(u => u.isActive).length}
          </div>
        </div>

        <div className="glass-card" style={{ 
          padding: '20px', 
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--warning)', fontSize: '14px', textTransform: 'uppercase' }}>Total Sensors</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-main)' }}>
            {statistics.totalSensors || 0}
          </div>
        </div>

        <div className="glass-card" style={{ 
          padding: '20px', 
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--danger)', fontSize: '14px', textTransform: 'uppercase' }}>System Alerts</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-main)' }}>
            {statistics.totalAlerts || 0}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        
{/* User Management */}
        <div className="glass-panel" style={{ 
          padding: '25px', 
          borderRadius: 'var(--radius-md)',
          gridColumn: '1 / -1' // Make it span full width
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)' }}>👥 User Management</h2>
            <button
              onClick={() => setShowAddUser(true)}
              className="btn-modern"
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                background: 'linear-gradient(135deg, var(--success) 0%, #059669 100%)'
              }}
            >
              + Add User
            </button>
          </div>

          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {users.map(user => (
              <div key={user.id} className="glass-card" style={{
                padding: '15px',
                marginBottom: '12px',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.02)'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px', color: 'var(--text-main)' }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                    {user.username} • <span style={{ color: 'var(--primary)' }}>{authService.getRoleDisplayName(user.role)}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', opacity: 0.7 }}>
                    {user.department} • {user.employeeId}
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    padding: '4px 10px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    borderRadius: '20px',
                    backgroundColor: user.isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: user.isActive ? 'var(--success)' : 'var(--danger)',
                    border: `1px solid ${user.isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                  }}>
                    {user.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handleEditUser(user)}
                      className="btn-glass"
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        color: 'var(--primary)',
                        borderColor: 'rgba(59, 130, 246, 0.3)'
                      }}
                      title="Edit User"
                    >
                      ✏️ Edit
                    </button>
                    
                    <button
                      onClick={() => handleToggleUser(user.username)}
                      className="btn-glass"
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        color: user.isActive ? 'var(--warning)' : 'var(--success)',
                        borderColor: user.isActive ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'
                      }}
                      title={user.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {user.isActive ? '⏸️ Deactivate' : '▶️ Activate'}
                    </button>
                    
                    <button
                      onClick={() => handleDeleteUser(user.username)}
                      className="btn-glass"
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        color: 'var(--danger)',
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                        opacity: user.username === 'admin' ? 0.5 : 1,
                        cursor: user.username === 'admin' ? 'not-allowed' : 'pointer'
                      }}
                      title="Delete User"
                      disabled={user.username === 'admin'} // Prevent deleting admin
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>


      </div>

      {/* Audit Logs */}
      <div className="glass-panel" style={{ 
        marginTop: '30px',
        padding: '25px', 
        borderRadius: 'var(--radius-md)'
      }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', color: 'var(--text-main)' }}>📋 Recent Audit Logs</h2>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {auditLogs.map((log, index) => (
            <div key={index} style={{
              padding: '12px',
              marginBottom: '8px',
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-glass)',
              borderRadius: '6px',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{log.action}</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
              <div style={{ marginTop: '4px', color: 'var(--text-main)' }}>
                {log.description} - <span style={{ color: 'var(--text-muted)' }}>{log.username}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <ModalOverlay onClose={() => setShowAddUser(false)} width="400px">
            <h3 style={{ color: 'var(--text-main)', marginTop: 0 }}>Add New User</h3>
            <form onSubmit={handleCreateUser}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Username:</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    marginTop: '4px',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Password:</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    marginTop: '4px',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Full Name:</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    marginTop: '4px',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Role:</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    marginTop: '4px',
                    color: 'var(--text-main)'
                  }}
                >
                  <option value="viewer">Viewer</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="safety">Safety</option>
                  <option value="control_room">Control Room</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Department:</label>
                <input
                  type="text"
                  value={newUser.department}
                  onChange={(e) => setNewUser(prev => ({ ...prev, department: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    marginTop: '4px',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Employee ID:</label>
                <input
                  type="text"
                  value={newUser.employeeId}
                  onChange={(e) => setNewUser(prev => ({ ...prev, employeeId: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    marginTop: '4px',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  className="btn-modern"
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, var(--success) 0%, #059669 100%)'
                  }}
                >
                  Create User
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="btn-glass"
                  style={{
                    flex: 1,
                    borderColor: 'var(--border-glass)',
                    color: 'var(--text-muted)'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
        </ModalOverlay>
      )}

      {/* Edit User Modal */}
      {showEditUser && editingUser && (
        <ModalOverlay onClose={() => { setShowEditUser(false); setEditingUser(null); }} width="400px">
            <h3 style={{ color: 'var(--text-main)', marginTop: 0 }}>Edit User: {editingUser.username}</h3>
            <form onSubmit={handleUpdateUser}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Username:</label>
                <input
                  type="text"
                  value={editingUser.username}
                  disabled
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    marginTop: '4px',
                    color: 'var(--text-muted)',
                    cursor: 'not-allowed'
                  }}
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '11px', opacity: 0.7 }}>
                  Username cannot be changed
                </small>
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ color: 'var(--text-muted)', fontSize: '12px' }}>New Password (leave blank to keep current):</label>
                <input
                  type="password"
                  value={editingUser.password}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, password: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    marginTop: '4px',
                    color: 'var(--text-main)'
                  }}
                  placeholder="Enter new password or leave blank"
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Full Name:</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, name: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    marginTop: '4px',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Role:</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, role: e.target.value }))}
                  disabled={editingUser.username === 'admin'} // Prevent changing admin role
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: editingUser.username === 'admin' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    marginTop: '4px',
                    color: editingUser.username === 'admin' ? 'var(--text-muted)' : 'var(--text-main)',
                    cursor: editingUser.username === 'admin' ? 'not-allowed' : 'pointer'
                  }}
                >
                  <option value="viewer">Viewer</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="safety">Safety</option>
                  <option value="control_room">Control Room</option>
                  <option value="admin">Admin</option>
                </select>
                {editingUser.username === 'admin' && (
                  <small style={{ color: 'var(--text-muted)', fontSize: '11px', opacity: 0.7 }}>
                    Admin role cannot be changed
                  </small>
                )}
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Department:</label>
                <input
                  type="text"
                  value={editingUser.department}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, department: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    marginTop: '4px',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Employee ID:</label>
                <input
                  type="text"
                  value={editingUser.employeeId}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, employeeId: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    marginTop: '4px',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  className="btn-modern"
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, var(--primary) 0%, #2563eb 100%)'
                  }}
                >
                  Update User
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditUser(false);
                    setEditingUser(null);
                  }}
                  className="btn-glass"
                  style={{
                    flex: 1,
                    borderColor: 'var(--border-glass)',
                    color: 'var(--text-muted)'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
        </ModalOverlay>
      )}
        </>
      )}

      {/* Sensor Management Tab */}
      {activeTab === 'sensors' && (
        <SensorManagement />
      )}

      {/* Dashboard Settings Tab */}
      {activeTab === 'settings' && (
        <DashboardSettings />
      )}
    </div>
  );
};

export default AdminDashboard;