import { logStartupEvent, trackError, registerModule } from '../utils/buildInfo';

// Export drawing states for convenience
export const DRAWING_STATES = {
  IDLE: 'idle',
  DRAWING: 'drawing',
  FINISHED: 'finished'
};

// Drawing service states
export const DRAWING_STATE = {
  IDLE: 'idle',
  DRAWING: 'drawing',
  FINISHED: 'finished'
};

/**
 * Minimal Drawing Service for 3D scene interactions
 * Avoids Three.js imports and reactive state
 */
class DrawingService {
  constructor() {
    this.scene = null;
    this.THREE = null;
    this.initialized = false;
    this.state = DRAWING_STATE.IDLE;
    this.currentTool = null;
    this.drawingObjects = [];
    this.options = {
      height: 2,
      color: '#ff0000',
      opacity: 0.7
    };
    
    // Register this module
    registerModule('DrawingService');
    logStartupEvent('Drawing service created (minimal version)');
  }

  /**
   * Initialize with Three.js scene and THREE library
   */
  initialize(scene, THREE) {
    try {
      logStartupEvent('Initializing drawing service');
      
      // Store references without making them reactive
      this.scene = scene;
      this.THREE = THREE;
      
      this.initialized = true;
      logStartupEvent('Drawing service initialized successfully');
      return true;
    } catch (error) {
      trackError(error);
      return false;
    }
  }
  
  /**
   * Basic drawing operation - just creates a simple cube at the clicked position
   */
  handleClick(position) {
    if (!this.scene || !this.THREE || !this.currentTool) return false;
    
    console.log('Processing drawing click at position:', position);
    
    try {
      // Create a simple cube at the clicked position
      const size = 1;
      const geometry = new this.THREE.BoxGeometry(size, size, size);
      const material = new this.THREE.MeshBasicMaterial({ 
        color: this.options.color 
      });
      
      const cube = new this.THREE.Mesh(geometry, material);
      cube.position.set(position.x, size/2, position.z);
      
      // Add to scene and track
      this.scene.add(cube);
      this.drawingObjects.push(cube);
      
      return true;
    } catch (error) {
      console.error('Error creating object:', error);
      return false;
    }
  }
  
  /**
   * Start drawing with the specified tool
   */
  startDrawing(toolType) {
    this.currentTool = toolType;
    this.state = DRAWING_STATE.DRAWING;
    return true;
  }
  
  /**
   * Stop the current drawing operation
   */
  stopDrawing() {
    this.state = DRAWING_STATE.IDLE;
    this.currentTool = null;
    return true;
  }
  
  /**
   * Set drawing options
   */
  setOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    return true;
  }
  
  /**
   * Clear all drawing objects
   */
  clearObjects() {
    if (!this.scene) return false;
    
    try {
      // Remove all tracked objects from scene
      for (const obj of this.drawingObjects) {
        this.scene.remove(obj);
      }
      
      // Clear tracking array
      this.drawingObjects = [];
      return true;
    } catch (error) {
      console.error('Error clearing objects:', error);
      return false;
    }
  }
}

// Create a singleton instance
const drawingService = new DrawingService();

// Export the singleton instance
export default drawingService;