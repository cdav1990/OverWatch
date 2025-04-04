const isSimulationRunning = ref(false);
const isSimulationPaused = ref(false);
const simulationSpeed = ref(1);
const simulationProgress = ref(0);
const simulationTime = ref(0);
const simulationStatus = ref('ready');
const simulationError = ref(null);
const simulationStats = ref({
  distance: 0,
  altitude: 0,
  speed: 0,
  battery: 100
});

// Add new refs for collapsible sections
const isDroneControlExpanded = ref(true);
const isCameraControlExpanded = ref(true);
const isSimulationSettingsExpanded = ref(true);
const isSimulationStatsExpanded = ref(true);
const isSimulationLogsExpanded = ref(true);

const missionType = ref('building-inspection');
const flightParamsExpanded = ref(true);
const objectInfoExpanded = ref(true);
const scanSettingsExpanded = ref(true);
const vehicleSettingsExpanded = ref(true);

<!-- Mission Simulation Panel -->
<div class="panel mission-simulation-panel">
  <div class="panel-header">
    <h3>Mission Simulation</h3>
    <div class="mission-type">
      <select v-model="missionType" class="mission-select">
        <option value="building-inspection">building-inspection</option>
      </select>
    </div>
    <div class="navigation-controls">
      <button class="nav-btn home"><i class="fas fa-home"></i></button>
      <button class="nav-btn prev"><i class="fas fa-step-backward"></i></button>
      <button class="nav-btn next"><i class="fas fa-step-forward"></i></button>
    </div>
  </div>

  <div class="panel-content">
    <!-- Pattern Options -->
    <div class="section pattern-options">
      <h4 class="section-title">Pattern Options</h4>
      <div class="pattern-tabs">
        <button class="tab-btn active">2D Patterns</button>
        <button class="tab-btn">3D Patterns</button>
      </div>
      <div class="pattern-buttons">
        <button class="pattern-btn active">
          <i class="fas fa-info-circle"></i>
          Object Info
        </button>
        <button class="pattern-btn">
          <i class="fas fa-circle"></i>
          Orbit
        </button>
        <button class="pattern-btn">
          <i class="fas fa-spiral"></i>
          Spiral
        </button>
        <button class="pattern-btn">
          <i class="fas fa-building"></i>
          Facade
        </button>
      </div>
    </div>

    <!-- Flight Parameters Section -->
    <div class="section">
      <div class="section-header" @click="flightParamsExpanded = !flightParamsExpanded">
        <h4>Flight Parameters</h4>
        <span class="toggle-icon">{{ flightParamsExpanded ? '▼' : '▶' }}</span>
      </div>
      <div v-show="flightParamsExpanded" class="section-content">
        <div class="subsection">
          <h5>Takeoff</h5>
          <div class="control-group">
            <label>Height (m)</label>
            <input type="number" v-model="takeoffHeight" min="0" max="100">
          </div>
        </div>
        <div class="subsection">
          <h5>Mission Speed</h5>
          <div class="control-group">
            <label>Climb & Descent</label>
            <input type="number" v-model="climbSpeed" min="0" max="10">
          </div>
          <div class="control-group">
            <label>Speed during data capture</label>
            <input type="number" v-model="captureSpeed" min="0" max="10">
          </div>
          <div class="control-group">
            <label>Speed between waypoints</label>
            <input type="number" v-model="waypointSpeed" min="0" max="10">
          </div>
        </div>
        <div class="subsection">
          <h5>Return to Home</h5>
          <div class="control-group">
            <select v-model="returnBehavior" class="select-full">
              <option value="takeoff">Return to Takeoff</option>
              <option value="home">Return to Home</option>
            </select>
          </div>
        </div>
        <button class="btn btn-primary btn-full">Save Flight Parameters</button>
      </div>
    </div>

    <!-- Object Info Settings Section -->
    <div class="section">
      <div class="section-header" @click="objectInfoExpanded = !objectInfoExpanded">
        <h4>Object Info Settings</h4>
        <span class="toggle-icon">{{ objectInfoExpanded ? '▼' : '▶' }}</span>
      </div>
      <div v-show="objectInfoExpanded" class="section-content">
        <div class="subsection">
          <h5>Object Dimensions</h5>
          <div class="control-group">
            <label>Width (m)</label>
            <input type="number" v-model="objectWidth" min="0">
          </div>
          <div class="control-group">
            <label>Length (m)</label>
            <input type="number" v-model="objectLength" min="0">
          </div>
          <div class="control-group">
            <label>Height (m)</label>
            <input type="number" v-model="objectHeight" min="0">
          </div>
        </div>
      </div>
    </div>

    <!-- Scan Settings Section -->
    <div class="section">
      <div class="section-header" @click="scanSettingsExpanded = !scanSettingsExpanded">
        <h4>Scan Settings</h4>
        <span class="toggle-icon">{{ scanSettingsExpanded ? '▼' : '▶' }}</span>
      </div>
      <div v-show="scanSettingsExpanded" class="section-content">
        <div class="control-group">
          <label>Scan Angle (°)</label>
          <input type="number" v-model="scanAngle" min="0" max="90">
        </div>
        <div class="control-group">
          <label>Overlap (%)</label>
          <input type="number" v-model="overlap" min="0" max="100">
        </div>
        <div class="control-group">
          <label>Object Color</label>
          <select v-model="objectColor" class="select-full">
            <option value="blue">Blue</option>
            <option value="red">Red</option>
            <option value="green">Green</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Vehicle Settings Section -->
    <div class="section">
      <div class="section-header" @click="vehicleSettingsExpanded = !vehicleSettingsExpanded">
        <h4>Vehicle Settings</h4>
        <span class="toggle-icon">{{ vehicleSettingsExpanded ? '▼' : '▶' }}</span>
      </div>
      <div v-show="vehicleSettingsExpanded" class="section-content">
        <div class="subsection">
          <h5>Speed Settings</h5>
          <div class="control-group">
            <label>Speed</label>
            <input type="range" v-model="vehicleSpeed" min="0" max="100" class="slider">
          </div>
        </div>
      </div>
    </div>

    <button class="btn btn-success btn-full">Create Object & Calculate Scan Pattern</button>
  </div>
</div>

<style scoped>
.panel {
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  background: #2a2a2a;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section {
  border: 1px solid #444;
  border-radius: 4px;
  margin-bottom: 1rem;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #2a2a2a;
  cursor: pointer;
  user-select: none;
}

.section-header:hover {
  background: #333;
}

.section-title {
  color: #00ff9d;
  margin: 0;
  padding: 0.5rem 1rem;
  font-size: 1rem;
}

.section-content {
  padding: 1rem;
  background: #1a1a1a;
}

.subsection {
  margin-bottom: 1.5rem;
}

.subsection h5 {
  color: #888;
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
}

.control-group {
  margin-bottom: 1rem;
}

.control-group label {
  display: block;
  color: #888;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
}

.control-group input[type="number"],
.control-group input[type="text"],
.select-full {
  width: 100%;
  padding: 0.5rem;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #fff;
}

.slider {
  width: 100%;
  height: 4px;
  background: #2a2a2a;
  border-radius: 2px;
  outline: none;
}

.pattern-tabs {
  display: flex;
  margin-bottom: 1rem;
}

.tab-btn {
  flex: 1;
  padding: 0.5rem;
  background: #2a2a2a;
  border: 1px solid #444;
  color: #888;
  cursor: pointer;
}

.tab-btn.active {
  background: #00ff9d;
  color: #1a1a1a;
}

.pattern-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.pattern-btn {
  padding: 0.75rem;
  background: #2a2a2a;
  border: 1px solid #444;
  color: #888;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pattern-btn.active {
  border-color: #00ff9d;
  color: #00ff9d;
}

.btn {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary {
  background: #00ff9d;
  color: #1a1a1a;
}

.btn-success {
  background: #00ff9d;
  color: #1a1a1a;
}

.btn-full {
  width: 100%;
  margin-top: 1rem;
}

.navigation-controls {
  display: flex;
  gap: 0.5rem;
}

.nav-btn {
  padding: 0.5rem;
  background: #2a2a2a;
  border: 1px solid #444;
  color: #00ff9d;
  cursor: pointer;
}

.mission-select {
  padding: 0.5rem;
  background: #2a2a2a;
  border: 1px solid #444;
  color: #fff;
  border-radius: 4px;
}

.toggle-icon {
  color: #00ff9d;
  font-size: 0.8rem;
}
</style> 