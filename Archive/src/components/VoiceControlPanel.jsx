import React, { useState, useEffect } from 'react';
import voiceCommandService from '../services/voiceCommandService';
import { screenLog } from '../utils/screenLogger.js';

const VoiceControlPanel = () => {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [lastAction, setLastAction] = useState('');
  const [locations, setLocations] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    if (!isSupported) return;
    
    screenLog('🎤 VoiceControlPanel mounted');
    setLocations(voiceCommandService.getLocationsList());

    const unsubscribe = voiceCommandService.subscribe((type, data) => {
      if (type === 'status') setIsListening(data === 'listening');
      if (type === 'command') {
        setLastCommand(data);
        setTranscript(data);
      }
      if (type === 'action') setLastAction(data);
      if (type === 'locationsUpdated') setLocations(data);
    });

    return unsubscribe;
  }, []);

  const toggleListening = () => {
    if (isListening) {
      voiceCommandService.stopListening();
    } else {
      voiceCommandService.startListening();
    }
  };

  const handleSaveLocation = (e) => {
    e.preventDefault();
    if (newLocationName.trim()) {
      voiceCommandService.saveLocation(newLocationName);
      setNewLocationName('');
      setShowSaveDialog(false);
    }
  };

  const handleNavigate = (loc) => {
    if (window.viewer3D) {
      window.viewer3D.setCameraState(loc.state);
    }
  };

  const handleDelete = (name) => {
    if (confirm(`Delete location "${name}"?`)) {
      voiceCommandService.deleteLocation(name);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="glass-panel" style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      padding: '15px',
      borderRadius: 'var(--radius-lg)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      width: '250px',
      transition: 'all 0.3s ease',
      border: isListening ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
      boxShadow: isListening ? '0 0 20px rgba(59, 130, 246, 0.3)' : '0 10px 30px rgba(0,0,0,0.3)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: '5px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '14px',
          color: 'var(--text-main)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🎙️ Voice Control
        </h3>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isListening ? 'var(--success)' : 'var(--danger)',
          boxShadow: isListening ? '0 0 10px var(--success)' : 'none'
        }} />
      </div>

      <button
        onClick={toggleListening}
        className="btn-modern"
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: isListening ? 'var(--danger)' : 'var(--primary)',
          color: 'white',
          fontSize: '24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          boxShadow: isListening ? '0 0 20px rgba(239, 68, 68, 0.4)' : '0 4px 15px rgba(59, 130, 246, 0.3)'
        }}
      >
        {isListening ? '⏹️' : '🎤'}
      </button>

      <div style={{
        fontSize: '12px',
        color: 'var(--text-muted)',
        textAlign: 'center',
        minHeight: '20px'
      }}>
        {isListening ? 'Listening...' : 'Click to start'}
      </div>

      {transcript && (
        <div style={{
          padding: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '12px',
          color: 'var(--text-main)',
          width: '100%',
          textAlign: 'center',
          border: '1px solid var(--border-glass)'
        }}>
          "{transcript}"
        </div>
      )}

      <div style={{
        marginTop: '5px',
        width: '100%'
      }}>
        <div style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          marginBottom: '5px',
          fontWeight: 'bold'
        }}>
          Try saying:
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '5px'
        }}>
          {['Show sensors', 'Hide sensors', 'Reset view', 'Show temperature'].map((cmd, i) => (
            <span key={i} style={{
              fontSize: '10px',
              padding: '3px 8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '10px',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-glass)'
            }}>
              {cmd}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VoiceControlPanel;
