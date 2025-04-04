import { defineStore } from 'pinia'

// Define the possible modes
export const MODES = {
  SIMULATION: 'SIMULATION',
  LIVE: 'LIVE'
}

// Create the store
export const useModeStore = defineStore('mode', {
  state: () => ({
    currentMode: MODES.SIMULATION
  }),
  
  getters: {
    isSimulation: (state) => state.currentMode === MODES.SIMULATION,
    isLive: (state) => state.currentMode === MODES.LIVE
  },
  
  actions: {
    setMode(mode) {
      if (Object.values(MODES).includes(mode)) {
        this.currentMode = mode
      } else {
        console.error(`Invalid mode: ${mode}. Must be one of: ${Object.values(MODES).join(', ')}`)
      }
    },
    
    toggleMode() {
      this.currentMode = this.currentMode === MODES.SIMULATION ? MODES.LIVE : MODES.SIMULATION
    }
  }
}) 