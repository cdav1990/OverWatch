<template>
  <div class="mode-toggle">
    <h3>Current Mode: {{ modeStore.currentMode }}</h3>
    
    <v-btn 
      color="primary" 
      @click="modeStore.toggleMode()"
    >
      Toggle Mode
    </v-btn>
    
    <div class="mode-specific-controls mt-4">
      <v-btn v-if="modeStore.isSimulation" color="success">
        Simulate Path
      </v-btn>
      
      <v-btn v-if="modeStore.isLive" color="warning">
        Connect Drone
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { useModeStore, MODES } from '../store/modeStore'

const modeStore = useModeStore()
</script>

<style scoped>
.mode-toggle {
  padding: 16px;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.1);
  margin-bottom: 16px;
}

.mode-specific-controls {
  margin-top: 16px;
}
</style> 