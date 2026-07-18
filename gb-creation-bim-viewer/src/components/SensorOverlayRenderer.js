import * as THREE from 'three';
import sensorDataManager from '../services/sensorDataManager.js';

/**
 * 3D Sensor Overlay System
 * Displays sensor data as 3D overlays on the BIM model
 */
class SensorOverlayRenderer {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    this.sensorMarkers = new Map();
    this.sensorLabels = new Map();
    this.alertIndicators = new Map();
    
    this.overlayGroup = new THREE.Group();
    this.overlayGroup.name = 'SensorOverlays';
    this.overlayGroup.visible = false; // Hide by default
    this.scene.add(this.overlayGroup);
    
    this.isEnabled = false; // Hide sensor overlays by default
    this.showLabels = false; // Hide sensor labels by default
    this.showAlerts = false; // Hide sensor alerts by default
    
    // Predefined sensor locations (disabled for now - will be configured later)
    // this.sensorLocations = {
    //   'ESP32_TEMP_001': { x: 10, y: 5, z: 15, zoneId: 'PLATFORM_A', name: 'Platform A - Temperature' },
    //   'ESP32_TEMP_002': { x: -10, y: 5, z: 15, zoneId: 'PLATFORM_B', name: 'Platform B - Temperature' },
    //   'ESP32_DOOR_001': { x: 0, y: 3, z: 20, zoneId: 'ENTRANCE_MAIN', name: 'Main Entrance Door' },
    //   'ESP32_LIGHT_001': { x: 5, y: 8, z: 10, zoneId: 'CONTROL_ROOM', name: 'Control Room Light' }
    // };
    this.sensorLocations = {}; // Empty for now
    
    this.initializeOverlays();
    this.setupEventListeners();
  }
  
  initializeOverlays() {
    // Create base materials
    this.materials = {
      online: new THREE.MeshBasicMaterial({ color: 0x4caf50, transparent: true, opacity: 0.8 }),
      offline: new THREE.MeshBasicMaterial({ color: 0x757575, transparent: true, opacity: 0.6 }),
      warning: new THREE.MeshBasicMaterial({ color: 0xff9800, transparent: true, opacity: 0.9 }),
      critical: new THREE.MeshBasicMaterial({ color: 0xf44336, transparent: true, opacity: 1.0 })
    };
    
    // Create geometries
    this.geometries = {
      marker: new THREE.SphereGeometry(0.3, 16, 16),
      alert: new THREE.RingGeometry(0.4, 0.6, 16),
      pulse: new THREE.RingGeometry(0.6, 0.8, 16)
    };
    
    // Initialize markers for known sensor locations (disabled for now)
    // Object.entries(this.sensorLocations).forEach(([sensorId, location]) => {
    //   this.createSensorMarker(sensorId, location);
    // });
  }
  
  setupEventListeners() {
    // Subscribe to sensor data updates
    this.unsubscribe = sensorDataManager.subscribe((eventType, data) => {
      if (eventType === 'sensorUpdate') {
        this.updateSensorMarker(data.sensorId, data);
      } else if (eventType === 'alertCreated') {
        this.showAlert(data.sensorId, data);
      } else if (eventType === 'alertResolved') {
        this.hideAlert(data.sensorId, data.alertId);
      }
    });
  }
  
  createSensorMarker(sensorId, location) {
    const group = new THREE.Group();
    group.name = `Sensor_${sensorId}`;
    group.position.set(location.x, location.y, location.z);
    
    // Main sensor marker
    const markerMesh = new THREE.Mesh(this.geometries.marker, this.materials.offline);
    markerMesh.name = 'marker';
    group.add(markerMesh);
    
    // Pulsing ring for active sensors
    const pulseRing = new THREE.Mesh(this.geometries.pulse, this.materials.online.clone());
    pulseRing.name = 'pulse';
    pulseRing.rotation.x = -Math.PI / 2;
    pulseRing.visible = false;
    group.add(pulseRing);
    
    // Alert indicator
    const alertRing = new THREE.Mesh(this.geometries.alert, this.materials.warning.clone());
    alertRing.name = 'alert';
    alertRing.rotation.x = -Math.PI / 2;
    alertRing.visible = false;
    group.add(alertRing);
    
    this.overlayGroup.add(group);
    this.sensorMarkers.set(sensorId, group);
    
    // Create HTML label
    this.createSensorLabel(sensorId, location);
    
    return group;
  }
  
  createSensorLabel(sensorId, location) {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'sensor-label glass-panel';
    labelDiv.style.cssText = `
      position: absolute;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-family: var(--font-family);
      pointer-events: none;
      z-index: 1000;
      white-space: nowrap;
      border: 1px solid var(--border-glass);
      transition: all 0.3s ease;
      display: none;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    `;
    
    labelDiv.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px; color: var(--text-main);">${location.name}</div>
      <div id="sensor-${sensorId}-data" style="font-size: 11px; color: var(--text-muted);">
        Status: Offline
      </div>
    `;
    
    document.body.appendChild(labelDiv);
    this.sensorLabels.set(sensorId, labelDiv);
  }
  
  updateSensorMarker(sensorId, sensorData) {
    const marker = this.sensorMarkers.get(sensorId);
    const label = this.sensorLabels.get(sensorId);
    
    if (!marker || !label) {
      // Create marker for new sensor if location is known
      if (this.sensorLocations[sensorId]) {
        this.createSensorMarker(sensorId, this.sensorLocations[sensorId]);
        return this.updateSensorMarker(sensorId, sensorData);
      }
      return;
    }
    
    const markerMesh = marker.getObjectByName('marker');
    const pulseRing = marker.getObjectByName('pulse');
    const alertRing = marker.getObjectByName('alert');
    
    // Update marker color based on status
    let material;
    if (sensorData.status === 'online') {
      const hasActiveAlerts = sensorData.alerts && 
        sensorData.alerts.some(alert => !alert.acknowledged);
      
      if (hasActiveAlerts) {
        const hasCritical = sensorData.alerts.some(alert => 
          alert.severity === 'critical' && !alert.acknowledged);
        material = hasCritical ? this.materials.critical : this.materials.warning;
      } else {
        material = this.materials.online;
      }
      
      // Show pulse animation for online sensors
      pulseRing.visible = true;
    } else {
      material = this.materials.offline;
      pulseRing.visible = false;
    }
    
    markerMesh.material = material;
    
    // Update label content
    const dataDiv = label.querySelector(`#sensor-${sensorId}-data`);
    let labelContent = `Status: ${sensorData.status.toUpperCase()}`;
    
    if (sensorData.currentValues) {
      const values = sensorData.currentValues;
      if (values.temperature !== undefined) {
        labelContent += `<br>🌡️ ${values.temperature.toFixed(1)}°C`;
      }
      if (values.humidity !== undefined) {
        labelContent += `<br>💧 ${values.humidity.toFixed(1)}%`;
      }
      if (values.doorState !== undefined) {
        labelContent += `<br>🚪 ${values.doorState ? 'Open' : 'Closed'}`;
      }
      if (values.lightState !== undefined) {
        labelContent += `<br>💡 ${values.lightState ? 'On' : 'Off'}`;
      }
    }
    
    if (sensorData.lastUpdate) {
      const timeDiff = (Date.now() - new Date(sensorData.lastUpdate).getTime()) / 1000;
      labelContent += `<br><small>${timeDiff < 60 ? Math.floor(timeDiff) + 's ago' : 
        timeDiff < 3600 ? Math.floor(timeDiff/60) + 'm ago' : 
        Math.floor(timeDiff/3600) + 'h ago'}</small>`;
    }
    
    dataDiv.innerHTML = labelContent;
    
    // Update label border color
    label.style.borderColor = material.color.getStyle();
  }
  
  showAlert(sensorId, alertData) {
    const marker = this.sensorMarkers.get(sensorId);
    if (!marker) return;
    
    const alertRing = marker.getObjectByName('alert');
    if (!alertRing) return;
    
    // Set alert color based on severity
    const alertMaterial = alertData.severity === 'critical' ? 
      this.materials.critical : this.materials.warning;
    
    alertRing.material = alertMaterial.clone();
    alertRing.visible = true;
    
    // Store alert for this sensor
    if (!this.alertIndicators.has(sensorId)) {
      this.alertIndicators.set(sensorId, new Set());
    }
    this.alertIndicators.get(sensorId).add(alertData.id);
    
    // Animate alert ring
    this.animateAlert(alertRing);
  }
  
  hideAlert(sensorId, alertId) {
    const alertSet = this.alertIndicators.get(sensorId);
    if (alertSet) {
      alertSet.delete(alertId);
      
      // Hide alert ring if no more active alerts
      if (alertSet.size === 0) {
        const marker = this.sensorMarkers.get(sensorId);
        if (marker) {
          const alertRing = marker.getObjectByName('alert');
          if (alertRing) {
            alertRing.visible = false;
          }
        }
      }
    }
  }
  
  animateAlert(alertRing) {
    let scale = 1.0;
    let growing = true;
    
    const animate = () => {
      if (!alertRing.visible) return;
      
      if (growing) {
        scale += 0.02;
        if (scale >= 1.3) growing = false;
      } else {
        scale -= 0.02;
        if (scale <= 1.0) growing = true;
      }
      
      alertRing.scale.set(scale, 1, scale);
      requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  updateLabelPositions() {
    if (!this.showLabels) return;
    
    this.sensorMarkers.forEach((marker, sensorId) => {
      const label = this.sensorLabels.get(sensorId);
      if (!label) return;
      
      // Project 3D position to screen coordinates
      const vector = marker.position.clone();
      vector.project(this.camera);
      
      const x = (vector.x * 0.5 + 0.5) * this.renderer.domElement.clientWidth;
      const y = (vector.y * -0.5 + 0.5) * this.renderer.domElement.clientHeight;
      
      // Check if marker is behind camera or outside view
      const isVisible = vector.z < 1 && x >= 0 && x <= this.renderer.domElement.clientWidth &&
                       y >= 0 && y <= this.renderer.domElement.clientHeight;
      
      if (isVisible) {
        label.style.display = 'block';
        label.style.left = x + 'px';
        label.style.top = y + 'px';
      } else {
        label.style.display = 'none';
      }
    });
  }
  
  animate() {
    if (!this.isEnabled) return;
    
    // Update pulse animations
    this.sensorMarkers.forEach((marker) => {
      const pulseRing = marker.getObjectByName('pulse');
      if (pulseRing && pulseRing.visible) {
        pulseRing.rotation.z += 0.02;
        
        // Pulse effect
        const time = Date.now() * 0.003;
        const scale = 1 + Math.sin(time) * 0.1;
        pulseRing.scale.set(scale, 1, scale);
        
        // Fade effect
        pulseRing.material.opacity = 0.5 + Math.sin(time * 2) * 0.3;
      }
    });
    
    this.updateLabelPositions();
  }
  
  // Public methods for controlling overlay
  setEnabled(enabled) {
    this.isEnabled = enabled;
    this.overlayGroup.visible = enabled;
    
    // Hide/show labels
    this.sensorLabels.forEach(label => {
      label.style.display = enabled && this.showLabels ? 'block' : 'none';
    });
  }
  
  setLabelsVisible(visible) {
    this.showLabels = visible;
    this.sensorLabels.forEach(label => {
      label.style.display = visible && this.isEnabled ? 'block' : 'none';
    });
  }
  
  setAlertsVisible(visible) {
    this.showAlerts = visible;
    this.sensorMarkers.forEach(marker => {
      const alertRing = marker.getObjectByName('alert');
      if (alertRing && !visible) {
        alertRing.visible = false;
      }
    });
  }
  
  getSensorAtPosition(intersections) {
    for (const intersection of intersections) {
      let object = intersection.object;
      
      // Traverse up to find sensor group
      while (object && object.parent) {
        if (object.name && object.name.startsWith('Sensor_')) {
          const sensorId = object.name.replace('Sensor_', '');
          return sensorId;
        }
        object = object.parent;
      }
    }
    return null;
  }
  
  highlightSensor(sensorId, highlight = true) {
    const marker = this.sensorMarkers.get(sensorId);
    if (!marker) return;
    
    const markerMesh = marker.getObjectByName('marker');
    if (highlight) {
      markerMesh.scale.set(1.5, 1.5, 1.5);
    } else {
      markerMesh.scale.set(1, 1, 1);
    }
  }
  
  dispose() {
    // Clean up
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    
    // Remove HTML labels
    this.sensorLabels.forEach(label => {
      document.body.removeChild(label);
    });
    
    // Remove 3D objects
    this.scene.remove(this.overlayGroup);
    
    // Dispose geometries and materials
    Object.values(this.geometries).forEach(geometry => geometry.dispose());
    Object.values(this.materials).forEach(material => material.dispose());
  }
}

export default SensorOverlayRenderer;