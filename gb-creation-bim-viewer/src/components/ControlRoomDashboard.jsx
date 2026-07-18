import React, { useState, useEffect } from 'react';
import sensorDataManager from '../services/sensorDataManager.js';

/**
 * Control Room Dashboard - Alert Management & Work Order Creation
 * Core responsibility: Alert → Work Order workflow
 */
const ControlRoomDashboard = () => {
  const [alerts, setAlerts] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showCreateWorkOrder, setShowCreateWorkOrder] = useState(false);
  const [workOrderForm, setWorkOrderForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignedTo: '',
    dueDate: '',
    category: 'maintenance'
  });

  const engineers = [
    'Amit Sharma - Track Maintenance',
    'Ravi Kumar - Electrical Systems',
    'Priya Singh - HVAC Systems',
    'Deepak Mehta - Signal Systems',
    'Sunita Rao - Platform Equipment'
  ];

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      await sensorDataManager.initialize();
      if (!mounted) return;
      loadDashboardData();
    };

    setup();
    
    const unsubscribe = sensorDataManager.subscribe((eventType) => {
      if (!mounted) return;
      if (eventType === 'alertCreated' || eventType === 'sensorUpdate') {
        loadDashboardData();
      }
    });

    const interval = setInterval(() => {
      if (!mounted) return;
      loadDashboardData();
    }, 30000);

    return () => {
      mounted = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadDashboardData = () => {
    const allAlerts = sensorDataManager.getActiveAlerts();
    const allSensors = sensorDataManager.getAllSensors();
    const stats = sensorDataManager.getStatistics();
    
    setAlerts(allAlerts);
    setSensors(allSensors);
    setStatistics(stats);
    
    // Load work orders from localStorage
    const savedWorkOrders = JSON.parse(localStorage.getItem('gb_creation_work_orders') || '[]');
    setWorkOrders(savedWorkOrders);
  };

  const handleAcknowledgeAlert = (alertId) => {
    sensorDataManager.acknowledgeAlert(alertId, 'control-room-operator');
    loadDashboardData();
  };

  const handleCreateWorkOrder = (alert) => {
    setSelectedAlert(alert);
    setWorkOrderForm({
      title: `${alert.type} Alert - Sensor ${alert.sensorId}`,
      description: `${alert.message}\n\nLocation: ${alert.sensorId}\nSeverity: ${alert.severity}\nTime: ${new Date(alert.timestamp).toLocaleString()}`,
      priority: alert.severity === 'critical' ? 'high' : alert.severity === 'warning' ? 'medium' : 'low',
      assignedTo: '',
      dueDate: new Date(Date.now() + (alert.severity === 'critical' ? 4 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      category: alert.type === 'temperature' || alert.type === 'humidity' ? 'maintenance' : 'inspection'
    });
    setShowCreateWorkOrder(true);
  };

  const handleSubmitWorkOrder = (e) => {
    e.preventDefault();
    
    const newWorkOrder = {
      id: `WO_${Date.now()}`,
      ...workOrderForm,
      alertId: selectedAlert?.id,
      sensorId: selectedAlert?.sensorId,
      createdBy: 'Control Room Operator',
      createdAt: new Date().toISOString(),
      status: 'created',
      updates: []
    };

    const existingWorkOrders = JSON.parse(localStorage.getItem('gb_creation_work_orders') || '[]');
    existingWorkOrders.push(newWorkOrder);
    localStorage.setItem('gb_creation_work_orders', JSON.stringify(existingWorkOrders));

    // Acknowledge the alert
    if (selectedAlert) {
      handleAcknowledgeAlert(selectedAlert.id);
    }

    setShowCreateWorkOrder(false);
    setSelectedAlert(null);
    loadDashboardData();
    
    alert(`Work Order ${newWorkOrder.id} created and assigned to ${newWorkOrder.assignedTo}`);
  };

  const getAlertIcon = (severity) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'warning': return '🟡';
      case 'info': return '🔵';
      default: return '⚪';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#e74c3c';
      case 'medium': return '#f39c12';
      case 'low': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'created': return '#3498db';
      case 'assigned': return '#f39c12';
      case 'in_progress': return '#e67e22';
      case 'completed': return '#27ae60';
      case 'cancelled': return '#95a5a6';
      default: return '#2c3e50';
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-main)' }}>

      {/* Statistics Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div className="glass-card" style={{ 
          padding: '20px', 
          textAlign: 'center',
          borderTop: '2px solid var(--danger)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--danger)', fontSize: '14px', textTransform: 'uppercase' }}>🚨 Active Alerts</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-main)' }}>
            {alerts.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '5px' }}>
            {alerts.filter(a => a.severity === 'critical').length} Critical
          </div>
        </div>

        <div className="glass-card" style={{ 
          padding: '20px', 
          textAlign: 'center',
          borderTop: '2px solid var(--success)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--success)', fontSize: '14px', textTransform: 'uppercase' }}>📡 Online Sensors</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-main)' }}>
            {statistics.onlineSensors || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '5px' }}>
            of {statistics.totalSensors || 0} total
          </div>
        </div>

        <div className="glass-card" style={{ 
          padding: '20px', 
          textAlign: 'center',
          borderTop: '2px solid var(--warning)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--warning)', fontSize: '14px', textTransform: 'uppercase' }}>📋 Active Work Orders</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-main)' }}>
            {workOrders.filter(wo => wo.status !== 'completed').length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '5px' }}>
            {workOrders.filter(wo => wo.priority === 'high').length} High Priority
          </div>
        </div>

        <div className="glass-card" style={{ 
          padding: '20px', 
          textAlign: 'center',
          borderTop: '2px solid var(--accent)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--accent)', fontSize: '14px', textTransform: 'uppercase' }}>⚡ System Status</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)' }}>
            OPERATIONAL
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '5px' }}>
            All systems normal
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        
        {/* Active Alerts */}
        <div className="glass-panel" style={{ 
          padding: '25px', 
          borderRadius: 'var(--radius-md)'
        }}>
          <h2 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', color: 'var(--text-main)' }}>
            🚨 Critical Alerts Requiring Action
          </h2>

          {alerts.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: 'var(--success)',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>All Clear</div>
              <div style={{ fontSize: '14px', marginTop: '5px', opacity: 0.8 }}>No active alerts</div>
            </div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {alerts.slice(0, 10).map(alert => (
                <div 
                  key={alert.id}
                  className="glass-card"
                  style={{ 
                    borderLeft: `4px solid ${
                      alert.severity === 'critical' ? 'var(--danger)' : 
                      alert.severity === 'warning' ? 'var(--warning)' : 'var(--primary)'
                    }`,
                    padding: '20px',
                    marginBottom: '15px',
                    background: alert.severity === 'critical' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.02)'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '15px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                        color: 'var(--text-main)'
                      }}>
                        {getAlertIcon(alert.severity)} {alert.sensorId}
                      </div>
                      
                      <div style={{ fontSize: '14px', marginBottom: '8px', lineHeight: '1.4', color: 'var(--text-main)' }}>
                        {alert.message}
                      </div>
                      
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                    
                    <div style={{ 
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      backgroundColor: alert.severity === 'critical' ? 'rgba(239, 68, 68, 0.2)' : 
                                     alert.severity === 'warning' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                      color: alert.severity === 'critical' ? 'var(--danger)' : 
                             alert.severity === 'warning' ? 'var(--warning)' : 'var(--primary)',
                      border: `1px solid ${
                        alert.severity === 'critical' ? 'rgba(239, 68, 68, 0.3)' : 
                        alert.severity === 'warning' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.3)'
                      }`
                    }}>
                      {alert.severity}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                      className="btn-glass"
                      style={{
                        padding: '8px 16px',
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        borderColor: 'var(--border-glass)'
                      }}
                    >
                      ✓ Acknowledge
                    </button>
                    
                    <button
                      onClick={() => handleCreateWorkOrder(alert)}
                      className="btn-modern"
                      style={{
                        padding: '8px 16px',
                        fontSize: '12px',
                        background: 'linear-gradient(135deg, var(--primary) 0%, #2563eb 100%)'
                      }}
                    >
                      📋 Create Work Order
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Work Orders */}
        <div className="glass-panel" style={{ 
          padding: '25px', 
          borderRadius: 'var(--radius-md)'
        }}>
          <h2 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', color: 'var(--text-main)' }}>
            📋 Recent Work Orders
          </h2>

          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {workOrders.slice(-10).reverse().map(workOrder => (
              <div 
                key={workOrder.id}
                className="glass-card"
                style={{ 
                  padding: '15px',
                  marginBottom: '12px',
                  borderLeft: `4px solid ${getPriorityColor(workOrder.priority)}`
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '10px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px', color: 'var(--text-main)' }}>
                      {workOrder.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      WO#{workOrder.id} • Assigned to: <span style={{ color: 'var(--primary)' }}>{workOrder.assignedTo}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Due: {new Date(workOrder.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                    <span style={{
                      padding: '2px 8px',
                      fontSize: '10px',
                      borderRadius: '12px',
                      backgroundColor: `${getPriorityColor(workOrder.priority)}33`, // 20% opacity
                      color: getPriorityColor(workOrder.priority),
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      border: `1px solid ${getPriorityColor(workOrder.priority)}66`
                    }}>
                      {workOrder.priority}
                    </span>
                    
                    <span style={{
                      padding: '2px 8px',
                      fontSize: '10px',
                      borderRadius: '12px',
                      backgroundColor: `${getStatusColor(workOrder.status)}33`,
                      color: getStatusColor(workOrder.status),
                      textTransform: 'uppercase',
                      border: `1px solid ${getStatusColor(workOrder.status)}66`
                    }}>
                      {workOrder.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Work Order Modal */}
      {showCreateWorkOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{
            padding: '30px',
            borderRadius: 'var(--radius-lg)',
            width: '600px',
            maxHeight: '80vh',
            overflowY: 'auto',
            border: '1px solid var(--border-glass)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)' }}>
              📋 Create Work Order
            </h3>
            
            {selectedAlert && (
              <div style={{
                padding: '15px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '20px',
                border: '1px solid var(--border-glass)'
              }}>
                <strong style={{ color: 'var(--text-main)' }}>Alert Details:</strong><br />
                <span style={{ color: 'var(--text-main)' }}>{getAlertIcon(selectedAlert.severity)} {selectedAlert.message}</span><br />
                <small style={{ color: 'var(--text-muted)' }}>Sensor: {selectedAlert.sensorId} • {new Date(selectedAlert.timestamp).toLocaleString()}</small>
              </div>
            )}
            
            <form onSubmit={handleSubmitWorkOrder}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Work Order Title:
                </label>
                <input
                  type="text"
                  value={workOrderForm.title}
                  onChange={(e) => setWorkOrderForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Description:
                </label>
                <textarea
                  value={workOrderForm.description}
                  onChange={(e) => setWorkOrderForm(prev => ({ ...prev, description: e.target.value }))}
                  required
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-main)',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '12px' }}>
                    Priority:
                  </label>
                  <select
                    value={workOrderForm.priority}
                    onChange={(e) => setWorkOrderForm(prev => ({ ...prev, priority: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-main)'
                    }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '12px' }}>
                    Due Date:
                  </label>
                  <input
                    type="date"
                    value={workOrderForm.dueDate}
                    onChange={(e) => setWorkOrderForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-main)'
                    }}
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Assign to Engineer:
                </label>
                <select
                  value={workOrderForm.assignedTo}
                  onChange={(e) => setWorkOrderForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-main)'
                  }}
                >
                  <option value="">Select Engineer...</option>
                  {engineers.map(engineer => (
                    <option key={engineer} value={engineer}>{engineer}</option>
                  ))}
                </select>
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
                  Create Work Order
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateWorkOrder(false)}
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
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlRoomDashboard;