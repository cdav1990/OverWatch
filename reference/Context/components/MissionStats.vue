<template>
  <div class="mission-stats">
    <div class="stats-header">
      <h3>Mission Statistics</h3>
      <v-btn
        icon="mdi-refresh"
        variant="text"
        size="small"
        @click="refreshStats"
      />
    </div>

    <div class="stats-grid">
      <!-- Flight Stats -->
      <div class="stat-group">
        <h4>Flight</h4>
        <div class="stat-row">
          <span class="stat-label">Distance:</span>
          <span class="stat-value">{{ formatDistance(store.totalDistance) }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Duration:</span>
          <span class="stat-value">{{ formatDuration(store.estimatedTime) }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Waypoints:</span>
          <span class="stat-value">{{ store.waypoints.length }}</span>
        </div>
      </div>

      <!-- Survey Stats -->
      <div class="stat-group" v-if="store.missionType === 'survey'">
        <h4>Survey</h4>
        <div class="stat-row">
          <span class="stat-label">GSD:</span>
          <span class="stat-value">{{ formatGSD(store.groundSampleDistance) }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Footprint:</span>
          <span class="stat-value">{{ formatFootprint(store.imageFootprint) }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Altitude:</span>
          <span class="stat-value">{{ store.surveySettings.altitude }}m</span>
        </div>
      </div>

      <!-- Camera Stats -->
      <div class="stat-group">
        <h4>Camera</h4>
        <div class="stat-row">
          <span class="stat-label">Model:</span>
          <span class="stat-value">{{ store.camera.name }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Resolution:</span>
          <span class="stat-value">{{ formatResolution(store.camera) }}</span>
        </div>
      </div>

      <!-- Safety Settings -->
      <div class="stat-group">
        <h4>Safety</h4>
        <div class="stat-row">
          <span class="stat-label">RTH:</span>
          <span class="stat-value">{{ store.safetySettings.returnToHome ? 'Enabled' : 'Disabled' }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">RTH Alt:</span>
          <span class="stat-value">{{ store.safetySettings.failsafeReturnAltitude }}m</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">End Action:</span>
          <span class="stat-value">{{ formatEndBehavior(store.safetySettings.missionEndBehavior) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useMissionStore } from '../store/missionStore'

const store = useMissionStore()

// Formatting functions
function formatDistance(meters) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`
  }
  return `${Math.round(meters)}m`
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function formatGSD(cmPerPixel) {
  return `${cmPerPixel.toFixed(1)} cm/px`
}

function formatFootprint(footprint) {
  const width = Math.round(footprint.width)
  const height = Math.round(footprint.height)
  return `${width}×${height}m`
}

function formatResolution(camera) {
  const mp = (camera.imageWidth * camera.imageHeight / 1000000).toFixed(1)
  return `${mp}MP`
}

function formatEndBehavior(behavior) {
  const behaviors = {
    'RTH': 'Return Home',
    'LAND': 'Land',
    'HOVER': 'Hover'
  }
  return behaviors[behavior] || behavior
}

function refreshStats() {
  // This function could be used to recalculate stats
  // or refresh data from external sources
}
</script>

<style scoped>
.mission-stats {
  background: var(--background-color);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.stats-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-color);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.stat-group {
  min-width: 0;
}

.stat-group h4 {
  margin: 0 0 8px 0;
  font-size: 0.8571428571rem;
  font-weight: 500;
  color: var(--text-color);
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  font-size: 0.8571428571rem;
}

.stat-label {
  color: var(--text-secondary);
}

.stat-value {
  color: var(--text-color);
  font-weight: 500;
}
</style> 