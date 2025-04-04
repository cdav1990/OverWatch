import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCameraStore = defineStore('camera', {
  state: () => ({
    // Camera model and basic info
    model: 'ilx',
    lensType: '50mm f/1.8',
    megapixels: 20,
    sensorSize: 'full-frame',
    
    // Current camera settings
    settings: {
      aperture: 2.8,
      shutterSpeed: '1/250',
      iso: 100,
      whiteBalance: 'auto',
      exposureCompensation: 0,
      focusMode: 'auto',
      focusDistance: 10,
      imageFormat: 'raw',
      aspectRatio: '4:3'
    },
    
    // Camera status
    status: {
      available: true,
      recording: false,
      storageFull: false,
      batteryLevel: 100
    },
    
    // Capture settings
    captureSettings: {
      captureMode: 'single', // 'single', 'burst', 'timelapse', 'video'
      captureInterval: 2, // seconds
      burstCount: 3,
      videoResolution: '4K',
      videoBitrate: 'high',
      videoFrameRate: 30
    }
  }),
  
  getters: {
    // Formatted resolution string
    resolution: (state) => {
      return `${state.megapixels}MP`
    },
    
    // Estimated storage usage per image in MB
    storagePerImage: (state) => {
      const format = state.settings.imageFormat
      const megapixels = state.megapixels
      
      // Rough estimates
      const sizes = {
        'jpg': megapixels * 0.3, // ~0.3MB per MP for JPG
        'raw': megapixels * 1.5, // ~1.5MB per MP for RAW
        'raw+jpg': megapixels * 1.8 // Both formats
      }
      
      return sizes[format] || sizes['jpg']
    }
  },
  
  actions: {
    // Set camera model
    setCameraModel(model) {
      this.model = model
    },
    
    // Update lens type
    setLensType(lensType) {
      this.lensType = lensType
    },
    
    // Update camera settings
    updateSettings(settings) {
      this.settings = {
        ...this.settings,
        ...settings
      }
    },
    
    // Update camera status
    updateStatus(status) {
      this.status = {
        ...this.status,
        ...status
      }
    },
    
    // Update capture settings
    updateCaptureSettings(settings) {
      this.captureSettings = {
        ...this.captureSettings,
        ...settings
      }
    },
    
    // Start recording/capturing
    startCapture() {
      this.status.recording = true
    },
    
    // Stop recording/capturing
    stopCapture() {
      this.status.recording = false
    }
  }
}) 