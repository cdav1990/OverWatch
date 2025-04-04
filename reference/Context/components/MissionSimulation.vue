<template>
  <div v-if="isVisible" class="mission-simulation-panel" :style="panelStyle">
    <div class="header" @mousedown="startDrag" ref="headerRef">
      <h2 class="panel-title">Mission Simulation</h2>
      <v-btn icon size="small" @click="closePanel">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </div>
    
    <div class="simulation-content">
      <!-- Animation controls at the top -->
      <div class="simulation-controls mb-4">
        <v-btn-group class="animation-controls">
          <v-btn color="primary" icon="mdi-home" @click="returnToHomePosition" title="Return to Home"></v-btn>
          <v-btn color="primary" icon="mdi-rewind" @click="restartAnimation" title="Restart"></v-btn>
          <v-btn color="primary" :icon="isPlaying ? 'mdi-pause' : 'mdi-play'" @click="toggleAnimation" title="Play/Pause"></v-btn>
        </v-btn-group>
      </div>
      
      <div class="mission-settings">
        <!-- Flight parameters settings -->
        <div class="section">
          <div class="section-header" @click="flightParamsExpanded = !flightParamsExpanded">
            <h4 class="section-title">Flight Parameters</h4>
            <span class="toggle-icon">{{ flightParamsExpanded ? '▼' : '▶' }}</span>
          </div>
          <div v-show="flightParamsExpanded" class="section-content">
            <!-- Takeoff Location - integrated into Flight Parameters -->
            <div class="settings-column mb-3">
              <h4 class="settings-subtitle">Takeoff Location</h4>
              <div v-if="hasTakeoffLocation" class="takeoff-info">
                <div class="info-stat">
                  <span class="info-label">Status:</span>
                  <span class="info-value success-text">Takeoff Location Set</span>
                </div>
                <div class="info-stat" v-if="missionStore.takeoffLocation">
                  <span class="info-label">Coordinates:</span>
                  <span class="info-value">
                    {{ formatCoordinate(missionStore.takeoffLocation.lat) }}, 
                    {{ formatCoordinate(missionStore.takeoffLocation.lng) }}
                  </span>
                </div>
                <v-btn 
                  color="warning" 
                  size="small" 
                  prepend-icon="mdi-map-marker" 
                  class="mt-2"
                  @click="selectTakeoffLocation"
                >
                  Change Location
                </v-btn>
              </div>
              <div v-else class="takeoff-missing">
                <div class="warning-message">
                  <v-icon color="warning" icon="mdi-alert-circle-outline"></v-icon>
                  <span>No takeoff location set.</span>
                </div>
                <v-btn 
                  color="warning" 
                  block 
                  prepend-icon="mdi-map-marker" 
                  class="mt-3"
                  @click="selectTakeoffLocation"
                >
                  Select Takeoff Location
                </v-btn>
              </div>
            </div>
            
            <div class="settings-grid">
              <div class="settings-column">
                <h4 class="settings-subtitle">Takeoff</h4>
                <div class="input-row">
                  <v-text-field
                    v-model.number="startingAltitude"
                    label="Initial Altitude (m)"
                    type="number"
                    min="5"
                    max="120"
                    variant="outlined"
                    density="compact"
                    bg-color="rgba(0, 0, 0, 0.7)"
                    color="warning"
                    hint="Height to climb before mission starts"
                    persistent-hint
                  ></v-text-field>
                  
                  <v-text-field
                    v-model.number="climbSpeed"
                    label="Climb Speed (m/s)"
                    type="number"
                    min="1"
                    max="10"
                    variant="outlined"
                    density="compact"
                    bg-color="rgba(0, 0, 0, 0.7)"
                    color="warning"
                  ></v-text-field>
                </div>
              </div>
              
              <div class="settings-column">
                <h4 class="settings-subtitle">Mission Speed</h4>
                <div class="input-row">
                  <v-text-field
                    v-model.number="missionSpeed"
                    label="Mission Speed (m/s)"
                    type="number"
                    min="1"
                    max="20"
                    variant="outlined"
                    density="compact"
                    bg-color="rgba(0, 0, 0, 0.7)"
                    color="warning"
                    hint="Speed during data capture"
                    persistent-hint
                  ></v-text-field>
                  
                  <v-text-field
                    v-model.number="transitSpeed"
                    label="Transit Speed (m/s)"
                    type="number"
                    min="1"
                    max="20"
                    variant="outlined"
                    density="compact"
                    bg-color="rgba(0, 0, 0, 0.7)"
                    color="warning"
                    hint="Speed between waypoints"
                    persistent-hint
                  ></v-text-field>
                </div>
              </div>
              
              <div class="settings-column">
                <h4 class="settings-subtitle">Return to Home</h4>
                <v-select
                  v-model="returnToHome"
                  :items="returnToHomeOptions"
                  label="RTH Behavior"
                  variant="outlined"
                  density="compact"
                  bg-color="rgba(0, 0, 0, 0.7)"
                  color="warning"
                  class="setting-control mb-3"
                ></v-select>
                
                <v-select
                  v-model="lossOfCommsBehavior"
                  :items="lossOfCommsBehaviorOptions"
                  label="Loss of Comms"
                  variant="outlined"
                  density="compact"
                  bg-color="rgba(0, 0, 0, 0.7)"
                  color="warning"
                  class="setting-control"
                  hint="Behavior if drone loses connection"
                  persistent-hint
                ></v-select>
              </div>

              <div class="settings-column">
                <h4 class="settings-subtitle">Speed Settings</h4>
                <v-slider
                  v-model="simulationSpeed"
                  :min="1"
                  :max="10"
                  :step="1"
                  color="warning"
                  show-ticks="always"
                  thumb-label
                  label="Simulation Speed"
                ></v-slider>
              </div>
            </div>
            
            <v-btn color="primary" block class="mt-4" @click="saveFlightParameters">
              Save Flight Parameters
            </v-btn>
          </div>
        </div>
        
        <!-- Camera and GSD Settings Section -->
        <div class="section">
          <div class="section-header" @click="hardwareInfoExpanded = !hardwareInfoExpanded">
            <h4 class="section-title">Mission Hardware Info</h4>
            <span class="toggle-icon">{{ hardwareInfoExpanded ? '▼' : '▶' }}</span>
          </div>
          <div v-show="hardwareInfoExpanded" class="section-content">
            <div v-if="!missionStore.hardware || !missionStore.hardware.cameraDetails" class="hardware-notice">
              <v-alert
                type="warning"
                variant="tonal"
                icon="mdi-alert-circle-outline"
                class="mb-3"
              >
                Please go back to Step 3 (Mission Hardware) to set up your drone, camera, and lens.
              </v-alert>
              <div class="d-flex justify-center">
                <v-btn color="warning" @click="navigateToHardwareSelection">
                  Go to Hardware Selection
                </v-btn>
              </div>
            </div>
            
            <div v-else>
              <!-- Hardware Info -->
              <div class="hardware-info-grid">
                <div class="info-section">
                  <h4 class="settings-subtitle">Drone</h4>
                  <div class="info-value">{{ missionStore.hardware.droneDetails?.name || 'Not selected' }}</div>
                </div>
                <div class="info-section">
                  <h4 class="settings-subtitle">Camera</h4>
                  <div class="info-value">
                    {{ missionStore.hardware.cameraDetails ? `${missionStore.hardware.cameraDetails.brand} ${missionStore.hardware.cameraDetails.model}` : 'Not selected' }}
                  </div>
                </div>
                <div class="info-section">
                  <h4 class="settings-subtitle">Lens</h4>
                  <div class="info-value">
                    {{ missionStore.hardware.lensDetails ? `${missionStore.hardware.lensDetails.brand} ${missionStore.hardware.lensDetails.model} (${missionStore.hardware.lensDetails.focalLength}mm)` : 'Not selected' }}
                  </div>
                </div>
              </div>
              
              <!-- Photogrammetry Parameters from Mission Hardware -->
              <div class="results-panel mt-4" v-if="photogrammetryParameters">
                <h4 class="settings-subtitle">Photogrammetry Parameters</h4>
                <div class="results-grid">
                  <div class="result-item">
                    <span class="result-label">GSD:</span>
                    <span class="result-value">{{ photogrammetryParameters.gsd ? photogrammetryParameters.gsd.toFixed(2) : '-' }} cm/px</span>
                  </div>
                  <div class="result-item">
                    <span class="result-label">Footprint:</span>
                    <span class="result-value">{{ photogrammetryParameters.footprint ? (photogrammetryParameters.footprint.width.toFixed(1) + ' × ' + photogrammetryParameters.footprint.height.toFixed(1) + ' m') : '-' }}</span>
                  </div>
                  <div class="result-item">
                    <span class="result-label">Image Spacing:</span>
                    <span class="result-value">{{ photogrammetryParameters.imageSpacing ? photogrammetryParameters.imageSpacing.toFixed(1) : '-' }} m (forward)</span>
                  </div>
                  <div class="result-item">
                    <span class="result-label">Track Spacing:</span>
                    <span class="result-value">{{ photogrammetryParameters.trackSpacing ? photogrammetryParameters.trackSpacing.toFixed(1) : '-' }} m (side)</span>
                  </div>
                  <div class="result-item">
                    <span class="result-label">Images per Ha:</span>
                    <span class="result-value">{{ photogrammetryParameters.imagesPerHectare ? Math.ceil(photogrammetryParameters.imagesPerHectare) : '-' }}</span>
                  </div>
                </div>
              </div>
              
              <div class="mt-4">
                <v-alert
                  type="info"
                  variant="tonal"
                  icon="mdi-information-outline"
                  density="compact"
                >
                  To change camera or drone settings, please go back to Step 3 (Mission Hardware).
                </v-alert>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Object Info Settings Section -->
        <div class="section">
          <div class="section-header" @click="objectInfoExpanded = !objectInfoExpanded">
            <h4 class="section-title">Object Info Settings</h4>
            <span class="toggle-icon">{{ objectInfoExpanded ? '▼' : '▶' }}</span>
          </div>
          <div v-show="objectInfoExpanded" class="section-content">
            <div class="settings-grid">
              <div class="settings-column">
                <h4 class="settings-subtitle">Object Dimensions</h4>
                <div class="input-row">
                  <v-text-field
                    v-model.number="buildingWidth"
                    label="Width (m)"
                    type="number"
                    min="5"
                    max="500"
                    variant="outlined"
                    density="compact"
                    bg-color="rgba(0, 0, 0, 0.7)"
                    color="warning"
                  ></v-text-field>
                  
                  <v-text-field
                    v-model.number="buildingLength"
                    label="Length (m)"
                    type="number"
                    min="5"
                    max="500"
                    variant="outlined"
                    density="compact"
                    bg-color="rgba(0, 0, 0, 0.7)"
                    color="warning"
                  ></v-text-field>
                  
                  <v-text-field
                    v-model.number="buildingHeight"
                    label="Height (m)"
                    type="number"
                    min="5"
                    max="500"
                    variant="outlined"
                    density="compact"
                    bg-color="rgba(0, 0, 0, 0.7)"
                    color="warning"
                  ></v-text-field>
                </div>
                
                <!-- Object Color in Object Dimensions section -->
                <v-select
                  v-model="objectColor"
                  :items="['blue', 'red', 'green', 'yellow', 'purple', 'orange']"
                  label="Object Color"
                  variant="outlined"
                  density="compact"
                  bg-color="rgba(0, 0, 0, 0.7)"
                  color="warning"
                  class="mt-3"
                ></v-select>
                
                <!-- Object Creation Button -->
                <v-btn 
                  color="success" 
                  block 
                  class="mt-3" 
                  prepend-icon="mdi-cube-outline"
                  @click="createScanObject"
                >
                  Create 3D Object
                </v-btn>
              </div>
            </div>
            <!-- Removed button -->
          </div>
        </div>
        
        <!-- Pattern Options Section (moved after Object Info) -->
        <div class="section pattern-options">
          <div class="section-header" @click="patternOptionsExpanded = !patternOptionsExpanded">
            <h4 class="section-title">Pattern Options</h4>
            <span class="toggle-icon">{{ patternOptionsExpanded ? '▼' : '▶' }}</span>
          </div>
          <div v-show="patternOptionsExpanded" class="section-content">
            <div class="pattern-types">
              <v-tabs v-model="patternType" color="warning">
                <v-tab value="2d">2D Patterns</v-tab>
                <v-tab value="3d">3D Patterns</v-tab>
              </v-tabs>
              
              <v-window v-model="patternType">
                <v-window-item value="2d">
                  <div class="pattern-buttons">
                    <v-btn
                      v-for="option in patternOptions.filter(o => o.value === 'grid' || o.value === 'spiral' || o.value === 'top-down')"
                      :key="option.value"
                      :prepend-icon="option.icon"
                      color="primary"
                      :variant="pattern === option.value ? 'elevated' : 'outlined'"
                      @click="setPattern(option.value)"
                      class="pattern-button"
                    >
                      {{ option.title }}
                    </v-btn>
                  </div>
                </v-window-item>
                
                <v-window-item value="3d">
                  <div class="pattern-buttons">
                    <v-btn
                      v-for="option in patternOptions.filter(o => o.value === 'building-scan' || o.value === 'orbit' || o.value === 'facade')"
                      :key="option.value"
                      :prepend-icon="option.icon"
                      color="primary"
                      :variant="pattern === option.value ? 'elevated' : 'outlined'"
                      @click="setPattern(option.value)"
                      class="pattern-button"
                    >
                      {{ option.title }}
                    </v-btn>
                  </div>
                </v-window-item>
              </v-window>
            </div>
            
            <!-- Add Generate Pattern Button -->
            <v-btn color="primary" block class="mt-4" prepend-icon="mdi-map-marker-path" @click="calculatePattern">
              Generate Flight Pattern
            </v-btn>
          </div>
        </div>
        
        <!-- Orbit Pattern Settings -->
        <div v-if="pattern === 'orbit'" class="section">
          <div class="section-header" @click="orbitSettingsExpanded = !orbitSettingsExpanded">
            <h4 class="section-title">Orbit Settings</h4>
            <span class="toggle-icon">{{ orbitSettingsExpanded ? '▼' : '▶' }}</span>
          </div>
          <div v-show="orbitSettingsExpanded" class="section-content">
          <div class="settings-grid">
            <div class="settings-column">
                <h4 class="settings-subtitle">Target Point</h4>
                <v-btn 
                  color="warning" 
                  prepend-icon="mdi-cursor-default-click-outline"
                  block
                  class="mb-3"
                  @click="selectOrbitTarget"
                >
                  Click to Select Target on Map
                </v-btn>
              <div class="input-row">
                <v-text-field
                    v-model.number="orbitCenterX"
                    label="Target X (m)"
                    type="number"
                    variant="outlined"
                    density="compact"
                    bg-color="rgba(0, 0, 0, 0.7)"
                    color="warning"
                    hint="X coordinate relative to takeoff"
                    persistent-hint
                  ></v-text-field>
                  
                  <v-text-field
                    v-model.number="orbitCenterZ"
                    label="Target Z (m)"
                    type="number"
                    variant="outlined"
                    density="compact"
                    bg-color="rgba(0, 0, 0, 0.7)"
                    color="warning"
                    hint="Z coordinate relative to takeoff"
                    persistent-hint
                  ></v-text-field>
                </div>
              </div>
              
              <div class="settings-column">
                <h4 class="settings-subtitle">Orbit Parameters</h4>
                <div class="input-row">
                  <v-text-field
                    v-model.number="orbitRadius"
                    label="Radius (m)"
                  type="number"
                  min="5"
                    max="100"
                    variant="outlined"
                    density="compact"
                    bg-color="rgba(0, 0, 0, 0.7)"
                    color="warning"
                  ></v-text-field>
                  
                  <v-text-field
                    v-model.number="orbitAltitude"
                    label="Altitude (m)"
                    type="number"
                    min="10"
                  max="120"
                  variant="outlined"
                  density="compact"
                  bg-color="rgba(0, 0, 0, 0.7)"
                  color="warning"
                  ></v-text-field>
                </div>
              </div>
              
              <div class="settings-column">
                <h4 class="settings-subtitle">Camera Settings</h4>
                <v-select
                  v-model="orbitCameraMode"
                  :items="orbitCameraModes"
                  label="Camera Mode"
                  variant="outlined"
                  density="compact"
                  bg-color="rgba(0, 0, 0, 0.7)"
                  color="warning"
                  class="setting-control mb-3"
                ></v-select>
                
                <v-text-field
                  v-model.number="orbitCameraAngle"
                  label="Camera Pitch (°)"
                  type="number"
                  min="-90"
                  max="0"
                  variant="outlined"
                  density="compact"
                  bg-color="rgba(0, 0, 0, 0.7)"
                  color="warning"
                  hint="-90° = straight down, 0° = horizontal"
                  persistent-hint
                ></v-text-field>
              </div>
            </div>
                
            <div class="settings-grid mt-4">
              <div class="settings-column">
                <h4 class="settings-subtitle">Advanced</h4>
                <div class="input-row">
                <v-text-field
                    v-model.number="orbitCount"
                    label="Num Orbits"
                  type="number"
                  min="1"
                  max="10"
                  variant="outlined"
                  density="compact"
                  bg-color="rgba(0, 0, 0, 0.7)"
                  color="warning"
                ></v-text-field>
                  
                  <v-text-field
                    v-model.number="orbitVerticalShift"
                    label="Vertical Shift (m)"
                    type="number"
                    min="-10"
                    max="10"
                    variant="outlined"
                    density="compact"
                    bg-color="rgba(0, 0, 0, 0.7)"
                    color="warning"
                    hint="Altitude change per orbit"
                    persistent-hint
                ></v-text-field>
              </div>
            </div>
            
            <div class="settings-column">
                <h4 class="settings-subtitle">Waypoints</h4>
                <v-text-field
                  v-model.number="orbitSegments"
                  label="Segments"
                  type="number"
                  min="8"
                  max="48"
                  variant="outlined"
                  density="compact"
                  bg-color="rgba(0, 0, 0, 0.7)"
                  color="warning"
                  hint="More segments = smoother flight"
                  persistent-hint
                ></v-text-field>
              </div>
            </div>
            
            <v-btn color="primary" block class="mt-4" @click="calculatePattern">
              Generate Orbit Pattern
            </v-btn>
          </div>
        </div>

        <!-- Spiral Pattern Settings -->
        <div v-if="pattern === 'spiral'" class="section">
          <div class="section-header" @click="spiralSettingsExpanded = !spiralSettingsExpanded">
            <h4 class="section-title">Spiral Settings</h4>
            <span class="toggle-icon">{{ spiralSettingsExpanded ? '▼' : '▶' }}</span>
          </div>
          <div v-show="spiralSettingsExpanded" class="section-content">
            <div class="settings-grid">
              <div class="settings-column">
                <h4 class="settings-subtitle">Center Point</h4>
              <div class="input-row">
                <v-text-field
                    v-model.number="spiralCenterX"
                    label="Center X (m)"
                  type="number"
                  variant="outlined"
                  density="compact"
                  bg-color="rgba(0, 0, 0, 0.7)"
                  color="warning"
                    hint="X coordinate relative to takeoff"
                  persistent-hint
                ></v-text-field>
                
                <v-text-field
                    v-model.number="spiralCenterZ"
                    label="Center Z (m)"
                  type="number"
                  variant="outlined"
                  density="compact"
                  bg-color="rgba(0, 0, 0, 0.7)"
                  color="warning"
                    hint="Z coordinate relative to takeoff"
                  persistent-hint
                ></v-text-field>
              </div>
            </div>
            
            <div class="settings-column">
                <h4 class="settings-subtitle">Radius</h4>
                <div class="input-row">
                  <v-text-field
                    v-model.number="spiralStartRadius"
                    label="Start Radius (m)"
                    type="number"
                    min="5"
                    max="100"
                variant="outlined"
                density="compact"
                bg-color="rgba(0, 0, 0, 0.7)"
                color="warning"
                  ></v-text-field>
                  
                  <v-text-field
                    v-model.number="spiralEndRadius"
                    label="End Radius (m)"
                    type="number"
                    min="5"
                    max="100"
                variant="outlined"
                density="compact"
                bg-color="rgba(0, 0, 0, 0.7)"
                color="warning"
                  ></v-text-field>
                </div>
              </div>
              
              <div class="settings-column">
                <h4 class="settings-subtitle">Altitude</h4>
                <div class="input-row">
                  <v-text-field
                    v-model.number="spiralStartAltitude"
                    label="Start Alt (m)"
                    type="number"
                    min="10"
                    max="120"
                    variant="outlined"
                    density="compact"
                    bg-color="rgba(0, 0, 0, 0.7)"
                    color="warning"
                  ></v-text-field>
                  
                  <v-text-field
                    v-model.number="spiralEndAltitude"
                    label="End Alt (m)"
                    type="number"
                    min="10"
                    max="120"
                    variant="outlined"
                    density="compact"
                    bg-color="rgba(0, 0, 0, 0.7)"
                    color="warning"
                  ></v-text-field>
                </div>
              </div>
            </div>
            
            <div class="settings-grid mt-4">
              <div class="settings-column">
                <h4 class="settings-subtitle">Pattern</h4>
                <div class="input-row">
                  <v-text-field
                    v-model.number="spiralRevolutions"
                    label="Revolutions"
                    type="number"
                    min="1"
                    max="10"
                    variant="outlined"
                    density="compact"
                    bg-color="rgba(0, 0, 0, 0.7)"
                    color="warning"
                    hint="Number of complete turns"
                persistent-hint
                  ></v-text-field>
                  
                  <v-text-field
                    v-model.number="spiralSegments"
                    label="Segments"
                    type="number"
                    min="20"
                    max="100"
                    variant="outlined"
                    density="compact"
                    bg-color="rgba(0, 0, 0, 0.7)"
                    color="warning"
                    hint="More segments = smoother spiral"
                    persistent-hint
                  ></v-text-field>
                </div>
            </div>
          </div>
          
            <v-btn color="primary" block class="mt-4" @click="calculatePattern">
              Generate Spiral Pattern
          </v-btn>
          </div>
        </div>
        
        <!-- Facade Scan Pattern Settings -->
        <div v-if="pattern === 'facade'" class="section">
          <div class="section-header" @click="facadeSettingsExpanded = !facadeSettingsExpanded">
            <h4 class="section-title">Facade Scan Settings</h4>
            <span class="toggle-icon">{{ facadeSettingsExpanded ? '▼' : '▶' }}</span>
          </div>
          <div v-show="facadeSettingsExpanded" class="section-content">
          <div class="settings-grid">
              <div class="settings-column">
                <h4 class="settings-subtitle">Building Location</h4>
                <div class="input-row">
                  <v-text-field
                    v-model.number="facadeCenterX"
                    label="Center X (m)"
                    type="number"
                    variant="outlined"
                    density="compact"
                    bg-color="rgba(0, 0, 0, 0.7)"
                    color="warning"
                    hint="X coordinate relative to takeoff"
                    persistent-hint
                  ></v-text-field>
                  
                  <v-text-field
                    v-model.number="facadeCenterZ"
                    label="Center Z (m)"
                    type="number"
                    variant="outlined"
                    density="compact"
                    bg-color="rgba(0, 0, 0, 0.7)"
                    color="warning"
                    hint="Z coordinate relative to takeoff"
                    persistent-hint
                  ></v-text-field>
                </div>
              </div>
              
            <div class="settings-column">
              <h4 class="settings-subtitle">Building Dimensions</h4>
              <div class="input-row">
                <v-text-field
                    v-model.number="facadeWidth"
                    label="Width (m)"
                  type="number"
                    min="5"
                    max="100"
                  variant="outlined"
                  density="compact"
                  bg-color="rgba(0, 0, 0, 0.7)"
                  color="warning"
                ></v-text-field>
                
                <v-text-field
                    v-model.number="facadeHeight"
                    label="Height (m)"
                  type="number"
                    min="5"
                    max="100"
                  variant="outlined"
                  density="compact"
                  bg-color="rgba(0, 0, 0, 0.7)"
                  color="warning"
                ></v-text-field>
              </div>
            </div>
            
            <div class="settings-column">
              <h4 class="settings-subtitle">Scan Settings</h4>
              <div class="input-row">
                <v-text-field
                    v-model.number="facadeScanDistance"
                    label="Distance (m)"
                  type="number"
                  min="5"
                    max="30"
                  variant="outlined"
                  density="compact"
                  bg-color="rgba(0, 0, 0, 0.7)"
                  color="warning"
                    hint="Distance from building"
                    persistent-hint
                ></v-text-field>
                
                <v-text-field
                    v-model.number="facadeOverlap"
                  label="Overlap (%)"
                  type="number"
                  min="0"
                    max="80"
                  variant="outlined"
                  density="compact"
                  bg-color="rgba(0, 0, 0, 0.7)"
                  color="warning"
                ></v-text-field>
                </div>
              </div>
            </div>
            
            <div class="settings-grid mt-4">
            <div class="settings-column">
                <h4 class="settings-subtitle">Orientation</h4>
                <v-text-field
                  v-model.number="facadeOrientation"
                  label="Rotation (°)"
                  type="number"
                  min="0"
                  max="360"
                  variant="outlined"
                  density="compact"
                  bg-color="rgba(0, 0, 0, 0.7)"
                color="warning"
                  hint="Building rotation"
                  persistent-hint
                ></v-text-field>
              </div>
              
              <!-- Add Face Selection Section -->
              <div class="settings-column">
                <h4 class="settings-subtitle">Face Selection</h4>
                <v-select
                  v-model="selectedFaces"
                  :items="facadeOptions"
                  label="Select Faces to Scan"
                  variant="outlined"
                  density="compact"
                  bg-color="rgba(0, 0, 0, 0.7)"
                  color="warning"
                  multiple
                  chips
                  hint="Select building faces to scan"
                  persistent-hint
                ></v-select>
                
                <div class="face-selection-visual mt-3">
                  <div class="building-top-view">
                    <div 
                      v-for="(face, index) in ['North', 'East', 'South', 'West']" 
                      :key="index"
                      :class="['building-face', 'face-' + index, {selected: selectedFaces.includes(face)}]"
                      @click="toggleFaceSelection(face)"
                    >
                      {{ face.charAt(0) }}
                    </div>
                    <div class="building-center"></div>
                  </div>
                  <div class="text-caption text-center mt-2">Top View (click to select/deselect)</div>
                </div>
            </div>
          </div>
          
            <!-- Remove the combined calculation button -->
          </div>
        </div>

        <!-- Top-Down Survey Settings -->
        <div v-if="pattern === 'top-down'" class="section-content">
          <h4 class="settings-subtitle">Top-Down Survey Settings</h4>
          
          <div v-if="!drawnArea" class="survey-instructions">
            <v-alert
              type="info"
              variant="tonal"
              icon="mdi-information-outline"
              class="mb-3"
            >
              Please use the 2D polygon tool to draw the survey area on the map. After drawing the area, you can adjust the settings below.
            </v-alert>
            <v-btn 
              color="primary" 
              block 
              prepend-icon="mdi-vector-polygon"
              @click="activateDrawingTool"
              class="mb-4"
            >
              Open Drawing Tool
            </v-btn>
          </div>
          
          <div v-else class="survey-area-info mb-4">
            <div class="d-flex align-center justify-space-between">
              <h5 class="text-subtitle-1">Survey Area Selected</h5>
              <v-btn 
                size="small" 
                variant="outlined" 
                color="primary" 
                @click="clearDrawnArea"
                prepend-icon="mdi-refresh"
              >
                Select New Area
              </v-btn>
            </div>
            <div class="area-details">
              <div class="info-item">
                <span class="info-label">Area Size:</span>
                <span class="info-value">{{ calculateAreaSize() }} m²</span>
              </div>
              <div class="info-item">
                <span class="info-label">Dimensions:</span>
                <span class="info-value">{{ calculateAreaDimensions() }}</span>
              </div>
            </div>
          </div>
          
          <!-- Takeoff and Landing Locations -->
          <div class="takeoff-landing-options mb-4">
            <h5 class="text-subtitle-1">Takeoff & Landing Locations</h5>
            
            <div class="location-cards mt-2">
              <!-- Takeoff Location Card -->
              <v-card variant="outlined" class="location-card mb-2">
                <v-card-title class="d-flex justify-space-between align-center py-2">
                  <span class="text-subtitle-2">Takeoff Location</span>
                  <v-btn 
                    v-if="!customTakeoffLocation" 
                    icon="mdi-map-marker-plus" 
                    size="small" 
                    color="primary"
                    @click="selectSurveyTakeoffLocation"
                  ></v-btn>
                  <v-btn 
                    v-else 
                    icon="mdi-delete" 
                    size="small" 
                    color="error"
                    @click="clearSurveyTakeoffLocation"
                  ></v-btn>
                </v-card-title>
                <v-card-text class="py-2">
                  <div v-if="customTakeoffLocation" class="custom-location-info">
                    <div class="info-item">
                      <span class="info-label">X:</span>
                      <span class="info-value">{{ customTakeoffLocation.x.toFixed(2) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Z:</span>
                      <span class="info-value">{{ customTakeoffLocation.z.toFixed(2) }}</span>
                    </div>
                  </div>
                  <div v-else class="location-message">
                    <span>Using default takeoff location</span>
                  </div>
                </v-card-text>
              </v-card>
              
              <!-- Landing Location Card -->
              <v-card variant="outlined" class="location-card">
                <v-card-title class="d-flex justify-space-between align-center py-2">
                  <span class="text-subtitle-2">Landing Location</span>
                  <v-btn 
                    v-if="!customLandingLocation" 
                    icon="mdi-map-marker-plus" 
                    size="small" 
                    color="primary"
                    @click="selectSurveyLandingLocation"
                  ></v-btn>
                  <v-btn 
                    v-else 
                    icon="mdi-delete" 
                    size="small" 
                    color="error"
                    @click="clearSurveyLandingLocation"
                  ></v-btn>
                </v-card-title>
                <v-card-text class="py-2">
                  <div v-if="customLandingLocation" class="custom-location-info">
                    <div class="info-item">
                      <span class="info-label">X:</span>
                      <span class="info-value">{{ customLandingLocation.x.toFixed(2) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Z:</span>
                      <span class="info-value">{{ customLandingLocation.z.toFixed(2) }}</span>
                    </div>
                  </div>
                  <div v-else class="location-message">
                    <span>Using takeoff location for landing</span>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </div>
          
          <div class="settings-grid">
            <div class="settings-column">
              <v-text-field
                v-model.number="surveyAltitude"
                label="Flight Altitude (m)"
                type="number"
                min="10"
                max="400"
                variant="outlined"
                density="compact"
                bg-color="rgba(0, 0, 0, 0.7)"
                color="warning"
              ></v-text-field>
              
              <v-text-field
                v-model.number="flightDirection"
                label="Flight Direction (°)"
                type="number"
                min="0"
                max="360"
                variant="outlined"
                density="compact"
                bg-color="rgba(0, 0, 0, 0.7)"
                color="warning"
                hint="0° = North, 90° = East"
                persistent-hint
              ></v-text-field>
            </div>
            
            <div class="settings-column">
              <v-text-field
                v-model.number="frontOverlap"
                label="Front Overlap (%)"
                type="number"
                min="50"
                max="90"
                variant="outlined"
                density="compact"
                bg-color="rgba(0, 0, 0, 0.7)"
                color="warning"
              ></v-text-field>
              
              <v-text-field
                v-model.number="sideOverlap"
                label="Side Overlap (%)"
                type="number"
                min="50"
                max="90"
                variant="outlined"
                density="compact"
                bg-color="rgba(0, 0, 0, 0.7)"
                color="warning"
              ></v-text-field>
            </div>
            
            <div class="settings-column">
              <v-text-field
                v-model.number="missionSpeed"
                label="Flight Speed (m/s)"
                type="number"
                min="0.5"
                max="10"
                step="0.1"
                variant="outlined"
                density="compact"
                bg-color="rgba(0, 0, 0, 0.7)"
                color="warning"
                hint="Speed during data capture"
                persistent-hint
              ></v-text-field>
              
              <v-btn 
                class="mt-3"
                color="primary" 
                block 
                variant="tonal"
                @click="calculateTopDownSurveyFromDrawnArea"
                :disabled="!drawnArea"
              >
                Update Flight Path
              </v-btn>
            </div>
          </div>
          
          <!-- Wind Direction Settings -->
          <div class="wind-settings mt-4">
            <h5 class="text-subtitle-1">Wind Settings</h5>
            <div class="settings-grid">
              <div class="settings-column">
                <v-text-field
                  v-model.number="windDirection"
                  label="Wind Direction (°)"
                  type="number"
                  min="0"
                  max="360"
                  variant="outlined"
                  density="compact"
                  bg-color="rgba(0, 0, 0, 0.7)"
                  color="warning"
                  hint="Direction wind is coming FROM"
                  persistent-hint
                ></v-text-field>
              </div>
              
              <div class="settings-column">
                <v-text-field
                  v-model.number="windSpeed"
                  label="Wind Speed (m/s)"
                  type="number"
                  min="0"
                  max="15"
                  variant="outlined"
                  density="compact"
                  bg-color="rgba(0, 0, 0, 0.7)"
                  color="warning"
                  hint="Flight path adjusts above 3 m/s"
                  persistent-hint
                ></v-text-field>
              </div>
              
              <div class="settings-column">
                <div class="wind-info">
                  <div v-if="windSpeed > 3" class="wind-direction-info">
                    <v-icon icon="mdi-information-outline" color="info" class="mr-1"></v-icon>
                    <span>Flight lines will be perpendicular to wind</span>
                  </div>
                  <div v-else class="wind-direction-info">
                    <v-icon icon="mdi-check" color="success" class="mr-1"></v-icon>
                    <span>Using manual flight direction</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Terrain Following Settings -->
          <div class="terrain-settings mt-4">
            <div class="d-flex align-center justify-space-between">
              <h5 class="text-subtitle-1">Terrain Following</h5>
              <v-switch
                v-model="useTerrainFollowing"
                color="primary"
                hide-details
                density="compact"
                class="mt-0 pt-0"
              ></v-switch>
            </div>
            
            <div v-if="useTerrainFollowing" class="terrain-options mt-2">
              <div class="settings-grid">
                <div class="settings-column">
                  <v-text-field
                    v-model.number="terrainSafetyDistance"
                    label="Safety Height (m)"
                    type="number"
                    min="5"
                    max="30"
                    variant="outlined"
                    density="compact"
                    bg-color="rgba(0, 0, 0, 0.7)"
                    color="warning"
                    hint="Height above terrain"
                    persistent-hint
                  ></v-text-field>
                </div>
                
                <div class="settings-column">
                  <div class="terrain-info-panel">
                    <v-alert
                      density="compact"
                      type="info"
                      variant="tonal"
                      class="mt-1"
                    >
                      Drone will maintain constant distance above terrain while capturing images.
                    </v-alert>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-else class="terrain-info mt-2">
              <v-alert
                density="compact"
                type="info"
                variant="tonal"
              >
                Using constant altitude above sea level.
              </v-alert>
            </div>
          </div>
          
          <div class="survey-info mt-4" v-if="photogrammetryParameters">
            <h4 class="settings-subtitle">Survey Information</h4>
            
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">GSD:</span>
                <span class="info-value">{{ photogrammetryParameters.gsd.toFixed(2) }} cm/px</span>
              </div>
              
              <div class="info-item">
                <span class="info-label">Footprint:</span>
                <span class="info-value">{{ photogrammetryParameters.footprint.width.toFixed(1) }} × {{ photogrammetryParameters.footprint.height.toFixed(1) }} m</span>
              </div>
              
              <div class="info-item">
                <span class="info-label">Image Spacing:</span>
                <span class="info-value">{{ photogrammetryParameters.imageSpacing.toFixed(1) }} m</span>
              </div>
              
              <div class="info-item">
                <span class="info-label">Track Spacing:</span>
                <span class="info-value">{{ photogrammetryParameters.trackSpacing.toFixed(1) }} m</span>
              </div>
              
              <div v-if="drawnArea" class="info-item">
                <span class="info-label">Images Required:</span>
                <span class="info-value">{{ calculateImagesRequired() }}</span>
              </div>
              
              <div v-if="drawnArea" class="info-item">
                <span class="info-label">Flight Time:</span>
                <span class="info-value">{{ calculateFlightTime() }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="mission-info" v-if="patternCalculated">
        <div class="simulation-progress">
          <div class="progress-info">
            <div class="info-stat">
              <span class="info-label">Waypoints:</span>
              <span class="info-value">{{ simulationWaypoints.length }}</span>
            </div>
            <div class="info-stat">
              <span class="info-label">Current:</span>
              <span class="info-value">{{ currentWaypointIndex + 1 }}/{{ simulationWaypoints.length }}</span>
            </div>
            <div class="info-stat">
              <span class="info-label">Flight Time:</span>
              <span class="info-value">{{ flightTimeDisplay }}</span>
            </div>
            <div class="info-stat">
              <span class="info-label">Coverage:</span>
              <span class="info-value">{{ coverageArea.toFixed(1) }} ft²</span>
            </div>
          </div>
          
          <v-progress-linear v-model="animationProgress" color="warning" height="8"></v-progress-linear>
        </div>
      </div>
    </div>
  </div>
  
  <v-dialog v-model="takeoffPromptVisible" persistent max-width="400px">
    <v-card>
      <v-card-title class="headline">
        Set Takeoff Location
      </v-card-title>
      <v-card-text>
        Please set a takeoff location before generating a pattern. This will be the starting and ending point for the mission.
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="outlined" @click="selectTakeoffLocation">
          Select Takeoff Location
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  
  <!-- GSD Information Dialog -->
  <v-dialog v-model="showGSDInfo" max-width="600px">
    <v-card>
      <v-card-title class="headline">
        Ground Sampling Distance (GSD)
      </v-card-title>
      <v-card-text>
        <p class="mb-3">
          <b>GSD</b> is the distance between the centers of two consecutive pixels measured on the ground. It determines the level of detail captured in your photogrammetry images.
        </p>
        
        <div class="info-subtitle">How it's calculated:</div>
        <p class="mb-3">
          GSD = (Sensor Width × Flight Height × 100) ÷ (Focal Length × Image Width)
        </p>
        
        <div class="info-subtitle">What it means:</div>
        <ul class="mb-4">
          <li><b>Lower GSD</b> (e.g., 1 cm/px): Higher resolution, more detail, requires flying lower or using a better camera</li>
          <li><b>Higher GSD</b> (e.g., 5 cm/px): Lower resolution, less detail, allows flying higher and covering more area</li>
        </ul>
        
        <div class="info-subtitle">Recommended GSD values:</div>
        <ul>
          <li><b>High Detail</b> (buildings, infrastructure): 1-2 cm/px</li>
          <li><b>Medium Detail</b> (general mapping): 2-5 cm/px</li>
          <li><b>Low Detail</b> (large area survey): 5-10 cm/px</li>
        </ul>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="showGSDInfo = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useMissionStore } from '../store/missionStore'
import { showNotification, showSuccessNotification } from '../utils/notifications'
import * as FlightPatterns from '../utils/flightPatterns'
import { toRaw } from 'vue'
import { 
  calculateGSD, 
  calculateFootprint, 
  calculateFieldOfView, 
  calculateImageSpacing,
  calculateAltitudeForGSD, 
  calculateFacadeParameters 
} from '../utils/gsdCalculations'

// Import API services
import api from '../services/api';

const { generateOrbit, generateSpiral, generateFacadeScan: flightPatternFacadeScan, convertToMissionWaypoints } = FlightPatterns;

// Define props
const props = defineProps({
  initialX: {
    type: Number,
    default: window.innerWidth / 2 - 350  // Center the panel (half of the new 700px width)
  },
  initialY: {
    type: Number,
    default: 100
  },
  initialPattern: {
    type: String,
    default: 'grid'
  },
  isVisible: {
    type: Boolean,
    default: true
  }
})

// Define panel state
const emit = defineEmits(['close'])
const isVisible = ref(props.isVisible)
const isDragging = ref(false)
const headerRef = ref(null)
const dragOffset = ref({ x: 0, y: 0 })
const panelPosition = ref({ x: props.initialX, y: props.initialY })

// Mission simulation state
const missionStore = useMissionStore()
const simulationWaypoints = ref([])
const currentWaypointIndex = ref(0)
const animationProgress = ref(0)
const isPlaying = ref(false)
const animationTimer = ref(null)
const patternCalculated = ref(false)
const coverageArea = ref(0)
const simulationSpeed = ref(1)
const takeoffPromptVisible = ref(false)

// Variables for survey and takeoff/landing selection
const isSelectingTakeoff = ref(false)
const isSelectingLanding = ref(false)
const customTakeoffLocation = ref(null)
const customLandingLocation = ref(null)
const drawnArea = ref(null)
const drawnAreaPoints = ref([])
const surveyAltitude = ref(50)
const flightDirection = ref(0)
const windDirection = ref(0)
const windSpeed = ref(0)
const useTerrainFollowing = ref(false)
const terrainSafetyDistance = ref(5)
const surveyArea = ref({ width: 100, height: 100 })

// Interface state
const patternType = ref('3d')
const pattern = ref(props.initialPattern || 'grid')

// Pattern options
const patternOptions = [
  { title: 'Building Scan', value: 'building-scan', icon: 'mdi-office-building' },
  { title: 'Grid', value: 'grid', icon: 'mdi-grid' },
  { title: 'Orbit', value: 'orbit', icon: 'mdi-orbit' },
  { title: 'Spiral', value: 'spiral', icon: 'mdi-spiral' },
  { title: 'Facade', value: 'facade', icon: 'mdi-wall' },
  { title: 'Top-Down', value: 'top-down', icon: 'mdi-camera-iris' }
]

// Flight parameters
const startingAltitude = ref(50)
const climbSpeed = ref(3)
const missionSpeed = ref(5)
const transitSpeed = ref(7)
const returnToHome = ref('takeoff')
const returnToHomeOptions = [
  { title: 'Return to Takeoff', value: 'takeoff' },
  { title: 'Land at Last Waypoint', value: 'last_waypoint' }
]
const lossOfCommsBehavior = ref('rtl')
const lossOfCommsBehaviorOptions = [
  { title: 'Return to Home', value: 'rtl' },
  { title: 'Land in Place', value: 'land' },
  { title: 'Continue Mission', value: 'continue' }
]

// Building scan parameters
const buildingWidth = ref(100)
const buildingLength = ref(300)
const buildingHeight = ref(300)
const scanDistance = ref(30)
const overlap = ref(20)
const objectColor = ref('blue')
const objectColorOptions = [
  { title: 'Red', value: 'red' },
  { title: 'Green', value: 'green' },
  { title: 'Blue', value: 'blue' },
  { title: 'Yellow', value: 'yellow' },
  { title: 'Orange', value: 'orange' },
  { title: 'Gray', value: 'gray' }
]

// Orbit pattern parameters
const orbitCenterX = ref(0)
const orbitCenterZ = ref(0)
const orbitRadius = ref(30)
const orbitAltitude = ref(60)
const orbitCameraMode = ref('center')
const orbitCameraModes = [
  { title: 'Point at Target', value: 'center' },
  { title: 'Forward Facing', value: 'forward' },
  { title: 'Fixed Angle', value: 'custom' }
]
const orbitCameraAngle = ref(-45)
const orbitSegments = ref(16)
const orbitCount = ref(1)
const orbitVerticalShift = ref(5)

// Spiral pattern parameters
const spiralCenterX = ref(0)
const spiralCenterZ = ref(0)
const spiralStartRadius = ref(10)
const spiralEndRadius = ref(50)
const spiralStartAltitude = ref(20)
const spiralEndAltitude = ref(100)
const spiralRevolutions = ref(3)
const spiralSegments = ref(60)

// Facade scan parameters
const facadeCenterX = ref(0)
const facadeCenterZ = ref(0)
const facadeWidth = ref(30)
const facadeHeight = ref(40)
const facadeScanDistance = ref(15)
const facadeOverlap = ref(30)
const facadeOrientation = ref(0)
const selectedFaces = ref(['North', 'East', 'South', 'West']) // Default: select all faces
const facadeOptions = [
  { title: 'North Face', value: 'North' },
  { title: 'East Face', value: 'East' },
  { title: 'South Face', value: 'South' },
  { title: 'West Face', value: 'West' }
]

// Add state for collapsible sections
const patternOptionsExpanded = ref(false);
const flightParamsExpanded = ref(false);
const hardwareInfoExpanded = ref(false);
const objectInfoExpanded = ref(false);
const orbitSettingsExpanded = ref(false);
const spiralSettingsExpanded = ref(false);
const facadeSettingsExpanded = ref(false);
const scanSettingsExpanded = ref(false);
const speedSettingsExpanded = ref(false);
const takeoffSectionExpanded = ref(false);
const cameraSettingsExpanded = ref(false);

// Add missing variables
const loopAnimation = ref(false);
const followCamera = ref(true);

// Camera and GSD Settings
const selectedDroneModel = ref('phantom4pro'); // Default to Phantom 4 Pro
const targetGSD = ref(2.5); // Default GSD target in cm/pixel
const frontOverlap = ref(75); // Default front overlap (%)
const sideOverlap = ref(65); // Default side overlap (%)
const photogrammetryParameters = ref(null);
const showGSDInfo = ref(false); // Controls GSD info dialog
const currentCamera = ref({
  name: '',
  focalLength: 0,
  sensorWidth: 0,
  sensorHeight: 0,
  imageWidth: 0,
  imageHeight: 0
});

// Toggle section visibility
const toggleSection = (section) => {
  if (section === 'patternOptions') patternOptionsExpanded.value = !patternOptionsExpanded.value;
  else if (section === 'flightParams') flightParamsExpanded.value = !flightParamsExpanded.value;
  else if (section === 'objectInfo') objectInfoExpanded.value = !objectInfoExpanded.value;
  else if (section === 'hardwareInfo') hardwareInfoExpanded.value = !hardwareInfoExpanded.value;
  else if (section === 'orbitSettings') orbitSettingsExpanded.value = !orbitSettingsExpanded.value;
  else if (section === 'spiralSettings') spiralSettingsExpanded.value = !spiralSettingsExpanded.value;
  else if (section === 'facadeSettings') facadeSettingsExpanded.value = !facadeSettingsExpanded.value;
  else if (section === 'scanSettings') scanSettingsExpanded.value = !scanSettingsExpanded.value;
  else if (section === 'speedSettings') speedSettingsExpanded.value = !speedSettingsExpanded.value;
  else if (section === 'takeoffSettings') takeoffSectionExpanded.value = !takeoffSectionExpanded.value;
  else if (section === 'cameraSettings') cameraSettingsExpanded.value = !cameraSettingsExpanded.value;
};

// Computed property for available drone models
const availableDroneModels = computed(() => {
  // For photogrammetry missions, prioritize drones with better cameras
  if (pattern.value === 'grid' || pattern.value === 'lawnmower') {
    return droneModels.filter(drone => 
      drone.categories.includes('mapping') || 
      drone.categories.includes('professional')
    );
  }
  
  // For facade scans, prioritize drones with optical zoom
  if (pattern.value === 'facade') {
    return droneModels.filter(drone => 
      drone.camera.opticalZoom > 1 || 
      drone.categories.includes('inspection')
    );
  }
  
  // Return all drones for other mission types
  return droneModels;
});

// Format drone models for v-select
const droneModelOptions = computed(() => {
  return availableDroneModels.value.map(model => ({
    value: model.id,
    title: model.name,
    subtitle: model.camera.name,
    prependAvatar: model.camera.opticalZoom > 1 ? '📸' : '🎥',
    appendIcon: model.categories.includes('professional') ? 'mdi-shield-check' : '',
  }));
});

// Update pattern and params when altitude changes
watch(startingAltitude, () => {
  if (pattern.value && patternCalculated.value) {
    console.log('Altitude changed, recalculating pattern');
    calculatePattern();
  }

  // Recalculate GSD and other photogrammetry parameters when altitude changes
  if (currentCamera.value.focalLength) {
    recalculatePhotogrammetryParams();
  }
});

// Update camera parameters when drone model changes
const updateCameraFromDrone = () => {
  if (!selectedDroneModel.value) return;

  const drone = getDroneModel(selectedDroneModel.value);
  if (!drone || !drone.camera) {
    currentCamera.value = {
      name: 'Unknown',
      focalLength: 0,
      sensorWidth: 0,
      sensorHeight: 0,
      imageWidth: 0,
      imageHeight: 0,
      pixelSize: 0,
      aspectRatio: 0
    };
    return;
  }

  // Update camera specs with selected drone's camera
  currentCamera.value = { ...drone.camera };
  
  // Recalculate parameters with new camera
  recalculatePhotogrammetryParams();
};

// Watch for drone model changes
watch(selectedDroneModel, updateCameraFromDrone);

// Calculate altitude needed to achieve target GSD
const calculateAltitudeFromGSD = () => {
  if (!currentCamera.value.focalLength || !targetGSD.value) {
    return startingAltitude.value;
  }
  
  try {
    // Calculate altitude based on target GSD
    const newAltitude = calculateAltitudeForGSD({
      gsd: targetGSD.value, // in cm/pixel
      focalLength: currentCamera.value.focalLength,
      sensorWidth: currentCamera.value.sensorWidth,
      imageWidth: currentCamera.value.imageWidth
    });
    
    // Validate altitude is within reasonable range (5-500m)
    if (newAltitude < 5) {
      showNotification({
        message: 'Warning: Calculated altitude is very low. Consider increasing GSD.',
        color: 'warning',
        timeout: 5000
      });
      return 5; // Minimum reasonable altitude
    }
    
    if (newAltitude > 500) {
      showNotification({
        message: 'Warning: Calculated altitude is very high. Consider decreasing GSD.',
        color: 'warning',
        timeout: 5000
      });
      return 500; // Maximum reasonable altitude
    }
    
    return newAltitude;
  } catch (error) {
    console.error('Error calculating altitude from GSD:', error);
    return startingAltitude.value; // Return current altitude on error
  }
};

// Apply target GSD by adjusting altitude
const applyTargetGSD = () => {
  const newAltitude = calculateAltitudeFromGSD();
  
  // Update altitude if it's different
  if (Math.abs(startingAltitude.value - newAltitude) > 0.1) {
    startingAltitude.value = Math.round(newAltitude);
    
    showNotification({
      message: `Altitude adjusted to ${startingAltitude.value}m to achieve target GSD`,
      color: 'info',
      timeout: 3000
    });
    
    // Also recalculate flight pattern if it exists
    if (pattern.value && patternCalculated.value) {
      calculatePattern();
    }
  }
};

// Calculate all photogrammetry parameters based on current settings
const recalculatePhotogrammetryParams = () => {
  if (!currentCamera.value.focalLength) {
    photogrammetryParameters.value = null;
    return;
  }
  
  try {
    // Call the implementation method directly rather than passing parameters
    calculatePhotogrammetryParameters();
  } catch (error) {
    console.error('Error calculating photogrammetry parameters:', error);
    photogrammetryParameters.value = null;
  }
};

// Create refs to store event handlers at component level
const eventHandlers = ref({
  takeoffLocationSet: null,
  orbitTargetSelected: null,
  drawnAreaCreated: null,
  surveyTakeoffSelected: null,
  surveyLandingSelected: null
});

// Dragging functionality
const startDrag = (event) => {
  // Prevent dragging when clicking on the close button
  if (event.target.closest('.v-btn')) return
  
  // Add dragging class to both panel and body
  const panel = event.currentTarget.closest('.mission-simulation-panel')
  if (panel) {
    panel.classList.add('dragging')
  }
  
  // Add class to body to control 3D scene pointer events
  document.body.classList.add('panel-dragging')
  
  // Store initial mouse and panel positions
  const panelRect = panel.getBoundingClientRect()
  dragOffset.value = {
    x: event.clientX - panelRect.left,
    y: event.clientY - panelRect.top
  }
  
  // Start dragging after setting the offset
  isDragging.value = true
  
  // Add event listeners
  document.addEventListener('mousemove', handleDrag, { passive: false })
  document.addEventListener('mouseup', stopDrag)
  
  // Prevent default behavior to avoid text selection during drag
  event.preventDefault()
}

// Handle drag movement
const handleDrag = (event) => {
  if (!isDragging.value) return
  
  // Prevent default browser behavior
  event.preventDefault()
  
  // Get viewport dimensions
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  
  // Get the panel element
  const panel = document.querySelector('.mission-simulation-panel')
  if (!panel) return
  
  // Get panel dimensions
  const panelWidth = panel.offsetWidth
  const panelHeight = panel.offsetHeight
  
  // Calculate the new position based on mouse position and original offset
  let newX = event.clientX - dragOffset.value.x
  let newY = event.clientY - dragOffset.value.y
  
  // Less restrictive constraints - allow more of the panel to go off-screen if needed
  // Just ensure at least 80px or 20% of panel width (whichever is smaller) remains visible
  const minVisibleWidth = Math.min(80, panelWidth * 0.2)
  const minVisibleHeight = Math.min(40, panelHeight * 0.2)
  
  // Limit position to keep panel partially visible
  newX = Math.max(-panelWidth + minVisibleWidth, Math.min(windowWidth - minVisibleWidth, newX))
  newY = Math.max(0, Math.min(windowHeight - minVisibleHeight, newY))
  
  // Update position state
  panelPosition.value = { x: newX, y: newY }
}

// Stop drag operation
const stopDrag = () => {
  if (!isDragging.value) return
  
  isDragging.value = false
  
  // Remove the dragging class from panel
  const panel = document.querySelector('.mission-simulation-panel')
  if (panel) {
    panel.classList.remove('dragging')
  }
  
  // Remove class from body
  document.body.classList.remove('panel-dragging')
  
  // Remove event listeners
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// Close panel function
const closePanel = () => {
  isVisible.value = false
  missionStore.toggleSimulationPanel()
  emit('close')
}

// Clean up event listeners
onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
})

// Set the pattern type
const setPattern = (newPattern) => {
  pattern.value = newPattern
  
  // Load default parameters based on pattern
  if (newPattern === 'building-scan') {
    buildingWidth.value = 100
    buildingLength.value = 300
    buildingHeight.value = 300
    scanDistance.value = 30
    overlap.value = 20
  } else if (newPattern === 'grid') {
    // Set grid defaults
  } else if (newPattern === 'spiral') {
    // Set spiral defaults
    spiralCenterX.value = 0
    spiralCenterZ.value = 0
    spiralStartRadius.value = 10
    spiralEndRadius.value = 50
    spiralStartAltitude.value = 20
    spiralEndAltitude.value = 100
    spiralRevolutions.value = 3
    spiralSegments.value = 60
  } else if (newPattern === 'orbit') {
    // Set orbit defaults
    orbitCenterX.value = 0
    orbitCenterZ.value = 0
    orbitRadius.value = 30
    orbitAltitude.value = 60
    orbitCameraMode.value = 'center'
    orbitCameraAngle.value = -45
    orbitSegments.value = 16
    orbitCount.value = 1
    orbitVerticalShift.value = 5
  } else if (newPattern === 'facade') {
    // Set facade scan defaults
    facadeCenterX.value = 0
    facadeCenterZ.value = 0
    facadeWidth.value = 30
    facadeHeight.value = 40
    facadeScanDistance.value = 15
    facadeOverlap.value = 30
    facadeOrientation.value = 0
  } else if (newPattern === 'top-down') {
    // Set top-down defaults
    surveyAltitude.value = 50
    frontOverlap.value = 70 // 70% front overlap default
    sideOverlap.value = 70; // 70% side overlap default
    flightDirection.value = 0;
    missionSpeed.value = 1; // 1 m/s default
    
    // Show instruction for using drawing tools
    if (!drawnArea.value) {
      showNotification({
        message: 'Please use the 2D polygon tool to draw the survey area',
        color: 'info',
        timeout: 5000
      });
      
      // Trigger switch to drawing mode
      window.dispatchEvent(new CustomEvent('activate-drawing-tool', {
        detail: {
          mode: '2d',
          tool: 'polygon'
        }
      }));
    }
  }
}

// Calculate flight time based on waypoints and speed
const flightTimeDisplay = computed(() => {
  if (!simulationWaypoints.value.length) return '0:00'
  
  // Calculate distance between waypoints
  let totalDistance = 0
  for (let i = 1; i < simulationWaypoints.value.length; i++) {
    const prev = simulationWaypoints.value[i-1]
    const curr = simulationWaypoints.value[i]
    const dx = curr.x - prev.x
    const dy = curr.y - prev.y
    const dz = curr.z - prev.z
    totalDistance += Math.sqrt(dx*dx + dy*dy + dz*dz)
  }
  
  // Calculate time based on distance and speed (5ft/s * speed multiplier)
  const baseSpeed = 5 // ft/s
  const timeInSeconds = totalDistance / (baseSpeed * simulationSpeed.value)
  
  // Format as mm:ss
  const minutes = Math.floor(timeInSeconds / 60)
  const seconds = Math.floor(timeInSeconds % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

// Function to calculate flight pattern
const calculatePattern = async () => {
  try {
    console.log('Calculating pattern:', pattern.value);
    
    let apiResponse;
    
    switch (pattern.value) {
      case 'grid':
        // Use backend API for grid pattern
        apiResponse = await api.flightPlan.generateGridPath({
          area: drawnAreaPoints.value,
          altitude: startingAltitude.value,
          overlap: overlap.value,
          spacing: 10, // Default spacing
          direction: flightDirection.value
        });
        break;
        
      case 'orbit':
        // Use backend API for orbit pattern
        apiResponse = await api.flightPlan.generateOrbitPath({
          center: { 
            x: orbitCenterX.value,
            y: 0,
            z: orbitCenterZ.value
          },
          radius: orbitRadius.value,
          altitude: orbitAltitude.value,
          segments: orbitSegments.value,
          cameraTilt: orbitCameraAngle.value,
          cameraMode: orbitCameraMode.value
        });
        break;
        
      case 'facade':
        // Use backend API for facade pattern
        apiResponse = await api.flightPlan.generateFacadePath({
          corners: [
            { x: facadeCenterX.value - facadeWidth.value/2, y: 0, z: facadeCenterZ.value - facadeWidth.value/2 },
            { x: facadeCenterX.value + facadeWidth.value/2, y: 0, z: facadeCenterZ.value - facadeWidth.value/2 },
            { x: facadeCenterX.value + facadeWidth.value/2, y: 0, z: facadeCenterZ.value + facadeWidth.value/2 },
            { x: facadeCenterX.value - facadeWidth.value/2, y: 0, z: facadeCenterZ.value + facadeWidth.value/2 }
          ],
          height: facadeHeight.value,
          distance: facadeScanDistance.value,
          spacing: facadeHeight.value * facadeOverlap.value / 100,
          baseAltitude: 5,
          overlap: facadeOverlap.value
        });
        break;
        
      case 'spiral':
        // Use backend API for spiral pattern
        apiResponse = await api.flightPlan.generateSpiralPath({
          center: {
            x: spiralCenterX.value,
            y: 0,
            z: spiralCenterZ.value
          },
          startRadius: spiralStartRadius.value,
          endRadius: spiralEndRadius.value,
          startAltitude: spiralStartAltitude.value,
          endAltitude: spiralEndAltitude.value,
          revolutions: spiralRevolutions.value,
          segments: spiralSegments.value
        });
        break;
        
      default:
          showNotification({
          message: `Pattern type '${pattern.value}' not implemented yet`,
          color: 'warning',
            timeout: 3000
          });
          return;
        }
        
    // Process API response
    if (apiResponse && apiResponse.waypoints) {
      patternCalculated.value = true;
      
      // Update local waypoints with the ones from the server
      simulationWaypoints.value = apiResponse.waypoints;
      
      // Show success notification
        showNotification({
        message: 'Flight pattern generated successfully!',
          color: 'success',
          timeout: 3000
        });
      
      // Update stats if available
      if (apiResponse.stats) {
        coverageArea.value = apiResponse.stats.coverage || 0;
      }
      
      // Dispatch custom event for visualization
      window.dispatchEvent(new CustomEvent('flight-path-updated', {
        detail: {
          waypoints: simulationWaypoints.value,
          pattern: pattern.value
        }
      }));
    } else {
    showNotification({
        message: 'Error: No waypoints returned from the server',
        color: 'error',
        timeout: 5000
      });
    }
  } catch (error) {
    console.error('Error calculating pattern:', error);
    
    showNotification({
      message: `Error: ${error.message || 'Failed to generate flight pattern'}`,
      color: 'error',
      timeout: 5000
    });
  }
};

// Toggle animation
const toggleAnimation = () => {
  if (isPlaying.value) {
    // Pause animation
    if (animationTimer.value) {
      clearInterval(animationTimer.value)
      animationTimer.value = null
    }
    isPlaying.value = false
    toggleSimulationPlayState(false)
  } else {
    // Start/resume animation
    startAnimation()
  }
}

// Start animation
const startAnimation = () => {
  if (!patternCalculated.value || !simulationWaypoints.value || simulationWaypoints.value.length === 0) {
    showNotification({
      message: 'Please calculate a pattern first',
      color: 'error',
      timeout: 3000
    });
    return;
  }
  
  // Check if takeoff location is set
  if (!missionStore.hasTakeoffLocation) {
    showTakeoffLocationPrompt();
    return;
  }
  
  try {
  isPlaying.value = true;
    toggleSimulationPlayState(true);
    
    // Check for valid waypoints before starting animation
    if (!validateWaypoints(simulationWaypoints.value)) {
      throw new Error('Invalid waypoint data detected');
    }
    
    // If animation was paused, resume from current position
  if (animationTimer.value) {
    clearInterval(animationTimer.value);
  }
  
    const updateInterval = 50; // 50ms per update (20 updates per second)
  animationTimer.value = setInterval(() => {
      // Safe guard against empty or invalid waypoints
      if (!simulationWaypoints.value || simulationWaypoints.value.length < 2) {
        console.error('No valid waypoints to animate');
        clearInterval(animationTimer.value);
        animationTimer.value = null;
        isPlaying.value = false;
        toggleSimulationPlayState(false);
        return;
      }
      
      try {
        // Update animation progress
        animationProgress.value += simulationSpeed.value * updateInterval / 1000;
        
        // Check if we've reached the next waypoint
        if (animationProgress.value >= 1) {
          animationProgress.value = 0;
      currentWaypointIndex.value++;
          
          // If we've reached the end, reset or stop
          if (currentWaypointIndex.value >= simulationWaypoints.value.length - 1) {
            if (loopAnimation.value) {
              currentWaypointIndex.value = 0;
            } else {
              // Stop animation
              clearInterval(animationTimer.value);
              animationTimer.value = null;
              isPlaying.value = false;
              toggleSimulationPlayState(false);
              return;
            }
          }
      
      // Update active waypoint in store
          setActiveWaypoint(currentWaypointIndex.value);
        }
        
        // Calculate interpolated position
        const currentWaypoint = simulationWaypoints.value[currentWaypointIndex.value];
        const nextWaypoint = simulationWaypoints.value[currentWaypointIndex.value + 1];
        
        // Safely access coordinates with fallbacks
        const current = {
          x: getCoordinate(currentWaypoint, 'x', 'lat'),
          y: getCoordinate(currentWaypoint, 'y', 'height'),
          z: getCoordinate(currentWaypoint, 'z', 'lng')
        };
        
        const next = {
          x: getCoordinate(nextWaypoint, 'x', 'lat'),
          y: getCoordinate(nextWaypoint, 'y', 'height'),
          z: getCoordinate(nextWaypoint, 'z', 'lng')
        };
        
        // Linear interpolation between current and next waypoint
        const interpolatedPosition = {
          x: current.x + (next.x - current.x) * animationProgress.value,
          y: current.y + (next.y - current.y) * animationProgress.value,
          z: current.z + (next.z - current.z) * animationProgress.value
        };
        
        // Update drone position in store
        setDronePosition({
          x: interpolatedPosition.x,
          y: interpolatedPosition.y,
          z: interpolatedPosition.z,
          followCamera: followCamera.value
        });
      } catch (err) {
        console.error('Error in animation update:', err);
      clearInterval(animationTimer.value);
        animationTimer.value = null;
        isPlaying.value = false;
        toggleSimulationPlayState(false);
        
        showNotification({
          message: 'Animation error: ' + err.message,
          color: 'error',
          timeout: 5000
        });
      }
    }, updateInterval);
  } catch (error) {
    console.error('Error starting animation:', error);
    isPlaying.value = false;
    toggleSimulationPlayState(false);
    
    showNotification({
      message: 'Error starting animation: ' + error.message,
      color: 'error',
      timeout: 5000
    });
  }
}

// Validates waypoints to ensure they have necessary properties
const validateWaypoints = (waypoints) => {
  if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
    return false;
  }
  
  // Check first few waypoints
  for (let i = 0; i < Math.min(waypoints.length, 3); i++) {
    const wp = waypoints[i];
    if (!wp) return false;
    
    // Check for position data in any of the supported formats
    if ((!wp.x && wp.x !== 0) && (!wp.position?.lat && wp.position?.lat !== 0)) {
      console.error('Invalid waypoint structure:', wp);
      return false;
    }
  }
  
  return true;
};

// Helper function to safely get coordinates from waypoints
const getCoordinate = (waypoint, primary, fallback) => {
  if (!waypoint) return 0;
  
  // First try direct property (x, y, z)
  if (waypoint[primary] !== undefined) return waypoint[primary];
  
  // Then try position property (position.lat, position.height, position.lng)
  if (waypoint.position && waypoint.position[fallback] !== undefined) {
    return waypoint.position[fallback];
  }
  
  // If all else fails, return 0
  return 0;
};

// Initialize with a default pattern on mount
onMounted(async () => {
  try {
    // Add global error handler to help debug issues
    window.addEventListener('error', (event) => {
      console.error('Global error caught:', event.error);
    });
    
    // Set initial panel position
    adjustInitialPosition();
    
    // Load flight parameters from store
    const storeFlightParams = missionStore.flightParameters;
    if (storeFlightParams) {
      climbSpeed.value = storeFlightParams.climbSpeed;
      startingAltitude.value = storeFlightParams.startingAltitude;
      missionSpeed.value = storeFlightParams.missionSpeed || 1; // Default to 1 m/s
      transitSpeed.value = storeFlightParams.transitSpeed;
    }
    
    // Load safety settings
    const storeSafetySettings = missionStore.safetySettings;
    if (storeSafetySettings) {
      returnToHome.value = storeSafetySettings.returnToHome;
      lossOfCommsBehavior.value = storeSafetySettings.lossOfCommsBehavior;
    }
    
    // Initialize camera settings with default drone model
    if (droneModels && droneModels.length > 0) {
      selectedDroneModel.value = droneModels[0].id;
      updateCameraFromDrone();
      
      // Initialize gsd calculation with current altitude
      setTimeout(() => {
        recalculatePhotogrammetryParams();
      }, 300);
    }

    // Check if takeoff location is set using the store getter
    if (!missionStore.hasTakeoffLocation) {
      console.log('No take-off location found, showing prompt');
      // Show prompt to set takeoff location
      showTakeoffLocationPrompt();
    } else {
      console.log('Existing take-off location found:', missionStore.takeoffLocation);
      // Move drone to takeoff location
      setDronePosition({
        x: missionStore.takeoffLocation.lat,
        y: 6, // 6 feet above ground level for hovering
        z: missionStore.takeoffLocation.lng,
        followCamera: false
      });
    }
    
    // Watch for changes to takeoff location
    watch(() => missionStore.takeoffLocation, (newLocation) => {
      if (newLocation) {
        console.log('Takeoff location changed, updating drone position:', newLocation);
        // Move drone to the new takeoff location
        setDronePosition({
          x: newLocation.lat,
          y: 6, // 6 feet above ground level for hovering
          z: newLocation.lng,
          followCamera: false
        });
      }
    }, { immediate: true });
    
    // Use safer event handling with proper cleanup
    const handleTakeoffSet = (event) => {
      // Takeoff location has been set
      console.log('Takeoff location set event received');
      
      // Close the prompt if it's open
      if (takeoffPromptVisible.value) {
        takeoffPromptVisible.value = false;
      }
      
      // Show success message
      showNotification({
        message: 'Takeoff location set successfully',
        color: 'success',
        timeout: 3000
      });
    };
    
    const handleOrbitTargetSelected = (event) => {
      // Update the orbit center coordinates with the selected point
      if (event.detail) {
        orbitCenterX.value = event.detail.x;
        orbitCenterZ.value = event.detail.z;
      }
    };
    
    // Handle survey takeoff location selection
    const handleSurveyTakeoffSelected = (event) => {
      if (event.detail && isSelectingTakeoff.value) {
        customTakeoffLocation.value = {
          x: event.detail.x,
          y: 6, // 6 feet above ground level for hovering
          z: event.detail.z
        };
        
        isSelectingTakeoff.value = false;
        
        showNotification({
          message: 'Survey takeoff location set successfully',
          color: 'success',
          timeout: 3000
        });
        
        // Recalculate flight path if we have a drawn area
        if (drawnAreaPoints.value.length > 0) {
          calculateTopDownSurveyFromDrawnArea();
        }
      }
    };
    
    // Handle survey landing location selection
    const handleSurveyLandingSelected = (event) => {
      if (event.detail && isSelectingLanding.value) {
        customLandingLocation.value = {
          x: event.detail.x,
          y: 6, // 6 feet above ground level for hovering
          z: event.detail.z
        };
        
        isSelectingLanding.value = false;
        
        showNotification({
          message: 'Survey landing location set successfully',
          color: 'success',
          timeout: 3000
        });
        
        // Recalculate flight path if we have a drawn area
        if (drawnAreaPoints.value.length > 0) {
          calculateTopDownSurveyFromDrawnArea();
        }
      }
    };
    
    // Add event listener for 2D drawing finalization
    const handleDrawnAreaCreated = (event) => {
      if (event.detail && event.detail.object && event.detail.points) {
        console.log('Drawn area received', event.detail);
        
        // Only process polygon shapes for the survey area
        if (event.detail.tool === 'polygon' || event.detail.type === '2dShape') {
          drawnArea.value = event.detail.object;
          drawnAreaPoints.value = [...event.detail.points]; // Make sure to create a copy
          
          if (pattern.value === 'top-down') {
            // Auto-compute the flight pattern with the drawn area
            calculateTopDownSurveyFromDrawnArea();
          }
          
          showNotification({
            message: 'Area selected for survey. You can adjust parameters to update the flight path.',
            color: 'success',
            timeout: 3000
          });
          
          // Scroll to survey settings section if needed
          nextTick(() => {
            const settingsSection = document.querySelector('.settings-grid');
            if (settingsSection) {
              settingsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });
        } else {
          console.log('Ignored non-polygon shape for survey area');
        }
      }
    };
    
    // Store the handler functions for later cleanup
    eventHandlers.value.takeoffLocationSet = handleTakeoffSet;
    eventHandlers.value.orbitTargetSelected = handleOrbitTargetSelected;
    eventHandlers.value.drawnAreaCreated = handleDrawnAreaCreated;
    eventHandlers.value.surveyTakeoffSelected = handleSurveyTakeoffSelected;
    eventHandlers.value.surveyLandingSelected = handleSurveyLandingSelected;
    
    // Store the handlers in component state instead of the store
    // This avoids relying on the store methods that might not exist
    window.addEventListener('takeoff-location-set', eventHandlers.value.takeoffLocationSet);
    window.addEventListener('orbit-target-selected', eventHandlers.value.orbitTargetSelected);
    window.addEventListener('asset-created', eventHandlers.value.drawnAreaCreated);
    window.addEventListener('ground-click', eventHandlers.value.surveyTakeoffSelected);
    window.addEventListener('ground-click', eventHandlers.value.surveyLandingSelected);
   
    // Set default values for top-down survey
    frontOverlap.value = 70; // 70% front overlap default
    sideOverlap.value = 70; // 70% side overlap default
    missionSpeed.value = 1; // 1 m/s default
    
    // Set up watchers for auto-computation
    watch([surveyAltitude, frontOverlap, sideOverlap, flightDirection, windDirection, windSpeed], () => {
      if (pattern.value === 'top-down' && drawnAreaPoints.value.length > 0) {
        // Auto-compute when parameters change
        calculateTopDownSurveyFromDrawnArea();
      }
    });
    
    // Check if there are already simulation waypoints in the store
    const storeWaypoints = missionStore.simulation?.waypoints;
  
    if (storeWaypoints && storeWaypoints.length > 0) {
      simulationWaypoints.value = storeWaypoints;
      patternCalculated.value = true;
      currentWaypointIndex.value = missionStore.simulation.activeWaypoint || 0;
      animationProgress.value = (currentWaypointIndex.value / (simulationWaypoints.value.length - 1)) * 100;
    }
  } catch (error) {
    console.error('Error in component initialization:', error);
    showNotification({
      message: 'Error initializing mission simulation panel',
      color: 'error',
      timeout: 3000
    });
  }
});

// Adjust the initial position of the panel
function adjustInitialPosition() {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // Position panel at center-top of viewport
  panelPosition.value = { 
    top: `10vh`, 
    left: `50%`, 
    transform: 'translateX(-50%)'
  };
}

// Handle drag movement
function handleMouseMove(event) {
  if (!isDragging.value) return;
  
  // Get viewport dimensions
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // Get panel element
  const panel = document.querySelector('.mission-simulation-panel');
  if (!panel) return;
  
  // Calculate new position
  let left = event.clientX - dragOffset.value.x;
  let top = event.clientY - dragOffset.value.y;
  
  // Convert to percentages for responsive positioning
  const leftPercent = (left / windowWidth) * 100;
  const topPercent = (top / windowHeight) * 100;
  
  // Update panel position
  panelPosition.value = {
    top: `${topPercent}vh`,
    left: `${leftPercent}vw`,
    transform: 'none' // Remove the translate transform when dragging
  };
}

// Stop dragging
function handleMouseUp() {
  // Remove dragging class from panel and body
  const panel = document.querySelector('.mission-simulation-panel');
  if (panel) {
    panel.classList.remove('dragging');
  }
  
  // Remove class from body
  document.body.classList.remove('panel-dragging');
  
  // Stop dragging
  isDragging.value = false;
}

// Computed style for panel positioning
const panelStyle = computed(() => {
  return {
    position: 'absolute',
    left: `${panelPosition.value.x}px`,
    top: `${panelPosition.value.y}px`,
    zIndex: 1000,
    transition: isDragging.value ? 'none' : 'box-shadow 0.3s ease',
    boxShadow: isDragging.value ? '0 8px 30px rgba(0, 255, 255, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.5)'
  }
})

// Show prompt for takeoff location
const showTakeoffLocationPrompt = () => {
  showNotification({
    message: 'Please set a takeoff location first',
    color: 'warning',
    timeout: 3000
  });
};

// Handle takeoff location selection
const selectTakeoffLocation = () => {
  // Close the takeoff prompt if it's visible
  takeoffPromptVisible.value = false;
  
  // Emit event to parent/app to enter takeoff selection mode
  window.dispatchEvent(new CustomEvent('enter-takeoff-selection-mode'));
  
  console.log('Entered takeoff selection mode');
  
  // Show help message
  showNotification({
    message: 'Click on the map to set takeoff location',
    color: 'info',
    timeout: 5000
  });
};

// Clean up on component unmount
onBeforeUnmount(() => {
  try {
    if (animationTimer.value) {
      clearInterval(animationTimer.value);
      animationTimer.value = null;
    }
    
    // Remove event listeners using the local handlers
    window.removeEventListener('takeoff-location-set', eventHandlers.value.takeoffLocationSet);
    window.removeEventListener('orbit-target-selected', eventHandlers.value.orbitTargetSelected);
    window.removeEventListener('asset-created', eventHandlers.value.drawnAreaCreated);
    window.removeEventListener('ground-click', eventHandlers.value.surveyTakeoffSelected);
    window.removeEventListener('ground-click', eventHandlers.value.surveyLandingSelected);
  } catch (error) {
    console.error('Error cleaning up component:', error);
  }
});

// Save flight parameters to store
const saveFlightParameters = () => {
  // Update flight parameters in store
  missionStore.updateFlightParameters({
    climbSpeed: climbSpeed.value,
    startingAltitude: startingAltitude.value,
    missionSpeed: missionSpeed.value,
    transitSpeed: transitSpeed.value
  });
  
  // Update safety settings in store
  missionStore.updateSafetySettings({
    returnToHome: returnToHome.value,
    lossOfCommsBehavior: lossOfCommsBehavior.value
  });
  
  // Show success notification
  showSuccessNotification('Flight parameters saved successfully');
}

// Add new function to select orbit target
const selectOrbitTarget = () => {
  // First check if takeoff location is set
  if (!missionStore.hasTakeoffLocation) {
    showTakeoffLocationPrompt();
    return;
  }
  
  console.log('Entering orbit target selection mode');
  
  // Dispatch custom event to enter orbit target selection mode
  window.dispatchEvent(new CustomEvent('enter-orbit-target-selection'));
}

// Helper function to safely access mission store methods
const safeStoreCall = (methodName, ...args) => {
  if (typeof missionStore[methodName] === 'function') {
    return missionStore[methodName](...args);
  } else {
    console.warn(`Missing mission store method: ${methodName}`);
    return null;
  }
};

// Use a safe version when clearing waypoints
const clearWaypoints = () => {
  if (typeof missionStore.clearWaypoints === 'function') {
    missionStore.clearWaypoints();
  } else {
    // Fallback: directly set empty waypoints if method doesn't exist
    missionStore.waypoints = [];
    if (missionStore.simulation) {
      missionStore.simulation.waypoints = [];
    }
  }
};

// Safe method to set active waypoint
const setActiveWaypoint = (index) => {
  if (typeof missionStore.setActiveWaypoint === 'function') {
    missionStore.setActiveWaypoint(index);
  } else if (missionStore.simulation) {
    missionStore.simulation.activeWaypoint = index;
  }
};

// Safe method to set drone position
const setDronePosition = (position) => {
  if (typeof missionStore.setDronePosition === 'function') {
    missionStore.setDronePosition(position);
  } else {
    missionStore.dronePosition = {
      ...missionStore.dronePosition,
      ...position
    };
  }
};

// Safe method to toggle simulation play state
const toggleSimulationPlayState = (isPlaying) => {
  if (typeof missionStore.toggleSimulationPlayState === 'function') {
    missionStore.toggleSimulationPlayState(isPlaying);
  } else if (missionStore.simulation) {
    missionStore.simulation.isPlaying = isPlaying;
  }
};

// Computed property to determine if takeoff location is set
const hasTakeoffLocation = computed(() => {
  return missionStore.hasTakeoffLocation;
});

// Format coordinate to display nicely
const formatCoordinate = (value) => {
  if (value === undefined || value === null) return 'N/A';
  return typeof value === 'number' ? value.toFixed(6) : value;
};

// Toggle face selection in the visual selector
const toggleFaceSelection = (face) => {
  const index = selectedFaces.value.indexOf(face);
  if (index >= 0) {
    // Remove face if already selected
    selectedFaces.value.splice(index, 1);
  } else {
    // Add face if not selected
    selectedFaces.value.push(face);
  }
};
const minVisiblePx = 100; // Minimum pixels that must remain visible
const minVisiblePercent = 0.2; // Or minimum percentage of element width
const scanObjectObj = ref(null); // Reference to the scan object

// Listen for scan object creation
window.addEventListener('scan-object-created', (event) => {
  if (event.detail && event.detail.object) {
    scanObjectObj.value = event.detail.object;
    console.log('Stored reference to scan object:', scanObjectObj.value);
  }
});

// Create a new 3D object
const createScanObject = () => {
  // First check if takeoff location is set
  if (!hasTakeoffLocation.value) {
    showNotification({
      message: 'Please set a takeoff location first',
      color: 'error',
      timeout: 3000
    });
    return;
  }
  
  console.log('Creating new 3D object with dimensions:', { 
    width: buildingWidth.value, 
    length: buildingLength.value, 
    height: buildingHeight.value 
  });
  
  // Set skipVisualization flag in the store to prevent automatic creation of objects by BuildingVisualization
  if (missionStore.simulation) {
    missionStore.simulation.skipVisualization = true;
  } else {
    missionStore.simulation = {
      ...missionStore.simulation,
      skipVisualization: true
    };
  }
  
  // Create a visualization of the building
  window.dispatchEvent(new CustomEvent('create-scan-object', {
    detail: {
      width: buildingWidth.value,
      length: buildingLength.value,
      height: buildingHeight.value,
      color: objectColor.value,
      position: {
        x: missionStore.takeoffLocation.lat,
        y: 0, // Ground level
        z: missionStore.takeoffLocation.lng
      },
      createGroundPlane: false, // Prevent ground plane creation
      createSecondaryObject: false, // Prevent secondary object creation
      opacity: 1.0, // Make it solid with no transparency
      showWireframe: false, // No wireframe
      centerInScene: false, // Don't recenter scene
      isDraggable: true // Enable drag and drop
    }
  }));
  
  showNotification({
    message: 'Building object created',
    color: 'success',
    timeout: 3000
  });
};

// Load hardware details from store
function loadHardwareFromStore() {
  console.log('Loading hardware from store:', missionStore.hardware);
  
  if (missionStore.hardware) {
    // Set drone model
    if (missionStore.hardware.drone) {
      selectedDroneModel.value = missionStore.hardware.drone;
    }
    
    // Set camera details if available
    if (missionStore.hardware.cameraDetails) {
      currentCamera.value = {
        name: `${missionStore.hardware.cameraDetails.brand} ${missionStore.hardware.cameraDetails.model}`,
        imageWidth: missionStore.hardware.cameraDetails.imageWidth || 0,
        imageHeight: missionStore.hardware.cameraDetails.imageHeight || 0,
        sensorWidth: missionStore.hardware.cameraDetails.sensorWidth || 0,
        sensorHeight: missionStore.hardware.cameraDetails.sensorHeight || 0,
        focalLength: Array.isArray(missionStore.hardware.lensDetails?.focalLength) 
          ? (missionStore.hardware.lensDetails.focalLength[0] + missionStore.hardware.lensDetails.focalLength[1]) / 2
          : (missionStore.hardware.lensDetails?.focalLength || 0)
      };
      
      // Log loaded camera details for debugging
      console.log('Loaded camera:', currentCamera.value);
      
      // Calculate initial GSD based on camera parameters and altitude
      calculateInitialGSDFromCamera();
    } else {
      console.log('No camera details found in store, using drone default');
      updateCameraFromDrone();
    }
    
    // Set mission parameters from flight parameters if available
    if (missionStore.flightParameters) {
      missionSpeed.value = missionStore.flightParameters.missionSpeed || 5;
    }
    
    // Set overlap parameters if stored
    if (missionStore.hardware.overlaps) {
      frontOverlap.value = missionStore.hardware.overlaps.front || 75;
      sideOverlap.value = missionStore.hardware.overlaps.side || 65;
    }
    
    // Load target GSD if available
    if (missionStore.hardware.targetGSD) {
      targetGSD.value = missionStore.hardware.targetGSD;
    }

    // Calculate photogrammetry parameters immediately
    calculatePhotogrammetryParameters();
  }
}

// Watch for changes in isVisible prop
watch(() => isVisible.value, (visible) => {
  if (visible) {
    console.log('Mission Simulation panel became visible');
    
    // Load hardware configuration when panel becomes visible
    nextTick(() => {
      loadHardwareFromStore();
      
      // Apply camera settings to visualization after a short delay to ensure DOM is updated
      setTimeout(() => {
        applyCameraToSimulation();
      }, 100);
    });
  }
}, { immediate: true });

// Calculate initial GSD based on loaded camera parameters
function calculateInitialGSDFromCamera() {
  if (!currentCamera.value) return;
  
  // Get default flight altitude from store or use reasonable default
  const altitude = missionStore.flightParameters?.altitude || 50;
  
  // Make sure we have all required parameters
  if (currentCamera.value.sensorWidth && 
      currentCamera.value.imageWidth && 
      currentCamera.value.focalLength) {
    
    // GSD (cm/pixel) = (sensor width * altitude * 100) / (focal length * image width)
    const gsd = (currentCamera.value.sensorWidth * altitude * 100) / 
                (currentCamera.value.focalLength * currentCamera.value.imageWidth);
    
    targetGSD.value = parseFloat(gsd.toFixed(2));
    console.log(`Initial GSD calculated: ${targetGSD.value} cm/pixel at altitude ${altitude}m`);
  }
}

// Watch for direct changes to mission store hardware
watch(() => missionStore.hardware, (newHardware) => {
  if (newHardware) {
    console.log('Hardware in store changed, reloading');
    loadHardwareFromStore();
  }
}, { deep: true });

// Watch for camera changes to update visualization
watch([() => currentCamera.value, () => photogrammetryParameters.value], () => {
  if (currentCamera.value?.focalLength && photogrammetryParameters.value) {
    console.log('Camera or photogrammetry parameters changed, updating visualization');
    applyCameraToSimulation();
  }
}, { deep: true });

// Component lifecycle hooks
onMounted(() => {
  console.log('Mission Simulation component mounted');
  
  // Load hardware configuration on component mount
  loadHardwareFromStore();
  
  // Adjust initial position
  adjustInitialPosition();
  
  // Add document-level event listeners
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  
  // Add window resize listener
  window.addEventListener('resize', adjustInitialPosition);
  
  // Apply camera to simulation
  nextTick(() => {
    applyCameraToSimulation();
  });
  
  console.log('Mission Simulation panel mounted, hardware loaded:', missionStore.hardware);
});

onBeforeUnmount(() => {
  // Clean up animation timer
  if (animationTimer.value) {
    clearInterval(animationTimer.value);
  }
  
  // Remove event listeners
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('resize', adjustInitialPosition);
});

// Apply camera changes to 3D visualization
function applyCameraToSimulation() {
  if (!currentCamera.value) {
    console.log('No camera to apply to simulation');
    return;
  }
  
  const cameraInfo = {
    name: currentCamera.value.name,
    imageWidth: currentCamera.value.imageWidth,
    imageHeight: currentCamera.value.imageHeight,
    sensorWidth: currentCamera.value.sensorWidth,
    sensorHeight: currentCamera.value.sensorHeight,
    focalLength: currentCamera.value.focalLength,
    gsd: photogrammetryParameters.value?.gsd || targetGSD.value || 2.5,
    footprint: photogrammetryParameters.value?.footprint || { width: 50, height: 40 }
  };
  
  console.log('Applying camera to simulation:', cameraInfo);
  
  // Dispatch event to update camera in 3D scene
  window.dispatchEvent(new CustomEvent('update-camera-visualization', {
    detail: cameraInfo
  }));
}


// Sample drone models for the dropdown
const droneModels = [
  {
    id: 'freefly-astro',
    name: 'Freefly Astro',
    categories: ['professional', 'inspection'],
    camera: {
      name: 'Phase One iXM-100',
      imageWidth: 11608,
      imageHeight: 8708,
      sensorWidth: 53.4,
      sensorHeight: 40.0,
      focalLength: 80,
      opticalZoom: 1
    }
  },
  {
    id: 'dji-mavic-2-pro',
    name: 'DJI Mavic 2 Pro',
    categories: ['consumer', 'mapping'],
    camera: {
      name: 'Hasselblad L1D-20c',
      imageWidth: 5472,
      imageHeight: 3648,
      sensorWidth: 13.2,
      sensorHeight: 8.8,
      focalLength: 28,
      opticalZoom: 1
    }
  },
  {
    id: 'dji-phantom-4-pro',
    name: 'DJI Phantom 4 Pro',
    categories: ['prosumer', 'mapping'],
    camera: {
      name: 'DJI 1" CMOS',
      imageWidth: 5472,
      imageHeight: 3648,
      sensorWidth: 13.2,
      sensorHeight: 8.8,
      focalLength: 24,
      opticalZoom: 1
    }
  },
  {
    id: 'dji-matrice-300',
    name: 'DJI Matrice 300 RTK',
    categories: ['professional', 'inspection'],
    camera: {
      name: 'Zenmuse H20T',
      imageWidth: 5184,
      imageHeight: 3888,
      sensorWidth: 17.3,
      sensorHeight: 13.0,
      focalLength: 50,
      opticalZoom: 30
    }
  }
];

// Function to get drone model by ID
function getDroneModel(id) {
  return droneModels.find(model => model.id === id) || null;
}

// Calculate photogrammetry parameters
function calculatePhotogrammetryParameters() {
  if (!currentCamera.value) return;
  
  // Get flight altitude
  const altitude = missionStore.flightParameters?.altitude || startingAltitude.value || 50;
  
  // Calculate GSD in cm/pixel
  const gsd = (currentCamera.value.sensorWidth * altitude * 100) / 
              (currentCamera.value.focalLength * currentCamera.value.imageWidth);
  
  // Calculate footprint dimensions (m)
  const footprintWidth = (currentCamera.value.sensorWidth * altitude) / currentCamera.value.focalLength;
  const footprintHeight = (currentCamera.value.sensorHeight * altitude) / currentCamera.value.focalLength;
  
  // Calculate image spacing based on forward overlap (m)
  const imageSpacing = footprintWidth * (1 - frontOverlap.value / 100);
  
  // Calculate track spacing based on side overlap (m)
  const trackSpacing = footprintHeight * (1 - sideOverlap.value / 100);
  
  // Calculate area coverage per image (m²)
  const areaCoverage = footprintWidth * footprintHeight;
  
  // Calculate effective area coverage considering overlap (m²)
  const effectiveAreaCoverage = imageSpacing * trackSpacing;
  
  // Calculate images per hectare (10,000 m²)
  const imagesPerHectare = 10000 / effectiveAreaCoverage;
  
  // Set the photogrammetry parameters
  photogrammetryParameters.value = {
    gsd,
    footprint: {
      width: footprintWidth,
      height: footprintHeight
    },
    imageSpacing,
    trackSpacing,
    areaCoverage,
    effectiveAreaCoverage,
    imagesPerHectare
  };
  
  console.log('Calculated photogrammetry parameters:', photogrammetryParameters.value);
  
  return photogrammetryParameters.value;
}

// Add function to center the panel
const centerPanel = () => {
  // Calculate center position based on window width and panel width
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const panelWidth = 700; // Match the CSS width
  
  // Center horizontally, position vertically at 10% from top
  panelPosition.value = {
    x: (windowWidth / 2) - (panelWidth / 2),
    y: windowHeight * 0.1
  };
};

// Center the panel on component mount
onMounted(() => {
  centerPanel();
  
  // Check if takeoff location exists
  if (!missionStore.hasTakeoffLocation) {
    takeoffPromptVisible.value = true;
  }
  
  // Other onMounted code...
});

// Add these placeholder functions before the applyCameraToSimulation function

// Function to generate orbit path
const generateOrbitPath = (center, radius, altitude, segments) => {
  console.log('Generating orbit path with parameters:', { center, radius, altitude, segments });
  
  // Create placeholder waypoints in a circle around the center
  const waypoints = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    waypoints.push({
      x: center.x + radius * Math.cos(angle),
      y: altitude,
      z: center.z + radius * Math.sin(angle),
      type: 'waypoint',
      label: `Orbit Point ${i + 1}`
    });
  }
  
  // Add closing point to complete the circle
  waypoints.push({ ...waypoints[0], label: 'Orbit Complete' });
  
  return waypoints;
};

// Function to generate spiral path
const generateSpiralPath = (center, startRadius, endRadius, altitude, revolutions) => {
  console.log('Generating spiral path with parameters:', { center, startRadius, endRadius, altitude, revolutions });
  
  // Create placeholder waypoints in a spiral pattern
  const segments = 60; // Number of points in the spiral
  const waypoints = [];
  
  for (let i = 0; i <= segments; i++) {
    const progress = i / segments;
    const angle = progress * revolutions * Math.PI * 2;
    const radius = startRadius + (endRadius - startRadius) * progress;
    
    waypoints.push({
      x: center.x + radius * Math.cos(angle),
      y: altitude,
      z: center.z + radius * Math.sin(angle),
      type: 'waypoint',
      label: `Spiral Point ${i + 1}`
    });
  }
  
  return waypoints;
};

// Function to generate facade scan path
const generateFacadeScanPath = (corners, height, distance, spacing, baseAltitude, useAbsoluteSpacing) => {
  console.log('Generating facade scan path with parameters:', { corners, height, distance, spacing, baseAltitude, useAbsoluteSpacing });
  
  // Create placeholder waypoints
  const waypoints = [];
  
  // Process each face (pair of corners)
  for (let i = 0; i < corners.length; i += 2) {
    const start = corners[i];
    const end = corners[i + 1] || corners[0]; // Connect to first corner if at the end
    
    // Calculate face vector and perpendicular direction for offset
    const faceVector = {
      x: end.x - start.x,
      z: end.z - start.z
    };
    
    const length = Math.sqrt(faceVector.x * faceVector.x + faceVector.z * faceVector.z);
    
    // Normalize and create perpendicular vector (90° counterclockwise)
    const normalizedFace = {
      x: faceVector.x / length,
      z: faceVector.z / length
    };
    
    const perpendicular = {
      x: -normalizedFace.z,
      z: normalizedFace.x
    };
    
    // Calculate number of vertical passes
    const passes = Math.ceil(height / spacing);
    
    // Generate waypoints for this face
    for (let j = 0; j < passes; j++) {
      const altitude = baseAltitude + j * spacing;
      
      // Alternate direction for each pass (zigzag pattern)
      const isReverse = j % 2 === 1;
      
      // Start and end points for this pass
      const passStart = isReverse ? end : start;
      const passEnd = isReverse ? start : end;
      
      // Add offset from the wall
      const offsetX = perpendicular.x * distance;
      const offsetZ = perpendicular.z * distance;
      
      // Add waypoints for this pass
      waypoints.push({
        x: passStart.x + offsetX,
        y: altitude,
        z: passStart.z + offsetZ,
        type: 'waypoint',
        label: `Face ${Math.floor(i/2) + 1}, Pass ${j + 1} Start`
      });
      
      waypoints.push({
        x: passEnd.x + offsetX,
        y: altitude,
        z: passEnd.z + offsetZ,
        type: 'waypoint',
        label: `Face ${Math.floor(i/2) + 1}, Pass ${j + 1} End`
      });
    }
  }
  
  return waypoints;
};

// Function to calculate area size for survey
const calculateAreaSize = () => {
  if (!drawnArea.value) return "0";
  return "1000"; // Placeholder value
};

// Function to calculate area dimensions
const calculateAreaDimensions = () => {
  if (!drawnArea.value) return "0m × 0m";
  return "100m × 100m"; // Placeholder value
};

// Function to calculate number of images required
const calculateImagesRequired = () => {
  if (!photogrammetryParameters.value || !drawnArea.value) return "0";
  return "100"; // Placeholder value
};

// Function to calculate flight time
const calculateFlightTime = () => {
  if (!drawnArea.value) return "0:00";
  return "10:00"; // Placeholder value
};

// Function to calculate a top-down survey from a drawn area
const calculateTopDownSurveyFromDrawnArea = () => {
  console.log('Calculating top-down survey from drawn area');
  if (!drawnAreaPoints.value || drawnAreaPoints.value.length === 0) {
    showNotification({
      message: 'Please draw a survey area first',
      color: 'warning',
      timeout: 3000
    });
    return;
  }
  
  // Calculate survey pattern (placeholder implementation)
  console.log('Generating survey pattern with points:', drawnAreaPoints.value);
  
  // Show success notification
  showNotification({
    message: 'Survey flight path updated',
    color: 'success',
    timeout: 3000
  });
};

</script>

<style scoped>
.mission-simulation-panel {
  position: absolute;
  width: 700px; /* Increased from 480px for better UI balance */
  color: white;
  background-color: rgba(0, 0, 0, 0.85);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  padding: 15px;
  z-index: 1000;
  pointer-events: auto;
  overflow-y: auto;
  max-height: 90vh; /* Increased to 90vh to match panel-wrapper height */
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  cursor: move;
}

.panel-title {
  margin: 0;
  font-size: 1.5em;
  color: #00ffff;
}

.mission-settings {
  margin-top: 10px;
}

.section {
  margin-bottom: 15px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
  overflow: hidden;
  background-color: rgba(0, 0, 0, 0.7);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background-color: rgba(0, 0, 0, 0.6);
  cursor: pointer;
  border-bottom: 1px solid rgba(0, 255, 255, 0.1);
}

.section-title {
  margin: 0;
  font-size: 1.1em;
  color: #00ffff;
}

.toggle-icon {
  color: #00ffff;
  font-size: 18px;
}

.section-content {
  padding: 15px;
  background-color: rgba(0, 0, 0, 0.4);
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); /* Increased from 220px to better use the width */
  gap: 15px;
}

.settings-column {
  margin-bottom: 15px;
}

.settings-subtitle {
  margin: 0 0 10px 0;
  font-size: 1em;
  color: #00ffff;
}

.input-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Specific styles for Object Info Settings section */
.section:nth-child(3) {
  background-color: rgba(0, 0, 0, 0.7);
  border-color: rgba(0, 255, 255, 0.2);
}

.section:nth-child(3) .section-header {
  background-color: rgba(0, 0, 0, 0.6);
}

.section:nth-child(3) .section-content {
  background-color: rgba(0, 0, 0, 0.4);
  padding: 15px;
}

/* Draggable panel styles */
.mission-simulation-panel.dragging {
  opacity: 0.95;
  cursor: grabbing;
  user-select: none;
  box-shadow: 0 8px 30px rgba(0, 255, 255, 0.4);
}

.mission-simulation-panel .header {
  cursor: grab;
  user-select: none;
  background-color: rgba(0, 0, 0, 0.7);
  border-bottom: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 8px 8px 0 0;
  padding: 10px 15px;
}

.mission-simulation-panel.dragging .header {
  cursor: grabbing;
  background-color: rgba(0, 10, 20, 0.8);
}

/* Style for body class when panel is being dragged */
body.panel-dragging {
  cursor: grabbing;
}

/* Prevent text selection during dragging */
.mission-simulation-panel.dragging * {
  user-select: none;
}

/* Improved layout for hardware info grid */
.hardware-info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 15px;
}

/* Enhanced result grid layout */
.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); /* Ensure results use the full width */
  gap: 15px;
  margin-top: 10px;
}
</style>
