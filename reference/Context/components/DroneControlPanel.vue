<template>
  <div class="drone-control-panel">
    <div class="panel-header">
      <h2>Drone Control Panel</h2>
      <div class="connection-status" :class="{ connected: connected }">
        {{ connected ? 'Connected' : 'Disconnected' }}
      </div>
    </div>
    
    <div class="panel-content">
      <!-- Drone Selection -->
      <div class="control-section">
        <h3>Select Drone</h3>
        <select v-model="selectedDroneId" @change="selectDrone">
          <option v-for="drone in drones" :key="drone.id" :value="drone.id">
            {{ drone.name }} ({{ drone.status }})
          </option>
        </select>
      </div>
      
      <!-- Telemetry Display -->
      <div class="telemetry-section">
        <h3>Telemetry</h3>
        <div v-if="selectedDrone" class="telemetry-grid">
          <div class="telemetry-item">
            <div class="label">Position</div>
            <div class="value">
              {{ formatCoordinate(selectedDrone.position?.lat) }}, 
              {{ formatCoordinate(selectedDrone.position?.lng) }}
            </div>
          </div>
          <div class="telemetry-item">
            <div class="label">Altitude</div>
            <div class="value">{{ selectedDrone.position?.alt || 0 }} m</div>
          </div>
          <div class="telemetry-item">
            <div class="label">Battery</div>
            <div class="value">{{ selectedDrone.batteryLevel || 0 }}%</div>
          </div>
          <div class="telemetry-item">
            <div class="label">Status</div>
            <div class="value">{{ selectedDrone.status || 'Unknown' }}</div>
          </div>
          
          <!-- Advanced Telemetry (if available) -->
          <template v-if="selectedDrone.telemetry">
            <div class="telemetry-item" v-if="selectedDrone.telemetry.attitude">
              <div class="label">Attitude</div>
              <div class="value">
                Roll: {{ formatAngle(selectedDrone.telemetry.attitude.roll) }}°, 
                Pitch: {{ formatAngle(selectedDrone.telemetry.attitude.pitch) }}°, 
                Yaw: {{ formatAngle(selectedDrone.telemetry.attitude.yaw) }}°
              </div>
            </div>
            <div class="telemetry-item" v-if="selectedDrone.telemetry.velocity">
              <div class="label">Velocity</div>
              <div class="value">{{ formatVelocity(selectedDrone.telemetry.velocity) }} m/s</div>
            </div>
            <div class="telemetry-item" v-if="selectedDrone.telemetry.gps">
              <div class="label">GPS</div>
              <div class="value">
                Fix: {{ selectedDrone.telemetry.gps.fixType || 'Unknown' }}, 
                HDOP: {{ selectedDrone.telemetry.gps.hdop || 'Unknown' }}
              </div>
            </div>
          </template>
        </div>
        <div v-else class="no-drone-selected">
          Please select a drone to view telemetry.
        </div>
      </div>
      
      <!-- Control Buttons -->
      <div class="control-section">
        <h3>Controls</h3>
        <div class="command-buttons">
          <button 
            @click="sendCommand('arm')" 
            :disabled="!selectedDrone || !canControl || selectedDrone.status === 'in-mission'"
            class="btn btn-primary"
          >
            Arm
          </button>
          <button 
            @click="sendCommand('disarm')" 
            :disabled="!selectedDrone || !canControl"
            class="btn btn-danger"
          >
            Disarm
          </button>
          <button 
            @click="takeoff" 
            :disabled="!selectedDrone || !canControl || selectedDrone.status !== 'available'"
            class="btn btn-success"
          >
            Takeoff
          </button>
          <button 
            @click="sendCommand('land')" 
            :disabled="!selectedDrone || !canControl || selectedDrone.status !== 'in-mission'"
            class="btn btn-warning"
          >
            Land
          </button>
          <button 
            @click="sendCommand('rtl')" 
            :disabled="!selectedDrone || !canControl || selectedDrone.status !== 'in-mission'"
            class="btn btn-info"
          >
            Return Home
          </button>
        </div>
      </div>
      
      <!-- Mission Control -->
      <div class="mission-section">
        <h3>Mission Control</h3>
        <div class="flight-plan-controls">
          <select v-model="selectedFlightPlanId">
            <option value="">-- Select Flight Plan --</option>
            <option v-for="plan in flightPlans" :key="plan.id" :value="plan.id">
              {{ plan.name }}
            </option>
          </select>
          <button 
            @click="startMission" 
            :disabled="!selectedFlightPlanId || !selectedDrone || !canControl || selectedDrone.status !== 'available'"
            class="btn btn-primary"
          >
            Start Mission
          </button>
          <button 
            @click="pauseMission" 
            :disabled="!selectedDrone || !canControl || selectedDrone.status !== 'in-mission'"
            class="btn btn-warning"
          >
            Pause Mission
          </button>
          <button 
            @click="abortMission" 
            :disabled="!selectedDrone || !canControl || selectedDrone.status !== 'in-mission'"
            class="btn btn-danger"
          >
            Abort Mission
          </button>
        </div>
      </div>
      
      <!-- Command Log -->
      <div class="log-section">
        <h3>Command Log</h3>
        <div class="command-log">
          <div v-for="(log, index) in commandLogs" :key="index" class="log-entry" :class="{ error: !log.success }">
            <span class="timestamp">{{ formatTime(log.timestamp) }}</span>
            <span class="command">{{ log.command }}</span>
            <span class="status">{{ log.success ? 'Success' : 'Failed' }}</span>
            <span class="message">{{ log.message }}</span>
          </div>
          <div v-if="commandLogs.length === 0" class="no-logs">
            No commands sent yet.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import api from '../services/api';

export default {
  name: 'DroneControlPanel',
  props: {
    initialDroneId: {
      type: [Number, String],
      default: null
    }
  },
  
  setup(props) {
    // State variables
    const drones = ref([]);
    const selectedDroneId = ref(props.initialDroneId);
    const connected = ref(false);
    const flightPlans = ref([]);
    const selectedFlightPlanId = ref('');
    const commandLogs = ref([]);
    const canControl = ref(true); // For future authentication/authorization
    
    // Unsubscribe functions for cleaning up event listeners
    let unsubscribeTelemetry = null;
    let unsubscribePosition = null;
    let unsubscribeStatus = null;
    let unsubscribeCommandAck = null;
    
    // Computed properties
    const selectedDrone = computed(() => {
      if (!selectedDroneId.value) return null;
      return drones.value.find(drone => drone.id === parseInt(selectedDroneId.value));
    });
    
    // Load drones on component mount
    onMounted(async () => {
      await loadDrones();
      await loadFlightPlans();
      
      // Setup real-time updates via Socket.io
      setupSocketListeners();
      
      // If initialDroneId is provided, select that drone
      if (props.initialDroneId) {
        selectDrone();
      }
    });
    
    // Clean up socket listeners on component unmount
    onUnmounted(() => {
      if (unsubscribeTelemetry) unsubscribeTelemetry();
      if (unsubscribePosition) unsubscribePosition();
      if (unsubscribeStatus) unsubscribeStatus();
      if (unsubscribeCommandAck) unsubscribeCommandAck();
    });
    
    // Load all drones from API
    const loadDrones = async () => {
      try {
        const response = await api.drone.getAll();
        drones.value = response;
        connected.value = true;
      } catch (error) {
        console.error('Failed to load drones:', error);
        connected.value = false;
        // Add to command log
        commandLogs.value.unshift({
          command: 'Load Drones',
          success: false,
          message: error.message || 'Failed to load drones',
          timestamp: Date.now()
        });
      }
    };
    
    // Load flight plans
    const loadFlightPlans = async () => {
      try {
        const response = await api.flightPlan.getAll();
        flightPlans.value = response;
      } catch (error) {
        console.error('Failed to load flight plans:', error);
        // Add to command log
        commandLogs.value.unshift({
          command: 'Load Flight Plans',
          success: false,
          message: error.message || 'Failed to load flight plans',
          timestamp: Date.now()
        });
      }
    };
    
    // Select a drone
    const selectDrone = async () => {
      if (!selectedDroneId.value) return;
      
      try {
        // Get detailed drone info
        const response = await api.drone.getById(selectedDroneId.value);
        // Find drone in list and update it
        const index = drones.value.findIndex(d => d.id === parseInt(selectedDroneId.value));
        if (index !== -1) {
          drones.value[index] = response;
        }
      } catch (error) {
        console.error('Failed to get drone details:', error);
      }
    };
    
    // Setup Socket.io listeners for real-time updates
    const setupSocketListeners = () => {
      // Subscribe to telemetry updates
      unsubscribeTelemetry = api.drone.subscribeTelemetry(data => {
        const index = drones.value.findIndex(d => d.id === data.droneId);
        if (index !== -1) {
          // Update drone telemetry data
          drones.value[index].telemetry = { ...data };
        }
      });
      
      // Subscribe to position updates
      unsubscribePosition = api.drone.subscribePosition(data => {
        const index = drones.value.findIndex(d => d.id === data.droneId);
        if (index !== -1) {
          // Update drone position
          drones.value[index].position = data.position;
        }
      });
      
      // Subscribe to status updates
      unsubscribeStatus = api.drone.subscribeStatus(data => {
        const index = drones.value.findIndex(d => d.id === data.droneId);
        if (index !== -1) {
          // Update drone status
          drones.value[index].status = data.status;
          drones.value[index].batteryLevel = data.batteryLevel;
        }
      });
      
      // Subscribe to command acknowledgements
      unsubscribeCommandAck = api.drone.subscribeCommandAck(data => {
        // Add to command log
        commandLogs.value.unshift({
          command: data.command,
          success: data.result,
          message: data.message,
          timestamp: data.timestamp
        });
        
        // Limit log size
        if (commandLogs.value.length > 50) {
          commandLogs.value = commandLogs.value.slice(0, 50);
        }
      });
    };
    
    // Send command to drone
    const sendCommand = async (command, params = {}) => {
      if (!selectedDroneId.value) return;
      
      try {
        const response = await api.drone.sendCommand(selectedDroneId.value, command, params);
        
        // Add to command log
        commandLogs.value.unshift({
          command,
          success: response.success,
          message: response.message,
          timestamp: Date.now()
        });
        
        return response;
      } catch (error) {
        console.error(`Failed to send ${command} command:`, error);
        
        // Add to command log
        commandLogs.value.unshift({
          command,
          success: false,
          message: error.message || `Failed to send ${command} command`,
          timestamp: Date.now()
        });
        
        return { success: false, message: error.message };
      }
    };
    
    // Takeoff with altitude parameter
    const takeoff = async () => {
      // Default to 10 meters if no altitude specified
      const altitude = 10;
      
      return sendCommand('takeoff', { altitude });
    };
    
    // Start a mission with the selected flight plan
    const startMission = async () => {
      if (!selectedDroneId.value || !selectedFlightPlanId.value) return;
      
      try {
        // First get the flight plan
        const flightPlan = await api.flightPlan.getById(selectedFlightPlanId.value);
        
        // Send upload mission command
        const result = await sendCommand('uploadMission', { 
          waypoints: flightPlan.waypoints,
          params: flightPlan.params,
          safetyParams: flightPlan.safetyParams
        });
        
        if (result.success) {
          // Start mission execution
          return sendCommand('startMission');
        }
        
        return result;
      } catch (error) {
        console.error('Failed to start mission:', error);
        
        // Add to command log
        commandLogs.value.unshift({
          command: 'Start Mission',
          success: false,
          message: error.message || 'Failed to start mission',
          timestamp: Date.now()
        });
        
        return { success: false, message: error.message };
      }
    };
    
    // Pause the current mission
    const pauseMission = async () => {
      return sendCommand('pauseMission');
    };
    
    // Abort the current mission and return to home
    const abortMission = async () => {
      return sendCommand('rtl');
    };
    
    // Format coordinate to 6 decimal places
    const formatCoordinate = (value) => {
      if (value === undefined || value === null) return 'N/A';
      return value.toFixed(6);
    };
    
    // Format angle to 2 decimal places (and convert radians to degrees if needed)
    const formatAngle = (value) => {
      if (value === undefined || value === null) return 'N/A';
      
      // Check if value is in radians (between -π and π)
      if (value >= -Math.PI && value <= Math.PI) {
        // Convert to degrees
        value = value * 180 / Math.PI;
      }
      
      return value.toFixed(2);
    };
    
    // Format velocity
    const formatVelocity = (velocity) => {
      if (!velocity) return 'N/A';
      
      // Calculate 3D velocity
      const speed = Math.sqrt(
        (velocity.vx || 0) ** 2 + 
        (velocity.vy || 0) ** 2 + 
        (velocity.vz || 0) ** 2
      );
      
      return speed.toFixed(2);
    };
    
    // Format timestamp
    const formatTime = (timestamp) => {
      if (!timestamp) return '';
      
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    };
    
    return {
      drones,
      selectedDroneId,
      selectedDrone,
      connected,
      flightPlans,
      selectedFlightPlanId,
      commandLogs,
      canControl,
      selectDrone,
      sendCommand,
      takeoff,
      startMission,
      pauseMission,
      abortMission,
      formatCoordinate,
      formatAngle,
      formatVelocity,
      formatTime
    };
  }
};
</script>

<style scoped>
.drone-control-panel {
  background-color: #f5f5f5;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 10px;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.connection-status {
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: bold;
  background-color: #ff4a4a;
  color: white;
}

.connection-status.connected {
  background-color: #43a047;
}

.panel-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.control-section,
.telemetry-section,
.mission-section,
.log-section {
  margin-bottom: 20px;
}

.telemetry-section {
  grid-column: span 2;
}

.log-section {
  grid-column: span 2;
}

.telemetry-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 10px;
}

.telemetry-item {
  background-color: white;
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.telemetry-item .label {
  font-weight: bold;
  margin-bottom: 5px;
  color: #666;
}

.command-buttons,
.flight-plan-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s ease;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #2196f3;
  color: white;
}

.btn-danger {
  background-color: #f44336;
  color: white;
}

.btn-success {
  background-color: #4caf50;
  color: white;
}

.btn-warning {
  background-color: #ff9800;
  color: white;
}

.btn-info {
  background-color: #00bcd4;
  color: white;
}

select {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.command-log {
  background-color: white;
  border-radius: 4px;
  padding: 10px;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.1);
}

.log-entry {
  padding: 8px;
  border-bottom: 1px solid #f0f0f0;
  font-family: monospace;
  display: grid;
  grid-template-columns: 80px 100px 80px 1fr;
  gap: 10px;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-entry.error {
  background-color: #ffebee;
}

.timestamp {
  color: #888;
}

.command {
  font-weight: bold;
}

.status {
  font-weight: bold;
}

.message {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-logs,
.no-drone-selected {
  padding: 20px;
  text-align: center;
  color: #888;
  font-style: italic;
}

@media (max-width: 768px) {
  .panel-content {
    grid-template-columns: 1fr;
  }
  
  .telemetry-section,
  .log-section {
    grid-column: span 1;
  }
  
  .telemetry-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .log-entry {
    grid-template-columns: 80px 80px 60px 1fr;
    font-size: 0.9rem;
  }
}
</style> 