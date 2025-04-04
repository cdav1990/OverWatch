<template>
  <div class="waypoint-list">
    <div v-if="waypoints.length === 0" class="empty-state">
      <v-icon icon="mdi-map-marker-plus" size="large" color="grey-lighten-1" />
      <p>No waypoints added yet. Click on the map to add waypoints.</p>
    </div>
    
    <div v-else>
      <!-- Waypoint Items -->
      <div
        v-for="(waypoint, index) in waypoints"
        :key="index"
        class="waypoint-item"
        :class="{ 'is-selected': selectedWaypoint === index }"
        @click="$emit('select-waypoint', index)"
      >
        <div class="waypoint-header">
          <span class="waypoint-title">Waypoint {{ index + 1 }}</span>
          <v-btn
            icon="mdi-delete"
            variant="text"
            density="compact"
            color="error"
            @click.stop="$emit('remove-waypoint', index)"
          />
        </div>

        <div class="waypoint-details">
          <div class="coordinate-group">
            <div class="coordinate">
              <span class="label">Lat:</span>
              <span class="value">{{ waypoint.position.lat.toFixed(6) }}°</span>
            </div>
            <div class="coordinate">
              <span class="label">Lon:</span>
              <span class="value">{{ waypoint.position.lng.toFixed(6) }}°</span>
            </div>
          </div>

          <v-text-field
            v-model.number="waypoint.height"
            label="Height (m)"
            type="number"
            min="0"
            max="120"
            hide-details
            density="compact"
            class="height-field"
            @input="updateHeight($event, index)"
            @click.stop
          />
        </div>
      </div>

      <!-- Mission Stats -->
      <div class="mission-stats">
        <div class="stat-row">
          <span>Total Distance:</span>
          <span>{{ totalDistance.toFixed(1) }} m</span>
        </div>
        <div class="stat-row">
          <span>Est. Flight Time:</span>
          <span>{{ formatTime(estimatedTime) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  waypoints: {
    type: Array,
    required: true
  },
  selectedWaypoint: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['select-waypoint', 'update-waypoint', 'remove-waypoint'])

// Computed properties
const totalDistance = computed(() => {
  let total = 0
  for (let i = 1; i < props.waypoints.length; i++) {
    const prev = props.waypoints[i - 1]
    const curr = props.waypoints[i]
    total += calculateDistance(prev.position, curr.position)
  }
  return total
})

const estimatedTime = computed(() => {
  // Assume average speed of 5 m/s
  const speed = 5
  // Add 10 seconds per waypoint for hover time
  return (totalDistance.value / speed) + (props.waypoints.length * 10)
})

// Methods
const calculateDistance = (pos1, pos2) => {
  const R = 6371000 // Earth's radius in meters
  const lat1 = toRad(pos1.lat)
  const lat2 = toRad(pos2.lat)
  const dLat = toRad(pos2.lat - pos1.lat)
  const dLon = toRad(pos2.lng - pos1.lng)

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

const toRad = (deg) => deg * Math.PI / 180

const updateHeight = (value, index) => {
  const height = parseFloat(value)
  if (!isNaN(height)) {
    const waypoint = { ...props.waypoints[index] }
    waypoint.height = height
    emit('update-waypoint', { index, waypoint })
  }
}

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.waypoint-list {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
  color: #666;
}

.empty-state p {
  margin-top: 16px;
  font-size: 14px;
}

.waypoint-item {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.waypoint-item:hover {
  border-color: var(--primary-color);
}

.waypoint-item.is-selected {
  border-color: var(--primary-color);
  background: var(--primary-color-light);
}

.waypoint-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.waypoint-title {
  font-weight: 500;
  font-size: 14px;
}

.waypoint-details {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.coordinate-group {
  flex: 1;
  margin-right: 16px;
}

.coordinate {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  font-size: 13px;
}

.coordinate .label {
  width: 40px;
  color: #666;
}

.height-field {
  width: 100px;
}

.mission-stats {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.stat-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  color: #666;
}
</style> 