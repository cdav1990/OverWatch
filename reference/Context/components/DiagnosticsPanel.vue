<template>
  <div class="diagnostics-panel" :class="{ collapsed: isCollapsed }" ref="panelRef" :style="positionStyle">
    <div class="panel-header" @mousedown="startDrag">
      <h3>System Diagnostics</h3>
      <div class="header-buttons">
        <v-btn icon small @click.stop="refreshData">
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
        <v-btn icon small @click.stop="togglePanel">
          <v-icon>{{ isCollapsed ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
        </v-btn>
        <v-btn icon small @click.stop="closePanel">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>
    </div>

    <div v-if="!isCollapsed" class="panel-content">
      <v-tabs v-model="activeTab" background-color="primary" dark>
        <v-tab value="system">SYSTEM</v-tab>
        <v-tab value="errors">ERRORS ({{ errors.length }})</v-tab>
        <v-tab value="performance">PERFORMANCE</v-tab>
        <v-tab value="startup">STARTUP EVENTS</v-tab>
      </v-tabs>

      <v-window v-model="activeTab" class="tabs-content">
        <!-- System Tab -->
        <v-window-item value="system">
          <div class="system-info">
            <div class="info-item">
              <div class="info-label">Three.js Version:</div>
              <div class="info-value">{{ systemInfo.threejsVersion }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Viewport Size:</div>
              <div class="info-value">{{ systemInfo.viewport.width }}x{{ systemInfo.viewport.height }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Objects in Scene:</div>
              <div class="info-value">{{ systemInfo.objectCount }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Renderer:</div>
              <div class="info-value">WebGL{{ systemInfo.webgl2 ? ' 2' : '' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Status:</div>
              <div class="info-value" :class="{ 'status-success': systemInfo.isInitialized, 'status-error': !systemInfo.isInitialized }">
                {{ systemInfo.isInitialized ? 'Initialized' : 'Not Initialized' }}
              </div>
            </div>
          </div>
        </v-window-item>

        <!-- Errors Tab -->
        <v-window-item value="errors">
          <div v-if="errors.length === 0" class="empty-state">
            <v-icon large color="success">mdi-check-circle</v-icon>
            <div>No errors detected</div>
          </div>
          <div v-else class="errors-list">
            <div v-for="(error, index) in errors" :key="index" class="error-item">
              <div class="error-header">
                <div class="error-type">{{ error.phase }}</div>
                <div class="error-time">{{ formatTime(error.timestamp) }}</div>
              </div>
              <div class="error-message">{{ error.message }}</div>
            </div>
          </div>
        </v-window-item>

        <!-- Performance Tab -->
        <v-window-item value="performance">
          <div class="performance-metrics">
            <div class="metric-item">
              <div class="metric-label">FPS:</div>
              <div class="metric-value">{{ performance.fps.toFixed(1) }}</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">Frame Time:</div>
              <div class="metric-value">{{ performance.frameTime.toFixed(2) }}ms</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">Memory Usage:</div>
              <div class="metric-value">{{ formatMemory(performance.memory.total) }}</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">Draw Calls:</div>
              <div class="metric-value">{{ performance.drawCalls }}</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">Triangles:</div>
              <div class="metric-value">{{ performance.triangles.toLocaleString() }}</div>
            </div>
          </div>
        </v-window-item>

        <!-- Startup Events Tab -->
        <v-window-item value="startup">
          <div class="events-timeline">
            <div v-for="(event, index) in startupEvents" :key="index" class="event-item" :class="{ 'event-important': event.isImportant }">
              <div class="time-indicator">
                <div class="event-time">{{ event.elapsedMs }}ms</div>
                <div class="event-marker" :class="{ 'success-marker': event.isSuccess }"></div>
                <div class="event-line" v-if="index < startupEvents.length - 1"></div>
              </div>
              <div class="event-content">
                <div class="event-message">{{ event.message }}</div>
              </div>
            </div>
          </div>
        </v-window-item>
      </v-window>

      <div class="panel-footer">
        <v-btn small color="error" @click="clearErrors">CLEAR ERRORS</v-btn>
        <v-btn small color="warning" @click="clearWarnings">CLEAR WARNINGS</v-btn>
        <v-btn small color="primary" @click="refreshData">REFRESH DATA</v-btn>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import * as THREE from 'three';
import { getBuildInfo } from '../utils/buildInfo';

// Panel state
const isCollapsed = ref(true);
const isVisible = ref(true);
const activeTab = ref('system');

// Position and size state for dragging
const position = ref({ x: null, y: null });
const size = ref({ width: 600, height: null });
const panelRef = ref(null);
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

// Computed styles
const positionStyle = computed(() => {
  // When explicitly positioned by dragging
  if (position.value.x !== null && position.value.y !== null) {
    return {
      top: `${position.value.y}px`,
      left: `${position.value.x}px`,
      transform: 'none'
    };
  }
  
  // Default to center position
  return {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
  };
});

// Data
const systemInfo = ref({
  threejsVersion: THREE.REVISION,
  viewport: { width: 0, height: 0 },
  webgl2: false,
  objectCount: 0,
  isInitialized: false
});

const errors = ref([]);
const warnings = ref([]);
const startupEvents = ref([]);
const performance = ref({
  fps: 60,
  frameTime: 16.67,
  memory: { total: 0, used: 0 },
  drawCalls: 0,
  triangles: 0
});

// Methods
const togglePanel = () => {
  isCollapsed.value = !isCollapsed.value;
};

const closePanel = () => {
  isVisible.value = false;
};

const clearErrors = () => {
  errors.value = [];
};

const clearWarnings = () => {
  warnings.value = [];
};

const refreshData = () => {
  // Get fresh data from buildInfo
  const info = getBuildInfo();
  
  // Update system info
  systemInfo.value.isInitialized = info.runtime?.isInitialized || false;
  systemInfo.value.objectCount = info.scene?.objectCount || 0;
  
  // Update errors and warnings
  errors.value = info.runtime?.errors || [];
  warnings.value = info.runtime?.warnings || [];
  
  // Update startup events
  parseStartupEvents(info.runtime?.startupEvents || []);
  
  // Update performance metrics
  updatePerformanceMetrics();
};

const parseStartupEvents = (events) => {
  startupEvents.value = events.map((event, index) => {
    return {
      message: event.message,
      timestamp: event.timestamp,
      elapsedMs: event.elapsedMs || index * 8, // Use actual elapsed time or estimate
      isImportant: event.isImportant || event.message.toLowerCase().includes('initialized') || 
                  event.message.toLowerCase().includes('complete'),
      isSuccess: !event.message.toLowerCase().includes('error') && 
                 !event.message.toLowerCase().includes('fail')
    };
  });
};

const updatePerformanceMetrics = () => {
  // This would typically come from a performance monitoring utility
  // For now, just use placeholder values or get them from renderer statistics
  performance.value.fps = 60;
  performance.value.frameTime = 16.67;
  performance.value.memory.total = 100 * 1024 * 1024; // 100MB example
  performance.value.drawCalls = 30;
  performance.value.triangles = 50000;
};

// Format helpers
const formatTime = (timestamp) => {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

const formatMemory = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

// Drag methods
const startDrag = (event) => {
  // Don't initiate drag if clicking buttons
  if (event.target.closest('button') || event.target.closest('.v-btn')) {
    return;
  }
  
  isDragging.value = true;
  
  const rect = panelRef.value.getBoundingClientRect();
  dragOffset.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
  
  // Set initial position if not already set
  if (!position.value.x && !position.value.y) {
    position.value = {
      x: rect.left,
      y: rect.top
    };
  }
  
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', stopDrag);
};

const handleDrag = (event) => {
  if (!isDragging.value) return;
  
  position.value = {
    x: event.clientX - dragOffset.value.x,
    y: event.clientY - dragOffset.value.y
  };
};

const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDrag);
};

// Lifecycle hooks
onMounted(() => {
  // Initial data load
  refreshData();
  
  // Set up interval to update performance metrics
  const perfInterval = setInterval(() => {
    updatePerformanceMetrics();
  }, 1000);
  
  // Set up window size listener
  const handleResize = () => {
    systemInfo.value.viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
  };
  
  window.addEventListener('resize', handleResize);
  handleResize(); // Initial call
  
  // Cleanup on unmount
  onUnmounted(() => {
    clearInterval(perfInterval);
    window.removeEventListener('resize', handleResize);
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDrag);
  });
});

// Expose methods that might be useful for parent components
defineExpose({
  refreshData,
  clearErrors,
  clearWarnings,
  show: () => { isVisible.value = true; },
  hide: () => { isVisible.value = false; },
  centerPanel: () => {
    // Reset position to center panel
    position.value = { x: null, y: null };
  }
});
</script>

<style scoped>
.diagnostics-panel {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  max-width: 90vw;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  overflow: hidden;
  transition: all 0.3s ease;
}

.diagnostics-panel.collapsed {
  opacity: 0;
  visibility: hidden;
  transform: translate(-50%, -50%) scale(0.95);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #2196F3;
  color: white;
  cursor: move;
  user-select: none;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.header-buttons {
  display: flex;
  gap: 8px;
}

.panel-content {
  max-height: 70vh;
  overflow-y: auto;
}

.tabs-content {
  padding: 16px;
  min-height: 300px;
}

.panel-footer {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid #e0e0e0;
  background-color: #f5f5f5;
}

/* System Tab */
.system-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.info-label {
  width: 150px;
  font-weight: 500;
  color: #555;
}

.info-value {
  flex: 1;
}

.status-success {
  color: #4CAF50;
  font-weight: 500;
}

.status-error {
  color: #F44336;
  font-weight: 500;
}

/* Error Tab */
.errors-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.error-item {
  padding: 12px;
  border-left: 4px solid #F44336;
  background-color: #FFEBEE;
  border-radius: 4px;
}

.error-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.error-type {
  font-weight: 500;
  color: #D32F2F;
}

.error-time {
  font-size: 13px;
  color: #757575;
}

.error-message {
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 13px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #757575;
  gap: 12px;
}

/* Performance Tab */
.performance-metrics {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.metric-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.metric-label {
  width: 150px;
  font-weight: 500;
  color: #555;
}

.metric-value {
  flex: 1;
  font-family: monospace;
}

/* Events Timeline */
.events-timeline {
  display: flex;
  flex-direction: column;
  padding: 8px 0;
}

.event-item {
  display: flex;
  margin-bottom: 8px;
}

.time-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 80px;
  margin-right: 16px;
}

.event-time {
  font-family: monospace;
  font-size: 14px;
  color: #555;
}

.event-marker {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #9E9E9E;
  margin: 4px 0;
}

.success-marker {
  background-color: #2196F3;
}

.event-important .event-marker {
  width: 20px;
  height: 20px;
  background-color: #1976D2;
}

.event-line {
  width: 2px;
  height: 40px;
  background-color: #E0E0E0;
}

.event-content {
  flex: 1;
  padding: 8px 12px;
  background-color: #F5F5F5;
  border-radius: 4px;
}

.event-important .event-content {
  background-color: #E3F2FD;
  border-left: 3px solid #2196F3;
}

.event-message {
  font-size: 14px;
}

/* Responsive handling */
@media (max-width: 600px) {
  .diagnostics-panel {
    width: 95vw;
    max-width: 95vw;
  }
  
  .time-indicator {
    width: 60px;
  }
}
</style> 