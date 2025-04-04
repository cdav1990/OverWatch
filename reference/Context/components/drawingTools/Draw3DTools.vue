<template>
  <!-- This component doesn't render anything directly to the DOM -->
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as THREE from 'three';
import { 
  DRAWING_STATES,
  DRAWING_STEPS, 
  setDrawingState,
  handleBoxMouseMove, 
  handleBoxHeightDrag,
  updateBoxHeight,
  createFinalBox,
  handleCylinderDrawing,
  handleSphereDrawing,
  createExtrusion,
  getDrawingObjects,
  clearDrawingObjects,
  createCADBox,
  createCADCylinder,
  createCADSphere,
  createCADExtrusion
} from '../../utils/drawingManager';

const props = defineProps({
  drawingMode: {
    type: String,
    default: 'box'
  },
  isDrawing: {
    type: Boolean,
    default: false
  },
  showHelpers: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits([
  'drawing-complete', 
  'drawing-cancel', 
  'height-change',
  'status-update',
  'object-created',
  'error'
]);

// Internal state
const mousePosition = ref(new THREE.Vector2());
const isExtruding = ref(false);
const currentHeight = ref(2);
const currentStep = ref(DRAWING_STEPS.INITIAL);
const raycaster = new THREE.Raycaster();
const drawingPoints = ref([]);
const selectedPoints = ref([]);

// Track the current operation for CSG
const csgOperation = ref(null);
const selectedObjects = ref([]);

// Add this near the top of script setup
let lastClickTime = 0;

// Watch for drawing mode changes
watch(() => props.isDrawing, (newValue) => {
  console.log('isDrawing changed to:', newValue, 'mode:', props.drawingMode);
  
  if (newValue) {
    // Start drawing mode
    console.log('Setting up drawing events for mode:', props.drawingMode);
    setupDrawingEvents();
    
    // Set initial status based on drawing mode
    if (props.drawingMode === 'box') {
      console.log('Starting box drawing mode');
      currentStep.value = DRAWING_STEPS.PLACING_FIRST_POINT;
      emit('status-update', 'Click to place first corner of box');
    } else if (props.drawingMode === 'cylinder') {
      console.log('Starting cylinder drawing mode');
      currentStep.value = DRAWING_STEPS.PLACING_FIRST_POINT;
      emit('status-update', 'Click to place center of cylinder');
    } else if (props.drawingMode === 'sphere') {
      console.log('Starting sphere drawing mode');
      currentStep.value = DRAWING_STEPS.PLACING_FIRST_POINT;
      emit('status-update', 'Click to place center of sphere');
    } else if (props.drawingMode === 'extrude') {
      console.log('Starting extrusion drawing mode');
      currentStep.value = DRAWING_STEPS.PLACING_FIRST_POINT;
      emit('status-update', 'Select a 2D shape to extrude');
    } else if (props.drawingMode === 'union' || 
               props.drawingMode === 'subtraction' || 
               props.drawingMode === 'intersection') {
      console.log('Starting CSG operation:', props.drawingMode);
      csgOperation.value = props.drawingMode;
      currentStep.value = DRAWING_STEPS.PLACING_FIRST_POINT;
      emit('status-update', 'Select first object for ' + props.drawingMode);
    }
  } else {
    // End drawing mode
    console.log('Ending drawing mode');
    cleanupDrawingEvents();
    currentStep.value = DRAWING_STEPS.INITIAL;
    csgOperation.value = null;
    selectedObjects.value = [];
  }
});

// Handle mouse position updates
const handleMouseMove = (event) => {
  mousePosition.value.x = (event.clientX / window.innerWidth) * 2 - 1;
  mousePosition.value.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  if (props.drawingMode === 'box' && props.isDrawing && currentStep.value === DRAWING_STEPS.PLACING_SECOND_POINT) {
    // Handle box live preview
    handleBoxMouseMove(event);
  }
  
  if (isExtruding.value) {
    // Calculate height adjustment based on mouse Y movement
    const heightChange = -event.movementY * 0.05;
    currentHeight.value = Math.max(0.1, currentHeight.value + heightChange);
    updateBoxHeight(currentHeight.value);
    emit('height-change', currentHeight.value);
  }
};

const handleClick = (event) => {
  // This handled directly by ground-click event
  console.log('Click detected in Draw3DTools');
};

const handleKeyDown = (event) => {
  if (event.key === 'Escape' && props.isDrawing) {
    cancelDrawing();
  } else if (event.key === 'Enter' && currentStep.value === DRAWING_STEPS.ADJUSTING_HEIGHT) {
    completeDrawing();
  }
};

const setupDrawingEvents = () => {
  // Add event listeners
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('click', handleClick);
  window.addEventListener('keydown', handleKeyDown);
  
  // Listen for ground clicks
  window.addEventListener('ground-click', handleGroundClick);
  
  // Notify status
  emit('status-update', 'Click to place first corner');
};

const cleanupDrawingEvents = () => {
  // Remove event listeners
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('click', handleClick);
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('ground-click', handleGroundClick);
};

const handleGroundClick = (event) => {
  try {
    const position = event.detail.position;
    console.log('Ground click detected in Draw3DTools at:', position);
    console.log('Current drawing mode:', props.drawingMode);
    console.log('Current step:', currentStep.value);
    
    switch(props.drawingMode) {
      case 'box':
        if (currentStep.value === DRAWING_STEPS.PLACING_FIRST_POINT) {
          // Save first point
          drawingPoints.value = [position.clone()];
          currentStep.value = DRAWING_STEPS.PLACING_SECOND_POINT;
          emit('status-update', 'Click to place second corner');
          console.log('First box point set, waiting for second point');
          
        } else if (currentStep.value === DRAWING_STEPS.PLACING_SECOND_POINT) {
          // Save second point
          drawingPoints.value.push(position.clone());
          currentStep.value = DRAWING_STEPS.ADJUSTING_HEIGHT;
          emit('status-update', 'Adjust height and confirm');
          console.log('Second box point set, adjusting height');
          
          // Start extrusion
          isExtruding.value = true;
          
          // Create box size ready event
          window.dispatchEvent(new CustomEvent('box-size-ready', {
            detail: {
              points: drawingPoints.value,
              height: currentHeight.value
            }
          }));
        }
        break;
        
      case 'cylinder':
        if (currentStep.value === DRAWING_STEPS.PLACING_FIRST_POINT) {
          // Start drawing cylinder
          handleCylinderDrawing(position);
          currentStep.value = DRAWING_STEPS.PLACING_SECOND_POINT;
          emit('status-update', 'Click to set cylinder radius');
          console.log('First cylinder point set, waiting for radius point');
        } else if (currentStep.value === DRAWING_STEPS.PLACING_SECOND_POINT) {
          // Complete cylinder with radius
          handleCylinderDrawing(position);
          completeDrawing();
          console.log('Cylinder drawing completed');
        }
        break;
        
      case 'sphere':
        if (currentStep.value === DRAWING_STEPS.PLACING_FIRST_POINT) {
          // Start drawing sphere
          handleSphereDrawing(position);
          currentStep.value = DRAWING_STEPS.PLACING_SECOND_POINT;
          emit('status-update', 'Click to set sphere radius');
          console.log('First sphere point set, waiting for radius point');
        } else if (currentStep.value === DRAWING_STEPS.PLACING_SECOND_POINT) {
          // Complete sphere with radius
          handleSphereDrawing(position);
          completeDrawing();
          console.log('Sphere drawing completed');
        }
        break;
        
      case 'polygon':
        handlePolygonGroundClick(position);
        break;
        
      case 'extrusion':
        handleExtrusionGroundClick(position);
        break;
        
      default:
        console.log('Unhandled drawing mode:', props.drawingMode);
    }
  } catch (error) {
    console.error('Error in handleGroundClick:', error);
    emit('error', error);
  }
};

const completeDrawing = (createdObject = null) => {
  let finalObject = createdObject;
  
  if (!finalObject) {
    if (props.drawingMode === 'box' && drawingPoints.value.length >= 2) {
      // Calculate box dimensions
      const width = Math.abs(drawingPoints.value[1].x - drawingPoints.value[0].x);
      const depth = Math.abs(drawingPoints.value[1].z - drawingPoints.value[0].z);
      const height = currentHeight.value;
      
      // Calculate center point
      const centerX = (drawingPoints.value[0].x + drawingPoints.value[1].x) / 2;
      const centerZ = (drawingPoints.value[0].z + drawingPoints.value[1].z) / 2;
      const centerPoint = new THREE.Vector3(centerX, height / 2, centerZ);
      
      // Use the CAD adapter for better box creation
      finalObject = createCADBox(centerPoint, width, height, depth);
    } else if (props.drawingMode === 'cylinder' && drawingPoints.value.length >= 2) {
      // Calculate radius
      const radius = drawingPoints.value[0].distanceTo(drawingPoints.value[1]);
      const height = currentHeight.value;
      
      // Use the CAD adapter for better cylinder creation
      finalObject = createCADCylinder(drawingPoints.value[0], radius, height);
    } else if (props.drawingMode === 'sphere' && drawingPoints.value.length >= 2) {
      // Calculate radius
      const radius = drawingPoints.value[0].distanceTo(drawingPoints.value[1]);
      
      // Use the CAD adapter for better sphere creation
      finalObject = createCADSphere(drawingPoints.value[0], radius);
    } else if (props.drawingMode === 'extrusion' && selectedPoints.value.length >= 3) {
      // Use the CAD adapter for extrusion
      finalObject = createCADExtrusion(selectedPoints.value, currentHeight.value);
    }
  }
  
  if (finalObject) {
    emit('object-created', finalObject);
  }
  
  emit('drawing-complete', {
    points: drawingPoints.value,
    selectedPoints: selectedPoints.value,
    height: currentHeight.value,
    type: props.drawingMode,
    object: finalObject
  });
  
  // Reset state
  drawingPoints.value = [];
  selectedPoints.value = [];
  isExtruding.value = false;
  currentStep.value = DRAWING_STEPS.INITIAL;
  
  // Clean up events
  cleanupDrawingEvents();
};

const cancelDrawing = () => {
  emit('drawing-cancel');
  
  // Reset state
  drawingPoints.value = [];
  isExtruding.value = false;
  currentStep.value = DRAWING_STEPS.INITIAL;
  
  // Clean up events
  cleanupDrawingEvents();
};

const handlePolygonGroundClick = (position) => {
  // Add point to polygon
  selectedPoints.value.push(position.clone());
  
  // If this is the first point, set to placing points
  if (selectedPoints.value.length === 1) {
    currentStep.value = DRAWING_STEPS.PLACING_SECOND_POINT;
    emit('status-update', 'Continue clicking to add points. Press Enter when finished or double-click the last point.');
  }
  
  // Check for double click to complete polygon
  const now = Date.now();
  if (selectedPoints.value.length > 2 && now - lastClickTime < 300) {
    currentStep.value = DRAWING_STEPS.ADJUSTING_HEIGHT;
    emit('status-update', getStepMessage(currentStep.value));
    isExtruding.value = true;
  }
  lastClickTime = now;
};

const handleExtrusionGroundClick = (position) => {
  // Similar to polygon but will create an extrusion
  selectedPoints.value.push(position.clone());
  
  // If this is the first point, set to placing points
  if (selectedPoints.value.length === 1) {
    currentStep.value = DRAWING_STEPS.PLACING_SECOND_POINT;
    emit('status-update', 'Continue clicking to add points. Press Enter when finished or double-click the last point.');
  }
  
  // Check for double click to complete extrusion shape
  const now = Date.now();
  if (selectedPoints.value.length > 2 && now - lastClickTime < 300) {
    currentStep.value = DRAWING_STEPS.ADJUSTING_HEIGHT;
    emit('status-update', getStepMessage(currentStep.value));
    isExtruding.value = true;
    
    // Create extrusion
    const extrudedObject = createExtrusion(selectedPoints.value, currentHeight.value);
    completeDrawing(extrudedObject);
  }
  lastClickTime = now;
};

const getStepMessage = (step) => {
  switch(step) {
    case DRAWING_STEPS.PLACING_FIRST_POINT:
      return `Click to place the first point of your ${props.drawingMode}`;
    case DRAWING_STEPS.PLACING_SECOND_POINT:
      return `Click to place the second point of your ${props.drawingMode}`;
    case DRAWING_STEPS.ADJUSTING_HEIGHT:
      return `Drag up/down to adjust height, press Enter when finished`;
    default:
      return 'Click on the ground to start drawing';
  }
};

// Add onMounted hook to log the component status
onMounted(() => {
  console.log('Draw3DTools component mounted');
  console.log('Initial drawing mode:', props.drawingMode);
  console.log('isDrawing prop:', props.isDrawing);
  
  // Add a test listener to check if ground-click events are working
  window.addEventListener('ground-click', (event) => {
    console.log('Ground click event received in Draw3DTools onMounted listener:', event.detail);
  });
  
  // Add listener for debugging watch changes
  console.log('Adding event listeners for debugging');
});

// Clean up on unmount
onUnmounted(() => {
  console.log('Draw3DTools component unmounting');
  cleanupDrawingEvents();
  window.removeEventListener('ground-click', () => {});
});
</script> 