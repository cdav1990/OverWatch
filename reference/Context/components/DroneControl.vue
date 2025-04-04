<template>
  <div class="drone-control">
    <!-- Always visible mode indicator button -->
    <v-btn
      :color="modeStore.isSimulation ? 'success' : 'warning'"
      class="mode-indicator-btn"
      @click="isCollapsed = !isCollapsed"
      elevation="4"
    >
      <v-icon start>{{ modeStore.isSimulation ? 'mdi-laptop' : 'mdi-drone' }}</v-icon>
      {{ modeStore.currentMode }}
      <v-icon end>{{ isCollapsed ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
    </v-btn>
    
    <!-- Expandable control panel -->
    <v-expand-transition>
      <div v-if="!isCollapsed" class="control-panel">
        <h2>Drone Control Panel</h2>
        
        <!-- Different panels based on the mode -->
        <div v-if="modeStore.isSimulation" class="simulation-panel">
          <h3>Simulation Mode</h3>
          <p>Configure and test your mission in a safe environment.</p>
          
          <div class="controls-grid">
            <v-btn variant="outlined" color="primary" class="mb-2">Add Waypoint</v-btn>
            <v-btn variant="outlined" color="primary" class="mb-2">Clear Path</v-btn>
            <v-btn variant="outlined" color="success" class="mb-2">Run Simulation</v-btn>
            <v-btn variant="outlined" color="warning" class="mb-2">Save Mission</v-btn>
          </div>
          
          <div class="status-display">
            <p>Simulation Status: <span class="status-ready">Ready</span></p>
          </div>
        </div>
        
        <div v-else-if="modeStore.isLive" class="live-panel">
          <h3>Live Mode</h3>
          <p>Connect to your drone and execute real missions.</p>
          
          <div class="controls-grid">
            <v-btn variant="outlined" color="warning" class="mb-2">Connect Drone</v-btn>
            <v-btn variant="outlined" color="error" class="mb-2" disabled>Emergency Stop</v-btn>
            <v-btn variant="outlined" color="success" class="mb-2" disabled>Start Mission</v-btn>
            <v-btn variant="outlined" color="info" class="mb-2" disabled>Return Home</v-btn>
          </div>
          
          <div class="status-display">
            <p>Drone Status: <span class="status-disconnected">Disconnected</span></p>
            <p>Battery: <span class="status-na">N/A</span></p>
            <p>Signal Strength: <span class="status-na">N/A</span></p>
          </div>
        </div>
        
        <!-- Mode toggle button at the bottom -->
        <div class="mode-toggle-btn">
          <v-btn 
            color="primary" 
            @click="modeStore.toggleMode()"
          >
            Switch to {{ modeStore.isSimulation ? 'Live' : 'Simulation' }} Mode
          </v-btn>
        </div>
      </div>
    </v-expand-transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useModeStore } from '../store/modeStore'

const modeStore = useModeStore()
const isCollapsed = ref(true) // Start collapsed by default
</script>

<style scoped>
.drone-control {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.mode-indicator-btn {
  border-radius: 8px;
  font-weight: bold;
  min-width: 150px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
}

.control-panel {
  margin-top: 8px;
  padding: 20px;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  max-width: 450px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
}

.controls-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 20px 0;
}

.status-display {
  background-color: rgba(0, 0, 0, 0.3);
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
}

.status-ready {
  color: #4caf50;
  font-weight: bold;
}

.status-disconnected {
  color: #f44336;
  font-weight: bold;
}

.status-na {
  color: #9e9e9e;
  font-style: italic;
}

.mode-toggle-btn {
  margin-top: 20px;
  text-align: center;
}

.simulation-panel, .live-panel {
  margin-bottom: 20px;
}

h2 {
  font-size: 1.5rem;
  margin-bottom: 16px;
  color: white;
}

h3 {
  font-size: 1.25rem;
  margin-bottom: 8px;
  color: white;
}
</style> 