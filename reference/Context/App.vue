<script setup>
import { ref, onMounted, onUnmounted, provide, watch, nextTick, computed } from 'vue'
import ToolButton from './components/ToolButton.vue'
import SurveySettings from './components/SurveySettings.vue'
import WaypointList from './components/WaypointList.vue'
import ObjectPanel from './components/ObjectPanel.vue'
import MissionPrecheck from './components/MissionPrecheck.vue'
import { useMissionStore } from './store/missionStore'
import { useModeStore } from './store/modeStore'
import MissionWizard from './components/MissionWizard.vue'
import Header from './components/Header.vue'
import Viewer from './components/Viewer.vue'
import DiagnosticsPanel from './components/DiagnosticsPanel.vue'
import SceneLayerManager from './components/SceneLayerManager.vue'
import HardwareSelection from './components/HardwareSelection.vue'
import { logStartupEvent, trackError, trackWarning } from './utils/buildInfo'
import { useTheme } from 'vuetify'
import { ThreeMeshBvhDrawing } from './utils/ThreeMeshBvhDrawing'
import DrawingAssetManager from './components/DrawingAssetManager.vue'
import * as THREE from 'three'
import DroneControl from './components/DroneControl.vue'
import MainScene from './components/MainScene.vue'
import MissionSimulation from './components/MissionSimulation.vue'
import BuildScene from './components/BuildScene.vue'

// Initialize stores
const missionStore = useMissionStore()
const modeStore = useModeStore()
const theme = useTheme()

// Gecko UI Theme Selector
const currentTheme = ref(theme.global.name.value)
const themes = [
  { id: 'forecastTheme', name: 'Forecast', icon: 'mdi-monitor-dashboard' },
  { id: 'geckoBlack', name: 'Gecko Black', icon: 'mdi-weather-night' },
  { id: 'geckoDark', name: 'Gecko Dark Blue', icon: 'mdi-shield-half-full' },
  { id: 'geckoLight', name: 'Gecko Light', icon: 'mdi-weather-sunny' }
]

// Switch theme function
const switchTheme = (themeName) => {
  theme.global.name.value = themeName
  currentTheme.value = themeName
  console.log(`Theme switched to ${themeName}`)
}

// Computed class to add theme class to body
const themeClass = computed(() => {
  return `theme--${currentTheme.value}`
})

// State
const viewCanvas = ref(null)
const activeTool = ref('select')
const activeTab = ref('waypoints')
const isPanelOpen = ref(true)
const isInTakeoffSelection = ref(false)
const scene = ref(null)

// Control panel visibility - only show mission precheck
const showMissionPrecheck = ref(true)

// Panel state coordination
const missionPrecheckExpanded = ref(false)

// State for BuildScene panel
const buildSceneExpanded = ref(false)

// State for Hardware Selection panel
const hardwareSelectionExpanded = ref(false)

// Track if hardware has been selected
const hardwareSelected = computed(() => {
  return missionStore.hardware && missionStore.hardware.drone && 
         missionStore.hardware.drone !== ''
})

// Additional drawing tool state
const activeDrawingMode = ref('none') // none, 2d, 3d
const activeDrawingTool = ref('select') // select, line, polygon, spline, etc.

// Provide panel state to child components
provide('panelStates', {
  missionPrecheckExpanded,
  buildSceneExpanded,
  hardwareSelectionExpanded
})

// Tools configuration
const tools = ref([
  { id: 'select', label: 'Select', icon: 'mdi-cursor-default' },
  { id: 'waypoint', label: 'Add Waypoint', icon: 'mdi-map-marker-plus' },
  { id: 'edit', label: 'Edit', icon: 'mdi-pencil' },
  { id: 'delete', label: 'Delete', icon: 'mdi-delete' }
])

// Panel types
const PANEL_TYPES = {
  MISSION: 'mission',
  OBJECTS: 'objects'
}

// Active panel type
const activePanelType = ref(PANEL_TYPES.MISSION)

// Mission wizard state
const showMissionWizard = ref(false)

// Origin coordinates for the mission
const originCoordinates = ref({
  latitude: 37.7749,
  longitude: -122.4194,
  altitude: 0
})

// Application state
const initialCoordinates = ref({
  latitude: 47.6062,
  longitude: -122.3321,
  altitude: 0
});

// UI state
const showDiagnostics = ref(false);
const showDiagnosticsButton = ref(false);
const showTakeoffPrompt = ref(false);
const errorSnackbar = ref({
  show: false,
  text: '',
  color: 'error',
  timeout: 5000
});

// Event listeners for app-wide diagnostics
let errorEventListener = null;
let warningEventListener = null;

// Add components to the template
const layerManagerRef = ref(null);

// Add ref for diagnostics panel
const diagnosticsPanelRef = ref(null);

// Workflow steps
const WORKFLOW_STEPS = {
  PRECHECK: 'precheck',
  BUILD_SCENE: 'build_scene',
  HARDWARE_SELECTION: 'hardware_selection',
  SIMULATION: 'simulation',
  PLAN_MISSION: 'plan_mission',
  EXPORT: 'export'
};

// Current workflow step
const currentWorkflowStep = ref(WORKFLOW_STEPS.PRECHECK);

const viewerRef = ref(null)

// State variables for the drawing tool
const drawingUtils = ref(null);

// Methods
const setActiveTool = (toolId) => {
  activeTool.value = toolId
  
  // When clicking the object tool, switch to object panel
  if (toolId === 'object') {
    activePanelType.value = PANEL_TYPES.OBJECTS
  }
}

const selectWaypoint = (index) => {
  missionStore.selectWaypoint(index)
}

const updateWaypoint = ({ index, waypoint }) => {
  missionStore.updateWaypoint(index, waypoint)
}

const removeWaypoint = (index) => {
  missionStore.removeWaypoint(index)
}

// Handle ground click
const handleGroundClick = (event) => {
  console.log('Ground click detected! Event:', event);
  
  // Extract position from the event, handling both direct and detail formats
  let position;
  
  if (event.position) {
    // Direct event format from Viewer component
    position = event.position;
    console.log('Direct position format detected:', position);
  } else if (event.detail && event.detail.position) {
    // Event with detail structure from window event
    position = event.detail.position;
    console.log('Detail position format detected:', position);
  } else {
    console.error('Invalid ground click event format:', event);
    return;
  }
  
  console.log('Ground click at position:', position);
  
  if (isInTakeoffSelection.value) {
    console.log('In takeoff selection mode, setting takeoff location');
    
    // Store the takeoff location
    missionStore.setTakeoffLocation({
      lat: position.x,
      lng: position.z
    });
    
    // Log to verify takeoff location was set correctly
    console.log('Takeoff location after setting:', missionStore.takeoffLocation);
    console.log('Has takeoff location:', missionStore.hasTakeoffLocation);
    
    // Move drone to the selected take-off position
    missionStore.setDronePosition({
      x: position.x,
      y: 0, // Ground level
      z: position.z,
      followCamera: false
    });
    
    // Reset takeoff selection mode
    isInTakeoffSelection.value = false;
    activeTool.value = 'select';
    
    // Remove takeoff selection mode styling
    document.body.classList.remove('takeoff-selection-mode');
    
    // Show clear success confirmation
    showConfirmationNotification(
      `Take-off location set at position: X=${position.x.toFixed(1)}, Z=${position.z.toFixed(1)}`, 
      'success',
      5000
    );
    
    // Dispatch event to notify other components that takeoff location is set
    window.dispatchEvent(new CustomEvent('takeoff-location-set', {
      detail: { 
        position: { 
          x: position.x, 
          z: position.z 
        } 
      }
    }));
    
    console.log('Takeoff location set successfully');
  } else if (activeTool.value === 'waypoint') {
    console.log('In waypoint mode, adding waypoint');
    
    missionStore.addWaypoint({
      position: {
        lat: position.x,
        lng: position.z
      },
      height: 5 // Default height
    });
    
    console.log('Waypoint added at:', position);
  } else {
    console.log('Ground click detected but no action taken (not in takeoff selection or waypoint mode)');
  }
}

// Handle object click
const handleObjectClick = (event) => {
  console.log('Object click detected!', event);
}

const togglePanel = () => {
  isPanelOpen.value = !isPanelOpen.value
}

// Method to advance to next step
const advanceToStep = (step) => {
  currentWorkflowStep.value = step;
  
  // Maintain backward compatibility with store
  switch (step) {
    case WORKFLOW_STEPS.PRECHECK:
      missionStore.setWorkflowStep('setup');
      break;
    case WORKFLOW_STEPS.PLAN_MISSION:
      missionStore.setWorkflowStep('planning');
      break;
    case WORKFLOW_STEPS.SIMULATION:
      missionStore.setWorkflowStep('simulation');
      break;
    case WORKFLOW_STEPS.EXPORT:
      missionStore.setWorkflowStep('export');
      break;
    case WORKFLOW_STEPS.HARDWARE_SELECTION:
      missionStore.setWorkflowStep('hardware');
      break;
  }
  
  // Update UI based on step
  switch (step) {
    case WORKFLOW_STEPS.PRECHECK:
      missionPrecheckExpanded.value = true;
      buildSceneExpanded.value = false;
      hardwareSelectionExpanded.value = false;
      break;
    case WORKFLOW_STEPS.BUILD_SCENE:
      buildSceneExpanded.value = true;
      missionPrecheckExpanded.value = false;
      hardwareSelectionExpanded.value = false;
      break;
    case WORKFLOW_STEPS.HARDWARE_SELECTION:
      hardwareSelectionExpanded.value = true;
      missionPrecheckExpanded.value = false;
      buildSceneExpanded.value = false;
      break;
    case WORKFLOW_STEPS.PLAN_MISSION:
      missionPrecheckExpanded.value = true;
      buildSceneExpanded.value = false;
      hardwareSelectionExpanded.value = false;
      break;
    case WORKFLOW_STEPS.SIMULATION:
      // Don't open any panels automatically when entering simulation step
      missionPrecheckExpanded.value = false;
      buildSceneExpanded.value = false;
      hardwareSelectionExpanded.value = false;
      break;
    case WORKFLOW_STEPS.EXPORT:
      missionPrecheckExpanded.value = true;
      buildSceneExpanded.value = false;
      hardwareSelectionExpanded.value = false;
      break;
  }
};

// Update the handleMissionPrecheckCompleted function
const handleMissionPrecheckCompleted = () => {
  // Move to the build scene step
  advanceToStep(WORKFLOW_STEPS.BUILD_SCENE);
};

// Add a handler for when build scene is completed
const handleBuildSceneCompleted = () => {
  // Move to the hardware selection step
  advanceToStep(WORKFLOW_STEPS.HARDWARE_SELECTION);
};

// Toggle the build scene panel
const toggleBuildScene = () => {
  buildSceneExpanded.value = !buildSceneExpanded.value;
  
  // If closing, make sure to reset the workflow step
  if (!buildSceneExpanded.value) {
    if (currentWorkflowStep.value === WORKFLOW_STEPS.BUILD_SCENE) {
      currentWorkflowStep.value = null;
    }
  } else {
    // If opening, set the workflow step
    currentWorkflowStep.value = WORKFLOW_STEPS.BUILD_SCENE;
  }
};

// Add handler for when hardware selection is completed
const handleHardwareSelectionCompleted = () => {
  // Close all panels
  hardwareSelectionExpanded.value = false
  missionPrecheckExpanded.value = false
  buildSceneExpanded.value = false
  
  // Reset workflow step to null to prevent automatic panel opening
  currentWorkflowStep.value = null
  
  // Debug takeoff location
  console.log('Checking takeoff location after hardware selection:', missionStore.takeoffLocation);
  console.log('Has takeoff location?', missionStore.hasTakeoffLocation);
  
  // Check if takeoff location is set - prompt user if it isn't
  if (!missionStore.hasTakeoffLocation) {
    console.log('Hardware selected but no takeoff location set. Showing prompt.');
    showTakeoffPrompt.value = true;
  }
  
  // Don't automatically advance to simulation step
  // Instead, let the user click on step 4 to start the simulation
  console.log('Hardware selection completed - hardware configuration saved')
}

// Methods for coordinating panel states
const expandMissionPrecheck = () => {
  missionPrecheckExpanded.value = true;
  buildSceneExpanded.value = false;
  hardwareSelectionExpanded.value = false;
  
  // Also set the current workflow step
  currentWorkflowStep.value = WORKFLOW_STEPS.PRECHECK;
}

const expandBuildScene = () => {
  buildSceneExpanded.value = true;
  missionPrecheckExpanded.value = false;
  hardwareSelectionExpanded.value = false;
  
  // Also set the current workflow step
  currentWorkflowStep.value = WORKFLOW_STEPS.BUILD_SCENE;
}

const expandHardwareSelection = () => {
  hardwareSelectionExpanded.value = true;
  missionPrecheckExpanded.value = false;
  buildSceneExpanded.value = false;
  
  // Also set the current workflow step
  currentWorkflowStep.value = WORKFLOW_STEPS.HARDWARE_SELECTION;
}

const collapseBoth = () => {
  missionPrecheckExpanded.value = false;
  buildSceneExpanded.value = false;
  hardwareSelectionExpanded.value = false;
}

// Expose methods to child components
provide('panelControls', {
  expandMissionPrecheck,
  expandBuildScene,
  expandHardwareSelection,
  collapseBoth
})

// Update drawing tool initialization
const initializeDrawingTools = () => {
  console.log('Initializing drawing tools - checking prerequisites');
  
  // 1. Check if we have the correct scene and viewer
  if (!scene.value) {
    console.error('Cannot initialize drawing tools: No scene available');
    return false;
  }
  
  if (!viewerRef.value) {
    console.error('Cannot initialize drawing tools: No viewer reference available');
    return false;
  }
  
  // 2. Check if we already have initialized drawing tools - clean them up if needed
  if (drawingUtils.value) {
    console.log('Drawing tools already exist, disposing old instance first');
    try {
      drawingUtils.value.dispose();
    } catch (err) {
      console.warn('Error disposing old drawing tools:', err);
    }
    drawingUtils.value = null;
  }
  
  console.log('Getting camera and renderer from viewer');
  
  // 3. Get camera and renderer from Viewer
  const camera = viewerRef.value.getCamera();
  const renderer = viewerRef.value.getRenderer();
  
  if (!camera || !renderer) {
    console.error('Cannot initialize drawing tools: Missing camera or renderer from viewer');
    console.error('Camera:', camera, 'Renderer:', renderer);
    return false;
  }
  
  // 4. Create new drawing utility instance with current scene context
  try {
    console.log('Creating new ThreeMeshBvhDrawing instance with scene, camera, renderer');
    drawingUtils.value = new ThreeMeshBvhDrawing(scene.value, camera, renderer);
    
    // 5. Make sure the drawing tools have the DOM element directly
    if (renderer.domElement) {
      // Make sure the DOM reference is correct 
      drawingUtils.value.domElement = renderer.domElement;
      console.log('DOM element assigned directly from renderer', renderer.domElement);
    }
    
    // 6. Set active drawing mode and tool
    if (activeDrawingMode.value && activeDrawingMode.value !== 'none') {
      console.log(`Setting initial drawing mode to: ${activeDrawingMode.value}`);
      drawingUtils.value.setActiveMode(activeDrawingMode.value);
    }
    
    if (activeDrawingTool.value && activeDrawingTool.value !== 'select') {
      console.log(`Setting initial drawing tool to: ${activeDrawingTool.value}`);
      drawingUtils.value.setActiveTool(activeDrawingTool.value);
    }
    
    // 7. Listen for drawing-asset-created events
    window.addEventListener('drawing-asset-created', (event) => {
      if (event.detail) {
        console.log('Drawing asset created:', event.detail);
      }
    });
    
    // 8. Trigger the viewer into drawing mode if needed
    if (activeDrawingMode.value !== 'none' && viewerRef.value) {
      console.log('Setting viewer into drawing mode');
      viewerRef.value.isDrawing = true;
    }
    
    console.log('Drawing tools initialization successful!');
    return true;
  } catch (err) {
    console.error('Error initializing drawing tools:', err);
    return false;
  }
};

// Add a method to handle when the Viewer notifies us that drawing mode is activated
const onDrawingModeActivated = (event) => {
  console.log('Drawing mode activated in Viewer, App.vue handling:', event);
  
  if (!drawingUtils.value) {
    // Try to initialize drawing tools now
    nextTick(() => {
      initializeDrawingTools();
      
      // Apply mode and tool settings after initialization
      if (drawingUtils.value) {
        const mode = event.mode || '2d';
        const tool = event.tool || 'polygon';
        
        activeDrawingMode.value = mode;
        activeDrawingTool.value = tool;
        
        drawingUtils.value.setActiveMode(mode);
        drawingUtils.value.setActiveTool(tool);
        
        console.log(`Drawing tools set to mode: ${mode}, tool: ${tool}`);
      }
    });
  } else {
    // Just update the existing drawing utils
    const mode = event.mode || '2d';
    const tool = event.tool || 'polygon';
    
    activeDrawingMode.value = mode;
    activeDrawingTool.value = tool;
    
    drawingUtils.value.setActiveMode(mode);
    drawingUtils.value.setActiveTool(tool);
    
    console.log(`Drawing tools updated to mode: ${mode}, tool: ${tool}`);
  }
};

// Add method to handle when Build Scene tab is closed
const cleanupDrawingTools = () => {
  if (drawingUtils.value) {
    console.log('Cleaning up drawing tools');
    drawingUtils.value.dispose();
    drawingUtils.value = null;
  }
};

// Add method to apply the current drawing to the scene
const applyDrawing = () => {
  if (drawingUtils.value) {
    console.log('Applying current drawing');
    // Any additional logic to finalize the drawing
    // For example, storing the drawn objects in a persistent store
    
    // Optionally close the panel after applying
    // buildSceneExpanded.value = false;
  }
};

// Add method to clear all drawings
const clearAllDrawings = () => {
  if (drawingUtils.value) {
    console.log('Clearing all drawings');
    drawingUtils.value.clearAll();
  }
};

// Update the activeTool when changing drawing tools
watch(activeDrawingTool, (newTool) => {
  if (drawingUtils.value) {
    drawingUtils.value.setActiveTool(newTool);
    console.log('Drawing tool changed to:', newTool);
  }
});

// Update the drawing mode when tab changes
watch(activeDrawingMode, (newMode) => {
  if (drawingUtils.value) {
    drawingUtils.value.setActiveMode(newMode);
    console.log('Drawing mode changed to:', newMode);
  }
});

// Watch for scene changes to initialize drawing tools
watch(scene, (newScene) => {
  if (newScene && buildSceneExpanded.value) {
    initializeDrawingTools();
  }
});

// Watch for buildSceneExpanded changes
watch(buildSceneExpanded, (isExpanded) => {
  if (isExpanded && scene.value) {
    // Initialize drawing tools when panel is expanded
    initializeDrawingTools();
  }
});

// Update the onSceneReady function
const onSceneReady = (threeScene) => {
  console.log('Scene is ready in App.vue:', threeScene);
  
  // Store the scene reference
  scene.value = threeScene;
  
  // Set origin coordinates for geo-referencing
  const defaultOrigin = {
    lat: 37.7749,
    lng: -122.4194,
    alt: 0
  };
  
  // Set the coordinates in the store
  missionStore.setOriginCoordinates(defaultOrigin.lat, defaultOrigin.lng, defaultOrigin.alt);
  
  // Set coordinates in scene userData if possible
  if (threeScene) {
    if (!threeScene.userData) {
      threeScene.userData = {};
    }
    threeScene.userData.originCoordinates = defaultOrigin;
    console.log('Origin coordinates set in scene userData', defaultOrigin);
    
    // Set the current workflow step
    currentWorkflowStep.value = WORKFLOW_STEPS.PRECHECK;
    
    // Initialize drawing tools if BuildScene panel is already expanded
    if (buildSceneExpanded.value) {
      initializeDrawingTools();
    }
  }
  
  console.log('Scene ready processing complete');
};

// Show the viewer when mounted
const showViewer = ref(true)
const cesiumContainer = ref(null)

// Add method to toggle step
const toggleStep = (step) => {
  if (currentWorkflowStep.value === step) {
    // Toggle current panel's expanded state
    switch (step) {
      case WORKFLOW_STEPS.PRECHECK:
        missionPrecheckExpanded.value = !missionPrecheckExpanded.value;
        break;
      case WORKFLOW_STEPS.BUILD_SCENE:
        buildSceneExpanded.value = !buildSceneExpanded.value;
        break;
      case WORKFLOW_STEPS.HARDWARE_SELECTION:
        hardwareSelectionExpanded.value = !hardwareSelectionExpanded.value;
        break;
      case WORKFLOW_STEPS.SIMULATION:
        // Debug takeoff location
        console.log('Checking takeoff location before simulation:', missionStore.takeoffLocation);
        console.log('Has takeoff location?', missionStore.hasTakeoffLocation);
        
        // If no takeoff location is set, prompt to set one
        if (!missionStore.hasTakeoffLocation) {
          console.log('No takeoff location set, showing prompt');
          showTakeoffPrompt.value = true;
        } else {
          // Toggle simulation panel visibility
          missionStore.toggleSimulationPanel();
        }
        break;
    }
  } else {
    // Advance to new step and expand it
    advanceToStep(step);
  }
};

// Lifecycle hooks
onMounted(() => {
  console.log('App component mounted - missionStore hardware:', missionStore.hardware);
  logStartupEvent('App component mounted');
  
  // Try to load persisted hardware configuration from localStorage
  const hardwareLoaded = missionStore.loadPersistedHardware();
  if (hardwareLoaded) {
    console.log('Successfully loaded hardware configuration from previous session');
  }
  
  // Check if takeoff location exists and log status
  if (missionStore.hasTakeoffLocation) {
    console.log('Takeoff location already set:', missionStore.takeoffLocation);
  } else {
    console.log('No takeoff location set yet. User will need to set one.');
  }
  
  // We'll let the Viewer component handle scene initialization now
  // and get the scene reference via the scene-ready event
  
  // Remove any existing event listeners to prevent duplicates
  window.removeEventListener('ground-click', handleGroundClick);
  
  // Add event listeners - ensure we're using the correct function reference
  console.log('Adding ground-click event listener');
  window.addEventListener('ground-click', handleGroundClick);
  
  window.addEventListener('enter-takeoff-selection', () => {
    console.log('Entering takeoff selection mode');
    isInTakeoffSelection.value = true;
    // Disable tools during takeoff selection
    activeTool.value = null;
    // Add class to body for styling
    document.body.classList.add('takeoff-selection-mode');
  });
  
  window.addEventListener('exit-takeoff-selection', () => {
    console.log('Exiting takeoff selection mode');
    isInTakeoffSelection.value = false;
    // Remove class from body
    document.body.classList.remove('takeoff-selection-mode');
  });
  
  window.addEventListener('mission-precheck-completed', handleMissionPrecheckCompleted);
  
  // Add event listener for notifications
  window.addEventListener('show-notification', (event) => {
    const { message, color, timeout } = event.detail;
    showConfirmationNotification(message, color || 'info', timeout || 3000);
  });
  
  // Ensure panel is collapsed initially
  missionPrecheckExpanded.value = false;
  
  // Set initial workflow step 
  currentWorkflowStep.value = WORKFLOW_STEPS.PRECHECK;
  
  // Listen for app-wide error events
  errorEventListener = (event) => {
    const error = event.detail;
    console.error('App caught error event:', error);
    
    // Only show UI notifications in development mode or for critical errors
    if (import.meta.env.DEV || error.critical) {
      showErrorNotification(error.message || 'An error occurred');
      showDiagnosticsButton.value = true;
    }
  };
  
  warningEventListener = (event) => {
    const warning = event.detail;
    console.warn('App caught warning event:', warning);
    
    // Only show warnings in development mode
    if (import.meta.env.DEV) {
      showWarningNotification(warning.message || 'A warning occurred');
    }
  };
  
  document.addEventListener('app:error', errorEventListener);
  document.addEventListener('app:warning', warningEventListener);
  
  // Set up an unhandled error handler for the application
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise rejection:', event.reason);
    showErrorNotification('An unexpected error occurred. See console for details.');
  });
  
  // Initialize viewer reference after a short delay
  nextTick(() => {
    console.log('Viewer ref available:', !!viewerRef.value);
  });
  
  // Listen for activate-drawing-tool events from other components
  window.addEventListener('activate-drawing-tool', (event) => {
    console.log('Activate drawing tool event received in App.vue:', event.detail);
    
    if (!event.detail) {
      console.warn('Invalid activate-drawing-tool event: missing detail');
      return;
    }
    
    // First, check if we're in the correct scene context
    // Drawing tools should only be activated in the main 3D scene, not in hardware mode
    if (hardwareSelected.value) {
      console.warn('Drawing tools cannot be activated in hardware mode - use main scene.');
      showErrorNotification(
        'Drawing tools can only be used in the main scene. Please complete hardware selection first.',
        5000
      );
      return;
    }
    
    // Extract mode and tool from event
    const mode = event.detail.mode || '2d';
    const tool = event.detail.tool || 'polygon';
    
    // Store the desired mode and tool
    activeDrawingMode.value = mode;
    activeDrawingTool.value = tool;
    
    // Expand the build scene panel if it's not already expanded
    if (!buildSceneExpanded.value) {
      console.log('Expanding build scene panel for drawing');
      buildSceneExpanded.value = true;
      
      // Give the DOM time to update
      setTimeout(() => {
        // Double-check scene is available before initializing
        if (!scene.value) {
          console.error('Cannot initialize drawing tools: scene is not available');
          showErrorNotification(
            'Drawing tools initialization failed: scene not available',
            5000
          );
          return;
        }
        
        // Initialize drawing tools after panel is visible
        const initialized = initializeDrawingTools();
        
        if (!initialized) {
          console.warn('Drawing tools initialization failed in first attempt, retrying...');
          
          // Second attempt after a longer delay
          setTimeout(() => {
            if (initializeDrawingTools()) {
              console.log('Drawing tools initialized on second attempt');
              
              // Make sure to apply drawing mode to the viewer
              if (viewerRef.value) {
                viewerRef.value.isDrawing = true;
                viewerRef.value.activeDrawingMode = mode;
              }
            } else {
              console.error('Drawing tools initialization failed on second attempt');
              
              // Show error notification
              showErrorNotification(
                'Could not initialize drawing tools. Try refreshing the page.',
                5000
              );
            }
          }, 500); // Longer delay for second attempt
        }
      }, 200); // Short delay to ensure DOM has time to update
    } else {
      // Panel is already open, just initialize or update tools
      console.log('Build scene panel already expanded, updating drawing tools');
      
      if (!scene.value) {
        console.error('Cannot initialize drawing tools: scene is not available');
        showErrorNotification(
          'Drawing tools initialization failed: scene not available',
          5000
        );
        return;
      }
      
      if (!drawingUtils.value) {
        // Initialize drawing tools
        const initialized = initializeDrawingTools();
        if (!initialized) {
          console.error('Failed to initialize drawing tools with panel already open');
        }
      } else {
        // Just update the existing tools
        console.log('Updating existing drawing tools with new mode and tool');
        drawingUtils.value.setActiveMode(mode);
        drawingUtils.value.setActiveTool(tool);
        
        // Make sure viewer is in drawing mode
        if (viewerRef.value) {
          viewerRef.value.isDrawing = true;
          viewerRef.value.activeDrawingMode = mode;
        }
      }
    }
  });
});

onUnmounted(() => {
  window.removeEventListener('ground-click', handleGroundClick)
  window.removeEventListener('enter-takeoff-selection', () => {
    isInTakeoffSelection.value = false
  })
  window.removeEventListener('exit-takeoff-selection', () => {
    isInTakeoffSelection.value = false
  })
  window.removeEventListener('mission-precheck-completed', handleMissionPrecheckCompleted)
  
  if (errorEventListener) {
    document.removeEventListener('app:error', errorEventListener);
  }
  
  if (warningEventListener) {
    document.removeEventListener('app:warning', warningEventListener);
  }
  
  logStartupEvent('App component unmounted');
})

// Error notification display
function showErrorNotification(message, timeout = 5000) {
  errorSnackbar.value = {
    show: true,
    text: message,
    color: 'error',
    timeout
  };
}

// Warning notification display
function showWarningNotification(message, timeout = 3000) {
  errorSnackbar.value = {
    show: true,
    text: message,
    color: 'warning',
    timeout
  };
}

// Clear errors/warnings
function clearErrors() {
  console.log('Clearing errors from UI');
  // Additional logic to clear errors could go here
}

function clearWarnings() {
  console.log('Clearing warnings from UI');
  // Additional logic to clear warnings could go here
}

// Add methods to toggle the panels
const toggleDiagnostics = () => {
  showDiagnostics.value = !showDiagnostics.value;
  
  // If opening, center the panel after it's mounted
  if (showDiagnostics.value) {
    setTimeout(() => {
      if (diagnosticsPanelRef.value) {
        diagnosticsPanelRef.value.centerPanel();
      }
    }, 50);
  }
};

const toggleLayerManager = () => {
  if (layerManagerRef.value) {
    // Toggle panel visibility
    layerManagerRef.value.togglePanel();
    
    // If opening and it's in default position, center it
    if (layerManagerRef.value.isPanelVisible()) {
      layerManagerRef.value.centerPanel();
    }
  }
};

// Watch for workflow step changes to ensure the correct panel is shown
watch(currentWorkflowStep, (newStep) => {
  console.log('Workflow step changed to:', newStep);
  
  if (newStep === WORKFLOW_STEPS.PRECHECK) {
    missionPrecheckExpanded.value = true;
    buildSceneExpanded.value = false;
  } else if (newStep === WORKFLOW_STEPS.BUILD_SCENE) {
    buildSceneExpanded.value = true;
    missionPrecheckExpanded.value = false;
  }
});

// Debug hardware selected state
watch(hardwareSelected, (selected) => {
  console.log('Hardware selected changed to:', selected);
  
  if (selected) {
    // When hardware is selected, close all configuration panels
    hardwareSelectionExpanded.value = false;
    missionPrecheckExpanded.value = false;
    buildSceneExpanded.value = false;
    
    // Reset workflow step to null to prevent automatic panel opening
    currentWorkflowStep.value = null;
  }
});

// Add method to highlight a drawing asset
const highlightDrawingAsset = (assetId) => {
  if (!drawingUtils.value) return;
  
  // Find the asset in either 2D or 3D collections
  const allAssets = drawingUtils.value.getDrawingAssets();
  const asset = allAssets.find(a => a.id === assetId);
  
  if (asset && asset.object) {
    // Store original materials to restore later
    if (!asset.object._originalMaterials) {
      // Save original materials (might be a group with multiple meshes)
      if (asset.object.isGroup) {
        asset.object._originalMaterials = [];
        asset.object.traverse(child => {
          if (child.isMesh) {
            asset.object._originalMaterials.push({
              object: child,
              material: child.material.clone()
            });
          }
        });
      } else if (asset.object.isMesh) {
        asset.object._originalMaterials = [{
          object: asset.object,
          material: asset.object.material.clone()
        }];
      }
    }
    
    // Apply highlight material
    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      wireframe: false,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    
    if (asset.object.isGroup) {
      asset.object.traverse(child => {
        if (child.isMesh) {
          child.material = highlightMaterial;
        }
      });
    } else if (asset.object.isMesh) {
      asset.object.material = highlightMaterial;
    }
    
    // Pulse animation or other highlight effect could be added here
  }
};

// Reset highlight effect
const resetHighlight = (assetId) => {
  if (!drawingUtils.value) return;
  
  // Find the asset in either 2D or 3D collections
  const allAssets = drawingUtils.value.getDrawingAssets();
  const asset = allAssets.find(a => a.id === assetId);
  
  if (asset && asset.object && asset.object._originalMaterials) {
    // Restore original materials
    asset.object._originalMaterials.forEach(item => {
      item.object.material = item.material;
    });
  }
};

// Handle asset deletion
const handleAssetDeleted = (assetId) => {
  console.log(`Asset ${assetId} deleted`);
};

// Handle clearing all assets
const handleAllAssetsCleared = () => {
  console.log('All drawing assets cleared');
};

// Add confirmation notification function
function showConfirmationNotification(message, color = 'success', timeout = 3000) {
  errorSnackbar.value = {
    show: true,
    text: message,
    color: color,
    timeout
  };
}

// Method to enter takeoff selection mode
const enterTakeoffSelectionMode = () => {
  // Close the dialog
  showTakeoffPrompt.value = false;
  
  // Enter takeoff selection mode
  isInTakeoffSelection.value = true;
  activeTool.value = null;
  
  // Add class to body for styling
  document.body.classList.add('takeoff-selection-mode');
  
  // Log clear instructions to console
  console.log('TAKEOFF SELECTION MODE: Click anywhere on the ground to set takeoff location');
  
  // Show notification to help guide the user
  showConfirmationNotification(
    'Click anywhere on the ground to set your take-off location', 
    'info', 
    10000
  );
}

// Add a method to handle closing the hardware selection panel
const closeHardwareSelection = () => {
  hardwareSelectionExpanded.value = false;
  currentWorkflowStep.value = null;
};
</script>

<template>
  <v-app class="app-wrapper" :class="themeClass">
    <v-app-bar class="gecko-app-bar" elevation="4" height="70">
      <div class="overwatch-logo">
        <svg width="240" height="50" viewBox="0 0 240 50" xmlns="http://www.w3.org/2000/svg">
          <!-- Tech/robotic background elements -->
          <rect x="2" y="15" width="236" height="20" fill="none" stroke="url(#blueGradient)" stroke-width="0.5" />
          <line x1="2" y1="15" x2="10" y2="5" stroke="#00b0ff" stroke-width="0.5" />
          <line x1="238" y1="15" x2="230" y2="5" stroke="#00b0ff" stroke-width="0.5" />
          <line x1="2" y1="35" x2="10" y2="45" stroke="#00b0ff" stroke-width="0.5" />
          <line x1="238" y1="35" x2="230" y2="45" stroke="#00b0ff" stroke-width="0.5" />
          
          <!-- Animated circles -->
          <circle cx="10" cy="5" r="2" fill="#4fc3f7">
            <animate attributeName="fill" values="#4fc3f7;#00b0ff;#4fc3f7" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="230" cy="5" r="2" fill="#4fc3f7">
            <animate attributeName="fill" values="#4fc3f7;#00b0ff;#4fc3f7" dur="3s" repeatCount="indefinite" begin="0.5s" />
          </circle>
          <circle cx="10" cy="45" r="2" fill="#4fc3f7">
            <animate attributeName="fill" values="#4fc3f7;#00b0ff;#4fc3f7" dur="3s" repeatCount="indefinite" begin="1s" />
          </circle>
          <circle cx="230" cy="45" r="2" fill="#4fc3f7">
            <animate attributeName="fill" values="#4fc3f7;#00b0ff;#4fc3f7" dur="3s" repeatCount="indefinite" begin="1.5s" />
          </circle>
          
          <!-- Hexagon accents with pulse animation -->
          <polygon points="20,25 25,18 35,18 40,25 35,32 25,32" fill="none" stroke="var(--gecko-mint)" stroke-width="1.5">
            <animate attributeName="stroke-width" values="1.5;2;1.5" dur="2s" repeatCount="indefinite" />
          </polygon>
          <polygon points="200,25 205,18 215,18 220,25 215,32 205,32" fill="none" stroke="var(--gecko-mint)" stroke-width="1.5">
            <animate attributeName="stroke-width" values="1.5;2;1.5" dur="2s" repeatCount="indefinite" begin="1s" />
          </polygon>
          
          <!-- Small gear icon -->
          <path d="M25,25 m-2,0 a2,2 0 1,0 4,0 a2,2 0 1,0 -4,0 M25,21 L25,19 M28,22 L29,20 M29,25 L31,25 M28,28 L29,30 M25,29 L25,31 M22,28 L21,30 M21,25 L19,25 M22,22 L21,20" 
                stroke="var(--gecko-mint)" stroke-width="0.8" fill="none">
            <animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 25 25" to="360 25 25" dur="15s" repeatCount="indefinite" />
          </path>
          
          <!-- Small gear icon on right -->
          <path d="M215,25 m-2,0 a2,2 0 1,0 4,0 a2,2 0 1,0 -4,0 M215,21 L215,19 M218,22 L219,20 M219,25 L221,25 M218,28 L219,30 M215,29 L215,31 M212,28 L211,30 M211,25 L209,25 M212,22 L211,20" 
                stroke="var(--gecko-mint)" stroke-width="0.8" fill="none">
            <animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 215 25" to="-360 215 25" dur="15s" repeatCount="indefinite" />
          </path>
          
          <!-- Main text with digital/circuit look -->
          <text x="45" y="32" class="tech-font" font-size="28" fill="var(--gecko-mint)">OVERWATCH</text>
          
          <!-- Digital line under text -->
          <path d="M40,36 h5 v2 h5 v-2 h10 v2 h5 v-2 h10 v2 h5 v-2 h10 v2 h5 v-2 h10 v2 h5 v-2 h40" 
                stroke="var(--gecko-mint)" stroke-width="0.5" fill="none" />
          
          <!-- Top digital line -->
          <path d="M45,15 h10 v-2 h5 v2 h10 v-2 h5 v2 h10 v-2 h5 v2 h10 v-2 h5 v2 h10 v-2 h5 v2 h10 v-2 h5 v2 h45" 
                stroke="var(--gecko-mint)" stroke-width="0.5" fill="none" />
          
          <!-- Pulsing dot on the left side -->
          <circle cx="6" cy="25" r="1.5" fill="var(--gecko-mint)" class="gecko-pulse">
            <animate attributeName="r" values="1;2;1" dur="2s" repeatCount="indefinite" />
          </circle>
          
          <!-- Pulsing dot on the right side -->
          <circle cx="234" cy="25" r="1.5" fill="var(--gecko-mint)" class="gecko-pulse">
            <animate attributeName="r" values="1;2;1" dur="2s" repeatCount="indefinite" begin="1s" />
          </circle>
          
          <!-- Gradients -->
          <defs>
            <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="var(--gecko-mint)" />
              <stop offset="100%" stop-color="var(--gecko-sky-blue)" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <v-spacer></v-spacer>
      
      <!-- Theme Selector -->
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn icon v-bind="props" class="app-bar-icon gecko-control-button mr-2">
            <v-icon size="large">
              {{ themes.find(t => t.id === currentTheme)?.icon || 'mdi-palette' }}
            </v-icon>
            <v-tooltip activator="parent" location="bottom">Theme</v-tooltip>
          </v-btn>
        </template>
        <v-list>
          <v-list-item v-for="t in themes" :key="t.id" @click="switchTheme(t.id)" class="theme-item">
            <v-list-item-title>
              <v-icon class="mr-2">{{ t.icon }}</v-icon>
              {{ t.name }}
              <v-icon v-if="currentTheme === t.id" color="primary" class="ml-2">mdi-check</v-icon>
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
      
      <v-btn icon @click="toggleLayerManager" class="app-bar-icon gecko-control-button">
        <v-icon size="large">mdi-layers-outline</v-icon>
        <v-tooltip activator="parent" location="bottom">Scene Layers</v-tooltip>
      </v-btn>
      
      <v-btn icon @click="showDiagnostics = !showDiagnostics" class="app-bar-icon gecko-control-button">
        <v-icon size="large">mdi-information-outline</v-icon>
        <v-tooltip activator="parent" location="bottom">Diagnostics</v-tooltip>
      </v-btn>
    </v-app-bar>

    <v-main style="position: relative; overflow: hidden; width: 100%; height: 100%;">
      <!-- Remove router-view and use direct component rendering -->
      <div class="main-content">
        <!-- Main content will be rendered here directly -->
      </div>
      
      <!-- Viewer container -->
      <div 
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; z-index: 10;"
      >
        <Viewer 
          v-if="showViewer && !hardwareSelected" 
          ref="viewerRef"
          @scene-ready="onSceneReady"
          @ground-click="handleGroundClick"
          @object-click="handleObjectClick"
          @drawing-mode-activated="onDrawingModeActivated"
        />
        
        <!-- Replace viewer with main scene when hardware is selected -->
        <MainScene v-if="hardwareSelected" />
      </div>
      
      <!-- Mode Toggle Component - Moved to bottom right -->
      <div class="mode-toggle-container" style="position: absolute; bottom: 20px; right: 20px; z-index: 15;">
        <DroneControl />
      </div>
      
      <!-- Step indicators and panels with higher z-index -->
      <div class="step-indicators" @click.stop>
        <!-- Step 1: Mission Precheck -->
        <div class="indicator-container step-1" :class="{ 'active-step': currentWorkflowStep === WORKFLOW_STEPS.PRECHECK }">
          <div class="step-indicator gecko-tech-value" @click.stop="toggleStep(WORKFLOW_STEPS.PRECHECK)">1</div>
        </div>
        
        <!-- Step 2: Build Scene -->
        <div class="indicator-container step-2" :class="{ 'active-step': currentWorkflowStep === WORKFLOW_STEPS.BUILD_SCENE }">
          <div class="step-indicator gecko-tech-value" @click.stop="toggleStep(WORKFLOW_STEPS.BUILD_SCENE)">2</div>
        </div>
        
        <!-- Step 3: Hardware Selection -->
        <div class="indicator-container step-3" :class="{ 'active-step': currentWorkflowStep === WORKFLOW_STEPS.HARDWARE_SELECTION }">
          <div class="step-indicator gecko-tech-value" @click.stop="toggleStep(WORKFLOW_STEPS.HARDWARE_SELECTION)">3</div>
        </div>
        
        <!-- Step 4: Mission Simulation -->
        <div class="indicator-container step-4" :class="{ 'active-step': currentWorkflowStep === WORKFLOW_STEPS.SIMULATION }">
          <div class="step-indicator gecko-tech-value" @click.stop="toggleStep(WORKFLOW_STEPS.SIMULATION)">4</div>
        </div>
      </div>
      
      <!-- Panels container -->
      <div class="panels-container" @click.stop>
        <!-- Mission Precheck Panel -->
        <div v-if="missionPrecheckExpanded" class="panel-wrapper" @click.stop>
          <MissionPrecheck 
            :expanded="true"
            @completed="handleMissionPrecheckCompleted"
          />
        </div>
        
        <!-- Build Scene Panel -->
        <div v-if="buildSceneExpanded" class="gecko-panel build-scene-panel" @click.stop>
          <BuildScene @toggle-panel="toggleBuildScene" @completed="handleBuildSceneCompleted" />
        </div>
        
        <!-- Hardware Selection Panel -->
        <div v-if="hardwareSelectionExpanded" class="panel-wrapper" @click.stop>
        <HardwareSelection
          @completed="handleHardwareSelectionCompleted"
          @close="closeHardwareSelection"
          :expanded="hardwareSelectionExpanded"
        />
        </div>
        
        <!-- Step 4: Mission Simulation -->
        <MissionSimulation
          v-if="currentWorkflowStep === WORKFLOW_STEPS.SIMULATION || missionStore.simulationPanelVisible"
          :isVisible="missionStore.simulationPanelVisible || currentWorkflowStep === WORKFLOW_STEPS.SIMULATION"
          @completed="advanceToStep(WORKFLOW_STEPS.PLAN_MISSION)"
        />
        
        <!-- Step 5: Plan Mission -->
      </div>
      
      <!-- Error notification system -->
      <v-snackbar
        v-model="errorSnackbar.show"
        :color="errorSnackbar.color"
        :timeout="errorSnackbar.timeout"
      >
        {{ errorSnackbar.text }}
        
        <template v-slot:actions>
          <v-btn
            color="white"
            variant="text"
            @click="errorSnackbar.show = false"
          >
            Close
          </v-btn>
          <v-btn
            v-if="showDiagnosticsButton"
            color="white"
            variant="text"
            @click="showDiagnostics = true"
          >
            Diagnostics
          </v-btn>
        </template>
      </v-snackbar>
      
      <!-- Diagnostics panel -->
      <DiagnosticsPanel 
        v-if="showDiagnostics" 
        ref="diagnosticsPanelRef"
        @close="showDiagnostics = false"
        @clear-errors="clearErrors"
        @clear-warnings="clearWarnings"
      />
      <SceneLayerManager ref="layerManagerRef" />
      
      <!-- Add a dedicated takeoff location prompt dialog -->
      <v-dialog v-model="showTakeoffPrompt" persistent max-width="500px">
        <v-card class="takeoff-prompt" bg-color="rgba(0, 0, 0, 0.9)">
          <v-card-title class="text-h5">Set Take-off Location</v-card-title>
          <v-card-text>
            Before running the simulation, please select a take-off location on the ground. 
            This location will be stored as your mission's reference point.
            <div class="mt-4 text-body-2">
              <v-icon color="warning" size="small" class="mr-1">mdi-alert-circle</v-icon>
              Click on the ground in the 3D view to set your take-off location.
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="enterTakeoffSelectionMode">
              Select Take-off Location
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-main>
  </v-app>
</template>

<style>
html, body {
  overflow: hidden;
  margin: 0;
  height: 100%;
  width: 100%;
}

.v-application {
  background: #121212;
  font-family: 'Roboto', sans-serif;
}

/* Add custom overwatch logo styling */
.overwatch-logo {
  padding-left: 16px; /* Match v-app-bar-title padding */
  display: flex;
  align-items: center;
  height: 100%;
}

.overwatch-logo svg {
  filter: drop-shadow(0px 0px 3px rgba(79, 195, 247, 0.5));
  transition: all 0.3s ease;
}

.overwatch-logo svg:hover {
  filter: drop-shadow(0px 0px 5px rgba(79, 195, 247, 0.8));
}

/* Add custom overwatch title styling */
.overwatch-title {
  font-family: 'Rajdhani', 'Roboto Condensed', sans-serif;
  font-weight: 700;
  letter-spacing: 2px;
  font-size: 3rem;
  text-transform: uppercase;
  background: linear-gradient(90deg, #4fc3f7, #00b0ff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  padding-right: 10px;
  line-height: 1;
  margin-top: 5px;
}

/* Step indicators container */
.step-indicators {
  position: absolute;
  top: 200px;
  right: 50px;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  gap: 25px;
  pointer-events: auto;
}

/* Indicator container styles */
.indicator-container {
  position: relative;
}

/* Panel container - positioned in top 1/4 of screen */
.panels-container {
  position: absolute;
  top: 200px;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  max-width: 1600px;  /* Increased from 1200px to accommodate HardwareSelection min-width of 1400px */
  max-height: 90vh;   /* Increased from 80vh to give more vertical space */
  z-index: 120;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  align-items: center;
}

.panel-wrapper {
  width: 100%;
  max-height: 85vh;  /* Increased from 50vh to allow more visible content */
  overflow: auto;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  margin-top: 10px;
}

/* Make sure content is displayed properly */
:deep(.v-expansion-panel) {
  background-color: #212121 !important;
  color: #ffffff !important;
  width: 100%;
  margin: 0;
  padding: 0;
}

/* Ensure expansion panels take full width */
:deep(.v-expansion-panels) {
  width: 100%;
  margin: 0;
  background-color: transparent;
}

/* Styles for modern black theme for components */
:deep(.v-expansion-panel) {
  background-color: #2d2d2d;
  color: #ffffff;
}

:deep(.v-expansion-panel-title) {
  background-color: #212121;
  padding: 14px 20px;
}

:deep(.v-expansion-panel-text) {
  background-color: #2d2d2d;
  color: #e0e0e0;
}

:deep(.v-btn) {
  text-transform: none;
}

:deep(.v-card) {
  background-color: #2d2d2d;
  color: #e0e0e0;
}

:deep(.v-card-title) {
  color: #ffffff;
}

/* Step indicator styles - updated for Gecko UI style */
.step-indicator {
  width: 60px;
  height: 60px;
  background-color: var(--gecko-dark-blue);
  color: var(--gecko-white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 26px;
  border-radius: 50%;
  box-shadow: 0 3px 10px rgba(0,0,0,0.4);
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease;
  position: relative;
  z-index: 10;
}

.step-indicator:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 15px rgba(0,0,0,0.6), 0 0 10px var(--gecko-mint);
}

.step-indicator:after {
  content: '';
  position: absolute;
  top: -5px;
  left: -5px;
  right: -5px;
  bottom: -5px;
  border-radius: 50%;
  border: 2px dashed rgba(87, 231, 178, 0.2);
  animation: rotateCircle 15s linear infinite;
  z-index: -1;
}

@keyframes rotateCircle {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Indicator steps with distinct colors - Gecko UI style */
.step-1 .step-indicator {
  background-color: var(--gecko-dark-blue);
  border: 4px solid var(--gecko-success);
}

.step-1 .step-indicator:hover {
  animation: geckoPulse 1.5s infinite;
}

/* Active step indicator styling - Gecko UI style */
.active-step .step-indicator {
  transform: scale(1.2);
  box-shadow: 0 6px 18px rgba(0,0,0,0.5), 0 0 15px var(--gecko-mint);
  animation: geckoGlow 2s infinite alternate;
}

.step-1.active-step .step-indicator {
  background-color: rgba(105, 255, 66, 0.3);
}

/* Step transitions */
.indicator-container {
  transition: all 0.3s ease;
}

.indicator-container .step-indicator {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

/* Larger app bar icon buttons */
.app-bar-icon {
  margin: 0 5px;
  transform: scale(1.2);
}

.app-bar-icon:hover {
  transform: scale(1.3);
  transition: transform 0.2s ease;
}

/* Theme selector styles */
.theme-item {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.theme-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.mr-2 {
  margin-right: 8px;
}

.ml-2 {
  margin-left: 8px;
}

/* Build Scene Panel */
.build-scene-panel {
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  animation: geckoFadeIn 0.3s ease-in-out;
  background-color: var(--gecko-dark-blue);
  border: 1px solid rgba(87, 231, 178, 0.2);
  box-shadow: 0 4px 15px rgba(0,0,0,0.4);
}

.theme--forecastTheme .build-scene-panel {
  background-color: var(--forecast-medium-grey);
  border: 1px solid var(--forecast-border);
}

.build-scene-content {
  max-height: calc(80vh - 100px);
  overflow-y: auto;
  padding-bottom: 16px;
}

/* Drawing tools grid */
.drawing-tools-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.tool-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  height: auto;
}

.tool-label {
  font-size: 12px;
  margin-top: 4px;
}

/* Step 2 indicator styling */
.step-2 .step-indicator {
  background-color: var(--gecko-dark-blue);
  border: 4px solid var(--gecko-sky-blue);
}

.step-2 .step-indicator:hover {
  animation: geckoPulse 1.5s infinite;
}

.step-2.active-step .step-indicator {
  background-color: rgba(0, 158, 255, 0.3);
}

.theme--forecastTheme .step-2 .step-indicator {
  border: 4px solid var(--forecast-cyan);
}

.theme--forecastTheme .step-2.active-step .step-indicator {
  background-color: rgba(0, 255, 255, 0.2);
}

.drawing-instructions {
  background-color: rgba(0, 0, 0, 0.1);
  border-left: 3px solid var(--primary);
  border-radius: 4px;
}

.theme--forecastTheme .drawing-instructions {
  background-color: rgba(0, 255, 255, 0.05);
  border-left: 3px solid var(--forecast-cyan);
}

/* Improve the drawing tools layout */
.drawing-tools-container {
  position: relative;
}

.drawing-tools-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 12px;
}

/* Mode toggle styling */
.mode-toggle-container {
  background-color: transparent;
  border-radius: 8px;
  z-index: 100;
}

/* Step 3 indicator styling */
.step-3 .step-indicator {
  background-color: var(--gecko-dark-blue);
  border: 4px solid var(--gecko-warning);
}

.step-3 .step-indicator:hover {
  animation: geckoPulse 1.5s infinite;
}

.step-3.active-step .step-indicator {
  background-color: rgba(255, 193, 7, 0.3);
}

.theme--forecastTheme .step-3 .step-indicator {
  border: 4px solid var(--forecast-warning);
}

.theme--forecastTheme .step-3.active-step .step-indicator {
  background-color: rgba(255, 193, 7, 0.2);
}

/* Hardware Selection Panel */
.hardware-panel {
  width: 100%;
  max-width: 1200px;
  max-height: 80vh;
  overflow: hidden;
  animation: geckoFadeIn 0.3s ease-in-out;
  background-color: var(--gecko-dark-blue);
  border: 1px solid rgba(255, 193, 7, 0.2);
  box-shadow: 0 4px 15px rgba(0,0,0,0.4);
}

.theme--forecastTheme .hardware-panel {
  background-color: var(--forecast-medium-grey);
  border: 1px solid var(--forecast-warning);
}

/* Step 4 indicator styling */
.step-4 .step-indicator {
  background-color: var(--gecko-dark-blue);
  border: 4px solid var(--gecko-primary);
}

.step-4 .step-indicator:hover {
  animation: geckoPulse 1.5s infinite;
}

.step-4.active-step .step-indicator {
  background-color: rgba(33, 150, 243, 0.3);
}

.theme--forecastTheme .step-4 .step-indicator {
  border: 4px solid var(--forecast-primary);
}

.theme--forecastTheme .step-4.active-step .step-indicator {
  background-color: rgba(33, 150, 243, 0.2);
}

/* Simulation Panel */
.simulation-panel {
  width: 100%;
  max-width: 1600px;  /* Increased from 1200px to match the panels-container width */
  max-height: 85vh;   /* Increased from 80vh to match the panel-wrapper height */
  overflow: hidden;
  animation: geckoFadeIn 0.3s ease-in-out;
  background-color: var(--gecko-dark-blue);
  border: 1px solid rgba(33, 150, 243, 0.2);
  box-shadow: 0 4px 15px rgba(0,0,0,0.4);
}

.theme--forecastTheme .simulation-panel {
  background-color: var(--forecast-medium-grey);
  border: 1px solid var(--forecast-primary);
}

/* Animation for Gecko UI elements */
@keyframes geckoPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(87, 231, 178, 0.7);
    transform: scale(1.05);
  }
  70% {
    box-shadow: 0 0 0 15px rgba(87, 231, 178, 0);
    transform: scale(1.1);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(87, 231, 178, 0);
    transform: scale(1.05);
  }
}

/* Takeoff prompt styling */
.takeoff-prompt {
  background-color: rgba(0, 0, 0, 0.95) !important;
  color: white !important;
  border: 1px solid var(--gecko-primary);
  box-shadow: 0 0 20px rgba(33, 150, 243, 0.4);
}

.takeoff-prompt .v-card-title {
  color: var(--gecko-primary);
  border-bottom: 1px solid rgba(33, 150, 243, 0.3);
  padding-bottom: 12px;
}

.takeoff-prompt .v-card-text {
  padding-top: 16px;
  color: rgba(255, 255, 255, 0.9);
}

/* Cursor style for take-off selection mode - make it more prominent and reliable */
body.takeoff-selection-mode {
  cursor: crosshair !important;
}

body.takeoff-selection-mode * {
  cursor: crosshair !important;
}

body.takeoff-selection-mode .v-application__wrap {
  cursor: crosshair !important;
}

/* Add indicator message when in takeoff selection mode */
body.takeoff-selection-mode::after {
  content: "Click anywhere on the ground to set takeoff location";
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(33, 150, 243, 0.8);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: bold;
  z-index: 10000;
  pointer-events: none;
}
</style>
