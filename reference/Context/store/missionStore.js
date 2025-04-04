import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { localToGlobal, globalToLocal } from '../utils/sceneManager'
import * as GeoUtils from '../utils/geoUtils'

export const useMissionStore = defineStore('mission', {
  state: () => ({
    // Mission basics
    missionType: null, // 'survey', 'inspection', 'manual'
    workflowStep: 'setup', // 'precheck', 'planning', 'review', 'setup'
    
    // Coordinates
    originCoordinates: { lat: 0, lng: 0, alt: 0 },
    takeoffLocation: null,
    waypoints: [],
    selectedWaypoint: null,
    
    // Equipment
    camera: null,
    
    // Survey settings
    surveySettings: {
      altitude: 50, // meters
      frontOverlap: 80, // percent
      sideOverlap: 70, // percent
      gridAngle: 0, // degrees
    },
    
    // Safety settings
    safetySettings: {
      returnToHome: 'takeoff', // 'takeoff', 'first_waypoint', 'last_waypoint'
      failsafeAltitude: 30, // meters
      missionEndBehavior: 'rtl', // 'rtl', 'land', 'hover'
      lossOfCommsBehavior: 'rtl', // 'rtl', 'land', 'hover', 'continue'
      geofenceEnabled: true,
      geofenceRadius: 500, // meters
      maxAltitude: 120, // meters
      batteryFailsafe: 20, // percent
    },
    
    // Flight parameters 
    flightParameters: {
      climbSpeed: 3.0, // meters per second
      descentSpeed: 2.0, // meters per second
      missionSpeed: 5.0, // meters per second
      transitSpeed: 8.0, // meters per second for transit between waypoints
      returnSpeed: 6.0, // meters per second for return to home
      startingAltitude: 20, // meters to climb to before mission starts
      approachAltitude: 10, // meters altitude for final approach
    },
    
    // Hardware state
    hardware: {
      drone: 'astro',        // Default to FreeFly Astro
      camera: 'ilx',         // Default to Sony ILX
      lens: '50mm f/1.8',    // Default to 50mm lens
      lidar: 'none',         // Default to no LiDAR
      fStop: 2.8,            // Default f-stop 
      focusDistance: 10,     // Default focus distance in feet
      
      // New detailed properties
      cameraDetails: null,   // Detailed camera specifications
      lensDetails: null,     // Detailed lens specifications
      dofCalculations: null, // Depth of field calculations
      fieldOfView: null,     // Field of view in degrees
      groundCoverage: null,  // Ground coverage at current distance
      groundSampleDistance: null, // Ground sample distance in cm/pixel
      
      // Temporary camera settings
      tempCameraDetails: null,
      tempLensDetails: null,
    },
    
    // Drone position state
    dronePosition: {
      x: 0,                // Lateral position (left/right)
      y: 50,               // Height in feet
      z: 0,                // Lateral position (forward/backward)
      followCamera: false,  // Whether camera follows drone
      showInfoPanel: true,  // Whether to show the info panel
      enhancedVisualization: false // Whether to show enhanced visualization
    },
    
    // Simulation state
    simulation: {
      waypoints: [],
      activeWaypoint: 0,
      isPlaying: false,
      pattern: 'building-scan',
      params: {
        buildingWidth: 100,
        buildingHeight: 300,
        scanDistance: 30,
        overlap: 20
      }
    },
    
    simulationPanelVisible: false,
    
    // Event handlers for component cleanup
    eventHandlers: {
      takeoffLocationSet: null,
      orbitTargetSelected: null,
      // Add other handlers as needed
    },
  }),
  
  getters: {
    // Check if takeoff location is set
    hasTakeoffLocation: (state) => {
      return state.takeoffLocation && 
             state.takeoffLocation.lat !== undefined && 
             state.takeoffLocation.lng !== undefined;
    },
    
    // Calculate Ground Sample Distance (GSD) in cm/pixel
    gsd: (state) => {
      if (!state.camera) return null
      
      // This is a simplified calculation
      // In real applications, you'd use the camera sensor size, focal length, 
      // and altitude to calculate this more precisely
      const altitude = state.surveySettings.altitude
      
      // Example calculation (adjust based on actual camera specs):
      // GSD = (sensor width * altitude * 100) / (focal length * image width)
      return (altitude * 100) / 20 // Example value in cm/pixel
    },
    
    // Calculate image footprint in meters (width x height)
    imageFootprint: (state) => {
      if (!state.camera || !state.gsd) return null
      
      // Example calculation:
      const gsdInMeters = state.gsd / 100
      
      // Get image dimensions from camera resolution
      // Parsing example resolution string "20MP (5280×3956)"
      let width = 5000
      let height = 3750
      
      if (state.camera.resolution) {
        const match = state.camera.resolution.match(/\((\d+)×(\d+)\)/)
        if (match) {
          width = parseInt(match[1])
          height = parseInt(match[2])
        }
      }
      
      return {
        width: width * gsdInMeters,
        height: height * gsdInMeters
      }
    },
    
    // Calculate total distance of waypoints in meters
    totalDistance: (state) => {
      if (state.waypoints.length < 2) return 0
      
      let distance = 0
      for (let i = 1; i < state.waypoints.length; i++) {
        const prev = state.waypoints[i - 1]
        const curr = state.waypoints[i]
        
        // Calculate Euclidean distance
        const dx = curr.position.lat - prev.position.lat
        const dz = curr.position.lng - prev.position.lng
        const dy = (curr.height || 0) - (prev.height || 0)
        
        distance += Math.sqrt(dx * dx + dy * dy + dz * dz)
      }
      
      return distance
    },
    
    // Estimated time for mission in seconds
    estimatedTime: (state) => {
      if (state.totalDistance === 0) return 0
      
      // Use the configured mission speed instead of hardcoded value
      const missionSpeed = state.flightParameters.missionSpeed || 5 // m/s
      
      // Add time for each waypoint (5 seconds per waypoint)
      const waypointTime = state.waypoints.length * 5 // seconds
      
      return (state.totalDistance / missionSpeed) + waypointTime
    }
  },
  
  actions: {
    // Set mission type
    setMissionType(type) {
      this.missionType = type
    },
    
    // Set workflow step
    setWorkflowStep(step) {
      this.workflowStep = step
    },
    
    // Set origin coordinates
    setOriginCoordinates(lat, lng, alt) {
      this.originCoordinates = { lat, lng, alt }
    },
    
    // Set takeoff location
    setTakeoffLocation(location) {
      this.takeoffLocation = location
      
      // Log the takeoff location for debugging and future use with RTK data
      console.log('Takeoff location set in store:', {
        local: {
          x: location.lat,
          z: location.lng
        },
        gps: {
          // When RTK data is available, it would be added here
          latitude: null,
          longitude: null,
          altitude: null
        }
      })
      
      // Always move the drone to the takeoff location when it's set or changed
      // Position the drone 6 feet above the ground plane
      this.setDronePosition({
        x: location.lat,
        y: 6, // 6 feet above ground level for hovering
        z: location.lng,
        followCamera: false
      });
      
      return location
    },
    
    // Set camera
    setCamera(camera) {
      this.camera = camera
    },
    
    // Add waypoint
    addWaypoint(waypoint) {
      this.waypoints.push(waypoint)
    },
    
    // Update waypoint
    updateWaypoint(index, waypoint) {
      if (index >= 0 && index < this.waypoints.length) {
        this.waypoints[index] = waypoint
      }
    },
    
    // Remove waypoint
    removeWaypoint(index) {
      if (index >= 0 && index < this.waypoints.length) {
        this.waypoints.splice(index, 1)
        
        // Update selected waypoint if needed
        if (this.selectedWaypoint === index) {
          this.selectedWaypoint = null
        } else if (this.selectedWaypoint > index) {
          this.selectedWaypoint--
        }
      }
    },
    
    // Select waypoint
    selectWaypoint(index) {
      this.selectedWaypoint = index
    },
    
    // Update survey settings
    updateSurveySettings(settings) {
      this.surveySettings = { ...this.surveySettings, ...settings }
    },
    
    // Update safety settings
    updateSafetySettings(settings) {
      this.safetySettings = { ...this.safetySettings, ...settings }
    },
    
    // Update flight parameters
    updateFlightParameters(parameters) {
      this.flightParameters = { ...this.flightParameters, ...parameters }
    },
    
    // Generate survey grid based on parameters
    generateSurveyGrid(boundaries) {
      // Clear existing waypoints
      this.waypoints = []
      
      if (!boundaries || !this.takeoffLocation) return
      
      // Implementation would generate waypoints based on:
      // - Area boundaries
      // - Survey settings (altitude, overlap, angle)
      // - Camera parameters
      
      // This is a simplified placeholder. A real implementation would:
      // 1. Calculate flight lines based on overlap and image footprint
      // 2. Generate waypoints along these lines
      // 3. Optimize for efficient coverage
      
      // For now, just add some dummy waypoints for illustration
      const altitude = this.surveySettings.altitude
      const startX = this.takeoffLocation.lat - 5
      const startY = this.takeoffLocation.lng - 5
      
      // Create a simple grid pattern
      for (let i = 0; i < 3; i++) {
        if (i % 2 === 0) {
          // Left to right
          for (let j = 0; j < 5; j++) {
            this.addWaypoint({
              position: {
                lat: startX + j * 2,
                lng: startY + i * 2
              },
              height: altitude
            })
          }
        } else {
          // Right to left
          for (let j = 4; j >= 0; j--) {
            this.addWaypoint({
              position: {
                lat: startX + j * 2,
                lng: startY + i * 2
              },
              height: altitude
            })
          }
        }
      }
    },
    
    /**
     * Set the hardware configuration for the mission
     */
    setHardware(hardware) {
      this.hardware = {
        ...this.hardware,
        ...hardware
      }
      
      // Persist hardware configuration to localStorage for app-wide access
      try {
        localStorage.setItem('missionHardware', JSON.stringify(this.hardware));
      } catch (error) {
        console.error('Failed to save hardware configuration to localStorage:', error);
      }
    },
    
    /**
     * Load persisted hardware configuration if it exists
     */
    loadPersistedHardware() {
      try {
        const storedHardware = localStorage.getItem('missionHardware');
        if (storedHardware) {
          this.hardware = JSON.parse(storedHardware);
          console.log('Loaded hardware configuration from localStorage');
          return true;
        }
      } catch (error) {
        console.error('Failed to load hardware configuration from localStorage:', error);
      }
      return false;
    },
    
    /**
     * Update the drone position
     */
    setDronePosition(position) {
      this.dronePosition = {
        ...this.dronePosition,
        ...position
      }
    },
    
    /**
     * Toggle whether the camera follows the drone
     */
    toggleFollowCamera() {
      // Get the current value
      const currentValue = this.dronePosition.followCamera
      
      // Toggle to the opposite value
      const newValue = !currentValue
      
      // Update the state
      this.dronePosition = {
        ...this.dronePosition,
        followCamera: newValue
      }
      
      // Log for debugging
      console.log(`[Store] Camera follow toggled: ${currentValue} → ${newValue}`)
    },
    
    /**
     * Update camera settings (f-stop and focus distance)
     */
    updateCameraSettings({ fStop, focusDistance, tempCamera, tempLens }) {
      if (fStop !== undefined) {
        this.hardware.fStop = fStop
      }
      
      if (focusDistance !== undefined) {
        this.hardware.focusDistance = focusDistance
      }
      
      // For temporary camera settings during simulation
      if (tempCamera) {
        this.hardware.tempCameraDetails = {
          ...this.hardware.tempCameraDetails,
          ...tempCamera
        }
      }
      
      if (tempLens) {
        this.hardware.tempLensDetails = {
          ...this.hardware.tempLensDetails,
          ...tempLens
        }
      }
    },
    
    /**
     * Toggle whether the info panel is visible
     */
    toggleInfoPanel() {
      // Get the current value
      const currentValue = this.dronePosition.showInfoPanel
      
      // Toggle to the opposite value
      this.dronePosition = {
        ...this.dronePosition,
        showInfoPanel: !currentValue
      }
    },
    
    /**
     * Toggle enhanced visualization
     */
    toggleEnhancedVisualization() {
      // Get the current value
      const currentValue = this.dronePosition.enhancedVisualization
      
      // Toggle to the opposite value
      this.dronePosition = {
        ...this.dronePosition,
        enhancedVisualization: !currentValue
      }
      
      console.log(`[Store] Enhanced visualization toggled: ${currentValue} → ${!currentValue}`)
    },
    
    /**
     * Set simulation waypoints
     */
    setSimulationWaypoints(waypoints) {
      this.simulation.waypoints = waypoints
    },
    
    /**
     * Set active waypoint in simulation
     */
    setActiveWaypoint(index) {
      this.simulation.activeWaypoint = index
    },
    
    /**
     * Toggle simulation play state
     */
    toggleSimulationPlayState(isPlaying) {
      if (isPlaying !== undefined) {
        this.simulation.isPlaying = isPlaying
      } else {
        this.simulation.isPlaying = !this.simulation.isPlaying
      }
    },
    
    /**
     * Toggle simulation panel visibility
     */
    toggleSimulationPanel() {
      this.simulationPanelVisible = !this.simulationPanelVisible
    },
    
    /**
     * Set a simulation flag
     * @param {string} flag - The flag name to set
     * @param {any} value - The value to set
     */
    setSimulationFlag(flag, value) {
      if (!this.simulation) {
        this.simulation = {}
      }
      this.simulation[flag] = value
    },
    
    // Store event handlers for proper cleanup
    setEventHandlers(handlers) {
      this.eventHandlers = { ...this.eventHandlers, ...handlers };
    },
    
    // Get event handlers
    getEventHandlers() {
      return this.eventHandlers;
    },
    
    // Clear event handlers
    clearEventHandlers() {
      this.eventHandlers = {
        takeoffLocationSet: null,
        orbitTargetSelected: null
      };
    },
  }
}) 