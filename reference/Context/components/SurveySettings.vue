<template>
  <div class="survey-settings">
    <h3>Survey Settings</h3>
    
    <!-- Camera Selection -->
    <div class="setting-group">
      <h4>Camera</h4>
      <v-select
        v-model="selectedCamera"
        :items="cameras"
        item-title="name"
        return-object
        label="Select Camera"
        class="mb-2"
      />
    </div>

    <!-- Flight Parameters -->
    <div class="setting-group">
      <h4>Flight Parameters</h4>
      <v-text-field
        v-model.number="altitude"
        label="Altitude (m)"
        type="number"
        min="10"
        max="120"
        class="mb-2"
      />
      <v-slider
        v-model="frontOverlap"
        label="Front Overlap"
        min="60"
        max="90"
        step="5"
        thumb-label
        class="mb-2"
      >
        <template v-slot:append>
          <span class="text-body-2 text-medium-emphasis">{{ frontOverlap }}%</span>
        </template>
      </v-slider>
      <v-slider
        v-model="sideOverlap"
        label="Side Overlap"
        min="60"
        max="90"
        step="5"
        thumb-label
        class="mb-2"
      >
        <template v-slot:append>
          <span class="text-body-2 text-medium-emphasis">{{ sideOverlap }}%</span>
        </template>
      </v-slider>
      <v-text-field
        v-model.number="gridAngle"
        label="Grid Angle (°)"
        type="number"
        min="0"
        max="360"
        class="mb-2"
      />
    </div>

    <!-- Survey Stats -->
    <div class="setting-group">
      <h4>Survey Statistics</h4>
      <div class="stat-row">
        <span>GSD:</span>
        <span>{{ gsd.toFixed(1) }} cm/px</span>
      </div>
      <div class="stat-row">
        <span>Area Coverage:</span>
        <span>{{ areaCoverage.toFixed(0) }} m²</span>
      </div>
      <div class="stat-row">
        <span>Flight Time:</span>
        <span>{{ formatTime(estimatedTime) }}</span>
      </div>
      <div class="stat-row">
        <span>Photos:</span>
        <span>{{ numberOfPhotos }}</span>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="actions">
      <v-btn
        color="primary"
        block
        :disabled="!canGenerateGrid"
        @click="generateGrid"
      >
        Generate Survey Grid
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMissionStore } from '../store/missionStore'

const store = useMissionStore()

// Available cameras
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
  },
]

// Form bindings
const selectedCamera = ref(cameras[0])
const altitude = ref(store.surveySettings.altitude)
const frontOverlap = ref(store.surveySettings.frontOverlap)
const sideOverlap = ref(store.surveySettings.sideOverlap)
const gridAngle = ref(store.surveySettings.gridAngle)

// Computed properties
const gsd = computed(() => {
  const alt = altitude.value
  const focal = selectedCamera.value.focalLength
  const sensorW = selectedCamera.value.sensorWidth
  const imageW = selectedCamera.value.imageWidth
  return (alt * sensorW) / (focal * imageW) * 100
})

const footprint = computed(() => {
  const alt = altitude.value
  const focal = selectedCamera.value.focalLength
  const sensorW = selectedCamera.value.sensorWidth
  const sensorH = selectedCamera.value.sensorHeight
  return {
    width: (alt * sensorW) / focal,
    height: (alt * sensorH) / focal
  }
})

const areaCoverage = computed(() => {
  // Simplified calculation - actual area would depend on the selected region
  return footprint.value.width * footprint.value.height
})

const numberOfPhotos = computed(() => {
  return store.waypoints.length
})

const estimatedTime = computed(() => {
  return store.estimatedTime
})

const canGenerateGrid = computed(() => {
  return store.takeoffLocation !== null
})

// Methods
const generateGrid = () => {
  // Update store settings
  store.updateSurveySettings({
    altitude: altitude.value,
    frontOverlap: frontOverlap.value,
    sideOverlap: sideOverlap.value,
    gridAngle: gridAngle.value
  })
  
  // Generate grid
  store.generateSurveyGrid()
}

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.survey-settings {
  padding: 16px;
}

.setting-group {
  margin-bottom: 24px;
}

.setting-group h4 {
  margin: 0 0 12px 0;
  color: var(--text-color);
  font-size: 14px;
  font-weight: 500;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  color: #666;
}

.actions {
  margin-top: 24px;
}
</style> 