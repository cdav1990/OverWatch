<template>
  <div class="mission-precheck" :class="{ 'minimized': isMinimized }">
    <div class="precheck-header">
      <h3>Step #1 Mission Prechecks</h3>
      <div class="header-buttons">
        <v-btn
          icon
          variant="text"
          size="small"
          @click="toggleMinimize"
        >
          <v-icon :icon="isMinimized ? 'mdi-chevron-up' : 'mdi-chevron-down'" />
        </v-btn>
        <v-btn
          icon
          variant="text"
          size="small"
          @click="closePanel"
        >
          <v-icon icon="mdi-close" />
        </v-btn>
      </div>
    </div>

    <div class="precheck-content" v-show="!isMinimized">
      <!-- Page indicator -->
      <div class="page-indicator">
        <div 
          v-for="(page, index) in totalPages" 
          :key="index"
          class="page-dot"
          :class="{ 'active': currentPage === index + 1 }"
          @click="goToPage(index + 1)"
        ></div>
      </div>

      <!-- Page 1: Takeoff Location (previously Page 2) -->
      <div v-if="currentPage === 1" class="precheck-page">
        <h4>Takeoff Location</h4>
        <div class="takeoff-options">
          <v-btn 
            color="primary" 
            variant="outlined" 
            size="small"
            class="mb-2"
            @click="setTakeoffMode"
          >
            <v-icon icon="mdi-map-marker" class="mr-1" />
            Select on Map
          </v-btn>
          
          <div v-if="hasTakeoffLocation" class="takeoff-coords">
            <div class="coord-label">
              <v-icon icon="mdi-latitude" size="small" class="mr-1" />
              Lat: {{ formatCoord(takeoffLocation.lat) }}
            </div>
            <div class="coord-label">
              <v-icon icon="mdi-longitude" size="small" class="mr-1" />
              Lon: {{ formatCoord(takeoffLocation.lng) }}
            </div>
          </div>
          <div v-else class="no-takeoff">
            No takeoff location set
          </div>
        </div>
      </div>

      <!-- Page 2: Flight Parameters (previously Page 4) -->
      <div v-if="currentPage === 2" class="precheck-page">
        <h4>Flight Parameters</h4>
        <div class="flight-params">
          <div class="param-group">
            <h5 class="param-subheading">Altitude & Speed</h5>
            <v-slider
              v-model="flightAltitude"
              label="Flight Altitude (m)"
              min="10"
              max="120"
              thumb-label
              class="mb-2"
            >
              <template v-slot:append>
                <v-text-field
                  v-model="flightAltitude"
                  type="number"
                  style="width: 70px"
                  density="compact"
                  variant="outlined"
                  hide-details
                  min="10"
                  max="120"
                ></v-text-field>
              </template>
            </v-slider>

            <v-text-field
              v-model.number="initialAltitude"
              label="Initial Altitude (m)"
              type="number"
              min="5"
              max="120"
              density="compact"
              variant="outlined"
              class="mb-2"
              hint="Height to climb before mission starts"
              persistent-hint
            ></v-text-field>

            <v-text-field
              v-model.number="climbSpeed"
              label="Climb Speed (m/s)"
              type="number"
              min="1" 
              max="10"
              density="compact"
              variant="outlined"
              class="mb-2"
            ></v-text-field>

            <v-text-field
              v-model.number="missionSpeed"
              label="Mission Speed (m/s)"
              type="number"
              min="1"
              max="20"
              density="compact"
              variant="outlined"
              class="mb-2"
              hint="Speed during data capture"
              persistent-hint
            ></v-text-field>

            <v-text-field
              v-model.number="transitSpeed"
              label="Transit Speed (m/s)"
              type="number"
              min="1"
              max="20"
              density="compact"
              variant="outlined"
              class="mb-4"
              hint="Speed between waypoints"
              persistent-hint
            ></v-text-field>
          </div>

          <div class="param-group">
            <h5 class="param-subheading">Safety Settings</h5>
            <v-select
              v-model="returnToHome"
              :items="returnOptions"
              label="Return to Home Behavior"
              variant="outlined"
              density="compact"
              class="mb-2"
            ></v-select>
            
            <v-select
              v-model="lossOfCommsBehavior"
              :items="commLossOptions"
              label="Loss of Comms Behavior"
              variant="outlined"
              density="compact"
              class="mb-2"
              hint="Behavior if drone loses connection"
              persistent-hint
            ></v-select>
          </div>
        </div>
      </div>

      <!-- Page 3: GSD Requirements (previously Page 5) -->
      <div v-if="currentPage === 3" class="precheck-page">
        <h4>GSD Requirements</h4>
        <div class="gsd-container">
          <v-radio-group v-model="gsdMode" inline>
            <v-radio value="auto" label="Auto (Based on altitude)"></v-radio>
            <v-radio value="target" label="Target GSD"></v-radio>
          </v-radio-group>
          
          <div v-if="gsdMode === 'target'" class="gsd-target">
            <v-text-field
              v-model="targetGSD"
              label="Target GSD (cm/pixel)"
              type="number"
              density="compact"
              variant="outlined"
              min="0.5"
              max="20"
            ></v-text-field>
            <p class="gsd-help">Altitude will be adjusted to achieve this GSD</p>
          </div>
          
          <div class="gsd-preview">
            <span class="preview-label">Estimated GSD:</span>
            <span class="preview-value">{{ estimatedGSD }} cm/pixel</span>
          </div>
        </div>
      </div>

      <!-- Page 4: Safety Settings (previously Page 6) -->
      <div v-if="currentPage === 4" class="precheck-page">
        <h4>Safety Settings</h4>
        <div class="safety-settings">
          <v-select
            v-model="returnToHome"
            :items="returnOptions"
            label="Return to Home"
            variant="outlined"
            density="compact"
            class="mb-2"
          ></v-select>
          
          <v-text-field
            v-model="failsafeAltitude"
            label="Failsafe Altitude (m)"
            type="number"
            density="compact"
            variant="outlined"
            min="20"
            max="120"
            class="mb-2"
          ></v-text-field>
          
          <v-select
            v-model="missionEndBehavior"
            :items="endBehaviorOptions"
            label="Mission End Behavior"
            variant="outlined"
            density="compact"
          ></v-select>
        </div>
      </div>

      <!-- Navigation Buttons -->
      <div class="page-navigation">
        <v-btn
          variant="outlined"
          :disabled="currentPage === 1"
          @click="prevPage"
          size="small"
        >
          Back
        </v-btn>
        
        <div class="page-indicator-text">
          {{ currentPage }} / {{ totalPages }}
        </div>
        
        <v-btn
          v-if="currentPage < totalPages"
          color="primary"
          :disabled="!canProceedFromCurrentPage"
          @click="nextPage"
          size="small"
        >
          Next
        </v-btn>
        
        <v-btn
          v-else
          color="primary"
          :disabled="!isReadyToStart"
          @click="startMission"
          size="small"
        >
          Start Mission
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, inject } from 'vue'
import { useMissionStore } from '../store/missionStore'

const store = useMissionStore()
// Start expanded by default since we're explicitly showing this component
const isMinimized = ref(false)
const currentPage = ref(1)
const totalPages = 4

// Get panel state from parent
const panelStates = inject('panelStates')

const flightAltitude = ref(50)
const initialAltitude = ref(20)
const climbSpeed = ref(3)
const missionSpeed = ref(5)
const transitSpeed = ref(7)
const gsdMode = ref('auto')
const targetGSD = ref(2.5)
const returnToHome = ref('takeoff')
const lossOfCommsBehavior = ref('rtl')
const failsafeAltitude = ref(30)
const missionEndBehavior = ref('rtl')

const returnOptions = [
  { title: 'Return to Takeoff', value: 'takeoff' },
  { title: 'Return to First Waypoint', value: 'first_waypoint' },
  { title: 'Return to Last Waypoint', value: 'last_waypoint' }
]
const commLossOptions = [
  { title: 'Return to Home', value: 'rtl' },
  { title: 'Land in Place', value: 'land' },
  { title: 'Continue Mission', value: 'continue' }
]
const endBehaviorOptions = [
  { title: 'Return to Home', value: 'rtl' },
  { title: 'Land at Last Waypoint', value: 'land' },
  { title: 'Hover in Place', value: 'hover' }
]

// Computed properties
const hasTakeoffLocation = computed(() => {
  return store.takeoffLocation && 
         typeof store.takeoffLocation.lat === 'number' && 
         typeof store.takeoffLocation.lng === 'number'
})

const takeoffLocation = computed(() => store.takeoffLocation || {})

const canProceedFromCurrentPage = computed(() => {
  switch (currentPage.value) {
    case 1: // Takeoff Location
      return hasTakeoffLocation.value
    case 2: // Flight Parameters
      return flightAltitude.value >= 10 && 
             initialAltitude.value >= 5 && 
             climbSpeed.value >= 1 && 
             missionSpeed.value >= 1 && 
             transitSpeed.value >= 1
    case 3: // GSD Requirements
      return true // No validation needed
    default:
      return true
  }
})

const isReadyToStart = computed(() => {
  return hasTakeoffLocation.value &&
         flightAltitude.value >= 10 &&
         initialAltitude.value >= 5 && 
         climbSpeed.value >= 1 && 
         missionSpeed.value >= 1 && 
         transitSpeed.value >= 1
})

// Estimated GSD based on altitude
const estimatedGSD = computed(() => {
  if (gsdMode.value === 'target') {
    return targetGSD.value
  }
  
  // Use a simplified calculation with default camera parameters
  // GSD = (sensor width * altitude) / (focal length * image width) * 100 (for cm)
  // Using typical values for a 1" sensor drone camera
  const sensorWidth = 13.2 // mm (1" sensor)
  const focalLength = 24 // mm (typical drone camera)
  const imageWidth = 5000 // pixels (typical drone camera)
  
  // Calculate GSD in cm/pixel
  const gsd = (sensorWidth * flightAltitude.value) / (focalLength * imageWidth) * 100
  return gsd.toFixed(2)
})

// Methods
const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value
  
  // Update the shared state if minimizing (closing)
  if (isMinimized.value) {
    // Emit event to let parent know we want to close
    panelStates.missionPrecheckExpanded.value = false
  }
}

const closePanel = () => {
  // Close this panel completely
  panelStates.missionPrecheckExpanded.value = false
}

const nextPage = () => {
  if (currentPage.value < totalPages) {
    currentPage.value++
  }
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const goToPage = (pageNumber) => {
  if (pageNumber >= 1 && pageNumber <= totalPages) {
    currentPage.value = pageNumber
  }
}

const setTakeoffMode = () => {
  console.log('Entering takeoff selection mode');
  
  // Dispatch an event to indicate we're selecting takeoff location
  window.dispatchEvent(new CustomEvent('enter-takeoff-selection'));
  
  // Show a notification to guide the user
  window.dispatchEvent(new CustomEvent('show-notification', {
    detail: {
      message: 'Click anywhere on the ground to set takeoff location',
      color: 'info',
      timeout: 5000
    }
  }));
}

const startMission = () => {
  // Set survey settings
  store.updateSurveySettings({
    altitude: flightAltitude.value,
    speed: missionSpeed.value,
    gsdMode: gsdMode.value,
    targetGSD: parseFloat(targetGSD.value)
  })
  
  // Set flight parameters
  store.updateFlightParameters({
    startingAltitude: initialAltitude.value,
    climbSpeed: climbSpeed.value,
    missionSpeed: missionSpeed.value,
    transitSpeed: transitSpeed.value
  })
  
  // Set safety settings
  store.updateSafetySettings({
    returnToHome: returnToHome.value,
    failsafeAltitude: failsafeAltitude.value,
    missionEndBehavior: missionEndBehavior.value,
    lossOfCommsBehavior: lossOfCommsBehavior.value
  })
  
  // Emit event to parent for workflow progression
  window.dispatchEvent(new CustomEvent('mission-precheck-completed'))
}

const formatCoord = (value) => {
  if (typeof value !== 'number') return 'N/A'
  return value.toFixed(6)
}

// Watch for store changes
watch(() => store.takeoffLocation, (location) => {
  if (location && isMinimized.value) {
    // Auto-expand when takeoff location is set
    isMinimized.value = false
  }
  
  if (location && currentPage.value === 1) {
    // Auto advance to next page when takeoff is set while on the takeoff page
    setTimeout(() => {
      nextPage()
    }, 500)
  }
})

// Watch for GSD mode changes
watch(gsdMode, (newMode) => {
  if (newMode === 'target' && flightAltitude.value) {
    // Update target GSD based on current altitude
    targetGSD.value = estimatedGSD.value
  }
})

// Watch for target GSD changes to adjust altitude when in target mode
watch(targetGSD, (newValue) => {
  if (gsdMode.value === 'target') {
    // Adjust altitude to achieve target GSD
    // This is a simplified calculation
    const camera = cameraOptions.find(c => c.id === selectedCamera.value)
    if (!camera) return
    
    // Extract camera parameters (simplified)
    let sensorWidth = 13.2 // Default for 1" sensor in mm
    if (camera.sensorSize.includes('4/3')) {
      sensorWidth = 17.3
    } else if (camera.sensorSize.includes('1/2')) {
      sensorWidth = 6.4
    } else if (camera.sensorSize.includes('APS-C')) {
      sensorWidth = 23.5
    }
    
    const focalLength = parseInt(camera.focalLength)
    
    let imageWidth = 5000 // Default
    const match = camera.resolution.match(/\((\d+)×(\d+)\)/)
    if (match) {
      imageWidth = parseInt(match[1])
    }
    
    // Calculate altitude from target GSD
    // altitude = (GSD * focal length * image width) / (sensor width * 100)
    const targetAltitude = (newValue * focalLength * imageWidth) / (sensorWidth * 100)
    
    // Clamp to min/max range
    flightAltitude.value = Math.min(Math.max(10, Math.round(targetAltitude)), 120)
  }
})

// Watch for external state changes
watch(() => panelStates.missionPrecheckExpanded, (expanded) => {
  // Only update if there's a mismatch to avoid loops
  if (isMinimized.value === expanded) {
    isMinimized.value = !expanded
  }
})

// Add debugging logs when setting takeoff location
function setTakeoffLocation(event) {
  // Log that we're setting takeoff location from the MissionPrecheck component
  console.log('Setting takeoff location from MissionPrecheck:', event);
  
  if (event && event.detail && event.detail.position) {
    const { x, z } = event.detail.position;
    store.setTakeoffLocation({
      lat: x,
      lng: z
    });
    
    // Log to verify takeoff location was set correctly
    console.log('Takeoff location after setting in MissionPrecheck:', store.takeoffLocation);
    console.log('Has takeoff location?', store.hasTakeoffLocation);
  }
}

// Add lifecycle hooks to listen for takeoff location events
onMounted(() => {
  // Listen for takeoff location events
  window.addEventListener('takeoff-location-set', setTakeoffLocation);
  console.log('MissionPrecheck mounted - listening for takeoff location events');
})

onUnmounted(() => {
  // Clean up event listeners
  window.removeEventListener('takeoff-location-set', setTakeoffLocation);
  console.log('MissionPrecheck unmounted - removed event listeners');
})
</script>

<style scoped>
.mission-precheck {
  width: 100%;
  background-color: #212121;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
  color: #ffffff;
}

.mission-precheck.minimized {
  max-height: 56px;
}

.precheck-header {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  height: 56px;
  box-sizing: border-box;
  background-color: #212121;
}

.precheck-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #ffffff;
}

.precheck-content {
  padding: 10px;
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  max-height: calc(50vh - 56px);
  background-color: #2d2d2d;
}

.page-indicator {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 10px;
}

.page-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-dot.active {
  background-color: #4CAF50;
  transform: scale(1.2);
}

.precheck-page {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.precheck-page h4 {
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: 500;
  color: #ffffff;
  text-align: center;
}

.option-group {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 12px;
}

.sub-settings {
  margin-top: 10px;
}

.takeoff-options {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.takeoff-coords {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  width: 100%;
  margin-top: 10px;
}

.coord-label {
  display: flex;
  align-items: center;
  font-size: 14px;
  margin-bottom: 4px;
  color: #e0e0e0;
}

.no-takeoff {
  padding: 10px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: #9e9e9e;
  font-size: 14px;
  text-align: center;
  width: 100%;
  margin-top: 10px;
}

.camera-settings, .flight-params, .safety-settings, .gsd-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.camera-details {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 13px;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-label {
  color: #9e9e9e;
}

.detail-value {
  font-weight: 500;
  color: #e0e0e0;
}

.gsd-target {
  padding: 6px 0;
}

.gsd-help {
  margin: 2px 0 0 0;
  font-size: 12px;
  color: #9e9e9e;
  font-style: italic;
}

.gsd-preview {
  margin-top: 6px;
  display: flex;
  justify-content: space-between;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
}

.preview-label {
  font-size: 13px;
  color: #9e9e9e;
}

.preview-value {
  font-size: 13px;
  font-weight: 500;
  color: #4CAF50;
}

.page-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.page-indicator-text {
  font-size: 13px;
  color: #9e9e9e;
}

.header-buttons {
  display: flex;
  align-items: center;
}

.license-tag {
  display: inline-block;
  font-size: 10px;
  background-color: #ff5252;
  color: white;
  padding: 1px 5px;
  border-radius: 3px;
  margin-left: 5px;
  vertical-align: top;
}

.param-group {
  margin-bottom: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 12px;
  background-color: rgba(255, 255, 255, 0.05);
}

.param-subheading {
  font-size: 14px;
  font-weight: 500;
  color: #e0e0e0;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
</style> 