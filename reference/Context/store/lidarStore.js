import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useLidarStore = defineStore('lidar', {
  state: () => ({
    // LiDAR model and basic info
    model: 'none',
    isEnabled: false,
    range: 100, // meters
    accuracy: 0.05, // meters
    pointsPerSecond: 100000,
    
    // Current LiDAR settings
    settings: {
      resolution: 'medium', // 'low', 'medium', 'high'
      scanMode: 'standard', // 'standard', 'high-density', 'long-range'
      captureRate: 10, // Hz
      fieldOfView: 360, // degrees
      verticalFieldOfView: 30, // degrees
      filtering: 'automatic' // 'none', 'light', 'medium', 'heavy', 'automatic'
    },
    
    // LiDAR status
    status: {
      available: false,
      scanning: false,
      calibrated: true,
      errorCode: null
    },
    
    // Scan data
    scanData: {
      currentPointCloud: null,
      storedPointClouds: [],
      lastScanTime: null,
      scanQuality: 'good', // 'poor', 'good', 'excellent'
      pointCount: 0
    }
  }),
  
  getters: {
    // Is LiDAR available and operational
    isOperational: (state) => {
      return state.isEnabled && state.status.available && state.status.calibrated
    },
    
    // Formatted model information
    modelInfo: (state) => {
      if (state.model === 'none') {
        return 'No LiDAR equipped'
      }
      return `${state.model} (${state.pointsPerSecond/1000}k points/sec, ${state.range}m range)`
    }
  },
  
  actions: {
    // Enable/disable LiDAR
    setEnabled(enabled) {
      this.isEnabled = enabled
    },
    
    // Set LiDAR model
    setModel(model) {
      this.model = model
      
      // Update capabilities based on model
      if (model !== 'none') {
        this.status.available = true
        
        // Set default capabilities based on model (simplified example)
        if (model.includes('high-res')) {
          this.pointsPerSecond = 300000
          this.accuracy = 0.02
        } else if (model.includes('long-range')) {
          this.range = 200
          this.pointsPerSecond = 50000
        }
      } else {
        this.status.available = false
      }
    },
    
    // Update LiDAR settings
    updateSettings(settings) {
      this.settings = {
        ...this.settings,
        ...settings
      }
    },
    
    // Update LiDAR status
    updateStatus(status) {
      this.status = {
        ...this.status,
        ...status
      }
    },
    
    // Start scanning
    startScan() {
      if (this.isOperational) {
        this.status.scanning = true
        this.scanData.lastScanTime = new Date()
      }
    },
    
    // Stop scanning
    stopScan() {
      this.status.scanning = false
    },
    
    // Store current point cloud
    storePointCloud(pointCloud) {
      this.scanData.storedPointClouds.push({
        id: Date.now(),
        timestamp: new Date(),
        data: pointCloud,
        pointCount: this.scanData.pointCount
      })
    },
    
    // Clear all stored point clouds
    clearStoredPointClouds() {
      this.scanData.storedPointClouds = []
    }
  }
}) 