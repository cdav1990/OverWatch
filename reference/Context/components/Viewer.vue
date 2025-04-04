<template>
  <div class="viewer-container" :class="{ 'drawing-mode': isDrawing }" ref="containerRef">
    <!-- Add a dedicated takeoff indicator element -->
    <div id="takeoff-hover-indicator" class="takeoff-indicator" v-show="false">
      <div class="takeoff-indicator-label">Click to set take-off location</div>
    </div>
  </div>
</template>

<script>
// Using non-setup script to avoid Vue 3 reactivity issues with Three.js
import jscadService from '../services/JSCADService';
import { ref, onMounted, onBeforeUnmount } from 'vue';

export default {
  props: {
    isDrawing: { type: Boolean, default: false },
    activeDrawingMode: { type: String, default: '' }
  },
  
  data() {
    return {
      fps: 0,
      drawingToolsActive: false
    };
  },
  
  mounted() {
    // Delay initialization to ensure DOM is ready
    setTimeout(() => this.initThreeJs(), 100);
    
    // Add resize handler
    window.addEventListener('resize', this.handleResize);
    
    // Listen for drawing tool activation
    window.addEventListener('activate-drawing-tool', this.handleDrawingToolActivation);
    
    // Monitor for takeoff selection mode
    onMounted(() => {
      // Initial check
      this.addTakeoffSelectVisualIndicator();
      
      // Add event listeners for takeoff selection mode changes
      window.addEventListener('enter-takeoff-selection', this.addTakeoffSelectVisualIndicator);
      window.addEventListener('exit-takeoff-selection', () => {
        // Remove the visual indicator
        this.removeHoverIndicator();
        
        // Reset cursor
        if (this.$refs.containerRef) {
          this.$refs.containerRef.style.cursor = 'default';
        }
      });
    });
  },
  
  beforeUnmount() {
    // Cleanup
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('activate-drawing-tool', this.handleDrawingToolActivation);
    this.destroyThreeJs();
    
    // Clean up on unmount
    window.removeEventListener('enter-takeoff-selection', this.addTakeoffSelectVisualIndicator);
    window.removeEventListener('exit-takeoff-selection', this.removeHoverIndicator);
    
    // Remove any remaining indicator
    this.removeHoverIndicator();
    
    // Remove mousemove listener if it exists
    if (this.$refs.containerRef) {
      this.$refs.containerRef.removeEventListener('mousemove', this.handleCanvasMouseMove);
    }
  },
  
  watch: {
    isDrawing(newValue) {
      console.log('Drawing mode changed:', newValue);
      if (newValue) {
        this.enableDrawingMode();
      } else {
        this.disableDrawingMode();
      }
    },
    
    activeDrawingMode(newValue) {
      if (this.isDrawing && newValue) {
        console.log('Active drawing mode changed:', newValue);
      }
    }
  },
  
  // Expose methods to parent components
  expose: ['getScene', 'getCamera', 'getRenderer', 'getControls', 'enableDrawingMode', 'disableDrawingMode'],
  
  methods: {
    getScene() {
      return this._scene;
    },
    
    getCamera() {
      return this._camera;
    },
    
    getRenderer() {
      return this._renderer;
    },
    
    getControls() {
      return this._controls;
    },
    
    // New method to handle drawing tool activation
    handleDrawingToolActivation(event) {
      if (event.detail && this._isInitialized) {
        console.log('Viewer received drawing tool activation:', event.detail);
        
        const mode = event.detail.mode || '2d';
        const tool = event.detail.tool || 'polygon';
        
        // Set the prop directly to ensure Vue reactivity
        this.isDrawing = true;
        this.activeDrawingMode = mode;
        
        // Force immediate DOM updates
        this.$nextTick(() => {
          // Enable drawing mode in the viewer
          this.drawingToolsActive = true;
          
          // Apply correct class and cursor to container
          if (this.$refs.containerRef) {
            console.log('Setting drawing cursor style - adding drawing-mode class');
            this.$refs.containerRef.classList.add('drawing-mode');
            
            // Set the cursor style based on the tool
            if (tool === 'select') {
              this.$refs.containerRef.style.cursor = 'default';
            } else {
              this.$refs.containerRef.style.cursor = 'crosshair';
            }
          } else {
            console.error('Container ref not available');
          }
          
          // Disable orbit controls to prevent interference
          if (this._controls) {
            this._controls.enabled = false;
          }
          
          // Emit that we're ready for drawing
          this.$emit('drawing-mode-activated', {
            mode: mode,
            tool: tool,
            scene: this._scene,
            camera: this._camera,
            renderer: this._renderer
          });
          
          console.log('Drawing tools activated in viewer with cursor:', this.$refs.containerRef?.style.cursor);
        });
      }
    },
    
    // New method to enable drawing mode
    enableDrawingMode() {
      if (this._isInitialized && this.$refs.containerRef) {
        this.drawingToolsActive = true;
        this.$refs.containerRef.classList.add('drawing-mode');
        this.$refs.containerRef.style.cursor = 'crosshair';
        
        // Disable orbit controls temporarily
        if (this._controls) {
          this._controls.enabled = false;
        }
        
        console.log('Drawing mode enabled in viewer');
      }
    },
    
    // New method to disable drawing mode
    disableDrawingMode() {
      if (this._isInitialized && this.$refs.containerRef) {
        this.drawingToolsActive = false;
        this.$refs.containerRef.classList.remove('drawing-mode');
        this.$refs.containerRef.style.cursor = 'default';
        
        // Re-enable orbit controls
        if (this._controls) {
          this._controls.enabled = true;
        }
        
        console.log('Drawing mode disabled in viewer');
      }
    },
    
    initThreeJs() {
      // Import Three.js dynamically to avoid reactivity issues
      import('three').then(THREE => {
        import('three/examples/jsm/controls/OrbitControls.js').then(({ OrbitControls }) => {
          // Keep three.js objects outside of Vue's reactivity system
          this._three = THREE;
          this._scene = new THREE.Scene();
          this._scene.background = new THREE.Color(0x1a1a1a);
          
          const container = this.$refs.containerRef;
          if (!container) return;
          
          // Setup basic dimensions
          const width = container.clientWidth || window.innerWidth;
          const height = container.clientHeight || window.innerHeight;
          
          // Create camera
          this._camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
          this._camera.position.set(15, 15, 15);
          this._camera.lookAt(0, 0, 0);
          
          // Create renderer - use basic settings to avoid issues
          this._renderer = new THREE.WebGLRenderer({ antialias: false });
          this._renderer.setSize(width, height);
          this._renderer.setClearColor(0x1a1a1a);
          container.appendChild(this._renderer.domElement);
          
          // Store origin coordinates
          this._scene.userData = {
            originCoordinates: {
              lat: 37.7749,
              lng: -122.4194,
              alt: 0
            }
          };
          
          // Add simple grid
          const gridHelper = new THREE.GridHelper(50, 50, 0x222222, 0x444444);
          this._scene.add(gridHelper);
          
          // Add ground plane
          const groundGeometry = new THREE.PlaneGeometry(50, 50);
          const groundMaterial = new THREE.MeshBasicMaterial({
            color: 0x222222,
            side: THREE.DoubleSide,
          });
          const ground = new THREE.Mesh(groundGeometry, groundMaterial);
          ground.rotation.x = Math.PI / 2;
          ground.position.y = -0.01;
          ground.name = 'ground';
          ground.userData = { 
            isGround: true,
            type: 'ground'
          };
          this._scene.add(ground);
          console.log('Added ground plane to scene with name:', ground.name);
          
          // Add a red cube for testing
          const boxGeometry = new THREE.BoxGeometry(3, 3, 3);
          const boxMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
          const box = new THREE.Mesh(boxGeometry, boxMaterial);
          box.position.set(0, 1.5, 0);
          box.userData = { isInteractiveObject: true };
          this._scene.add(box);
          
          // Add a blue sphere
          const sphereGeometry = new THREE.SphereGeometry(2, 16, 16);
          const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
          sphere.position.set(8, 2, 8);
          sphere.userData = { isInteractiveObject: true };
          this._scene.add(sphere);
          
          // Add simple controls without damping
          this._controls = new OrbitControls(this._camera, this._renderer.domElement);
          this._controls.enableDamping = false;
          
          // Add click handler
          this._renderer.domElement.addEventListener('click', this.handleCanvasClick);
          
          // Add mousemove handler for drawing previews
          this._renderer.domElement.addEventListener('mousemove', this.handleCanvasMouseMove);
          
          // Setup animation variables outside Vue's reactivity
          this._frameCount = 0;
          this._lastTime = performance.now();
          this._isInitialized = true;
          
          // Initialize JSCAD service with Three.js scene and library
          jscadService.initialize(this._scene, THREE);
          
          // Start rendering
          this.startAnimation();
          
          // Emit scene ready event
          this.$emit('scene-ready', this._scene);
        });
      });
    },
    
    startAnimation() {
      // Keep the animation loop outside of Vue's reactivity
      const animate = () => {
        if (!this._isInitialized) return;
        
        requestAnimationFrame(animate);
        
        // Update FPS counter
        this._frameCount++;
        const currentTime = performance.now();
        if (currentTime - this._lastTime >= 1000) {
          this.fps = Math.round((this._frameCount * 1000) / (currentTime - this._lastTime));
          this._frameCount = 0;
          this._lastTime = currentTime;
        }
        
        // Render with minimal operations
        if (this._renderer && this._scene && this._camera) {
          this._renderer.render(this._scene, this._camera);
        }
      };
      
      animate();
    },
    
    handleResize() {
      if (!this._camera || !this._renderer || !this.$refs.containerRef) return;
      
      const width = this.$refs.containerRef.clientWidth;
      const height = this.$refs.containerRef.clientHeight;
      
      this._camera.aspect = width / height;
      this._camera.updateProjectionMatrix();
      
      this._renderer.setSize(width, height);
    },
    
    handleCanvasClick(event) {
      if (!this._isInitialized) return;
      
      // Log click for debugging
      console.log('Canvas click detected in Viewer, drawing active:', this.drawingToolsActive);
      
      // Get mouse position
      const THREE = this._three;
      const mouse = new THREE.Vector2();
      const rect = this._renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Raycasting
      this.raycaster = this.raycaster || new THREE.Raycaster();
      this.raycaster.setFromCamera(mouse, this._camera);
      
      // Check for intersections
      const intersects = this.raycaster.intersectObjects(this._scene.children, true);
      
      console.log('Canvas click - intersects:', intersects.length);
      
      // If in drawing mode - handle it differently
      if (this.drawingToolsActive || this.isDrawing) {
        console.log('Drawing click processing in Viewer');
        
        if (intersects.length > 0) {
          const intersect = intersects[0];
          console.log('Drawing click at point:', intersect.point);
          
          // Create a custom event with the proper detail structure
          const drawingClickEvent = new CustomEvent('drawing-click', {
            detail: { 
              position: {
                x: intersect.point.x,
                y: intersect.point.y, 
                z: intersect.point.z
              },
              mouse: mouse,
              activeMode: this.activeDrawingMode,
              originalEvent: event
            }
          });
          
          // Dispatch the event
          window.dispatchEvent(drawingClickEvent);
          
          // Also emit for Vue component communication
          this.$emit('drawing-click', {
            position: intersect.point,
            mouse: mouse,
            activeMode: this.activeDrawingMode,
            originalEvent: event
          });
          
          // Prevent further processing
          return;
        }
      }
      
      // Normal processing for non-drawing mode
      if (intersects.length > 0) {
        const intersect = intersects[0];
        console.log('Clicked object:', intersect.object.name || 'unnamed', intersect.object.userData);
        
        // Handle ground click - match any object with isGround userData flag or 'ground' name
        if (intersect.object.name === 'ground' || 
            (intersect.object.userData && intersect.object.userData.isGround)) {
          console.log('Ground click detected at', intersect.point);
          
          // Create a custom event with the proper detail structure
          const groundClickEvent = new CustomEvent('ground-click', {
            detail: { 
              position: {
                x: intersect.point.x,
                y: intersect.point.y, 
                z: intersect.point.z
              }
            }
          });
          
          // Dispatch the event directly
          window.dispatchEvent(groundClickEvent);
          
          // Also emit for Vue component communication
          this.$emit('ground-click', { 
            position: {
              x: intersect.point.x,
              y: intersect.point.y,
              z: intersect.point.z
            }
          });
        } 
        // Handle object click
        else {
          console.log('Object click:', intersect.object);
          this.$emit('object-click', {
            objectId: intersect.object.id,
            position: intersect.point,
            object: intersect.object,
            isInteractiveObject: intersect.object.userData && 
                                 intersect.object.userData.isInteractiveObject
          });
        }
      }
    },
    
    handleCanvasMouseMove(event) {
      if (!this._isInitialized) return;
      
      // For drawing mode cursor enhancement
      if (this.drawingToolsActive || this.isDrawing) {
        // Update custom cursor position if enabled
        const cursorOverlay = document.querySelector('.drawing-mode::after');
        if (cursorOverlay) {
          cursorOverlay.style.left = `${event.clientX}px`;
          cursorOverlay.style.top = `${event.clientY}px`;
          cursorOverlay.style.display = 'block';
        }
        
        // Get mouse position for raycasting
        const THREE = this._three;
        const mouse = new THREE.Vector2();
        const rect = this._renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Raycasting
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this._camera);
        
        // Check for intersections
        const intersects = raycaster.intersectObjects(this._scene.children, true);
        
        if (intersects.length > 0) {
          const intersect = intersects[0];
          
          // Emit mouse move event with position data
          this.$emit('drawing-mousemove', { 
            position: intersect.point,
            normalizedPosition: mouse
          });
          
          // Dispatch global event for other components
          window.dispatchEvent(new CustomEvent('drawing-mousemove', {
            detail: { 
              position: intersect.point,
              mouse: mouse
            }
          }));
        }
      }
      
      // For take-off selection mode
      if (document.body.classList.contains('takeoff-selection-mode')) {
        this.showHoverIndicator(event);
      }
    },
    
    destroyThreeJs() {
      if (this._renderer) {
        this._renderer.domElement.removeEventListener('click', this.handleCanvasClick);
        this._renderer.domElement.removeEventListener('mousemove', this.handleCanvasMouseMove);
        this._renderer.dispose();
      }
      
      if (this._controls) {
        this._controls.dispose();
      }
      
      // Clear references
      this._isInitialized = false;
      this._scene = null;
      this._camera = null;
      this._renderer = null;
      this._controls = null;
    },
    
    addTakeoffSelectVisualIndicator() {
      // Check if we're in takeoff selection mode
      const takeoffSelectionActive = document.body.classList.contains('takeoff-selection-mode');
      
      if (takeoffSelectionActive) {
        // Show the indicator (already styled to appear only in takeoff-selection-mode)
        const indicator = document.getElementById('takeoff-hover-indicator');
        if (indicator) {
          indicator.style.display = 'block';
        }
        
        // Add global mousemove listener for better tracking
        document.addEventListener('mousemove', this.showHoverIndicator);
      } else {
        // Hide the indicator
        this.removeHoverIndicator();
        
        // Remove the global mousemove listener
        document.removeEventListener('mousemove', this.showHoverIndicator);
      }
    },
    
    showHoverIndicator(event) {
      // Get the fixed indicator element
      const indicator = document.getElementById('takeoff-hover-indicator');
      if (indicator) {
        // Update position to follow mouse
        indicator.style.left = `${event.clientX}px`;
        indicator.style.top = `${event.clientY}px`;
      }
    },
    
    removeHoverIndicator() {
      // Just hide the indicator rather than removing it
      const indicator = document.getElementById('takeoff-hover-indicator');
      if (indicator) {
        indicator.style.display = 'none';
      }
    }
  }
};
</script>

<style>
.viewer-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #121212;
}

/* Add drawing mode cursor styles */
.drawing-mode {
  cursor: crosshair !important;
}

/* Make the cursor more visible with a custom overlay */
.drawing-mode::after {
  content: "";
  position: absolute;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 255, 255, 0.8);
  border-radius: 50%;
  pointer-events: none;
  z-index: 9999;
  transition: all 0.1s ease;
  display: none; /* Initially hidden, shown via JS */
}

/* When drawing mode is active, show the cursor indicator */
.viewer-container.drawing-mode::after {
  display: block !important;
}

/* Takeoff selection indicator styles */
.takeoff-indicator {
  position: absolute;
  width: 40px;
  height: 40px;
  background-color: rgba(33, 150, 243, 0.3);
  border: 2px solid rgba(33, 150, 243, 0.8);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 1000;
  display: none;
}

.takeoff-indicator-label {
  position: absolute;
  top: 45px;
  left: 50%;
  transform: translateX(-50%);
  color: white;
  background-color: rgba(0,0,0,0.7);
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 14px;
  white-space: nowrap;
}

/* When in takeoff selection mode, show the indicator */
body.takeoff-selection-mode .takeoff-indicator {
  display: block !important;
}
</style>

<script setup>
// If we're in take-off selection mode, change cursor and add visual indicator
const addTakeoffSelectVisualIndicator = () => {
  // Check if we're in takeoff selection mode
  const takeoffSelectionActive = document.body.classList.contains('takeoff-selection-mode');
  
  if (takeoffSelectionActive) {
    // Change cursor style
    container.value.style.cursor = 'crosshair';
    
    // Add hover effect to the scene
    container.value.addEventListener('mousemove', showHoverIndicator);
  } else {
    container.value.style.cursor = 'default';
    container.value.removeEventListener('mousemove', showHoverIndicator);
    
    // Remove any existing hover indicator
    removeHoverIndicator();
  }
};

// Show hover indicator at mouse position
const showHoverIndicator = (event) => {
  // Get the fixed indicator element
  const indicator = document.getElementById('takeoff-hover-indicator');
  if (indicator) {
    // Update position to follow mouse
    indicator.style.left = `${event.clientX}px`;
    indicator.style.top = `${event.clientY}px`;
  }
};

// Remove hover indicator
const removeHoverIndicator = () => {
  // Just hide the indicator rather than removing it
  const indicator = document.getElementById('takeoff-hover-indicator');
  if (indicator) {
    indicator.style.display = 'none';
  }
};
</script> 