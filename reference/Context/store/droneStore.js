import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useDroneStore = defineStore('drone', {
  state: () => ({
    // Drone basic info
    model: 'astro',
    batteryLevel: 100,
    maxAltitude: 120,
    maxSpeed: 10,
    
    // Drone status
    status: 'idle', // 'idle', 'flying', 'returning', 'emergency'
    
    // Current position
    position: {
      x: 0,
      y: 0,
      z: 0,
      heading: 0,
      velocity: {
        x: 0,
        y: 0,
        z: 0
      }
    },
    
    // Telemetry
    telemetry: {
      altitude: 0,
      speed: 0,
      distance: 0,
      flightTime: 0,
      remainingBattery: 100,
      homeDistance: 0
    }
  }),
  
  getters: {
    // Estimated remaining flight time in minutes
    remainingFlightTime: (state) => {
      // Simplified calculation
      return (state.batteryLevel / 100) * 25 // Assuming 25 minutes max flight time
    },
    
    // Is drone currently flying
    isFlying: (state) => {
      return state.status === 'flying' || state.status === 'returning'
    }
  },
  
  actions: {
    // Update drone model
    setDroneModel(model) {
      this.model = model
    },
    
    // Update battery level
    updateBatteryLevel(level) {
      this.batteryLevel = level
    },
    
    // Update drone status
    setStatus(status) {
      this.status = status
    },
    
    // Update drone position
    updatePosition(position) {
      this.position = {
        ...this.position,
        ...position
      }
    },
    
    // Update telemetry data
    updateTelemetry(telemetry) {
      this.telemetry = {
        ...this.telemetry,
        ...telemetry
      }
    }
  }
}) 