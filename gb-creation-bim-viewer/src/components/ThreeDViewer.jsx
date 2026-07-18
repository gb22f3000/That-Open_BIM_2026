import React, { useRef, useEffect } from 'react';
import SensorOverlayRenderer from './SensorOverlayRenderer.js';
import { screenLog, screenSuccess, screenError } from '../utils/screenLogger.js';

/**
 * 3D Viewer Component for use in Admin Dashboard tabs
 */
const ThreeDViewer = ({ isActive = false }) => {
  const viewer3DRef = useRef(null);
  const sensorOverlayRef = useRef(null);

  screenLog(`ThreeDViewer: Component mounted/updated. isActive=${isActive}`);

  useEffect(() => {
    screenLog(`ThreeDViewer: useEffect triggered. isActive=${isActive}`);
    if (!isActive) {
      screenLog('ThreeDViewer: Not active, skipping initialization');
      return;
    }

    screenLog('ThreeDViewer: Starting checkForViewer loop...');
    // Wait for the 3D viewer to be initialized from main.js
    const checkForViewer = () => {
      const hasViewer = !!(window.viewer3D && window.viewer3D.scene && window.viewer3D.camera);
      screenLog(`ThreeDViewer: Checking for viewer... found=${hasViewer}`);
      
      if (hasViewer) {
        screenSuccess('ThreeDViewer: Viewer found! Initializing...');
        // Attach the 3D container to our React component
        if (window.viewer3D.attachToContainer) {
          screenLog('ThreeDViewer: Attaching to viewer3d-container...');
          window.viewer3D.attachToContainer('viewer3d-container');
          screenSuccess('ThreeDViewer: Container attached');
        }

        // Auto-load first available model if none loaded
        const tryAutoLoad = async () => {
          screenLog('ThreeDViewer: tryAutoLoad called');
          screenLog(`  - window.loadFragmentModel: ${typeof window.loadFragmentModel}`);
          screenLog(`  - window.availableModels: ${window.availableModels?.length || 0} models`);
          screenLog(`  - window.loadedModels: ${window.loadedModels?.size || 0} loaded`);
          
          if (window.loadFragmentModel && window.availableModels && window.availableModels.length > 0) {
            // Check if any models are already loaded
            const hasLoadedModels = window.loadedModels && window.loadedModels.size > 0;
            if (hasLoadedModels) {
              screenSuccess('ThreeDViewer: Models already loaded, skipping auto-load');
              return;
            }
            
            const firstModel = window.availableModels[0];
            screenLog(`ThreeDViewer: Auto-loading first model: ${firstModel}`);
            try {
              const success = await window.loadFragmentModel(firstModel);
              screenLog(`ThreeDViewer: Load result: ${success}`);
              if (success && window.fitModelsToView) {
                setTimeout(() => {
                  screenLog('ThreeDViewer: Fitting view to loaded model');
                  window.fitModelsToView();
                  screenSuccess('ThreeDViewer: View fitted');
                }, 800);
              }
            } catch (error) {
              screenError(`ThreeDViewer: Auto-load failed: ${error.message}`);
              console.error('Auto-load error:', error);
            }
          } else {
            screenError('ThreeDViewer: Cannot auto-load - missing dependencies');
          }
        };
        
        screenLog('ThreeDViewer: Scheduling auto-load attempts...');
        setTimeout(tryAutoLoad, 500);
        // Retry after 2 seconds if first attempt had issues
        setTimeout(tryAutoLoad, 2000);

        // Initialize sensor overlay system (disabled for now)
        /*
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
        */

        // Setup resize observer for 3D viewer
        screenLog('ThreeDViewer: Setting up resize observer...');
        const resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (window.viewer3D && window.viewer3D.world && width > 0 && height > 0) {
              window.viewer3D.world.renderer.three.setSize(width, height);
              window.viewer3D.camera.aspect = width / height;
              window.viewer3D.camera.updateProjectionMatrix();
              screenLog(`ThreeDViewer: Resized to ${width}x${height}`);
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
  }, [isActive]);

  // Show/hide BIM controls based on active state
  useEffect(() => {
    screenLog(`ThreeDViewer: BIM controls visibility effect. isActive=${isActive}`);
    if (window.viewer3D && window.viewer3D.showBIMControls) {
      screenLog(`ThreeDViewer: Calling showBIMControls(${isActive})`);
      window.viewer3D.showBIMControls(isActive);
      screenSuccess(`ThreeDViewer: BIM controls ${isActive ? 'shown' : 'hidden'}`);
    } else {
      screenError('ThreeDViewer: window.viewer3D.showBIMControls not available');
    }
    
    // Also show/hide toggle button
    const toggleButton = document.querySelector('.phone-menu-toggler');
    screenLog(`ThreeDViewer: Toggle button found: ${!!toggleButton}`);
    if (toggleButton) {
      if (isActive) {
        toggleButton.classList.add('phone-menu-toggler-visible');
        screenLog('ThreeDViewer: Toggle button shown');
      } else {
        toggleButton.classList.remove('phone-menu-toggler-visible');
        screenLog('ThreeDViewer: Toggle button hidden');
      }
    }
  }, [isActive]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div 
        ref={viewer3DRef}
        id="viewer3d-container"
        style={{ 
          width: '100%',
          height: '100%',
          position: 'relative',
          display: isActive ? 'block' : 'none'
        }}
      >
        {/* 3D viewer canvas will be inserted here by main.js */}
      </div>
      
      {!isActive && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          backgroundColor: '#f8f9fa',
          color: '#6c757d',
          fontSize: '16px'
        }}>
          🏗️ 3D Viewer will load when this tab is active
        </div>
      )}
    </div>
  );
};

export default ThreeDViewer;