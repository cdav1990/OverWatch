<template>
  <div class="mission-wizard">
    <!-- Step Indicator -->
    <div class="mission-wizard__steps" v-if="!isMinimized">
      <div 
        v-for="(step, index) in steps" 
        :key="step.id"
        class="step-indicator"
        :class="{
          'is-active': currentStep === index,
          'is-completed': index < currentStep
        }"
      >
        <div class="step-number">
          <v-icon v-if="index < currentStep" icon="mdi-check" size="small" />
          <span v-else>{{ index + 1 }}</span>
        </div>
        <span class="step-label">{{ step.label }}</span>
      </div>
    </div>

    <!-- Mission Type Selection -->
    <v-slide-x-transition>
      <div v-if="currentStep === 0 && !isMinimized" class="mission-wizard__content">
        <h3>Select Mission Type</h3>
        <div class="mission-types">
          <div
            v-for="type in missionTypes"
            :key="type.id"
            class="mission-type-item"
            :class="{ 'is-selected': selectedType === type.id }"
            @click="selectMissionType(type.id)"
          >
            <div class="mission-type-radio" />
            <div class="mission-type-details">
              <h4>{{ type.label }}</h4>
              <p>{{ type.description }}</p>
            </div>
          </div>
        </div>
        <div class="wizard-actions">
          <v-btn
            color="primary"
            :disabled="!selectedType"
            @click="nextStep"
          >
            Continue
          </v-btn>
        </div>
      </div>
    </v-slide-x-transition>

    <!-- Takeoff Location -->
    <v-slide-x-transition>
      <div v-if="currentStep === 1 && !isMinimized" class="mission-wizard__content">
        <h3>Set Takeoff Location</h3>
        <div class="takeoff-instructions">
          <v-icon icon="mdi-map-marker" color="primary" class="mr-2" />
          <p>Click on the map to set the takeoff location</p>
        </div>
        <div v-if="store.takeoffLocation" class="takeoff-preview">
          <h4>Takeoff Coordinates</h4>
          <div class="coordinates-section">
            <h5>Local ENU Coordinates (meters)</h5>
            <div class="coordinate-group">
              <div class="coordinate">
                <span class="label">East:</span>
                <span class="value">{{ store.takeoffLocation.lat.toFixed(2) }}m</span>
              </div>
              <div class="coordinate">
                <span class="label">North:</span>
                <span class="value">{{ store.takeoffLocation.lng.toFixed(2) }}m</span>
              </div>
              <div class="coordinate">
                <span class="label">Up:</span>
                <span class="value">0.00m</span>
              </div>
            </div>
          </div>

          <div class="coordinates-section">
            <h5>WGS-84 Geodetic Coordinates</h5>
            <div class="coordinate-group">
              <div class="coordinate">
                <span class="label">Latitude:</span>
                <span class="value">{{ formatCoordinate(store.takeoffGlobalCoordinates.lat, true) }}</span>
              </div>
              <div class="coordinate">
                <span class="label">Longitude:</span>
                <span class="value">{{ formatCoordinate(store.takeoffGlobalCoordinates.lon, false) }}</span>
              </div>
              <div class="coordinate">
                <span class="label">Altitude:</span>
                <span class="value">{{ store.takeoffGlobalCoordinates.height.toFixed(1) }}m MSL</span>
              </div>
            </div>
            
            <!-- Dropdown to change coordinate format -->
            <div class="coordinate-format-selector">
              <v-select
                v-model="coordinateFormat"
                :items="coordinateFormats"
                label="Format"
                density="compact"
                variant="plain"
                hide-details
                class="coord-format-select"
              />
            </div>
          </div>
          
          <v-divider class="my-3"></v-divider>
          
          <div class="coordinate-info">
            <v-icon icon="mdi-information-outline" color="primary" class="mr-2" size="small" />
            <p>This takeoff point will be locked as the mission reference origin</p>
          </div>
        </div>
        <div class="wizard-actions">
          <v-btn @click="prevStep">Back</v-btn>
          <v-btn
            color="primary"
            :disabled="!store.takeoffLocation"
            @click="nextStep"
          >
            Continue
          </v-btn>
        </div>
      </div>
    </v-slide-x-transition>

    <!-- Camera Settings -->
    <v-slide-x-transition>
      <div v-if="currentStep === 2 && !isMinimized" class="mission-wizard__content">
        <h3>Camera Settings</h3>
        <div class="camera-settings">
          <v-select
            v-model="selectedCamera"
            :items="cameras"
            item-title="name"
            return-object
            label="Select Camera"
            class="mb-4"
          />
          <div class="camera-specs">
            <div class="spec-group">
              <h4>Sensor</h4>
              <div class="spec-row">
                <span>Width:</span>
                <span>{{ selectedCamera.sensorWidth }} mm</span>
              </div>
              <div class="spec-row">
                <span>Height:</span>
                <span>{{ selectedCamera.sensorHeight }} mm</span>
              </div>
            </div>
            <div class="spec-group">
              <h4>Resolution</h4>
              <div class="spec-row">
                <span>Width:</span>
                <span>{{ selectedCamera.imageWidth }} px</span>
              </div>
              <div class="spec-row">
                <span>Height:</span>
                <span>{{ selectedCamera.imageHeight }} px</span>
              </div>
            </div>
          </div>
        </div>
        <div class="wizard-actions">
          <v-btn @click="prevStep">Back</v-btn>
          <v-btn
            color="primary"
            :disabled="!selectedCamera"
            @click="nextStep"
          >
            Continue
          </v-btn>
        </div>
      </div>
    </v-slide-x-transition>

    <!-- Flight Parameters -->
    <v-slide-x-transition>
      <div v-if="currentStep === 3 && !isMinimized" class="mission-wizard__content">
        <h3>Flight Parameters</h3>
        <div class="flight-params">
          <v-text-field
            v-model.number="flightParams.altitude"
            label="Altitude (m)"
            type="number"
            min="10"
            max="120"
            class="mb-4"
          />
          <v-slider
            v-model="flightParams.frontOverlap"
            label="Front Overlap"
            min="60"
            max="90"
            step="5"
            thumb-label
            class="mb-4"
          >
            <template v-slot:append>
              <span>{{ flightParams.frontOverlap }}%</span>
            </template>
          </v-slider>
          <v-slider
            v-model="flightParams.sideOverlap"
            label="Side Overlap"
            min="60"
            max="90"
            step="5"
            thumb-label
            class="mb-4"
          >
            <template v-slot:append>
              <span>{{ flightParams.sideOverlap }}%</span>
            </template>
          </v-slider>
          <v-text-field
            v-model.number="flightParams.gridAngle"
            label="Grid Angle (°)"
            type="number"
            min="0"
            max="360"
            class="mb-4"
          />
        </div>
        <div class="wizard-actions">
          <v-btn @click="prevStep">Back</v-btn>
          <v-btn
            color="primary"
            :disabled="!isFlightParamsValid"
            @click="nextStep"
          >
            Continue
          </v-btn>
        </div>
      </div>
    </v-slide-x-transition>

    <!-- Safety Settings -->
    <v-slide-x-transition>
      <div v-if="currentStep === 4 && !isMinimized" class="mission-wizard__content">
        <h3>Safety Settings</h3>
        <div class="safety-settings">
          <v-switch
            v-model="safetySettings.returnToHome"
            label="Return to Home"
            color="primary"
            class="mb-4"
          />
          <v-text-field
            v-model.number="safetySettings.failsafeReturnAltitude"
            label="Failsafe Return Altitude (m)"
            type="number"
            min="30"
            :max="120"
            class="mb-4"
          />
          <v-select
            v-model="safetySettings.missionEndBehavior"
            :items="endBehaviors"
            label="Mission End Behavior"
            class="mb-4"
          />
        </div>
        <div class="wizard-actions">
          <v-btn @click="prevStep">Back</v-btn>
          <v-btn
            color="primary"
            @click="completeMissionSetup"
          >
            Start Mission Planning
          </v-btn>
        </div>
      </div>
    </v-slide-x-transition>

    <!-- Minimize/Maximize Button -->
    <v-btn
      icon
      variant="text"
      class="mission-wizard__toggle"
      @click="toggleMinimize"
    >
      <v-icon :icon="isMinimized ? 'mdi-chevron-up' : 'mdi-chevron-down'" />
    </v-btn>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useMissionStore } from '../store/missionStore'
import * as GeoUtils from '../utils/geoUtils'

const store = useMissionStore()
const isMinimized = ref(false)
const currentStep = ref(0)
const selectedType = ref(null)
const selectedCamera = ref(store.camera)

// Coordinate format options
const coordinateFormat = ref('dd')
const coordinateFormats = [
  { title: 'Decimal Degrees', value: 'dd' },
  { title: 'Degrees Minutes Seconds', value: 'dms' },
  { title: 'Degrees Decimal Minutes', value: 'ddm' }
]

const steps = [
  { id: 'type', label: 'Mission Type' },
  { id: 'takeoff', label: 'Takeoff Location' },
  { id: 'camera', label: 'Camera Settings' },
  { id: 'flight', label: 'Flight Parameters' },
  { id: 'safety', label: 'Safety Settings' }
]

const missionTypes = [
  {
    id: 'survey',
    label: 'Survey Mission',
    description: 'Create a grid pattern to survey an area with specified overlap'
  },
  {
    id: 'inspection',
    label: 'Inspection Mission',
    description: 'Inspect a structure or point of interest from multiple angles'
  },
  {
    id: 'manual',
    label: 'Manual Mission',
    description: 'Manually place waypoints to create a custom flight path'
  }
]

const cameras = [
  {
    name: 'Default Camera',
    sensorWidth: 23.5,
    sensorHeight: 15.6,
    focalLength: 35,
    imageWidth: 6000,
    imageHeight: 4000,
  },
  {
    name: 'DJI Phantom 4 Pro',
    sensorWidth: 13.2,
    sensorHeight: 8.8,
    focalLength: 24,
    imageWidth: 5472,
    imageHeight: 3648,
  }
]

const flightParams = ref({
  altitude: 50,
  frontOverlap: 75,
  sideOverlap: 65,
  gridAngle: 0
})

const safetySettings = ref({
  returnToHome: true,
  failsafeReturnAltitude: 30,
  missionEndBehavior: 'RTH'
})

const endBehaviors = [
  { title: 'Return to Home', value: 'RTH' },
  { title: 'Land', value: 'LAND' },
  { title: 'Hover', value: 'HOVER' }
]

const isFlightParamsValid = computed(() => {
  const { altitude, gridAngle } = flightParams.value
  return altitude >= 10 && altitude <= 120 && gridAngle >= 0 && gridAngle <= 360
})

// Methods
const selectMissionType = (type) => {
  selectedType.value = type
  store.$patch({ missionType: type })
}

const nextStep = () => {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
    // Emit event when entering takeoff selection step
    if (currentStep.value === 1) {
      window.dispatchEvent(new CustomEvent('enter-takeoff-selection'))
    }
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// Add watcher for takeoffLocation
watch(() => store.takeoffLocation, (newLocation) => {
  if (newLocation && currentStep.value === 1) {
    // Auto advance to next step after takeoff location is set
    setTimeout(() => {
      nextStep()
    }, 500) // Small delay to show the marker
  }
})

const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value
}

const completeMissionSetup = () => {
  // Update store with all settings
  store.$patch({
    camera: selectedCamera.value,
    surveySettings: {
      ...store.surveySettings,
      ...flightParams.value
    },
    safetySettings: safetySettings.value
  })
  
  // Hide wizard and enable waypoint adding
  isMinimized.value = true
}

// Format coordinates based on selected format
function formatCoordinate(value, isLatitude) {
  if (!value) return '-';
  
  const type = isLatitude ? 'lat' : 'lon';
  
  switch (coordinateFormat.value) {
    case 'dms':
      return GeoUtils.formatCoordinates(value, value, 'dms')[type];
    case 'ddm':
      return GeoUtils.formatCoordinates(value, value, 'ddm')[type];
    case 'dd':
    default:
      const direction = isLatitude 
        ? (value >= 0 ? 'N' : 'S')
        : (value >= 0 ? 'E' : 'W');
      return `${Math.abs(value).toFixed(6)}° ${direction}`;
  }
}
</script>

<style scoped>
.mission-wizard {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 480px;
  background: var(--background-color);
  border-radius: 8px 8px 0 0;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.mission-wizard__steps {
  display: flex;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
}

.step-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
}

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid currentColor;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8571428571rem;
}

.step-label {
  font-size: 0.8571428571rem;
}

.step-indicator.is-active {
  color: var(--primary-color);
}

.step-indicator.is-completed {
  color: #29cf83;
}

.mission-wizard__content {
  padding: 24px;
  max-height: 480px;
  overflow-y: auto;
}

.mission-wizard__content h3 {
  margin: 0 0 24px 0;
  color: var(--text-color);
  font-size: 1.1428571429rem;
  font-weight: 500;
}

.mission-types {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mission-type-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mission-type-item:hover {
  border-color: var(--primary-color);
}

.mission-type-item.is-selected {
  border-color: var(--primary-color);
  background: #edf1fd;
}

.mission-type-radio {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #bec4ca;
  margin-top: 2px;
}

.mission-type-item.is-selected .mission-type-radio {
  border-color: var(--primary-color);
  position: relative;
}

.mission-type-item.is-selected .mission-type-radio::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--primary-color);
}

.mission-type-details h4 {
  margin: 0 0 8px 0;
  color: var(--text-color);
  font-size: 0.8571428571rem;
  font-weight: 500;
}

.mission-type-details p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.8571428571rem;
}

.takeoff-instructions {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f3f5f9;
  border-radius: 4px;
  margin-bottom: 16px;
}

.takeoff-instructions p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.8571428571rem;
}

.takeoff-preview {
  background: #f3f5f9;
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 16px;
}

.takeoff-preview h4 {
  margin: 0 0 16px 0;
  font-size: 0.9285714286rem;
  font-weight: 500;
  color: var(--text-color);
}

.coordinates-section {
  margin-bottom: 16px;
}

.coordinates-section h5 {
  margin: 0 0 8px 0;
  font-size: 0.8571428571rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.coordinate-group {
  display: flex;
  gap: 16px;
}

.coordinate {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.coordinate .label {
  font-size: 0.7857142857rem;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.coordinate .value {
  font-family: 'Roboto Mono', monospace;
  font-size: 0.8571428571rem;
  font-weight: 500;
  color: var(--text-color);
}

.coordinate-info {
  display: flex;
  align-items: center;
  font-size: 0.7857142857rem;
  color: var(--text-secondary);
}

.coordinate-info p {
  margin: 0;
}

.camera-specs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.spec-group h4 {
  margin: 0 0 8px 0;
  color: var(--text-color);
  font-size: 0.8571428571rem;
  font-weight: 500;
}

.spec-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 0.8571428571rem;
  color: var(--text-secondary);
}

.wizard-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.mission-wizard__toggle {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 20px;
  border-radius: 4px 4px 0 0;
  background: var(--background-color);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}
</style> 