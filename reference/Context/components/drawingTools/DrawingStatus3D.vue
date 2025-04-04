<template>
  <div class="drawing-status" v-if="isVisible">
    <div class="status-icon">
      <v-icon :icon="getToolTypeIcon()" size="large" color="white" />
    </div>
    <div class="status-content">
      <div class="status-title">
        Drawing 3D {{ capitalizedToolType }}
      </div>
      <div class="status-message">
        {{ statusMessage }}
      </div>
      <div v-if="showMeasurements" class="status-measurements">
        <span v-if="measurementData.width">Width: {{ measurementData.width.toFixed(1) }}m</span>
        <span v-if="measurementData.height">Height: {{ measurementData.height.toFixed(1) }}m</span>
        <span v-if="measurementData.depth">Depth: {{ measurementData.depth.toFixed(1) }}m</span>
        <span v-if="measurementData.radius">Radius: {{ measurementData.radius.toFixed(1) }}m</span>
        <span v-if="measurementData.volume">Volume: {{ measurementData.volume.toFixed(1) }}m³</span>
      </div>
    </div>
    <div class="actions">
      <v-btn
        v-if="showAccept"
        class="accept-btn mr-2"
        color="success"
        variant="flat"
        density="comfortable"
        @click="onAccept"
      >
        <v-icon icon="mdi-check" class="mr-1" size="small" />
        Accept
      </v-btn>
      <v-btn
        class="cancel-btn"
        color="grey-lighten-4"
        variant="outlined"
        density="comfortable"
        @click="onCancel"
      >
        <v-icon icon="mdi-close" class="mr-1" size="small" />
        Cancel
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  toolType: {
    type: String,
    default: 'shape'
  },
  isVisible: {
    type: Boolean,
    default: false
  },
  statusMessage: {
    type: String,
    default: 'Click and drag on the ground plane to create your shape. Press ESC to cancel.'
  },
  measurementData: {
    type: Object,
    default: () => ({})
  },
  showAccept: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['cancel', 'accept']);

const showMeasurements = computed(() => {
  return Object.keys(props.measurementData).length > 0;
});

const capitalizedToolType = computed(() => {
  if (!props.toolType) return 'Shape';
  return props.toolType.charAt(0).toUpperCase() + props.toolType.slice(1);
});

const getToolTypeIcon = () => {
  switch (props.toolType) {
    case 'box':
      return 'mdi-cube-outline';
    case 'cylinder':
      return 'mdi-cylinder';
    case 'sphere':
      return 'mdi-sphere';
    case 'polygon':
      return 'mdi-vector-polygon';
    case 'extrusion':
      return 'mdi-shape-plus';
    case 'rectangle':
      return 'mdi-rectangle-outline';
    case 'circle':
      return 'mdi-circle-outline';
    default:
      return 'mdi-shape';
  }
};

const onCancel = () => {
  emit('cancel');
};

const onAccept = () => {
  emit('accept');
};
</script>

<style scoped>
.drawing-status {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 15px 25px;
  border-radius: 8px;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  max-width: 80%;
  backdrop-filter: blur(5px);
}

.status-icon {
  background-color: var(--primary-color, #1976D2);
  padding: 10px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  font-weight: bold;
  font-size: 16px;
}

.status-content {
  flex: 1;
}

.status-title {
  font-weight: bold;
  margin-bottom: 5px;
  font-size: 16px;
}

.status-message {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 5px;
}

.status-measurements {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
  font-size: 13px;
  opacity: 0.8;
}

.status-measurements span {
  background-color: rgba(255, 255, 255, 0.2);
  padding: 3px 8px;
  border-radius: 4px;
}

.actions {
  display: flex;
  align-items: center;
}

.cancel-btn, .accept-btn {
  margin-left: auto;
}
</style> 