<template>
  <div class="hardware-selection-container">
    <!-- Notification display -->
    <div v-if="notification.show" class="notification" :class="'notification-' + notification.color">
      {{ notification.message }}
      <span class="notification-close" @click="notification.show = false">&times;</span>
    </div>
    
    <!-- Main header bar with centered title and close button -->
    <div class="main-header-bar">
      <div class="header-title">Mission Hardware</div>
      <button class="close-button absolute-close" @click="$emit('close')">&times;</button>
    </div>
    
    <div class="questionnaire-panel">
      <p class="panel-description">
        Configure the hardware setup for your mission by selecting your drone, LiDAR, camera and lens combinations.
      </p>

      <!-- Drone Selection -->
      <div class="form-section">
        <h3 class="section-title">Select Drone</h3>
        <v-select
          v-model="selectedDroneId"
          :items="availableDrones"
          item-title="name"
          item-value="id"
          label="Select Drone"
          hide-details
          variant="outlined"
          density="compact"
          bg-color="rgba(30, 30, 30, 0.7)"
          color="warning"
        ></v-select>
      </div>

      <!-- Sensor Size Selection -->
      <div class="form-section">
        <h3 class="section-title">Select Sensor Size</h3>
        <v-select
          v-model="selectedSensorType"
          :items="sensorTypes"
          label="Select Sensor Size"
          hide-details
          variant="outlined"
          density="compact"
          bg-color="rgba(30, 30, 30, 0.7)"
          color="warning"
          @update:model-value="handleSensorChange"
        ></v-select>
      </div>

      <!-- LiDAR Selection -->
      <div class="form-section">
        <h3 class="section-title">Select LiDAR</h3>
        <v-select
          v-model="selectedLidarId"
          :items="availableLidars"
          item-title="name"
          item-value="id"
          label="Select LiDAR"
          hide-details
          variant="outlined"
          density="compact"
          bg-color="rgba(30, 30, 30, 0.7)"
          color="warning"
        ></v-select>
      </div>

      <!-- Camera Selection -->
      <div class="form-section">
        <h3 class="section-title">Select Camera</h3>
        <v-select
          v-model="selectedCameraId"
          :items="availableCameras"
          item-title="display"
          item-value="id"
          label="Select Camera"
          hide-details
          variant="outlined"
          density="compact"
          bg-color="rgba(30, 30, 30, 0.7)"
          color="warning"
          @update:model-value="handleCameraChange"
        ></v-select>
      </div>

      <!-- Lens Selection -->
      <div class="form-section">
        <h3 class="section-title">Select Lens</h3>
        <v-select
          v-model="selectedLensId"
          :items="compatibleLenses"
          item-title="display"
          item-value="id"
          label="Select Lens"
          hide-details
          variant="outlined"
          density="compact"
          bg-color="rgba(30, 30, 30, 0.7)"
          color="warning"
          :disabled="!selectedCameraId"
        ></v-select>
      </div>

      <!-- Camera & Lens Information -->
      <div v-if="selectedCamera && selectedLens" class="camera-info-panel">
        <div class="sensor-info-title">Camera & Lens Information</div>
        <div class="sensor-info-row">
          <div class="sensor-info-label">Camera:</div>
          <div class="sensor-info-value">{{ selectedCamera ? `${selectedCamera.brand} ${selectedCamera.model}` : '-' }}</div>
        </div>
        <div class="sensor-info-row">
          <div class="sensor-info-label">Sensor Size:</div>
          <div class="sensor-info-value">
            {{ selectedCamera ? `${selectedCamera.sensorWidth}mm × ${selectedCamera.sensorHeight}mm` : '-' }}
          </div>
        </div>
        <div class="sensor-info-row">
          <div class="sensor-info-label">Focal Length:</div>
          <div class="sensor-info-value">
            {{ selectedLens ? displayFocalLength(selectedLens.focalLength) : '-' }}
          </div>
        </div>
        <div class="sensor-info-row">
          <div class="sensor-info-label">Max Aperture:</div>
          <div class="sensor-info-value">{{ selectedLens ? `f/${selectedLens.maxAperture}` : '-' }}</div>
        </div>
        <div class="sensor-info-row">
          <div class="sensor-info-label">Field of View:</div>
          <div class="sensor-info-value">{{ horizontalFOV.toFixed(1) }}° horizontal, {{ verticalFOV.toFixed(1) }}° vertical</div>
        </div>
        <div class="sensor-info-row">
          <div class="sensor-info-label">Ground Coverage:</div>
          <div class="sensor-info-value">
            {{ (groundCoverage.width * 3.28084).toFixed(1) }}ft × {{ (groundCoverage.height * 3.28084).toFixed(1) }}ft at {{ focusDistanceFeet }}ft distance
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <v-btn
          color="warning"
          variant="tonal"
          :disabled="!isHardwareSelectionComplete"
          @click="selectHardware"
        >
          Select Hardware
        </v-btn>
      </div>
    </div>

    <div class="visualization-container">
      <!-- Visualization Panel with tabs -->
      <div class="visualization-panel">
        <div class="visualization-tabs">
          <div class="tab-header">
            <div 
              class="tab-button" 
              :class="{ active: activeTab === '2d' }"
              @click="activeTab = '2d'"
            >
              2D View
            </div>
            <div 
              class="tab-button" 
              :class="{ active: activeTab === '3d' }"
              @click="activeTab = '3d'"
            >
              3D View
            </div>
          </div>
          <div class="tab-content">
            <!-- 2D View Tab -->
            <div v-if="activeTab === '2d'" class="tab-pane">
              <div class="drone-2d-visualization">
                <img :src="getDroneImagePath" class="drone-image" alt="Drone Top View">
                
                <div v-if="selectedCamera && selectedLens" class="sensor-illustration">
                  <div class="camera-body">
                    <div class="camera-lens"></div>
                  </div>
                  <div class="field-of-view-indicator" :style="fieldOfViewStyle"></div>
                </div>
                
                <div v-else class="sensor-placeholder">
                  Select a camera and lens to see field of view visualization
                </div>
              </div>
            </div>
            
            <!-- 3D View Tab -->
            <div v-if="activeTab === '3d'" class="tab-pane">
              <DroneSceneViewer
                :selected-drone="selectedDrone"
                :camera-details="selectedCamera"
                :lens-details="selectedLens"
                :focus-distance="focusDistance"
                :aperture="aperture"
                @error="handleVisualizationError"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Depth of Field Controls -->
      <div v-if="selectedCamera && selectedLens" class="dof-controls-container">
        <div class="section-title">Depth of Field Controls</div>
        <div class="dof-controls">
          <div class="control-item">
            <v-slider
              v-model="aperture"
              :min="selectedLens ? getMinFStop() : 2.8"
              :max="selectedLens ? getMaxFStop() : 22"
              :step="0.1"
              label="Aperture (f/)"
              color="warning"
              hide-details
            ></v-slider>
            <div class="text-center mt-1">f/{{ aperture.toFixed(1) }}</div>
          </div>
          <div class="control-item">
            <v-slider
              v-model="focusDistanceFeet"
              :min="3"
              :max="400"
              :step="1"
              label="Focus Distance (ft)"
              color="warning"
              hide-details
            ></v-slider>
            <div class="text-center mt-1">{{ focusDistanceFeet }} ft</div>
          </div>
        </div>

        <!-- Replace DOF tables with the information section -->
        <div class="dof-info-grid">
          <div class="info-item">
            <div class="info-label">Hyperfocal Distance:</div>
            <div class="info-value">{{ formatDistanceInFeet(dofInfo.hyperfocal) }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Near Limit:</div>
            <div class="info-value">{{ formatDistanceInFeet(dofInfo.nearLimit) }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Far Limit:</div>
            <div class="info-value">{{ dofInfo.farLimit === Infinity ? "∞" : metersToFeet(dofInfo.farLimit).toFixed(2) + " ft" }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Total Depth of Field:</div>
            <div class="info-value">{{ dofInfo.totalDOF === Infinity ? "∞" : metersToFeet(dofInfo.totalDOF).toFixed(2) + " ft" }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">In Focus Range:</div>
            <div class="info-value">{{ dofInfo.inFocus.replace(/(\d+(\.\d+)?)\s*m/g, (match, p1) => metersToFeet(parseFloat(p1)).toFixed(2) + ' ft') }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Circle of Confusion:</div>
            <div class="info-value">{{ dofInfo.circleOfConfusion.toFixed(3) }} mm</div>
          </div>
          <div class="info-item">
            <div class="info-label">Focal Length:</div>
            <div class="info-value">{{ selectedLens ? displayFocalLength(selectedLens.focalLength) : "-" }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Field of View:</div>
            <div class="info-value">{{ horizontalFOV.toFixed(1) }}° × {{ verticalFOV.toFixed(1) }}°</div>
          </div>
          <div class="info-item">
            <div class="info-label">Surface Area:</div>
            <div class="info-value">{{ (groundCoverage.width * 3.28084).toFixed(2) }}ft × {{ (groundCoverage.height * 3.28084).toFixed(2) }}ft ({{ (groundCoverage.width * groundCoverage.height * 10.76391).toFixed(2) }}ft²) at {{ focusDistanceFeet }}ft</div>
          </div>
          <div class="info-item">
            <div class="info-label">GSD:</div>
            <div class="info-value">{{ calculateCurrentGSD().toFixed(2) }} mm at {{ focusDistanceFeet }}ft</div>
          </div>
          
          <!-- GSD Reference Table -->
          <div class="info-item gsd-reference-table">
            <div class="info-label">Target GSD Reference:</div>
            <div class="gsd-table-container">
              <table class="gsd-table">
                <thead>
                  <tr>
                    <th>Target GSD (mm)</th>
                    <th>Distance (ft)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="targetGSD in [0.25, 0.50, 0.75, 1.00, 1.50, 2.00, 3.00, 5.00]" :key="targetGSD">
                    <td>{{ targetGSD.toFixed(2) }}</td>
                    <td>{{ calculateDistanceForGSD(targetGSD).toFixed(1) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="dof-placeholder">
        Select a camera and lens to see depth of field information
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useMissionStore } from '../store/missionStore'
import DroneSceneViewer from './DroneSceneViewer.vue'
import { 
  cameras, 
  lenses, 
  droneModels, 
  getCameraById, 
  getLensById, 
  getCompatibleLenses as getDatabaseCompatibleLenses,
  getLensFStops
} from '../utils/cameraDatabase'
import { calculateDOF, calculateFieldOfView } from '../utils/dofCalculations'
import { calculateFootprint, calculateGSD } from '../utils/gsdCalculations'
import { getDOFCalculations } from '../utils/dofCalculations'

// Define emits
const emit = defineEmits(['close'])

// State variables
const selectedDroneId = ref(null)
const selectedLidarId = ref(null)
const selectedCameraId = ref(null)
const selectedLensId = ref(null)
const selectedSensorType = ref('All')

// UI state 
const activeTab = ref('2d')
const aperture = ref(2.8)
const focusDistance = ref(10) // in meters internally

// Focus distance in feet for the UI slider
const focusDistanceFeet = computed({
  get: () => Math.round(metersToFeet(focusDistance.value)),
  set: (feet) => { focusDistance.value = feetToMeters(feet) }
})

// Conversion functions
function metersToFeet(meters) {
  return meters * 3.28084;
}

function feetToMeters(feet) {
  return feet / 3.28084;
}

// List of sensor types for the dropdown
const sensorTypes = [
  'All',
  'Medium Format',
  'Full Frame',
  'APS-C',
  '1-inch',
  '1/2-inch'
]

// Compute available drones from drone models
const availableDrones = computed(() => {
  return droneModels.map(drone => ({
    id: drone.id,
    name: drone.name,
    brand: drone.brand
  }))
})

// Filter cameras by selected sensor type
const filteredCameras = computed(() => {
  if (selectedSensorType.value === 'All') {
    return cameras
  }
  return cameras.filter(camera => camera.sensorType === selectedSensorType.value)
})

// Compute available cameras
const availableCameras = computed(() => {
  return filteredCameras.value.map(camera => ({
    id: camera.id,
    display: `${camera.brand} ${camera.model} (${camera.megapixels}MP, ${camera.sensorType})`,
    brand: camera.brand,
    model: camera.model
  }))
})

// LiDAR options
const availableLidars = computed(() => {
  return [
    { id: 'ouster', name: 'Ouster OS0-128' },
    { id: 'hovermap', name: 'Emesent Hovermap' },
    { id: 'none', name: 'None' }
  ]
})

// Get compatible lenses for the selected camera
const compatibleLenses = computed(() => {
  if (!selectedCameraId.value) return []
  
  const compatibleLenses = getDatabaseCompatibleLenses(selectedCameraId.value)
  return compatibleLenses.map(lens => {
    const focalLengthDisplay = displayFocalLength(lens.focalLength)
    return {
      id: lens.id,
      display: `${lens.brand} ${focalLengthDisplay} f/${lens.maxAperture}`
    }
  })
})

// Display focal length for zoom or prime lenses
function displayFocalLength(focalLength) {
  if (Array.isArray(focalLength)) {
    return `${focalLength[0]}-${focalLength[1]}mm`
  }
  return `${focalLength}mm`
}

// Get actual focal length value for calculations (center of zoom range or fixed value)
function getEffectiveFocalLength(lens) {
  if (!lens) return 0
  
  if (Array.isArray(lens.focalLength)) {
    return (lens.focalLength[0] + lens.focalLength[1]) / 2
  }
  return lens.focalLength
}

// Computed properties for selected hardware objects
const selectedDrone = computed(() => {
  return droneModels.find(d => d.id === selectedDroneId.value) || null
})

const selectedLidar = computed(() => {
  const lidar = availableLidars.value.find(l => l.id === selectedLidarId.value)
  return lidar || null
})

const selectedCamera = computed(() => {
  return getCameraById(selectedCameraId.value)
})

const selectedLens = computed(() => {
  return getLensById(selectedLensId.value)
})

// Handle camera change
function handleCameraChange() {
  // Reset lens selection when camera changes
  selectedLensId.value = ''
}

// Get min and max f-stops for the selected lens
function getMinFStop() {
  if (!selectedLens.value) return 2.8
  return selectedLens.value.maxAperture
}

function getMaxFStop() {
  if (!selectedLens.value) return 22
  return selectedLens.value.minAperture
}

// Computed property for 2D drone image path
const getDroneImagePath = computed(() => {
  if (selectedDroneId.value === 'freefly-alta-x') {
    return '/images/drones/alta-top-view.png'
  }
  return '/images/drones/astro-top-view.png'
})

// Field of View calculator
const fieldOfViewStyle = computed(() => {
  if (!selectedCamera.value || !selectedLens.value) return {}
  
  // Calculate effective focal length
  const focalLength = getEffectiveFocalLength(selectedLens.value)
  
  // Calculate FOV angle
  const fovAngle = 2 * Math.atan(selectedCamera.value.sensorWidth / (2 * focalLength))
  const fovDegrees = fovAngle * (180 / Math.PI)
  
  // Scale and transform the FOV indicator
  return {
    transform: `rotate(-90deg) perspective(500px) rotateY(${fovDegrees / 2}deg)`,
    width: `${100 + (fovDegrees * 2)}px`,
    height: `${120}px`
  }
})

// Depth of Field calculations
const doF = computed(() => {
  if (!selectedCamera.value || !selectedLens.value) {
    return {
      hyperfocal: 0,
      nearLimit: 0,
      farLimit: 0,
      totalDepth: 0,
      inFront: 0,
      behind: 0
    }
  }
  
  // Get effective focal length
  const focalLength = getEffectiveFocalLength(selectedLens.value)
  
  // Use the DOF calculation function from utils
  const dofResult = calculateDOF(
    focalLength, 
    aperture.value, 
    focusDistance.value, 
    selectedCamera.value.sensorWidth, 
    selectedCamera.value.sensorHeight
  )
  
  // Calculate additional values
  const inFront = focusDistance.value - dofResult.nearLimit
  const behind = dofResult.farLimit === Infinity ? Infinity : dofResult.farLimit - focusDistance.value
  
  return {
    hyperfocal: dofResult.hyperfocal,
    nearLimit: dofResult.nearLimit,
    farLimit: dofResult.farLimit,
    totalDepth: dofResult.totalDOF,
    inFront,
    behind
  }
})

// Field of View calculations
const horizontalFOV = computed(() => {
  if (!selectedCamera.value || !selectedLens.value) return 0
  
  // Get effective focal length
  const focalLength = getEffectiveFocalLength(selectedLens.value)
  
  // Calculate horizontal FOV in degrees using utility function
  return calculateFieldOfView(focalLength, selectedCamera.value.sensorWidth)
})

const verticalFOV = computed(() => {
  if (!selectedCamera.value || !selectedLens.value) return 0
  
  // Get effective focal length
  const focalLength = getEffectiveFocalLength(selectedLens.value)
  
  // Calculate vertical FOV in degrees using utility function
  return calculateFieldOfView(focalLength, selectedCamera.value.sensorHeight)
})

// Calculate ground coverage at focus distance
const groundCoverage = computed(() => {
  if (!selectedCamera.value || !selectedLens.value) return { width: 0, height: 0 }
  
  // Use current focus distance instead of fixed 100m altitude
  const altitude = focusDistance.value;
  
  // Create camera parameters object for footprint calculation
  const cameraParams = {
    focalLength: getEffectiveFocalLength(selectedLens.value),
    sensorWidth: selectedCamera.value.sensorWidth,
    sensorHeight: selectedCamera.value.sensorHeight,
    imageWidth: selectedCamera.value.imageWidth,
    imageHeight: selectedCamera.value.imageHeight
  }
  
  // Use the footprint calculation function from utils
  const footprint = calculateFootprint(cameraParams, altitude)
  
  return footprint
})

// Check if hardware selection is complete
const isHardwareSelectionComplete = computed(() => {
  return !!selectedDroneId.value && !!selectedCameraId.value && !!selectedLensId.value
})

// Get store
const missionStore = useMissionStore()

// Load existing hardware selection from store
onMounted(() => {
  loadExistingHardware()
  
  // Set default values if no previous selection exists
  if (!selectedCameraId.value) {
    // Set default sensor type
    selectedSensorType.value = 'Medium Format'
    
    // Find the Phase One iXM-100 camera
    const defaultCamera = cameras.find(camera => 
      camera.brand === 'Phase One' && camera.model === 'iXM-100'
    )
    
    if (defaultCamera) {
      selectedCameraId.value = defaultCamera.id
      
      // Find the 80mm lens compatible with this camera
      const compatibleLenses = getDatabaseCompatibleLenses(defaultCamera.id)
      const defaultLens = compatibleLenses.find(lens => 
        lens.brand === 'Phase One' && lens.focalLength === 80
      )
      
      if (defaultLens) {
        selectedLensId.value = defaultLens.id
      }
    }
    
    // Set default drone and LiDAR
    selectedDroneId.value = 'freefly-astro'
    selectedLidarId.value = 'ouster'
    
    // Set default aperture and focus distance
    aperture.value = 5.6
    focusDistance.value = 10
    
    // Set 3D view as active by default
    activeTab.value = '3d'
    
    // Automatically save the default hardware selection
    nextTick(() => {
      if (isHardwareSelectionComplete.value) {
        selectHardware()
      }
    })
  }
})

function loadExistingHardware() {
  if (missionStore.hardware) {
    // Set drone and lidar from store
    selectedDroneId.value = missionStore.hardware.drone || 'freefly-astro'
    selectedLidarId.value = missionStore.hardware.lidar || 'none'
    
    // Set sensor type if it exists in store
    if (missionStore.hardware.sensorType) {
      selectedSensorType.value = missionStore.hardware.sensorType
    }
    
    // Set camera if it exists in our database
    if (missionStore.cameraDetails) {
      const storedCamera = cameras.find(
        c => c.brand === missionStore.cameraDetails.brand && c.model === missionStore.cameraDetails.model
      )
      if (storedCamera) {
        selectedCameraId.value = storedCamera.id
      }
    }
    
    // Set lens if it exists in our database
    if (missionStore.lensDetails) {
      const storedLens = lenses.find(
        l => l.brand === missionStore.lensDetails.brand && l.model === missionStore.lensDetails.model
      )
      if (storedLens) {
        selectedLensId.value = storedLens.id
      }
    }
    
    // Set aperture and focus distance
    aperture.value = missionStore.hardware.fStop || 2.8
    focusDistance.value = missionStore.hardware.focusDistance || 10
  }
}

// Save hardware selections to the store
function selectHardware() {
  missionStore.setHardware({
    drone: selectedDroneId.value,
    lidar: selectedLidarId.value,
    camera: selectedCameraId.value,
    lens: selectedLensId.value,
    sensorType: selectedSensorType.value,
    fStop: aperture.value,
    focusDistance: focusDistance.value,
    // Add detailed information
    cameraDetails: selectedCamera.value,
    lensDetails: selectedLens.value,
    droneDetails: selectedDrone.value
  })
  
  showNotification({
    message: 'Hardware configuration saved successfully',
    color: 'success',
    timeout: 3000
  });
}

// Handle 3D error
function handle3DError() {
  showNotification({
    message: 'Error occurred while loading 3D visualization',
    color: 'error',
    timeout: 3000
  });
}

// Handle sensor type change
function handleSensorChange() {
  // Reset selected camera when sensor type changes
  selectedCameraId.value = null
  selectedLensId.value = null
}

// Compute DOF calculations
const dofInfo = computed(() => {
  if (!selectedCamera.value || !selectedLens.value) {
    return {
      hyperfocal: 0,
      nearLimit: 0,
      farLimit: 0,
      totalDOF: 0,
      inFocus: "N/A",
      circleOfConfusion: 0
    }
  }
  
  const focalLength = selectedLens.value.focalLength
  const dofCalc = getDOFCalculations(
    focusDistance.value,
    focalLength,
    aperture.value,
    selectedCamera.value.sensorType,
    selectedCamera.value.sensorWidth
  )
  
  return dofCalc
})

// Function to format distances in feet with proper infinity handling
function formatDistanceInFeet(meters) {
  if (meters === Infinity) return '∞';
  return `${metersToFeet(meters).toFixed(2)} ft`;
}

// General distance formatter for UI display
function formatDistance(meters) {
  if (meters === Infinity) return '∞';
  return `${metersToFeet(meters).toFixed(1)} ft`;
}

// Handle visualization error
function handleVisualizationError() {
  showNotification({
    message: 'Hardware preview could not be loaded',
    color: 'warning',
    timeout: 3000
  })
}

// Calculate FOV in degrees
function calculateFOV() {
  if (!selectedCamera.value || !selectedLens.value) return 0
  
  // Get sensor width and focal length
  const sensorWidth = selectedCamera.value.sensorWidth || 36
  const focalLength = selectedLens.value.focalLength || 50
  
  // Calculate horizontal FOV in degrees
  const fovRadians = 2 * Math.atan(sensorWidth / (2 * focalLength))
  const fovDegrees = fovRadians * (180 / Math.PI)
  
  return Math.round(fovDegrees)
}

// Simple notification system
const notification = ref({
  show: false,
  message: '',
  color: 'info',
  timeout: 3000
})

// Function to show notifications
function showNotification(options) {
  notification.value = {
    show: true,
    message: options.message,
    color: options.color || 'info',
    timeout: options.timeout || 3000
  }

  // Auto-hide after timeout
  setTimeout(() => {
    notification.value.show = false
  }, notification.value.timeout)
}

// Add function to calculate current GSD
function calculateCurrentGSD() {
  if (!selectedCamera.value || !selectedLens.value) return 0;
  
  // Use focus distance instead of fixed 100m altitude
  const altitude = focusDistance.value;
  
  const cameraParams = {
    focalLength: getEffectiveFocalLength(selectedLens.value),
    sensorWidth: selectedCamera.value.sensorWidth,
    sensorHeight: selectedCamera.value.sensorHeight,
    imageWidth: selectedCamera.value.imageWidth,
    imageHeight: selectedCamera.value.imageHeight
  };
  
  // GSD is returned in cm/pixel, convert to mm
  return calculateGSD(cameraParams, altitude) * 10;
}

// Add function to calculate distance for a target GSD
function calculateDistanceForGSD(targetGSDmm) {
  if (!selectedCamera.value || !selectedLens.value) return 0;
  
  const targetGSDcm = targetGSDmm / 10; // Convert from mm to cm
  
  const cameraParams = {
    focalLength: getEffectiveFocalLength(selectedLens.value),
    sensorWidth: selectedCamera.value.sensorWidth,
    sensorHeight: selectedCamera.value.sensorHeight,
    imageWidth: selectedCamera.value.imageWidth,
    imageHeight: selectedCamera.value.imageHeight
  };
  
  // Rearranged formula from calculateGSD:
  // GSD = (sensorWidth * altitude * 100) / (focalLength * imageWidth)
  // So altitude = (GSD * focalLength * imageWidth) / (sensorWidth * 100)
  const distanceM = (targetGSDcm * cameraParams.focalLength * cameraParams.imageWidth) / 
                    (cameraParams.sensorWidth * 100);
  
  // Convert to feet
  return metersToFeet(distanceM);
}
</script>

<style>
.hardware-selection-container {
  display: flex;
  flex-direction: row;
  height: 110%;
  min-height: 1200px;
  width: 110%;
  min-width: 1400px;
  color: white;
  font-family: 'Arial', sans-serif;
  background-color: rgba(0, 0, 0, 0.95);
  border-radius: 8px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.7);
  overflow: hidden;
  border: 1px solid rgba(255, 193, 7, 0.2);
  position: relative;
}

.questionnaire-panel {
  flex: 0 0 30%;
  padding: 24px;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  overflow-y: auto;
  background-color: rgba(0, 0, 0, 0.5);
}

.visualization-container {
  flex: 0 0 70%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.close-button {
  background: rgba(255, 193, 7, 0.2);
  color: var(--gecko-warning, #ffb300);
  border: 1px solid rgba(255, 193, 7, 0.5);
  border-radius: 4px;
  width: 32px;
  height: 32px;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.close-button:hover {
  background: rgba(255, 193, 7, 0.4);
}

.panel-title {
  font-size: 24px;
  margin: 0 0 16px;
  color: var(--gecko-warning, #ffb300);
}

.panel-description {
  margin-bottom: 24px;
  opacity: 0.8;
}

.form-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 18px;
  margin: 0 0 16px;
  color: var(--gecko-warning, #ffb300);
  font-weight: normal;
}

.action-buttons {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* Camera info panel in questionnaire section */
.camera-info-panel {
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  padding: 16px;
  margin-top: 16px;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.sensor-info-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 10px;
  color: var(--gecko-warning, #ffb300);
}

.sensor-info-row {
  display: flex;
  margin-bottom: 6px;
}

.sensor-info-label {
  flex: 0 0 120px;
  font-weight: bold;
}

.sensor-info-value {
  flex: 1;
}

/* Visualization panel */
.visualization-panel {
  flex: 1;
  background-color: rgba(30, 30, 30, 0.7);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-height: 400px;
}

.visualization-tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tab-header {
  display: flex;
  background-color: rgba(0, 0, 0, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tab-button {
  padding: 12px 24px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
  flex: 1;
  text-align: center;
  font-weight: bold;
  border-bottom: 3px solid transparent;
}

.tab-button.active {
  background-color: rgba(255, 193, 7, 0.1);
  border-bottom: 3px solid var(--gecko-warning, #ffb300);
  color: var(--gecko-warning, #ffb300);
}

.tab-button:hover:not(.active) {
  background-color: rgba(255, 255, 255, 0.05);
}

.tab-content {
  flex: 1;
  position: relative;
  min-height: 350px;
}

.tab-pane {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* 2D Visualization */
.drone-2d-visualization {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
  position: relative;
}

.drone-image {
  max-width: 80%;
  max-height: 200px;
  object-fit: contain;
  margin-bottom: 20px;
}

.sensor-illustration {
  position: relative;
  margin-top: 20px;
}

.camera-body {
  width: 50px;
  height: 30px;
  background-color: #333;
  border: 2px solid #555;
  border-radius: 4px;
  position: relative;
}

.camera-lens {
  width: 25px;
  height: 25px;
  background-color: #222;
  border: 2px solid #444;
  border-radius: 50%;
  position: absolute;
  top: 2.5px;
  left: 12.5px;
}

.field-of-view-indicator {
  position: absolute;
  top: 15px;
  left: 25px;
  width: 100px;
  height: 120px;
  border-top: 2px solid rgba(255, 193, 7, 0.7);
  border-bottom: 2px solid rgba(255, 193, 7, 0.7);
  border-right: 2px solid rgba(255, 193, 7, 0.7);
  border-left: none;
  box-sizing: border-box;
  transform-origin: left center;
  transform: rotate(-90deg) perspective(500px) rotateY(0deg);
  background-color: rgba(255, 193, 7, 0.15);
  z-index: -1;
}

/* DOF Controls and Tables */
.dof-controls-container {
  background-color: rgba(30, 30, 30, 0.7);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.dof-controls {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.control-item {
  flex: 1;
}

.dof-tables-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}

.dof-table {
  flex: 1;
  min-width: 200px;
}

.dof-placeholder, .sensor-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  padding: 30px;
}

.error-message {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  padding: 30px;
}

.three-js-container {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: #121219;
  overflow: hidden;
}

.fallback-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 1000px;
}

.preview-content {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
}

.drone-illustration {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) translateY(-30px);
  transform-style: preserve-3d;
}

.drone-body {
  width: 80px;
  height: 20px;
  background-color: #444;
  position: absolute;
  top: 0;
  left: 0;
  transform: translate(-50%, -50%);
  border-radius: 4px;
}

.drone-arm {
  width: 50px;
  height: 8px;
  background-color: #333;
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 50%;
  border-radius: 2px;
}

.arm1 {
  transform: translate(-50%, -50%) rotate(45deg);
}

.arm2 {
  transform: translate(-50%, -50%) rotate(135deg);
}

.arm3 {
  transform: translate(-50%, -50%) rotate(225deg);
}

.arm4 {
  transform: translate(-50%, -50%) rotate(315deg);
}

.drone-camera {
  width: 16px;
  height: 16px;
  background-color: #222;
  position: absolute;
  top: 20px;
  left: 0;
  transform: translate(-50%, 0);
  border-radius: 50%;
}

.camera-frustum {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-style: preserve-3d;
  transform: translate(-50%, -50%) translateY(10px);
  transition: all 0.3s ease;
}

.near-plane {
  width: 20px;
  height: 15px;
  background-color: rgba(64, 128, 255, 0.2);
  border: 1px solid rgba(64, 128, 255, 0.7);
  position: absolute;
  transform: translate(-50%, -50%) translateZ(-10px);
}

.far-plane {
  width: 100px;
  height: 75px;
  background-color: rgba(0, 255, 0, 0.1);
  border: 1px solid rgba(0, 255, 0, 0.3);
  position: absolute;
  transform: translate(-50%, -50%) translateZ(-100px) scale(3);
  transition: all 0.3s ease;
}

.frustum-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 150px;
  background: linear-gradient(to bottom, rgba(64, 128, 255, 0.7), rgba(64, 128, 255, 0));
  transform-origin: top;
}

.line1 {
  transform: translate(-10px, -7.5px) translateZ(-10px) rotateX(10deg) rotateY(-5deg);
}

.line2 {
  transform: translate(10px, -7.5px) translateZ(-10px) rotateX(10deg) rotateY(5deg);
}

.line3 {
  transform: translate(10px, 7.5px) translateZ(-10px) rotateX(-10deg) rotateY(5deg);
}

.line4 {
  transform: translate(-10px, 7.5px) translateZ(-10px) rotateX(-10deg) rotateY(-5deg);
}

.preview-info {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background-color: rgba(0, 0, 0, 0.6);
  padding: 10px;
  border-radius: 4px;
  color: white;
  font-size: 12px;
}

.info-label {
  margin-bottom: 4px;
}

/* Depth of Field Info */
.dof-info {
  background-color: rgba(30, 30, 30, 0.7);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.dof-info-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.info-item {
  flex: 1;
  min-width: 200px;
}

.info-label {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 6px;
  color: var(--gecko-warning, #ffb300);
}

.info-value {
  font-size: 14px;
}

/* Notification styles */
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 4px;
  z-index: 1000;
  color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  animation: slide-in 0.3s ease-out;
  max-width: 300px;
}

.notification-success {
  background-color: #4caf50;
}

.notification-error {
  background-color: #f44336;
}

.notification-warning {
  background-color: #ff9800;
}

.notification-info {
  background-color: #2196f3;
}

.notification-close {
  margin-left: 10px;
  cursor: pointer;
  font-weight: bold;
}

@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.gsd-reference-table {
  flex-basis: 100%;
}

.gsd-table-container {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 5px;
  margin-top: 8px;
}

.gsd-table {
  width: 100%;
  border-collapse: collapse;
}

.gsd-table th,
.gsd-table td {
  padding: 8px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.gsd-table th {
  background-color: rgba(255, 193, 7, 0.1);
  color: var(--gecko-warning, #ffb300);
  font-weight: bold;
  font-size: 14px;
}

.gsd-table tbody tr:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.gsd-table tbody tr:last-child td {
  border-bottom: none;
}

/* Style for the absolute positioned close button in the top right */
.absolute-close {
  position: absolute;
  top: 15px;
  right: 15px;
  z-index: 10;
}

.main-header-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50px;
  background-color: rgba(20, 20, 20, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  border-bottom: 1px solid rgba(255, 193, 7, 0.3);
  z-index: 5;
}

.header-title {
  font-size: 24px;
  color: var(--gecko-warning, #ffb300);
  font-weight: bold;
}

/* Adjust padding for content areas to account for header */
.questionnaire-panel {
  padding-top: 60px;
}

.visualization-container {
  padding-top: 60px;
}

/* Style for the absolute positioned close button in the top right */
.absolute-close {
  position: absolute;
  top: 9px;
  right: 15px;
  z-index: 10;
}
</style> 