/**
 * NCRTC Digital Twin Authentication Service
 * Handles user authentication, role management, and session control
 */

class AuthService {
  constructor() {
    console.log('🔧 AuthService: Constructor called');
    this.currentUser = null;
    this.sessionTimeout = 8 * 60 * 60 * 1000; // 8 hours
    this.roles = {
      ADMIN: 'admin',
      CONTROL_ROOM: 'control_room',
      MAINTENANCE: 'maintenance',
      SAFETY: 'safety',
      VIEWER: 'viewer'
    };
    
    // Define permissions for each role
    this.permissions = {
      [this.roles.ADMIN]: {
        userManagement: true,
        alertAcknowledgment: true,
        workOrderCreation: true,
        workOrderExecution: false,
        emergencyControls: true,
        systemSettings: true,
        viewAllSensors: true,
        generateReports: true,
        manageThresholds: true,
        viewAuditLogs: true
      },
      [this.roles.CONTROL_ROOM]: {
        userManagement: false,
        alertAcknowledgment: true,
        workOrderCreation: true,
        workOrderExecution: false,
        emergencyControls: true,
        systemSettings: false,
        viewAllSensors: true,
        generateReports: true,
        manageThresholds: false,
        viewAuditLogs: false
      },
      [this.roles.MAINTENANCE]: {
        userManagement: false,
        alertAcknowledgment: false,
        workOrderCreation: false,
        workOrderExecution: true,
        emergencyControls: false,
        systemSettings: false,
        viewAllSensors: true,
        generateReports: false,
        manageThresholds: false,
        viewAuditLogs: false
      },
      [this.roles.SAFETY]: {
        userManagement: false,
        alertAcknowledgment: true,
        workOrderCreation: true,
        workOrderExecution: false,
        emergencyControls: true,
        systemSettings: false,
        viewAllSensors: true,
        generateReports: true,
        manageThresholds: false,
        viewAuditLogs: true
      },
      [this.roles.VIEWER]: {
        userManagement: false,
        alertAcknowledgment: false,
        workOrderCreation: false,
        workOrderExecution: false,
        emergencyControls: false,
        systemSettings: false,
        viewAllSensors: false,
        generateReports: false,
        manageThresholds: false,
        viewAuditLogs: false
      }
    };

    // Mock user database (in production, this would be a secure backend)
    this.users = {
      'admin@ncrtc.in': {
        id: 'usr_001',
        username: 'admin@ncrtc.in',
        password: 'admin123', // In production: bcrypt hash
        name: 'System Administrator',
        role: this.roles.ADMIN,
        department: 'IT Operations',
        employeeId: 'NCRTC001',
        lastLogin: null,
        isActive: true
      },
      'control@ncrtc.in': {
        id: 'usr_002',
        username: 'control@ncrtc.in',
        password: 'control123',
        name: 'Rajesh Kumar',
        role: this.roles.CONTROL_ROOM,
        department: 'Control Room',
        employeeId: 'NCRTC002',
        lastLogin: null,
        isActive: true
      },
      'maintenance@ncrtc.in': {
        id: 'usr_003',
        username: 'maintenance@ncrtc.in',
        password: 'maint123',
        name: 'Amit Sharma',
        role: this.roles.MAINTENANCE,
        department: 'Engineering',
        employeeId: 'NCRTC003',
        lastLogin: null,
        isActive: true
      },
      'safety@ncrtc.in': {
        id: 'usr_004',
        username: 'safety@ncrtc.in',
        password: 'safety123',
        name: 'Priya Singh',
        role: this.roles.SAFETY,
        department: 'Safety & Security',
        employeeId: 'NCRTC004',
        lastLogin: null,
        isActive: true
      },
      'viewer@ncrtc.in': {
        id: 'usr_005',
        username: 'viewer@ncrtc.in',
        password: 'viewer123',
        name: 'Guest User',
        role: this.roles.VIEWER,
        department: 'External',
        employeeId: 'NCRTC005',
        lastLogin: null,
        isActive: true
      }
    };

    this.initializeSession();
  }

  checkUrlParamsAndInitialize() {
    console.log('🔄 AuthService.checkUrlParamsAndInitialize: Checking URL params again...');
    
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const clearSession = urlParams.get('clearSession');
        const forceLogin = urlParams.get('forceLogin');

        console.log('🔍 AuthService: Delayed URL param check');
        console.log('  window.location.href:', window.location.href);
        console.log('  clearSession param:', clearSession);
        console.log('  forceLogin param:', forceLogin);

        if (clearSession === 'true' || forceLogin === 'true') {
          console.log('🚫 AuthService: SKIPPING session initialization (delayed check)');
          this.currentUser = null;
          return;
        }
      } catch (e) {
        console.error('❌ AuthService: Error in delayed URL check:', e);
      }
    }

    // If we get here, proceed with normal session initialization
    console.log('✅ AuthService: Proceeding with normal session initialization');
    this.loadExistingSession();
  }

  loadExistingSession() {
    console.log('🔄 AuthService.loadExistingSession: Checking for existing session...');
    
    // Check for existing session
    const savedSession = localStorage.getItem('ncrtc_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        if (this.isSessionValid(session)) {
          this.currentUser = session.user;
          this.startSessionTimer();
          console.log('✅ AuthService: Restored session for user:', this.currentUser?.name);
        } else {
          console.log('⚠️ AuthService: Session expired, logging out');
          this.logout();
        }
      } catch (error) {
        console.error('❌ AuthService: Invalid session data:', error);
        this.logout();
      }
    } else {
      console.log('ℹ️ AuthService: No saved session found');
    }
  }

  initializeSession() {
    console.log('🔄 AuthService.initializeSession: Starting...');

    // CRITICAL: Check URL parameters first - if clearSession or forceLogin is present,
    // skip session initialization to prevent auto-login
    if (typeof window !== 'undefined') {
      try {
        // Check if window.location is available and has search params
        if (window.location && window.location.search) {
          const urlParams = new URLSearchParams(window.location.search);
          const clearSession = urlParams.get('clearSession');
          const forceLogin = urlParams.get('forceLogin');

          console.log('🔍 AuthService: URL param check');
          console.log('  window.location.href:', window.location.href);
          console.log('  window.location.search:', window.location.search);
          console.log('  clearSession param:', clearSession, 'type:', typeof clearSession);
          console.log('  forceLogin param:', forceLogin, 'type:', typeof forceLogin);

          if (clearSession === 'true' || forceLogin === 'true') {
            console.log('🚫 AuthService: SKIPPING session initialization due to URL params');
            console.log('  Reason: clearSession=true OR forceLogin=true');
            this.currentUser = null;
            return;
          } else {
            console.log('✅ AuthService: No URL params blocking session init, proceeding...');
          }
        } else {
          console.log('⚠️ AuthService: window.location.search not available yet, will check later');
          // Schedule a re-check after a short delay
          setTimeout(() => {
            console.log('🔄 AuthService: Re-checking URL params after delay...');
            this.checkUrlParamsAndInitialize();
          }, 100);
          return;
        }
      } catch (e) {
        console.error('❌ AuthService: Error parsing URL:', e);
        console.error('  Error details:', e.message);
      }
    } else {
      console.log('⚠️ AuthService: window undefined, skipping URL check');
    }
    
    // If we get here, proceed with normal session initialization
    this.loadExistingSession();
  }

  async login(username, password) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const user = this.users[username];
        
        if (!user) {
          reject(new Error('User not found'));
          return;
        }

        if (!user.isActive) {
          reject(new Error('Account is deactivated'));
          return;
        }

        if (user.password !== password) {
          reject(new Error('Invalid password'));
          return;
        }

        // Update last login
        user.lastLogin = new Date().toISOString();

        // Create session
        const sessionData = {
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            department: user.department,
            employeeId: user.employeeId,
            permissions: this.permissions[user.role]
          },
          loginTime: Date.now(),
          expiresAt: Date.now() + this.sessionTimeout
        };

        // Save session
        localStorage.setItem('ncrtc_session', JSON.stringify(sessionData));
        this.currentUser = sessionData.user;
        this.startSessionTimer();

        // Log audit event
        this.logAuditEvent('USER_LOGIN', `User ${user.name} logged in successfully`);

        resolve(sessionData.user);
      }, 1000); // Simulate network delay
    });
  }

  logout() {
    console.log('🚪 AuthService.logout() called');
    console.log('Before logout - currentUser:', this.currentUser);
    
    if (this.currentUser) {
      this.logAuditEvent('USER_LOGOUT', `User ${this.currentUser.name} logged out`);
    }
    
    localStorage.removeItem('ncrtc_session');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    
    this.currentUser = null;
    
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }
    
    console.log('After logout - currentUser:', this.currentUser);
    console.log('After logout - isAuthenticated:', this.isAuthenticated());
  }

  // Force reset method for URL parameter handling
  forceReset() {
    console.log('🔄 AuthService.forceReset() called');
    this.currentUser = null;
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
    console.log('✅ AuthService state reset');
  }

  forceUrlParamCheck() {
    console.log('🔄 AuthService.forceUrlParamCheck() called');
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      const urlParams = new URLSearchParams(window.location.search);
      const clearSession = urlParams.get('clearSession');
      const forceLogin = urlParams.get('forceLogin');
      
      if (clearSession === 'true' || forceLogin === 'true') {
        console.log('🚫 AuthService: Force clearing session due to URL params');
        this.logout();
        this.forceReset();
        return true;
      }
    }
    return false;
  }

  isSessionValid(session) {
    return session && session.expiresAt > Date.now();
  }

  startSessionTimer() {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }

    const session = JSON.parse(localStorage.getItem('ncrtc_session'));
    if (session) {
      const timeLeft = session.expiresAt - Date.now();
      if (timeLeft > 0) {
        this.sessionTimer = setTimeout(() => {
          alert('Session expired. Please login again.');
          this.logout();
          window.location.reload();
        }, timeLeft);
      }
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  hasPermission(permission) {
    if (!this.currentUser || !this.currentUser.permissions) {
      return false;
    }
    return this.currentUser.permissions[permission] === true;
  }

  hasRole(role) {
    return this.currentUser && this.currentUser.role === role;
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }

  getRoleDisplayName(role) {
    const roleNames = {
      [this.roles.ADMIN]: 'System Administrator',
      [this.roles.CONTROL_ROOM]: 'Control Room Operator',
      [this.roles.MAINTENANCE]: 'Maintenance Engineer',
      [this.roles.SAFETY]: 'Safety Officer',
      [this.roles.VIEWER]: 'Viewer'
    };
    return roleNames[role] || role;
  }

  logAuditEvent(action, description) {
    const auditLog = {
      timestamp: new Date().toISOString(),
      userId: this.currentUser?.id || 'anonymous',
      username: this.currentUser?.username || 'anonymous',
      action: action,
      description: description,
      ipAddress: 'localhost', // In production: get real IP
      userAgent: navigator.userAgent
    };

    // Store in localStorage (in production: send to secure backend)
    const existingLogs = JSON.parse(localStorage.getItem('ncrtc_audit_logs') || '[]');
    existingLogs.push(auditLog);
    localStorage.setItem('ncrtc_audit_logs', JSON.stringify(existingLogs));

    console.log('Audit Log:', auditLog);
  }

  getAuditLogs() {
    if (!this.hasPermission('viewAuditLogs')) {
      throw new Error('Access denied: Insufficient permissions');
    }
    return JSON.parse(localStorage.getItem('ncrtc_audit_logs') || '[]');
  }

  // User management functions (Admin only)
  async createUser(userData) {
    if (!this.hasPermission('userManagement')) {
      throw new Error('Access denied: User management permission required');
    }

    const userId = `usr_${Date.now()}`;
    const newUser = {
      id: userId,
      username: userData.username,
      password: userData.password, // In production: hash password
      name: userData.name,
      role: userData.role,
      department: userData.department,
      employeeId: userData.employeeId,
      lastLogin: null,
      isActive: true
    };

    this.users[userData.username] = newUser;
    this.logAuditEvent('USER_CREATED', `New user created: ${userData.name} (${userData.role})`);
    
    return newUser;
  }

  async updateUser(username, updateData) {
    if (!this.hasPermission('userManagement')) {
      throw new Error('Access denied: User management permission required');
    }

    const user = this.users[username];
    if (!user) {
      throw new Error('User not found');
    }

    Object.assign(user, updateData);
    this.logAuditEvent('USER_UPDATED', `User updated: ${user.name}`);
    
    return user;
  }

  async deleteUser(username) {
    if (!this.hasPermission('userManagement')) {
      throw new Error('Access denied: User management permission required');
    }

    const user = this.users[username];
    if (!user) {
      throw new Error('User not found');
    }

    user.isActive = false;
    this.logAuditEvent('USER_DEACTIVATED', `User deactivated: ${user.name}`);
    
    return true;
  }

  getAllUsers() {
    if (!this.hasPermission('userManagement')) {
      throw new Error('Access denied: User management permission required');
    }

    return Object.values(this.users).map(user => ({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      department: user.department,
      employeeId: user.employeeId,
      lastLogin: user.lastLogin,
      isActive: user.isActive
    }));
  }

  // Get demo credentials for testing different roles
  getDemoCredentials() {
    return [
      {
        username: 'admin@ncrtc.in',
        password: 'admin123',
        role: 'Admin',
        description: 'System Administrator - Full access to all features'
      },
      {
        username: 'control@ncrtc.in',
        password: 'control123',
        role: 'Control Room',
        description: 'Control Room Operator - Monitor sensors and create work orders'
      },
      {
        username: 'maintenance@ncrtc.in',
        password: 'maint123',
        role: 'Maintenance',
        description: 'Maintenance Engineer - Execute work orders and field tasks'
      },
      {
        username: 'safety@ncrtc.in',
        password: 'safety123',
        role: 'Safety',
        description: 'Safety Officer - Incident management and safety protocols'
      },
      {
        username: 'viewer@ncrtc.in',
        password: 'viewer123',
        role: 'Viewer',
        description: 'Read-only access - View system overview and reports'
      }
    ];
  }
}

// Create singleton instance
const authService = new AuthService();

// Ensure all methods are accessible
console.log('AuthService methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(authService)));

export default authService;