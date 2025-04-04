<template>
  <div class="drawing-tools">
    <v-card class="drawing-card">
      <v-card-title class="d-flex justify-space-between align-center">
        <span>Drawing Tools</span>
        <v-btn icon @click="$emit('close')">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      
      <v-divider></v-divider>
      
      <v-card-text>
        <v-tabs v-model="activeTab">
          <v-tab value="3d">3D Shapes</v-tab>
          <v-tab value="2d">2D Shapes</v-tab>
        </v-tabs>
        
        <v-window v-model="activeTab" class="mt-2">
          <!-- 3D Shapes Tab -->
          <v-window-item value="3d">
            <div class="shape-grid">
              <v-card 
                v-for="shape in shapes3D" 
                :key="shape.id"
                @click="selectShape(shape)"
                :class="{ 
                  'selected-shape': selectedShapeId === shape.id,
                  'active-drawing-shape': isActiveDrawing && activeShape === shape.id
                }"
                class="shape-card"
                elevation="1"
                variant="outlined"
              >
                <v-card-text class="text-center">
                  <v-icon :icon="shape.icon" size="large" color="primary"></v-icon>
                  <div class="shape-name">{{ shape.name }}</div>
                </v-card-text>
              </v-card>
            </div>
          </v-window-item>
          
          <!-- 2D Shapes Tab -->
          <v-window-item value="2d">
            <div class="shape-grid">
              <v-card 
                v-for="shape in shapes2D" 
                :key="shape.id"
                @click="selectShape(shape)"
                :class="{ 
                  'selected-shape': selectedShapeId === shape.id,
                  'active-drawing-shape': isActiveDrawing && activeShape === shape.id
                }"
                class="shape-card"
                elevation="1"
                variant="outlined"
              >
                <v-card-text class="text-center">
                  <v-icon :icon="shape.icon" size="large" color="primary"></v-icon>
                  <div class="shape-name">{{ shape.name }}</div>
                </v-card-text>
              </v-card>
            </div>
          </v-window-item>
        </v-window>
        
        <!-- Options for selected shape -->
        <div v-if="selectedShape && !isActiveDrawing" class="mt-4">
          <v-divider class="mb-4"></v-divider>
          
          <v-card class="options-card" variant="outlined">
            <v-card-title>{{ selectedShape.name }} Options</v-card-title>
            
            <v-card-text>
              <!-- Common options for all shapes -->
              <v-row>
                <v-col cols="12">
                  <v-color-picker
                    v-model="shapeOptions.color"
                    hide-inputs
                    hide-canvas
                    show-swatches
                    swatches-max-height="120px"
                  ></v-color-picker>
                </v-col>
              </v-row>
              
              <!-- Box options -->
              <template v-if="selectedShape.id === 'box'">
                <v-row>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model.number="shapeOptions.box.width"
                      label="Width"
                      type="number"
                      min="0.1"
                      step="0.1"
                      density="compact"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model.number="shapeOptions.box.height"
                      label="Height"
                      type="number"
                      min="0.1"
                      step="0.1"
                      density="compact"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model.number="shapeOptions.box.depth"
                      label="Depth"
                      type="number"
                      min="0.1"
                      step="0.1"
                      density="compact"
                    ></v-text-field>
                  </v-col>
                </v-row>
              </template>
              
              <!-- Sphere options -->
              <template v-if="selectedShape.id === 'sphere'">
                <v-row>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model.number="shapeOptions.sphere.radius"
                      label="Radius"
                      type="number"
                      min="0.1"
                      step="0.1"
                      density="compact"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model.number="shapeOptions.sphere.segments"
                      label="Segments"
                      type="number"
                      min="8"
                      step="1"
                      density="compact"
                    ></v-text-field>
                  </v-col>
                </v-row>
              </template>
              
              <!-- Cylinder options -->
              <template v-if="selectedShape.id === 'cylinder'">
                <v-row>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model.number="shapeOptions.cylinder.radius"
                      label="Radius"
                      type="number"
                      min="0.1"
                      step="0.1"
                      density="compact"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model.number="shapeOptions.cylinder.height"
                      label="Height"
                      type="number"
                      min="0.1"
                      step="0.1"
                      density="compact"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model.number="shapeOptions.cylinder.segments"
                      label="Segments"
                      type="number"
                      min="8"
                      step="1"
                      density="compact"
                    ></v-text-field>
                  </v-col>
                </v-row>
              </template>
              
              <!-- Rectangle options -->
              <template v-if="selectedShape.id === 'rectangle'">
                <v-row>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model.number="shapeOptions.rectangle.width"
                      label="Width"
                      type="number"
                      min="0.1"
                      step="0.1"
                      density="compact"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model.number="shapeOptions.rectangle.length"
                      label="Length"
                      type="number"
                      min="0.1"
                      step="0.1"
                      density="compact"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model.number="shapeOptions.rectangle.extrude"
                      label="Extrude"
                      type="number"
                      min="0.01"
                      step="0.01"
                      density="compact"
                    ></v-text-field>
                  </v-col>
                </v-row>
              </template>
              
              <!-- Circle options -->
              <template v-if="selectedShape.id === 'circle'">
                <v-row>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model.number="shapeOptions.circle.radius"
                      label="Radius"
                      type="number"
                      min="0.1"
                      step="0.1"
                      density="compact"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model.number="shapeOptions.circle.segments"
                      label="Segments"
                      type="number"
                      min="8"
                      step="1"
                      density="compact"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model.number="shapeOptions.circle.extrude"
                      label="Extrude"
                      type="number"
                      min="0.01"
                      step="0.01"
                      density="compact"
                    ></v-text-field>
                  </v-col>
                </v-row>
              </template>
            </v-card-text>
          </v-card>
          
          <!-- Action buttons -->
          <div class="d-flex justify-end mt-4">
            <v-btn color="error" variant="outlined" class="mr-2" @click="cancelDrawing">
              Cancel
            </v-btn>
            <v-btn color="primary" @click="startDrawing">
              Start Drawing
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import jscadService from '../services/JSCADService';

export default {
  props: {
    isActiveDrawing: {
      type: Boolean,
      default: false
    },
    activeShape: {
      type: String,
      default: null
    }
  },
  
  emits: ['close', 'drawing-started', 'drawing-stopped'],
  
  setup(props, { emit }) {
    // Tabs and shapes
    const activeTab = ref('3d');
    const selectedShapeId = ref(null);
    const isDrawing = ref(false);
    
    // Definition of available shapes
    const shapes3D = [
      { id: 'box', name: 'Box', icon: 'mdi-cube-outline', type: '3d' },
      { id: 'sphere', name: 'Sphere', icon: 'mdi-circle-outline', type: '3d' },
      { id: 'cylinder', name: 'Cylinder', icon: 'mdi-cylinder', type: '3d' },
    ];
    
    const shapes2D = [
      { id: 'rectangle', name: 'Rectangle', icon: 'mdi-rectangle-outline', type: '2d' },
      { id: 'circle', name: 'Circle', icon: 'mdi-circle-outline', type: '2d' },
    ];
    
    // Shape options with default values
    const shapeOptions = ref({
      color: '#1976D2',
      box: {
        width: 1,
        height: 1,
        depth: 1,
      },
      sphere: {
        radius: 1,
        segments: 32
      },
      cylinder: {
        radius: 0.5,
        height: 2,
        segments: 32
      },
      rectangle: {
        width: 2,
        length: 1,
        extrude: 0.1
      },
      circle: {
        radius: 1,
        segments: 32,
        extrude: 0.1
      }
    });
    
    // Get the currently selected shape
    const selectedShape = computed(() => {
      return [...shapes3D, ...shapes2D].find(shape => shape.id === selectedShapeId.value);
    });
    
    // Watch for active shape changes from parent
    watch(() => props.activeShape, (newShape) => {
      if (newShape && !selectedShapeId.value) {
        // Auto-select the active shape if none is selected
        selectedShapeId.value = newShape;
        
        // Switch to appropriate tab
        const is3DShape = shapes3D.some(shape => shape.id === newShape);
        activeTab.value = is3DShape ? '3d' : '2d';
      }
    });
    
    // Select a shape
    const selectShape = (shape) => {
      // If already drawing, don't change selection
      if (props.isActiveDrawing) return;
      
      selectedShapeId.value = shape.id;
    };
    
    // Start drawing
    const startDrawing = () => {
      if (!selectedShape.value || props.isActiveDrawing) return;
      
      isDrawing.value = true;
      
      // Notify parent component
      emit('drawing-started', {
        shapeType: selectedShape.value.id,
        options: shapeOptions.value
      });
      
      // Add ESC key handler
      document.addEventListener('keydown', handleKeyDown);
    };
    
    // Stop drawing
    const stopDrawing = () => {
      isDrawing.value = false;
      
      // Notify parent component
      emit('drawing-stopped');
      
      // Remove ESC key handler
      document.removeEventListener('keydown', handleKeyDown);
    };
    
    // Cancel drawing
    const cancelDrawing = () => {
      isDrawing.value = false;
      selectedShapeId.value = null;
      
      // Notify parent component
      emit('drawing-stopped');
      
      // Remove ESC key handler
      document.removeEventListener('keydown', handleKeyDown);
    };
    
    // Handle keydown events
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        cancelDrawing();
      }
    };
    
    // Clean up on unmount
    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeyDown);
    });
    
    return {
      activeTab,
      shapes3D,
      shapes2D,
      selectedShapeId,
      selectedShape,
      shapeOptions,
      isDrawing,
      selectShape,
      startDrawing,
      stopDrawing,
      cancelDrawing
    };
  }
};
</script>

<style scoped>
.drawing-tools {
  position: relative;
}

.drawing-card {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

.shape-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.shape-card {
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.shape-card:hover {
  background-color: rgba(25, 118, 210, 0.1);
}

.selected-shape {
  border-color: var(--v-primary-base);
  background-color: rgba(25, 118, 210, 0.1);
}

.active-drawing-shape {
  border-color: rgba(76, 175, 80, 0.8);
  background-color: rgba(76, 175, 80, 0.1);
  position: relative;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
}

.active-drawing-shape::after {
  content: 'Active';
  position: absolute;
  top: 5px;
  right: 5px;
  font-size: 10px;
  background-color: rgba(76, 175, 80, 0.8);
  color: white;
  padding: 2px 4px;
  border-radius: 3px;
}

.shape-name {
  margin-top: 8px;
  font-size: 14px;
}

.options-card {
  margin-top: 16px;
}
</style> 