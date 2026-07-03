/**
 * Voice Command Service
 * Handles speech recognition and camera navigation
 */

class VoiceCommandService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.listeners = new Set();
    this.savedLocations = this.loadLocations();
    
    this.initializeSpeechRecognition();
  }

  initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false; // Stop after one command
      this.recognition.lang = 'en-US';
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;

      this.recognition.onresult = (event) => {
        const command = event.results[0][0].transcript.toLowerCase().trim();
        console.log('🎤 Voice command received:', command);
        this.notifyListeners('command', command);
        this.processCommand(command);
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          this.isListening = false;
          this.notifyListeners('status', 'stopped');
        }
      };

      this.recognition.onerror = (event) => {
        console.error('🎤 Speech recognition error:', event.error);
        this.isListening = false;
        this.notifyListeners('error', event.error);
        this.notifyListeners('status', 'error');
      };
    } else {
      console.warn('⚠️ Speech recognition not supported in this browser');
    }
  }

  startListening() {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
        this.isListening = true;
        this.notifyListeners('status', 'listening');
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.notifyListeners('status', 'stopped');
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(type, data) {
    this.listeners.forEach(cb => cb(type, data));
  }

  // --- Location Management ---

  loadLocations() {
    try {
      const stored = localStorage.getItem('bmov_voice_locations');
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  }

  saveLocation(name) {
    if (!window.viewer3D) return false;
    
    const state = window.viewer3D.getCameraState();
    if (state) {
      const key = name.toLowerCase().trim();
      this.savedLocations[key] = {
        name: name, // Display name
        state: state
      };
      localStorage.setItem('bmov_voice_locations', JSON.stringify(this.savedLocations));
      this.notifyListeners('locationsUpdated', this.getLocationsList());
      return true;
    }
    return false;
  }

  deleteLocation(name) {
    const key = name.toLowerCase().trim();
    if (this.savedLocations[key]) {
      delete this.savedLocations[key];
      localStorage.setItem('bmov_voice_locations', JSON.stringify(this.savedLocations));
      this.notifyListeners('locationsUpdated', this.getLocationsList());
    }
  }

  getLocationsList() {
    return Object.values(this.savedLocations);
  }

  processCommand(command) {
    // Remove common prefixes
    const cleanCommand = command.replace(/^(go to|move to|show me|navigate to)\s+/, '');
    
    // Exact match check
    const location = this.savedLocations[cleanCommand];
    
    if (location) {
      console.log(`📍 Navigating to: ${location.name}`);
      if (window.viewer3D) {
        window.viewer3D.setCameraState(location.state);
        this.notifyListeners('action', `Navigated to ${location.name}`);
      }
    } else {
      // Fuzzy search or "not found"
      this.notifyListeners('action', `Location "${cleanCommand}" not found`);
    }
  }
}

const serviceInstance = new VoiceCommandService();

// Expose to window for BIM panel access
if (typeof window !== 'undefined') {
  window.voiceCommandService = serviceInstance;
}

export default serviceInstance;
