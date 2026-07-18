import React, { useEffect, useRef, useState } from 'react';
import voiceCommandService from '../services/voiceCommandService';

const Viewer3D = () => {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedModels, setLoadedModels] = useState([]); // keys: relPath under models/, e.g. "Sahibabad/xxx.frag"
  const [selectedObject, setSelectedObject] = useState(null);
  const [currentViewMode, setCurrentViewMode] = useState('perspective');
  const [stations, setStations] = useState(["Sahibabad"]);
  const [currentStation, setCurrentStation] = useState("Sahibabad");
  const [availableModels, setAvailableModels] = useState([]); // from station manifest
  const [modelsLoading, setModelsLoading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [compactView, setCompactView] = useState(true);
  
  // Voice & Location State
  const [locations, setLocations] = useState([]);
  const [newLocationName, setNewLocationName] = useState('');
  const [isListening, setIsListening] = useState(false);

  // Initialize Voice Service
  useEffect(() => {
    setLocations(voiceCommandService.getLocationsList());
    
    const unsubscribe = voiceCommandService.subscribe((type, data) => {
      if (type === 'locationsUpdated') setLocations(data);
      if (type === 'status') setIsListening(data === 'listening');
    });
    
    return unsubscribe;
  }, []);

  const handleSaveLocation = () => {
    if (newLocationName.trim()) {
      voiceCommandService.saveLocation(newLocationName);
      setNewLocationName('');
    }
  };

  const handleDeleteLocation = (name) => {
    if (confirm(`Delete location "${name}"?`)) {
      voiceCommandService.deleteLocation(name);
    }
  };

  const handleGoToLocation = (loc) => {
    if (window.viewer3D && window.viewer3D.setCameraState) {
      window.viewer3D.setCameraState(loc.state);
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      voiceCommandService.stopListening();
    } else {
      voiceCommandService.startListening();
    }
  };

  // Try to load stations list if provided (optional enhancement)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Optional: a central stations file, if present
        const resp = await fetch('models/stations.json');
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled && Array.isArray(data?.stations) && data.stations.length) {
            setStations(data.stations);
            if (!data.stations.includes(currentStation)) {
              setCurrentStation(data.stations[0]);
            }
          }
        }
      } catch {
        // ignore, default to ["Sahibabad"]
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load manifest for the selected station
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setModelsLoading(true);
      try {
        const url = `models/${currentStation}/models-manifest.json`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Failed to fetch manifest for ${currentStation}`);
        const manifest = await resp.json();
        const models = Array.isArray(manifest?.models) ? manifest.models : [];
        // Normalize to use relPath under models/
        const normalized = models.map(m => {
          const path = typeof m.path === 'string' ? m.path : '';
          const rel = path.replace(/^models\//, '');
          return {
            id: m.id || rel,
            name: m.description || m.id || m.name || rel,
            file: (m.name || '').replace(/\.frag$/i, '') || '',
            relPath: rel, // e.g. "Sahibabad/xxx.frag"
            fileName: (m.name || rel.split('/').pop() || ''),
            description: m.description || '',
          };
        });
        if (!cancelled) {
          setAvailableModels(normalized);
          // Clear UI loaded state when station changes
          setLoadedModels([]);
          
            // Auto-load models when manifest is loaded
          if (normalized.length > 0) {
             console.log('🔄 Auto-loading models from manifest...');
             // Use a small timeout to ensure state is updated
             setTimeout(() => {
               // Check if we are still mounted and viewer is ready
               if (window.viewer3D && window.viewer3D.world) {
                 normalized.forEach(model => {
                   loadModel(model.relPath);
                 });
               }
             }, 1000); // Increased timeout to ensure viewer is fully ready
          }
        }
      } catch (err) {
        console.error('Error loading station manifest:', err);
        if (!cancelled) setAvailableModels([]);
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentStation]);

  useEffect(() => {
    // Wait for the 3D viewer to be initialized from main.js
    let attempts = 0;
    const checkForViewer = () => {
      if (window.viewer3D && window.viewer3D.attachToContainer) {
        setIsLoading(false);
        
        // Hide the old BIM controls - we'll use our own
        window.viewer3D.showBIMControls(false);
        
        // Attach the 3D container to our React component by id
        if (containerRef.current) {
          try {
            console.log('🔌 Viewer3D: Attaching container to viewer3d-container...');
            // Pass the ref directly to avoid ID conflicts or lookup failures
            window.viewer3D.attachToContainer(containerRef.current);
            
            // Force pointer events on the wrapper
            containerRef.current.style.pointerEvents = 'auto';
            
            // Force initial size after attach
            const el = containerRef.current;
            const resizeNow = () => {
              if (!el || !window.viewer3D || !window.viewer3D.world) return;
              const rect = el.getBoundingClientRect();
              console.log(`📏 Viewer3D: Resize ${rect.width}x${rect.height}`);
              if (rect.width > 0 && rect.height > 0) {
                window.viewer3D.world.renderer.three.setSize(rect.width, rect.height);
                window.viewer3D.camera.aspect = rect.width / rect.height;
                window.viewer3D.camera.updateProjectionMatrix();
              }
            };
            // Run a couple of times to beat layout timing
            resizeNow();
            requestAnimationFrame(resizeNow);
            setTimeout(resizeNow, 100);
            setTimeout(resizeNow, 500); // Extra resize
            
            // Force a render
            if (window.viewer3D.world) {
               window.viewer3D.world.renderer.update();
               window.viewer3D.world.camera.update();
               
               // Reset camera if it's way off
               const camPos = window.viewer3D.world.camera.three.position;
               if (camPos.length() < 1 || camPos.length() > 1000) {
                  console.log("📷 Resetting camera position on attach");
                  window.viewer3D.world.camera.controls.setLookAt(20, 20, 20, 0, 0, 0);
               }
            }
            
            // Sync loaded models state from global viewer
            if (window.loadedModels && window.loadedModels.size > 0) {
               const loaded = Array.from(window.loadedModels.keys());
               console.log('🔄 Syncing loaded models from global state:', loaded);
               setLoadedModels(loaded);
            }
            
            // Auto-load models if none are loaded
            if ((!window.loadedModels || window.loadedModels.size === 0) && availableModels.length > 0) {
               console.log('🔄 Auto-loading models for Admin view...');
               availableModels.forEach(model => {
                 loadModel(model.relPath);
               });
            }
          } catch (e) {
            // Fallback: manual append if needed
            const existingContainer = containerRef.current.querySelector('#container');
            if (!existingContainer) {
              const container = document.getElementById('container');
              if (container) {
                containerRef.current.appendChild(container);
              }
            }
          }
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

        if (containerRef.current) {
          resizeObserver.observe(containerRef.current);
        }

        return () => {
          resizeObserver.disconnect();
          // Detach viewer to preserve it
          if (window.viewer3D && window.viewer3D.detachFromContainer) {
             window.viewer3D.detachFromContainer();
          }
        };
      } else {
        // Retry after a short delay
        attempts++;
        if (attempts > 50) { // 5 seconds timeout
             console.error("Viewer3D: Timed out waiting for window.viewer3D");
             setIsLoading(false); // Force show UI anyway so we can see errors
        } else {
             setTimeout(checkForViewer, 100);
        }
      }
    };

    checkForViewer();
  }, []);

  const loadModel = async (relPath) => {
    console.log('🔄 loadModel called with relPath:', relPath);
    console.log('📋 Current loadedModels:', loadedModels);
    
    if (loadedModels.includes(relPath)) {
      console.log('⚠️ Model already loaded, skipping:', modelId);
      return;
    }
    
    try {
      const model = availableModels.find(m => m.relPath === relPath);
      console.log('🔍 Found model:', model);
      
      if (model) {
        console.log('🌐 Checking window.loadFragmentModel:', typeof window.loadFragmentModel);
        console.log('🌐 Checking window.viewer3D:', typeof window.viewer3D);
        
        if (window.loadFragmentModel) {
          // Pass path relative to models/ so main.js prefixes correctly
          const pathUnderModels = model.relPath; // e.g. "Sahibabad/xxx.frag"
          console.log('📂 Loading fragment model:', pathUnderModels);
          await window.loadFragmentModel(pathUnderModels);
          console.log('✅ Model loaded successfully:', relPath);
          setLoadedModels(prev => {
            const newModels = [...prev, relPath];
            console.log('📝 Updated loadedModels:', newModels);
            return newModels;
          });
        } else {
          console.error('❌ window.loadFragmentModel is not available');
          console.log('🔍 Available window properties:', Object.keys(window).filter(key => key.includes('load') || key.includes('viewer') || key.includes('fragment')));
        }
      } else {
        console.error('❌ Model not found in availableModels:', relPath);
      }
    } catch (error) {
      console.error(`❌ Error loading model ${relPath}:`, error);
    }
  };

  const unloadModel = async (relPath) => {
    console.log('🗑️ unloadModel called with relPath:', relPath);
    console.log('📋 Current loadedModels:', loadedModels);
    
    if (!loadedModels.includes(relPath)) {
      console.log('⚠️ Model not loaded, skipping unload:', relPath);
      return;
    }
    
    try {
      const model = availableModels.find(m => m.relPath === relPath);
      console.log('🔍 Found model for unload:', model);
      
      if (model) {
        console.log('🌐 Checking window.unloadFragmentModel:', typeof window.unloadFragmentModel);
        
        if (window.unloadFragmentModel) {
          console.log('🗂️ Unloading fragment model:', model.relPath);
          await window.unloadFragmentModel(model.relPath);
          console.log('✅ Model unloaded successfully:', relPath);
          setLoadedModels(prev => {
            const newModels = prev.filter(p => p !== relPath);
            console.log('📝 Updated loadedModels after unload:', newModels);
            return newModels;
          });
        } else {
          console.error('❌ window.unloadFragmentModel is not available');
        }
      }
    } catch (error) {
      console.error(`❌ Error unloading model ${relPath}:`, error);
    }
  };

  const resetCamera = async () => {
    if (window.viewer3D && window.viewer3D.world) {
      await window.viewer3D.world.camera.controls.setLookAt(20, 20, 20, 0, 0, 0);
    }
  };

  const changeViewMode = async (mode) => {
    if (!window.viewer3D || !window.viewer3D.world) return;
    
    const camera = window.viewer3D.world.camera.controls;
    switch (mode) {
      case 'top':
        await camera.setLookAt(0, 50, 0, 0, 0, 0);
        break;
      case 'front':
        await camera.setLookAt(0, 0, 50, 0, 0, 0);
        break;
      case 'iso':
        await camera.setLookAt(20, 20, 20, 0, 0, 0);
        break;
    }
    setCurrentViewMode(mode);
  };

  const handleReloadViewer = () => {
    console.log("♻️ Reloading viewer...");
    if (window.viewer3D && containerRef.current) {
      // Detach first to be clean
      if (window.viewer3D.detachFromContainer) {
        window.viewer3D.detachFromContainer();
      }
      
      // Small delay to allow detach to finish
      setTimeout(() => {
        if (window.viewer3D.attachToContainer) {
          window.viewer3D.attachToContainer(containerRef.current);
          
          // Force updates
          if (window.viewer3D.world) {
             window.viewer3D.world.renderer.update();
             window.viewer3D.world.camera.update();
             
             // Ensure grid is visible
             if (window.createSceneHelpers) { // If we exposed this
                // We didn't expose createSceneHelpers globally in main.js, but attachToContainer calls it.
             }
          }
        }
      }, 100);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏗️</div>
          <div style={{ fontSize: '18px', color: '#6c757d' }}>Loading 3D Viewer...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* 3D Viewer Controls Header */}
      <div style={{
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '8px 8px 0 0',
        borderBottom: '1px solid #e9ecef',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3 style={{ margin: 0, color: '#495057' }}>🏗️ 3D BIM Viewer</h3>
          <div style={{ fontSize: '12px', color: '#6c757d' }}>
            {loadedModels.length} of {availableModels.length} models loaded
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* View Controls */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => changeViewMode('iso')}
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                backgroundColor: currentViewMode === 'iso' ? '#007bff' : '#f8f9fa',
                color: currentViewMode === 'iso' ? 'white' : '#495057',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Isometric
            </button>
            <button
              onClick={() => changeViewMode('top')}
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                backgroundColor: currentViewMode === 'top' ? '#007bff' : '#f8f9fa',
                color: currentViewMode === 'top' ? 'white' : '#495057',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Top
            </button>
            <button
              onClick={() => changeViewMode('front')}
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                backgroundColor: currentViewMode === 'front' ? '#007bff' : '#f8f9fa',
                color: currentViewMode === 'front' ? 'white' : '#495057',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Front
            </button>
          </div>

          <button
            onClick={resetCamera}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Reset Camera
          </button>

          <button
            onClick={() => {
              console.log('🔄 Force render button clicked');
              if (window.forceRender) {
                window.forceRender();
              }
            }}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🎬 Force Render
          </button>

          <button
            onClick={() => {
              console.log('🎯 Fit models button clicked');
              if (window.fitModelsToView) {
                window.fitModelsToView();
              }
            }}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              backgroundColor: '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🎯 Fit to View
          </button>

          <button
            onClick={handleReloadViewer}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              backgroundColor: '#6610f2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Reload Viewer
          </button>

          <button
            onClick={() => {
              if (window.viewer3D && window.viewer3D.diagnose) {
                window.viewer3D.diagnose();
              } else {
                console.log("Diagnostics not available");
              }
            }}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              backgroundColor: '#fd7e14',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔍 Diagnose
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', backgroundColor: '#f8f9fa' }}>
        
        {/* 3D Viewer */}
        <div 
          ref={containerRef}
          id="viewer3d-container"
          style={{ 
            flex: 1,
            position: 'relative',
            backgroundColor: '#202932',
            overflow: 'hidden',
            pointerEvents: 'auto'
          }}
        >
          {/* The 3D viewer canvas will be inserted here */}
          
          {/* 3D Viewer Instructions Overlay */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '12px',
            pointerEvents: 'none'
          }}>
            <div>🖱️ <strong>Left Click:</strong> Rotate</div>
            <div>🖱️ <strong>Right Click:</strong> Pan</div>
            <div>🖱️ <strong>Scroll:</strong> Zoom</div>
            <div>🖱️ <strong>Double Click:</strong> Select Object</div>
          </div>

          {/* Selected Object Info */}
          {selectedObject && (
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '12px',
              borderRadius: '6px',
              maxWidth: '300px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                📋 Selected Object
              </div>
              <div style={{ fontSize: '12px' }}>
                {selectedObject}
              </div>
              <button
                onClick={() => setSelectedObject(null)}
                style={{
                  marginTop: '8px',
                  padding: '4px 8px',
                  fontSize: '10px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>

        {/* Models Panel */}
        <div style={{
          width: '320px',
          backgroundColor: 'white',
          borderLeft: '1px solid #e9ecef',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 10
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa'
          }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#495057' }}>📁 Model Management</h4>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: '#6c757d' }}>Station</label>
              <select
                value={currentStation}
                onChange={async (e) => {
                  const nextStation = e.target.value;
                  // Unload everything currently loaded before switching
                  for (const relPath of [...loadedModels]) {
                    try { await unloadModel(relPath); } catch {}
                  }
                  setLoadedModels([]);
                  setCurrentStation(nextStation);
                }}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: '12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  marginTop: '4px'
                }}
              >
                {stations.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  console.log('🔄 Load All clicked - loading all station models');
                  availableModels.forEach(model => {
                    console.log('📂 Loading model:', model.relPath);
                    loadModel(model.relPath);
                  });
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '11px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Load All
              </button>
              <button
                onClick={() => {
                  console.log('🗑️ Unload All clicked - unloading all models');
                  loadedModels.forEach(relPath => {
                    console.log('🗂️ Unloading model:', relPath);
                    unloadModel(relPath);
                  });
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '11px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Unload All
              </button>
            </div>
            {/* List tools: filter + compact toggle */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter models..."
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  fontSize: '12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px'
                }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6c757d' }}>
                <input
                  type="checkbox"
                  checked={compactView}
                  onChange={(e) => setCompactView(e.target.checked)}
                />
                Compact
              </label>
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
            {modelsLoading && (
              <div style={{ fontSize: '12px', color: '#6c757d', padding: '8px' }}>Loading models for {currentStation}…</div>
            )}
            {!modelsLoading && availableModels
              .filter(m =>
                !filterText?.trim() ||
                m.name?.toLowerCase().includes(filterText.toLowerCase()) ||
                m.fileName?.toLowerCase().includes(filterText.toLowerCase())
              )
              .map(model => {
              const isLoaded = loadedModels.includes(model.relPath);
              return (
                <div
                  key={model.relPath}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: compactView ? 'auto 1fr auto' : 'auto 1fr auto',
                    alignItems: 'center',
                    gap: compactView ? '8px' : '12px',
                    padding: compactView ? '6px 8px' : '10px 12px',
                    marginBottom: compactView ? '6px' : '10px',
                    border: `1px solid ${isLoaded ? '#b7e2c1' : '#e9ecef'}`,
                    borderRadius: '6px',
                    backgroundColor: 'white'
                  }}
                >
                  {/* status dot */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      title={isLoaded ? 'Loaded' : 'Not loaded'}
                      style={{
                        display: 'inline-block',
                        width: compactView ? '8px' : '10px',
                        height: compactView ? '8px' : '10px',
                        borderRadius: '50%',
                        backgroundColor: isLoaded ? '#28a745' : '#adb5bd'
                      }}
                    />
                  </div>

                  {/* text block */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600,
                      fontSize: compactView ? '12px' : '13px',
                      color: '#495057',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {model.name || model.fileName}
                    </div>
                    <div style={{
                      fontSize: compactView ? '10px' : '11px',
                      color: '#6c757d',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {model.fileName}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      console.log(`🎯 Individual button clicked for model: ${model.relPath}, isLoaded: ${isLoaded}`);
                      if (isLoaded) {
                        console.log(`🗑️ Unloading individual model: ${model.relPath}`);
                        unloadModel(model.relPath);
                      } else {
                        console.log(`📂 Loading individual model: ${model.relPath}`);
                        loadModel(model.relPath);
                      }
                    }}
                    style={{
                      padding: compactView ? '2px 8px' : '4px 10px',
                      fontSize: compactView ? '10px' : '11px',
                      backgroundColor: isLoaded ? '#dc3545' : '#0d6efd',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {isLoaded ? 'Unload' : 'Load'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Saved Locations & Voice Control Section */}
          <div style={{
            padding: '16px',
            borderTop: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, color: '#495057' }}>📍 Saved Locations</h4>
              <button
                onClick={toggleVoice}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  backgroundColor: isListening ? '#dc3545' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {isListening ? '🔴 Stop Voice' : '🎤 Start Voice'}
              </button>
            </div>

            {/* Add Location */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="text"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="Location name..."
                onKeyDown={(e) => e.key === 'Enter' && handleSaveLocation()}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  fontSize: '12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px'
                }}
              />
              <button
                onClick={handleSaveLocation}
                disabled={!newLocationName.trim()}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  opacity: newLocationName.trim() ? 1 : 0.6
                }}
              >
                Save
              </button>
            </div>

            {/* Locations List */}
            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
              {locations.length === 0 ? (
                <div style={{ fontSize: '11px', color: '#adb5bd', textAlign: 'center', padding: '8px' }}>
                  No saved locations
                </div>
              ) : (
                locations.map(loc => (
                  <div key={loc.name} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    marginBottom: '4px',
                    backgroundColor: 'white',
                    border: '1px solid #e9ecef',
                    borderRadius: '4px'
                  }}>
                    <span style={{ fontSize: '12px', color: '#495057' }}>{loc.name}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleGoToLocation(loc)}
                        style={{
                          padding: '2px 6px',
                          fontSize: '10px',
                          backgroundColor: '#0d6efd',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        Go
                      </button>
                      <button
                        onClick={() => handleDeleteLocation(loc.name)}
                        style={{
                          padding: '2px 6px',
                          fontSize: '10px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Viewer3D;