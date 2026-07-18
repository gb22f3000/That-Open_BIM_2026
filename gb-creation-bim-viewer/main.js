import * as FRAGS from "@thatopen/fragments";
import * as THREE from "three";
import Stats from "stats.js";
import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { screenLog, screenError, screenSuccess } from "./src/utils/screenLogger.js";

screenLog("🚀 main.js starting execution...");

// 🖼️ Getting or creating the container so the renderer always mounts somewhere
function ensureContainer() {
  screenLog("📦 ensureContainer called");
  let el = document.getElementById("container");
  if (!el) {
    el = document.createElement("div");
    el.id = "container";
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.position = "relative";
    el.style.flex = "1";
    el.style.minHeight = "0";
    // Disable pointer events by default so it doesn't block UI when not in use
    el.style.pointerEvents = "none";
    // Always start under <body>; React may later move it
    document.body.appendChild(el);
    screenLog("📦 Created new container");
  } else {
    // If it's not under <body>, move it there to avoid hidden parents
    if (el.parentElement !== document.body) {
      document.body.appendChild(el);
      screenLog("📦 Moved container to body");
    }
    // Normalize styles for flex layout
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.position = "relative";
    el.style.flex = "1";
    el.style.minHeight = "0";
    // Disable pointer events by default
    el.style.pointerEvents = "auto"; 
    el.style.zIndex = "1"; 
  }
  
  // Watch for style changes and enforce pointer-events: none if in body
  // DISABLED OBSERVER
  /*
  const observer = new MutationObserver((mutations) => {
    if (el.parentElement === document.body && el.style.pointerEvents !== 'none') {
      el.style.pointerEvents = 'none';
      el.style.zIndex = '-1';
    }
  });
  observer.observe(el, { attributes: true, attributeFilter: ['style'] });
  */
  
  return el;
}
const container = ensureContainer();

// 🚀 Creating a components instance
screenLog("🔧 Initializing OBC Components...");
const components = new OBC.Components();

// 🌎 Setting up the world
const worlds = components.get(OBC.Worlds);

const world = worlds.create();
screenLog("🌍 World created");

// Initialize the world components
world.scene = new OBC.SimpleScene(components);
world.renderer = new OBC.SimpleRenderer(components, container);
world.camera = new OBC.SimpleCamera(components);

// Initialize the components
components.init();
screenLog("✅ Components initialized");

// Set up the scene with default lighting
world.scene.setup();

// Make background transparent for better integration
world.scene.three.background = null;

// Add a grid and axes helpers so something is always visible in the viewport
const createSceneHelpers = () => {
  // Remove existing helpers if any (to avoid duplicates)
  const existingGrid = world.scene.three.children.find(c => c instanceof THREE.GridHelper);
  if (existingGrid) world.scene.three.remove(existingGrid);
  
  const existingAxes = world.scene.three.children.find(c => c instanceof THREE.AxesHelper);
  if (existingAxes) world.scene.three.remove(existingAxes);

  // Create new grid
  const grid = new THREE.GridHelper(200, 100, 0x888888, 0x444444);
  // Make grid visible but subtle
  const m = grid.material;
  if (Array.isArray(m)) {
    m.forEach((mat) => { mat.transparent = true; mat.opacity = 0.5; });
  } else if (m) {
    m.transparent = true; m.opacity = 0.5;
  }
  world.scene.three.add(grid);

  const axes = new THREE.AxesHelper(5);
  world.scene.three.add(axes);
  
  console.log("✅ Scene helpers (Grid/Axes) recreated");
};

createSceneHelpers();

// 💄 Adding fragments to our scene
// Initialize fragments manager globally
const fragments = components.get(OBC.FragmentsManager);

async function setupFragments() {
  try {
    // Initialize fragments manager with worker
    const githubUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
    const fetchedUrl = await fetch(githubUrl);
    const workerBlob = await fetchedUrl.blob();
    const workerFile = new File([workerBlob], "worker.mjs", {
      type: "text/javascript",
    });
    const workerUrl = URL.createObjectURL(workerFile);
    fragments.init(workerUrl);

    // Update fragments when camera stops moving
    world.camera.controls.addEventListener("rest", () =>
      fragments.core.update(true),
    );

    // Add models to scene when loaded
    fragments.list.onItemSet.add(({ value: model }) => {
      // Ensure model doesn't block raycasting for camera controls
      if (model.object) {
        world.scene.three.add(model.object);
        
        // Ensure camera controls are still enabled
        if (world.camera && world.camera.controls) {
          world.camera.controls.enabled = true;
          // Re-bind controls to the canvas to ensure they keep working
          const canvas = world.renderer.three.domElement;
          if (canvas) {
             world.camera.controls.domElement = canvas;
          }
        }
      }
      fragments.core.update(true);
    });

    // Initialize fragments system (don't auto-load models)
    console.log("Fragments system initialized. Use the Model Management panel to load specific models.");

  } catch (error) {
    console.error("Error setting up fragments:", error);
  }
  
  // Position camera for initial view
  await world.camera.controls.setLookAt(20, 20, 20, 0, 0, 0);
  
  console.log("Fragments system ready. Load models using the Model Management panel.");
}

// ✨ Setting up Raycasters
const casters = components.get(OBC.Raycasters);
// Each raycaster is associated with a specific world.
// Here, we retrieve the raycaster for the `world` used in our scene.
const caster = casters.get(world);

// Variables for raycasting functionality
let onSelectCallback = (_modelIdMap) => {};
let onItemSelected = () => {};
let attributes;

// Color for highlighting selected objects
const highlightColor = new THREE.Color("purple");

// Model management
const availableModels = [
  "Sahibabad/NCRTC-DM009-AYE-SAHI-STN-M3-AR-00121.frag",
  "Sahibabad/NCRTC-DM009-AYE-SAHI-STN-M3-EL-00121.frag",
  "Sahibabad/NCRTC-DM009-AYE-SAHI-STN-M3-PI-00121.frag", 
  "Sahibabad/NCRTC-DM009-AYE-SAHI-STN-M3-ST-00121.frag",
  "Sahibabad/NCRTC-DM009-AYE-SAHI-STN-M3-ST-00122.frag",
  "Sahibabad/NCRTC-DM009-AYE-SAHI-STN-M3-ST-00124.frag"
];

// Expose to window for React components
window.availableModels = availableModels;

const loadedModels = new Map(); // Track loaded models: filename -> modelId

// Expose to window for checking loaded state
window.loadedModels = loadedModels;

// Function to load a specific fragment model
async function loadFragmentModel(fileName) {
  if (loadedModels.has(fileName)) {
    console.log(`Model ${fileName} is already loaded`);
    return false;
  }

  try {
    const path = `./models/${fileName}`;
    const modelId = fileName.split("/").pop().split(".").shift();
    
    console.log(`🔄 Loading model: ${fileName}`);
    console.log(`   Path: ${path}`);
    console.log(`   Model ID: ${modelId}`);
    
    const file = await fetch(path);
    if (!file.ok) {
      throw new Error(`HTTP ${file.status}: ${file.statusText}`);
    }
    
    const buffer = await file.arrayBuffer();
    console.log(`   Buffer size: ${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB`);
    
    const loadedModel = await fragments.core.load(buffer, { modelId });
    
    if (loadedModel) {
      loadedModels.set(fileName, modelId);
      await fragments.core.update(true);
      
      console.log(`✅ Successfully loaded: ${fileName}`);
      console.log(`   Total models loaded: ${loadedModels.size}`);
      
      // Auto-fit camera to show loaded content
      if (loadedModels.size === 1) {
        // First model loaded, position camera appropriately
        await world.camera.controls.setLookAt(50, 30, 50, 0, 0, 0);
      }
      
      updateModelsList();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error loading ${fileName}:`, error);
    return false;
  }
}

// Function to unload a specific fragment model
async function unloadFragmentModel(fileName) {
  const modelId = loadedModels.get(fileName);
  if (!modelId) {
    console.log(`Model ${fileName} is not loaded`);
    return false;
  }

  try {
    const model = fragments.list.get(modelId);
    if (model) {
      // Remove from scene
      world.scene.three.remove(model.object);
      // Remove from fragments manager
      fragments.list.delete(modelId);
      // Clear any highlights
      await fragments.resetHighlight();
    }
    
    loadedModels.delete(fileName);
    await fragments.core.update(true);
    console.log(`Successfully unloaded: ${fileName}`);
    updateModelsList();
    return true;
  } catch (error) {
    console.error(`Error unloading ${fileName}:`, error);
    return false;
  }
}

// Function to update the models list in UI
function updateModelsList() {
  const modelsList = document.getElementById('models-list');
  if (!modelsList) return;

  modelsList.innerHTML = '';
  
  // Make sure we're using the full list from window.availableModels
  const modelsToShow = window.availableModels || availableModels;
  
  modelsToShow.forEach(fileName => {
    const isLoaded = loadedModels.has(fileName);
    const base = fileName.split('/').pop();
    const displayName = base.replace('.frag', '').replace('NCRTC-DM009-AYE-SAHI-STN-M3-', '');
    
    const modelItem = document.createElement('div');
    modelItem.className = 'model-item';
    
    const statusIndicator = document.createElement('div');
    statusIndicator.style.cssText = `
      width: 8px; 
      height: 8px; 
      border-radius: 50%;
    `;
    statusIndicator.className = isLoaded ? 'model-status-loaded' : 'model-status-unloaded';
    
    const label = document.createElement('bim-label');
    label.textContent = displayName;
    label.style.flex = '1';
    
    const button = document.createElement('bim-button');
    button.setAttribute('label', isLoaded ? 'Unload' : 'Load');
    button.setAttribute('size', 'small');
    if (isLoaded) {
      button.setAttribute('variant', 'danger');
    }
    
    button.addEventListener('click', async (e) => {
      e.target.loading = true;
      if (isLoaded) {
        await unloadFragmentModel(fileName);
      } else {
        await loadFragmentModel(fileName);
      }
      e.target.loading = false;
    });
    
    modelItem.appendChild(statusIndicator);
    modelItem.appendChild(label);
    modelItem.appendChild(button);
    modelsList.appendChild(modelItem);
  });
}

// Set up double-click event for raycasting
container.addEventListener("dblclick", async () => {
  const result = await caster.castRay();
  if (!result) return;
  
  console.log("Raycast result:", result);
  
  // Handle fragment objects
  if (result.fragments && result.localId !== undefined) {
    // The modelIdMap is how selections are represented in the engine.
    // The keys are modelIds, while the values are sets of localIds (items within the model)
    const modelIdMap = { [result.fragments.modelId]: new Set([result.localId]) };
    
    // Get comprehensive fragment model data
    const modelId = Object.keys(modelIdMap)[0];
    if (modelId && fragments.list.get(modelId)) {
      const model = fragments.list.get(modelId);
      try {
        const localIds = [...modelIdMap[modelId]];
        const [data] = await model.getItemsData(localIds);
        
        // Add additional information
        const enhancedData = {
          ...data,
          ModelId: { value: modelId },
          LocalId: { value: localIds[0] },
          FileName: { value: [...loadedModels.entries()].find(([k, v]) => v === modelId)?.[0] || 'Unknown' },
          ObjectType: { value: data.ObjectType?.value || data.type || 'BIM Element' },
          SelectionInfo: {
            value: {
              fragmentId: result.fragments.id,
              geometryId: result.geometryId,
              instanceId: result.instanceId
            }
          }
        };
        
        attributes = enhancedData;
        console.log('Object metadata:', enhancedData);
      } catch (error) {
        console.warn("Could not get item data:", error);
        attributes = { 
          Name: { value: "Fragment Element" }, 
          Type: { value: "BIM Object" },
          ModelId: { value: modelId },
          Error: { value: error.message }
        };
      }
    }

    // Highlight the selected fragment
    await fragments.highlight(
      {
        color: highlightColor,
        renderedFaces: FRAGS.RenderedFaces.ONE,
        opacity: 1,
        transparent: false,
      },
      modelIdMap,
    );
    
    await fragments.core.update(true);
    onItemSelected();
  }
  // Handle basic Three.js objects (like our fallback cube)
  else if (result.object) {
    // Change the color of the selected object
    if (result.object.material) {
      result.object.material.color.copy(highlightColor);
    }
    
    // Store comprehensive info about the selected object
    const obj = result.object;
    attributes = {
      Name: { value: obj.name || "Unnamed Object" },
      Type: { value: obj.type },
      UUID: { value: obj.uuid },
      Position: { 
        value: `X: ${obj.position.x.toFixed(4)}, Y: ${obj.position.y.toFixed(4)}, Z: ${obj.position.z.toFixed(4)}` 
      },
      Rotation: { 
        value: `X: ${obj.rotation.x.toFixed(4)}, Y: ${obj.rotation.y.toFixed(4)}, Z: ${obj.rotation.z.toFixed(4)}` 
      },
      Scale: { 
        value: `X: ${obj.scale.x.toFixed(4)}, Y: ${obj.scale.y.toFixed(4)}, Z: ${obj.scale.z.toFixed(4)}` 
      },
      Visible: { value: obj.visible },
      CastShadow: { value: obj.castShadow },
      ReceiveShadow: { value: obj.receiveShadow }
    };
    
    // Add material information if available
    if (obj.material) {
      attributes.Material = {
        value: {
          type: obj.material.type,
          color: obj.material.color ? `#${obj.material.color.getHexString()}` : 'N/A',
          opacity: obj.material.opacity || 1,
          transparent: obj.material.transparent || false
        }
      };
    }
    
    // Add geometry information if available
    if (obj.geometry) {
      attributes.Geometry = {
        value: {
          type: obj.geometry.type,
          vertices: obj.geometry.attributes?.position?.count || 'N/A',
          faces: obj.geometry.index ? obj.geometry.index.count / 3 : 'N/A'
        }
      };
    }
    
    onItemSelected();
  }
});

// Function to display detailed metadata
function displayMetadata(objectData) {
  const metadataPanel = document.getElementById('metadata-panel');
  const metadataContent = document.getElementById('metadata-content');
  
  if (!metadataPanel || !metadataContent) return;
  
  if (!objectData) {
    metadataPanel.style.display = 'none';
    return;
  }
  
  metadataPanel.style.display = 'block';
  
  let html = '<div style="padding: 8px; background: rgba(0,0,0,0.05); border-radius: 4px;">';
  
  // Helper function to format property values
  function formatValue(value) {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object' && value.value !== undefined) return value.value;
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'number') return value.toFixed(4);
    return String(value);
  }
  
  // Helper function to get property type
  function getPropertyType(value) {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object' && value.value !== undefined) return typeof value.value;
    return typeof value;
  }
  
  // Sort properties for better display
  const sortedKeys = Object.keys(objectData).sort();
  
  sortedKeys.forEach(key => {
    const value = objectData[key];
    const formattedValue = formatValue(value);
    const propertyType = getPropertyType(value);
    
    html += `
      <div style="margin-bottom: 8px; padding: 4px; border-left: 3px solid #2196F3;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: #1976D2; font-size: 11px;">${key}</strong>
          <span style="background: #E3F2FD; padding: 2px 6px; border-radius: 2px; font-size: 10px; color: #1565C0;">${propertyType}</span>
        </div>
        <div style="margin-top: 4px; word-break: break-all; font-family: monospace; background: #F5F5F5; padding: 4px; border-radius: 2px;">
          ${formattedValue}
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  metadataContent.innerHTML = html;
}

// Function to export metadata to JSON file
function exportMetadata() {
  if (!attributes) {
    alert('No object selected to export metadata');
    return;
  }
  
  const dataStr = JSON.stringify(attributes, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `object-metadata-${Date.now()}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
  
  console.log('Metadata exported to:', exportFileDefaultName);
}

// Function to copy metadata to clipboard
async function copyMetadataToClipboard(e) {
  if (!attributes) {
    alert('No object selected to copy metadata');
    return;
  }
  
  try {
    const formattedData = JSON.stringify(attributes, null, 2);
    await navigator.clipboard.writeText(formattedData);
    
    // Show temporary success message
    const button = e?.currentTarget || e?.target;
    const originalLabel = button.getAttribute('label');
    button.setAttribute('label', 'Copied!');
    setTimeout(() => {
      button.setAttribute('label', originalLabel);
    }, 2000);
    
    console.log('Metadata copied to clipboard');
  } catch (err) {
    console.error('Failed to copy metadata:', err);
    alert('Failed to copy metadata to clipboard');
  }
}

// 🧩 Adding UI
BUI.Manager.init();

// Create the LEFT control panel (Camera & Models)
const panelLeft = BUI.Component.create(() => {
  return BUI.html`
    <bim-panel label="Camera & Models" class="bim-controls-left">
      <bim-panel-section label="Camera Controls">
        <bim-button 
          label="🔄 Reset Camera"
          @click="${async () => {
            await world.camera.controls.setLookAt(20, 20, 20, 0, 0, 0);
          }}">
        </bim-button>
        
        <bim-button 
          label="⬆️ Top View"
          @click="${async () => {
            await world.camera.controls.setLookAt(0, 50, 0, 0, 0, 0);
          }}">
        </bim-button>
        
        <bim-button 
          label="➡️ Front View"
          @click="${async () => {
            await world.camera.controls.setLookAt(0, 0, 50, 0, 0, 0);  
          }}">
        </bim-button>
        
        <bim-button 
          label="🎯 Fit All Models"
          @click="${async () => {
            if (loadedModels.size > 0) {
              await world.camera.controls.setLookAt(100, 50, 100, 0, 0, 0);
            } else {
              await world.camera.controls.setLookAt(20, 20, 20, 0, 0, 0);
            }
          }}">
        </bim-button>
      </bim-panel-section>

      <bim-panel-section label="Model Management">
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <bim-button 
            label="✅ Load All" 
            @click="${async ({ target }) => {
              target.loading = true;
              for (const fileName of availableModels) {
                if (!loadedModels.has(fileName)) {
                  await loadFragmentModel(fileName);
                }
              }
              target.loading = false;
            }}">
          </bim-button>
          <bim-button 
            label="❌ Unload All" 
            @click="${async ({ target }) => {
              target.loading = true;
              for (const fileName of [...loadedModels.keys()]) {
                await unloadFragmentModel(fileName);
              }
              target.loading = false;
            }}">
          </bim-button>
        </div>
        <div id="models-list" style="max-height: 400px; overflow-y: auto;">
          <!-- Models list will be populated here -->
        </div>
      </bim-panel-section>

      <bim-panel-section label="Scene Controls">
        <bim-color-input 
          label="Background Color" color="#202932" 
          @input="${({ target }) => {
            world.scene.config.backgroundColor = new THREE.Color(target.color);
          }}">
        </bim-color-input>
        
        <bim-number-input 
          slider step="0.1" label="Directional Light" value="1.5" min="0.1" max="10"
          @change="${({ target }) => {
            world.scene.config.directionalLight.intensity = target.value;
          }}">
        </bim-number-input>
        
        <bim-number-input 
          slider step="0.1" label="Ambient Light" value="1" min="0.1" max="5"
          @change="${({ target }) => {
            world.scene.config.ambientLight.intensity = target.value;
          }}">
        </bim-number-input>
      </bim-panel-section>
    </bim-panel>
  `;
});

// Create the RIGHT control panel (Voice & Debug)
const panelRight = BUI.Component.create(() => {
  return BUI.html`
    <bim-panel label="Voice & Debug" class="bim-controls-right">
      <bim-panel-section label="Voice Navigation">
        <div style="margin-bottom: 12px; padding: 12px; background: #f0f9ff; border-radius: 6px; border: 1px solid #bae6fd;">
          <bim-button 
            id="voice-toggle-btn"
            label="🎤 Start Listening"
            style="width: 100%; margin-bottom: 8px;">
          </bim-button>
          <div id="voice-status" style="font-size: 11px; color: #0369a1; text-align: center; margin-top: 8px; font-weight: 600;">
            Status: Ready
          </div>
          <div id="voice-transcript" style="font-size: 10px; color: #64748b; text-align: center; margin-top: 4px; min-height: 16px; font-style: italic;">
          </div>
        </div>
        
        <div style="margin-top: 12px; padding: 10px; background: #fef3c7; border-radius: 6px; border: 1px solid #fde047;">
          <div style="font-weight: 600; color: #854d0e; margin-bottom: 8px; font-size: 12px;">📍 Save Current View</div>
          <div style="display: flex; gap: 6px;">
            <input 
              type="text" 
              id="location-name-input" 
              placeholder="Enter location name..."
              style="flex: 1; padding: 6px 8px; border: 1px solid #fbbf24; border-radius: 4px; font-size: 11px; background: white; color: #0f172a;"/>
            <bim-button 
              id="save-location-btn"
              label="💾 Save"
              style="min-width: 60px;">
            </bim-button>
          </div>
        </div>
        
        <div style="margin-top: 12px;">
          <div style="font-weight: 600; color: #0f172a; margin-bottom: 8px; font-size: 12px;">📌 Saved Locations</div>
          <div id="saved-locations-list" style="max-height: 200px; overflow-y: auto;">
            <div style="font-size: 11px; color: #64748b; padding: 8px; text-align: center; font-style: italic;">No saved locations yet</div>
          </div>
        </div>
        
        <div style="font-size: 10px; color: #475569; margin-top: 12px; padding: 8px; background: #f8fafc; border-radius: 4px; border: 1px solid #e2e8f0;">
          💡 <strong>Usage:</strong><br/>
          1. Navigate to a view<br/>
          2. Save it with a name<br/>
          3. Say the name to return<br/>
          Example: "platform", "entrance"
        </div>
      </bim-panel-section>

      <bim-panel-section label="Debug Info">
        <div id="debug-info" style="font-size: 10px; font-family: monospace; color: #475569; padding: 8px; background: #f8f9fa; border-radius: 4px; max-height: 250px; overflow-y: auto; line-height: 1.5;">
          Initializing...
        </div>
        <bim-button 
          id="refresh-debug-btn"
          label="🔄 Refresh"
          style="width: 100%; margin-top: 8px;">
        </bim-button>
      </bim-panel-section>
    </bim-panel>
  `;
});

document.body.append(panelLeft);
document.body.append(panelRight);

// Initialize the models list
setTimeout(() => {
  updateModelsList();
  
  // Setup voice control button event listener
  const voiceBtn = document.getElementById('voice-toggle-btn');
  const voiceStatus = document.getElementById('voice-status');
  const voiceTranscript = document.getElementById('voice-transcript');
  
  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      console.log('🎤 Voice button clicked');
      if (window.voiceCommandService) {
        try {
          if (window.voiceCommandService.isListening) {
            window.voiceCommandService.stopListening();
            voiceBtn.setAttribute('label', '🎤 Start Listening');
            if (voiceStatus) voiceStatus.textContent = 'Status: Ready';
            console.log('✅ Voice listening stopped');
          } else {
            window.voiceCommandService.startListening();
            voiceBtn.setAttribute('label', '🔴 Listening...');
            if (voiceStatus) voiceStatus.textContent = 'Status: Listening...';
            if (voiceTranscript) voiceTranscript.textContent = 'Speak now...';
            console.log('✅ Voice listening started');
          }
        } catch (error) {
          console.error('❌ Voice control error:', error);
          if (voiceStatus) voiceStatus.textContent = 'Status: Error - ' + error.message;
        }
      } else {
        console.error('❌ voiceCommandService not available');
        if (voiceStatus) voiceStatus.textContent = 'Status: Service not available';
      }
    });
    console.log('✅ Voice button listener attached');
  } else {
    console.error('❌ Voice button not found');
  }
  
  // Subscribe to voice service events
  if (window.voiceCommandService) {
    window.voiceCommandService.subscribe((type, data) => {
      if (type === 'command') {
        if (voiceTranscript) voiceTranscript.textContent = `"${data}"`;
        // Auto-stop after command (service already does this via continuous=false)
        setTimeout(() => {
          if (voiceBtn) voiceBtn.setAttribute('label', '🎤 Start Listening');
          if (voiceStatus) voiceStatus.textContent = 'Status: Command processed';
          setTimeout(() => {
            if (voiceStatus) voiceStatus.textContent = 'Status: Ready';
            if (voiceTranscript) voiceTranscript.textContent = '';
          }, 2000);
        }, 100);
      } else if (type === 'action') {
        if (voiceStatus) voiceStatus.textContent = `Status: ${data}`;
      } else if (type === 'locationsUpdated') {
        updateSavedLocationsList();
      }
    });
  }
  
  // Save location button
  const saveLocationBtn = document.getElementById('save-location-btn');
  const locationNameInput = document.getElementById('location-name-input');
  
  if (saveLocationBtn && locationNameInput) {
    saveLocationBtn.addEventListener('click', () => {
      const name = locationNameInput.value.trim();
      if (name && window.voiceCommandService) {
        const success = window.voiceCommandService.saveLocation(name);
        if (success) {
          console.log(`✅ Saved location: ${name}`);
          locationNameInput.value = '';
          updateSavedLocationsList();
          if (voiceStatus) {
            voiceStatus.textContent = `Saved: ${name}`;
            setTimeout(() => {
              if (voiceStatus) voiceStatus.textContent = 'Status: Ready';
            }, 2000);
          }
        } else {
          console.error('❌ Failed to save location');
        }
      }
    });
    
    // Allow Enter key to save
    locationNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        saveLocationBtn.click();
      }
    });
  }
  
  // Function to update saved locations list
  function updateSavedLocationsList() {
    const listDiv = document.getElementById('saved-locations-list');
    if (!listDiv || !window.voiceCommandService) return;
    
    const locations = window.voiceCommandService.getLocationsList();
    
    if (locations.length === 0) {
      listDiv.innerHTML = '<div style="font-size: 11px; color: #64748b; padding: 8px; text-align: center; font-style: italic;">No saved locations yet</div>';
      return;
    }
    
    listDiv.innerHTML = locations.map(loc => `
      <div style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; margin-bottom: 4px; background: white; border-radius: 4px; border: 1px solid #e2e8f0;">
        <span style="flex: 1; font-size: 11px; color: #0f172a; font-weight: 500;">📍 ${loc.name}</span>
        <button 
          class="goto-location-btn"
          data-location="${loc.name.toLowerCase()}"
          style="padding: 4px 8px; background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; border-radius: 3px; font-size: 10px; cursor: pointer; font-weight: 600;"
          title="Go to this location">
          Go
        </button>
        <button 
          class="delete-location-btn"
          data-location="${loc.name}"
          style="padding: 4px 8px; background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; border-radius: 3px; font-size: 10px; cursor: pointer; font-weight: 600;"
          title="Delete this location">
          ✕
        </button>
      </div>
    `).join('');
    
    // Attach event listeners to goto buttons
    listDiv.querySelectorAll('.goto-location-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const locationKey = btn.getAttribute('data-location');
        if (window.voiceCommandService) {
          window.voiceCommandService.processCommand(locationKey);
        }
      });
    });
    
    // Attach event listeners to delete buttons
    listDiv.querySelectorAll('.delete-location-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const locationName = btn.getAttribute('data-location');
        if (confirm(`Delete location "${locationName}"?`)) {
          if (window.voiceCommandService) {
            window.voiceCommandService.deleteLocation(locationName);
            updateSavedLocationsList();
            console.log(`🗑️ Deleted location: ${locationName}`);
          }
        }
      });
    });
  }
  
  // Initial load of saved locations
  updateSavedLocationsList();
  
  // Setup debug panel
  const updateDebugInfo = () => {
    const debugDiv = document.getElementById('debug-info');
    if (debugDiv) {
      const info = [];
      info.push('=== System Status ===');
      info.push(`viewer3D: ${!!window.viewer3D}`);
      info.push(`loadFragmentModel: ${typeof window.loadFragmentModel}`);
      info.push(`voiceCommandService: ${!!window.voiceCommandService}`);
      info.push('');
      info.push('=== Models ===');
      info.push(`Available: ${window.availableModels?.length || 0}`);
      info.push(`Loaded: ${window.loadedModels?.size || 0}`);
      if (window.loadedModels && window.loadedModels.size > 0) {
        info.push('Loaded models:');
        window.loadedModels.forEach((modelId, fileName) => {
          info.push(`  • ${fileName.split('/').pop()}`);
        });
      }
      info.push('');
      info.push('=== Camera ===');
      if (window.viewer3D && window.viewer3D.getCameraState) {
        const state = window.viewer3D.getCameraState();
        if (state && state.position) {
          info.push(`Position: (${state.position.x.toFixed(1)}, ${state.position.y.toFixed(1)}, ${state.position.z.toFixed(1)})`);
        }
      }
      info.push('');
      info.push(`Updated: ${new Date().toLocaleTimeString()}`);
      debugDiv.textContent = info.join('\n');
    }
  };
  
  updateDebugInfo();
  setInterval(updateDebugInfo, 2000);
  
  const refreshBtn = document.getElementById('refresh-debug-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', updateDebugInfo);
  }
  
}, 100);

// Mobile menu toggle button (hamburger menu)
const button = BUI.Component.create(() => {
  return BUI.html`
      <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
        @click="${() => {
          if (panel.classList.contains("options-menu-visible")) {
            panel.classList.remove("options-menu-visible");
          } else {
            panel.classList.add("options-menu-visible");
          }
        }}">
      </bim-button>
    `;
});

// Hide button by default
button.style.display = 'none';
document.body.append(button);

// ⏱️ Performance monitoring
const stats = new Stats();
stats.showPanel(2);
stats.dom.style.left = "0px";
stats.dom.style.zIndex = "unset";
stats.dom.style.display = "none"; // Hide by default
document.body.append(stats.dom);
world.renderer.onBeforeUpdate.add(() => stats.begin());
world.renderer.onAfterUpdate.add(() => stats.end());

// Initialize the fragments
setupFragments();

// Cleanup function
window.addEventListener('beforeunload', () => {
  // Minimal cleanup to avoid hanging the browser
  try {
    if (window.viewer3D) {
      window.viewer3D = null;
    }
  } catch (e) {
    // ignore
  }
});

// Export for debugging and React integration
window.world = world;
window.components = components;
window.fragments = fragments;

// Export fragment loading functions for React integration
window.loadFragmentModel = loadFragmentModel;
window.unloadFragmentModel = unloadFragmentModel;

// Export utility functions for debugging
window.forceRender = function() {
  console.log('🔄 Force rendering update...');
  fragments.core.update(true);
  world.renderer.three.render(world.scene.three, world.camera.three);
  console.log('🎬 Scene children:', world.scene.three.children.length);
  console.log('📋 Loaded models:', Array.from(loadedModels.keys()));
};

window.fitModelsToView = async function() {
  console.log('🎯 Fitting all models to view...');
  try {
    const box = new THREE.Box3();
    let hasModels = false;
    
    fragments.list.forEach((model) => {
      if (model.object) {
        const modelBox = new THREE.Box3().setFromObject(model.object);
        box.union(modelBox);
        hasModels = true;
        console.log('📦 Model bounds added:', modelBox);
      }
    });
    
    if (hasModels && !box.isEmpty()) {
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const distance = Math.max(size.x, size.y, size.z) * 1.5;
      
      console.log('📐 Calculated bounds - Center:', center, 'Size:', size);
      await world.camera.controls.setLookAt(
        center.x + distance, 
        center.y + distance, 
        center.z + distance,
        center.x, 
        center.y, 
        center.z
      );
      console.log('✅ Camera positioned to fit models');
    } else {
      console.log('⚠️ No models found or bounds are empty');
    }
  } catch (error) {
    console.error('❌ Error fitting models:', error);
  }
};

// Create global viewer3D object for React integration
screenLog("🌐 Exposing window.viewer3D...");
window.viewer3D = {
  scene: world.scene.three,
  camera: world.camera.three,
  renderer: world.renderer.three,
  world: world,
  components: components,
  fragments: fragments,
  animationCallbacks: [],
  eventListeners: new Map(),
  
  // Add event listener method
  addEventListener: function(eventType, callback) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType).add(callback);
  },

  // Get current camera position and target
  getCameraState: function() {
    try {
      const controls = world.camera.controls;
      const position = new THREE.Vector3();
      const target = new THREE.Vector3();
      
      controls.getPosition(position);
      controls.getTarget(target);
      
      return {
        position: { x: position.x, y: position.y, z: position.z },
        target: { x: target.x, y: target.y, z: target.z }
      };
    } catch (e) {
      console.error("Error getting camera state:", e);
      return null;
    }
  },

  // Move camera to specific state
  setCameraState: async function(state) {
    try {
      if (!state || !state.position || !state.target) return;
      const { position, target } = state;
      await world.camera.controls.setLookAt(
        position.x, position.y, position.z,
        target.x, target.y, target.z,
        true // animate
      );
    } catch (e) {
      console.error("Error setting camera state:", e);
    }
  },

  // Trigger event method
  triggerEvent: function(eventType, data) {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  },
  
  // Reinitialize container for React integration
  attachToContainer: function(targetElementOrId) {
    screenLog(`🔗 attachToContainer called`);
    let targetElement = targetElementOrId;
    if (typeof targetElementOrId === 'string') {
      targetElement = document.getElementById(targetElementOrId);
    }
    
    // Use the global container variable if getElementById fails (e.g. if removed from DOM)
    const existingContainer = document.getElementById("container") || container;
    
    if (targetElement && existingContainer) {
      // Move container to new parent
      targetElement.appendChild(existingContainer);
      screenLog("🔗 Container appended to target");
      
      // Ensure container uses flex layout properly
      existingContainer.style.position = "absolute"; 
      existingContainer.style.top = "0";
      existingContainer.style.left = "0";
      existingContainer.style.width = "100%";
      existingContainer.style.height = "100%";
      existingContainer.style.zIndex = "1";
      
      // CRITICAL: Force pointer events
      existingContainer.style.pointerEvents = "auto";
      
      // Also force canvas pointer events if it exists
      const canvas = existingContainer.querySelector('canvas');
      if (canvas) {
        canvas.style.pointerEvents = "auto";
        canvas.style.outline = "none";
        // Ensure canvas fills container
        canvas.style.width = "100%";
        canvas.style.height = "100%";
      }

      // Force controls to be enabled and updated
      if (world.camera && world.camera.controls) {
         world.camera.controls.enabled = true;
         // Ensure controls are bound to the correct element (canvas or container)
         // We prefer the canvas to ensure events are captured correctly
         if (canvas) {
            // If using CameraControls, it might need setElement
            // But for OrbitControls, domElement is a property
            world.camera.controls.domElement = canvas;
         } else {
            world.camera.controls.domElement = existingContainer;
         }
         world.camera.controls.update();
      }

      // Force immediate resize with proper dimensions, with fallback
      const resizeAttempts = [0, 16, 100, 300, 600, 1200];
      const resizeNow = (attempt) => {
        const rect = targetElement.getBoundingClientRect();
        let w = rect.width;
        let h = rect.height;
        // Fallback to client sizes if rect reports 0 (layout not settled yet)
        if (w === 0 || h === 0) {
          w = targetElement.clientWidth;
          h = targetElement.clientHeight;
        }
        if (w > 32 && h > 32) {
          world.renderer.three.setSize(w, h);
          world.camera.three.aspect = w / h;
          world.camera.three.updateProjectionMatrix();
          console.log(`🔧 Viewer resize attempt ${attempt} => ${w}x${h}`);
        } else {
          console.log(`⏳ Viewer size not ready (attempt ${attempt}) w:${w} h:${h}`);
        }
        
        // Re-force pointer events and controls binding on every resize attempt
        // This ensures that if something resets them, we put them back
        if (existingContainer) {
          existingContainer.style.pointerEvents = "auto";
          // Ensure absolute positioning is maintained
          existingContainer.style.position = "absolute";
          existingContainer.style.top = "0";
          existingContainer.style.left = "0";
          existingContainer.style.width = "100%";
          existingContainer.style.height = "100%";
          existingContainer.style.zIndex = "1";
        }
        
        const currentCanvas = existingContainer.querySelector('canvas');
        if (currentCanvas) {
          currentCanvas.style.pointerEvents = "auto";
          if (world.camera && world.camera.controls) {
             world.camera.controls.enabled = true;
             world.camera.controls.domElement = currentCanvas;
          }
        }
        
        // Ensure scene helpers are present
        createSceneHelpers();
      };
      resizeAttempts.forEach((delay, idx) => {
        if (delay === 0) resizeNow(idx);
        else setTimeout(() => resizeNow(idx), delay);
      });

      // Observe container resize to keep renderer in sync
      if (this._resizeObserver) {
        this._resizeObserver.disconnect();
      }
      
      this._resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === targetElement) {
            const cr = entry.contentRect;
            if (cr.width > 0 && cr.height > 0) {
              world.renderer.three.setSize(cr.width, cr.height);
              world.camera.three.aspect = cr.width / cr.height;
              world.camera.three.updateProjectionMatrix();
            }
          }
        }
      });
      this._resizeObserver.observe(targetElement);
    } else {
      console.error(`❌ attachToContainer failed: target=${targetElementOrId} found=${!!targetElement}, container=${!!existingContainer}`);
    }
  },

  // Detach container to preserve it when React component unmounts
  detachFromContainer: function() {
    screenLog("🔌 detachFromContainer called");
    const existingContainer = document.getElementById("container") || container;
    if (existingContainer) {
      // Move back to body to keep it alive
      document.body.appendChild(existingContainer);
      // Hide it and move out of the way
      existingContainer.style.position = "fixed";
      existingContainer.style.top = "0";
      existingContainer.style.left = "0";
      existingContainer.style.width = "1px";
      existingContainer.style.height = "1px";
      existingContainer.style.zIndex = "-1";
      existingContainer.style.pointerEvents = "none";
      screenLog("🔌 Container detached and moved to body");
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  },
  
  // Diagnostic function
  diagnose: function() {
    console.log("🔍 Viewer Diagnostics:");
    console.log("  Container:", document.getElementById("container"));
    console.log("  Canvas:", document.querySelector("canvas"));
    console.log("  Scene Children:", world.scene.three.children.length);
    console.log("  Camera Position:", world.camera.three.position);
    console.log("  Renderer Size:", world.renderer.three.getSize(new THREE.Vector2()));
    console.log("  Loaded Models:", loadedModels);
    console.log("  Fragments Initialized:", !!fragments);
  },
  
  // Show/hide BIM controls
  showBIMControls: function(show = true) {
    if (panelLeft) {
      if (show) {
        panelLeft.style.display = 'block';
      } else {
        panelLeft.style.display = 'none';
      }
    }
    if (panelRight) {
      if (show) {
        panelRight.style.display = 'block';
      } else {
        panelRight.style.display = 'none';
      }
    }
    if (button) {
      button.style.display = show ? 'block' : 'none';
    }
    if (stats && stats.dom) {
      stats.dom.style.display = show ? 'block' : 'none';
    }
  },
  
  // Toggle BIM panel visibility
  toggleBIMPanel: function() {
    if (panelLeft) {
      if (panelLeft.classList.contains("options-menu-visible")) {
        panelLeft.classList.remove("options-menu-visible");
      } else {
        panelLeft.classList.add("options-menu-visible");
      }
    }
    if (panelRight) {
      if (panelRight.classList.contains("options-menu-visible")) {
        panelRight.classList.remove("options-menu-visible");
      } else {
        panelRight.classList.add("options-menu-visible");
      }
    }
  }
};

// Try auto-attaching to the React viewport with retries (handles initial full refresh before React mounts)
(() => {
  const targetId = "viewer3d-container";
  let tries = 0;
  const maxTries = 50; // ~5s total
  const interval = 100; // ms
  const timer = setInterval(() => {
    tries++;
    const target = document.getElementById(targetId);
    // Only attach if the container is NOT already attached to the target
    const container = document.getElementById("container");
    const isAttached = container && container.parentElement === target;
    
    if (target && !isAttached && window.viewer3D && typeof window.viewer3D.attachToContainer === "function") {
      window.viewer3D.attachToContainer(targetId);
      clearInterval(timer);
    }
    if (tries >= maxTries) {
      clearInterval(timer);
    }
  }, interval);

  // Ensure timer stops on unload
  window.addEventListener('beforeunload', () => clearInterval(timer));
})();

// Modify the existing raycasting to trigger events for React
// DISABLED: This might be interfering with CameraControls
/*
const originalRaycastHandler = world.renderer.three.domElement.onpointerdown;
world.renderer.three.domElement.onpointerdown = function(event) {
  // Call original handler
  if (originalRaycastHandler) {
    originalRaycastHandler.call(this, event);
  }
  
  // Trigger event for React components
  const intersections = [];
  if (window.viewer3D) {
    window.viewer3D.triggerEvent('click', { event, intersections });
  }
};
*/

// Add animation callback system
const originalAnimationLoop = world.renderer.onBeforeUpdate;
world.renderer.onBeforeUpdate.add(() => {
  if (window.viewer3D && window.viewer3D.animationCallbacks) {
    window.viewer3D.animationCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Animation callback error:', error);
      }
    });
  }
});