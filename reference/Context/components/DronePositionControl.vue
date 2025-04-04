<template>
  <div v-if="isVisible" class="drone-control-panel" :style="panelStyle">
    <div class="header" @mousedown="startDrag" ref="headerRef">
      <h3>Drone Position Control</h3>
      <v-btn icon size="small" @click="closePanel">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </div>
    
    <div class="control-section">
      <div class="position-controls">
        <div class="slider-control">
          <label>X Position (Left/Right)</label>
          <v-slider
            v-model="position.x"
            class="align-center"
            :min="-100"
            :max="100"
            :step="1"
            color="primary"
            track-color="grey-darken-1"
            thumb-label="always"
            @update:model-value="updatePosition"
          >
            <template v-slot:thumb-label="{ modelValue }">
              {{ modelValue }}ft
            </template>
          </v-slider>
        </div>
        
        <div class="slider-control">
          <label>Height (Y)</label>
          <v-slider
            v-model="position.y"
            class="align-center"
            :min="0"
            :max="400"
            :step="5"
            color="primary"
            track-color="grey-darken-1"
            thumb-label="always"
            @update:model-value="updatePosition"
          >
            <template v-slot:thumb-label="{ modelValue }">
              {{ modelValue }}ft
            </template>
          </v-slider>
        </div>
        
        <div class="slider-control">
          <label>Z Position (Forward/Back)</label>
          <v-slider
            v-model="position.z"
            class="align-center"
            :min="-100"
            :max="100"
            :step="1"
            color="primary"
            track-color="grey-darken-1"
            thumb-label="always"
            @update:model-value="updatePosition"
          >
            <template v-slot:thumb-label="{ modelValue }">
              {{ modelValue }}ft
            </template>
          </v-slider>
        </div>
      </div>
      
      <div class="camera-controls">
        <v-switch
          :model-value="missionStore.dronePosition.followCamera"
          color="primary"
          label="Camera Follows Drone"
          @update:model-value="toggleFollowCamera"
          hint="Centers view on drone but allows manual camera control"
          persistent-hint
        ></v-switch>
        
        <v-divider class="my-3"></v-divider>
        
        <v-switch
          :model-value="missionStore.dronePosition.showInfoPanel"
          color="warning"
          label="Info Panel"
          @update:model-value="toggleInfoPanel"
          hint="Show/hide hardware info in top-left corner"
          persistent-hint
        ></v-switch>
        
        <v-divider class="my-3"></v-divider>
        
        <v-switch
          v-model="enhancedVisualization"
          color="success"
          label="Enhanced 3D Visualization"
          @update:model-value="toggleEnhancedVisualization"
          hint="Toggle between simple and enhanced camera frustum and DOF visualization"
          persistent-hint
        ></v-switch>
      </div>
      
      <div class="camera-settings">
        <h4>Camera Settings</h4>
        <div class="setting-row">
          <v-select
            v-model="fStop"
            :items="availableFStops"
            label="F-Stop"
            variant="outlined"
            density="compact"
            bg-color="rgba(0, 0, 0, 0.2)"
            color="warning"
            class="setting-control"
            @update:model-value="updateCameraSettings"
          ></v-select>
          
          <v-text-field
            v-model.number="focusDistance"
            label="Focus Distance (ft)"
            type="number"
            min="1"
            max="1000"
            variant="outlined"
            density="compact"
            bg-color="rgba(0, 0, 0, 0.2)"
            color="warning"
            class="setting-control"
            @update:model-value="updateCameraSettings"
          ></v-text-field>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { useMissionStore } from '../store/missionStore'

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const missionStore = useMissionStore()

// Position state, initialize from store
const position = reactive({
  x: 0,
  y: 50,
  z: 0,
  followCamera: false
})

// Camera settings
const fStop = ref(2.8)
const focusDistance = ref(10)
const enhancedVisualization = ref(false)

// Available f-stops (common values)
const availableFStops = [
  1.4, 1.8, 2, 2.8, 4, 5.6, 8, 11, 16, 22
]

// Dragging functionality
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const panelPosition = ref({ x: 50, y: 50 })
const headerRef = ref(null)

// Panel style with position
const panelStyle = computed(() => {
  return {
    top: `${panelPosition.value.y}%`,
    left: `${panelPosition.value.x}%`,
    transform: 'translate(-50%, -50%)'
  }
})

// Start drag operation
const startDrag = (event) => {
  // Prevent dragging when clicking on the close button
  if (event.target.closest('.v-btn')) return
  
  isDragging.value = true
  
  // Calculate offset from click position to panel center
  const rect = event.currentTarget.getBoundingClientRect()
  const panelRect = event.currentTarget.parentElement.getBoundingClientRect()
  
  dragOffset.value = {
    x: event.clientX - panelRect.left - panelRect.width / 2,
    y: event.clientY - panelRect.top - panelRect.height / 2
  }
  
  // Add event listeners
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
}

// Handle drag movement
const handleDrag = (event) => {
  if (!isDragging.value) return
  
  // Calculate new position as percentage of viewport
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  
  // Calculate the new position
  const newX = ((event.clientX - dragOffset.value.x) / windowWidth) * 100
  const newY = ((event.clientY - dragOffset.value.y) / windowHeight) * 100
  
  // Update position
  panelPosition.value = {
    x: Math.max(10, Math.min(90, newX)), // Keep within 10-90% of screen width
    y: Math.max(10, Math.min(90, newY))  // Keep within 10-90% of screen height
  }
}

// Stop drag operation
const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// Clean up event listeners
onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
})

// Initialize from store
onMounted(() => {
  // Initialize position
  if (missionStore.dronePosition) {
    position.x = missionStore.dronePosition.x
    position.y = missionStore.dronePosition.y
    position.z = missionStore.dronePosition.z
    position.followCamera = missionStore.dronePosition.followCamera
    enhancedVisualization.value = missionStore.dronePosition.enhancedVisualization || false
  }
  
  // Initialize camera settings
  if (missionStore.hardware) {
    fStop.value = missionStore.hardware.fStop
    focusDistance.value = missionStore.hardware.focusDistance
  }
  
  // Center the panel initially
  panelPosition.value = { x: 50, y: 50 }
})

// Watch for store changes
watch(() => missionStore.dronePosition, (newPosition) => {
  if (newPosition) {
    position.x = newPosition.x
    position.y = newPosition.y
    position.z = newPosition.z
    position.followCamera = newPosition.followCamera
    enhancedVisualization.value = newPosition.enhancedVisualization || false
  }
}, { deep: true })

watch(() => missionStore.hardware, (newHardware) => {
  if (newHardware) {
    fStop.value = newHardware.fStop
    focusDistance.value = newHardware.focusDistance
  }
}, { deep: true })

// Update position in store
const updatePosition = () => {
  missionStore.setDronePosition({
    x: position.x,
    y: position.y,
    z: position.z,
    followCamera: position.followCamera
  })
}

// Toggle camera following
const toggleFollowCamera = () => {
  // Use the store's direct toggle method
  missionStore.toggleFollowCamera()
  
  // Synchronize our local state with the store
  position.followCamera = missionStore.dronePosition.followCamera
  
  console.log('Camera follow toggled to:', position.followCamera, 'Store value:', missionStore.dronePosition.followCamera)
}

// Toggle info panel visibility
const toggleInfoPanel = () => {
  // Use the store's direct toggle method
  missionStore.toggleInfoPanel()
  
  console.log('Info panel toggled to:', missionStore.dronePosition.showInfoPanel)
}

// Toggle enhanced visualization
const toggleEnhancedVisualization = () => {
  // Toggle the value in the store
  missionStore.setDronePosition({
    ...missionStore.dronePosition,
    enhancedVisualization: enhancedVisualization.value
  })
  
  console.log('Enhanced visualization toggled to:', enhancedVisualization.value)
}

// Update camera settings
const updateCameraSettings = () => {
  missionStore.updateCameraSettings({
    fStop: fStop.value,
    focusDistance: focusDistance.value
  })
}

// Close the panel
const closePanel = () => {
  emit('close')
}
</script>

<style scoped>
.drone-control-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.8);
  border-radius: 10px;
  padding: 20px;
  width: 460px;
  z-index: 1000;
  color: white;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 193, 7, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  cursor: move;
  touch-action: none;
  user-select: none;
}

.header h3 {
  margin: 0;
  color: var(--gecko-warning);
  font-size: 1.25rem;
}

.control-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.position-controls, .camera-controls, .camera-settings {
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 16px;
  border-left: 3px solid var(--gecko-warning);
}

.slider-control {
  margin-bottom: 16px;
}

.slider-control label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.camera-settings h4 {
  margin-top: 0;
  margin-bottom: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
}

.setting-row {
  display: flex;
  gap: 16px;
}

.setting-control {
  flex: 1;
}
</style> 