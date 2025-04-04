<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>Drone Mission Dashboard</h1>
      <div class="connection-status">
        <div class="status-item" :class="{ active: backendConnected }">
          <span class="status-dot"></span>Backend
        </div>
        <div class="status-item" :class="{ active: rosConnected }">
          <span class="status-dot"></span>ROS
        </div>
        <div class="status-item" :class="{ active: mavlinkConnected }">
          <span class="status-dot"></span>MAVLink
        </div>
      </div>
    </div>
    
    <div class="dashboard-content">
      <div class="left-panel">
        <!-- 3D Visualization Panel -->
        <div class="visualization-panel">
          <h2>Mission Visualization</h2>
          <div class="placeholder-3d-viewer" ref="viewer3d">
            <p>3D Viewer will be displayed here</p>
          </div>
        </div>
        
        <!-- Flight Plan Panel -->
        <div class="flight-plan-panel">
          <h2>Flight Plan</h2>
          <div class="flight-plan-controls">
            <select v-model="selectedFlightPlanId" @change="loadFlightPlan">
              <option value="">-- Select Flight Plan --</option>
              <option v-for="plan in flightPlans" :key="plan.id" :value="plan.id">
                {{ plan.name }}
              </option>
            </select>
            <button @click="createNewFlightPlan" class="btn-primary">
              Create New
            </button>
          </div>
          
          <div v-if="selectedFlightPlan" class="flight-plan-details">
            <div class="flight-plan-info">
              <div class="info-item">
                <span class="label">Name:</span>
                <span class="value">{{ selectedFlightPlan.name }}</span>
              </div>
              <div class="info-item">
                <span class="label">Type:</span>
                <span class="value">{{ selectedFlightPlan.type }}</span>
              </div>
              <div class="info-item">
                <span class="label">Est. Time:</span>
                <span class="value">{{ selectedFlightPlan.estimatedTime || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="label">Distance:</span>
                <span class="value">{{ selectedFlightPlan.totalDistance || 'N/A' }}</span>
              </div>
            </div>
            
            <div class="flight-plan-waypoints">
              <h3>Waypoints ({{ selectedFlightPlan.waypoints?.length || 0 }})</h3>
              <div class="waypoint-list">
                <div v-for="(wp, index) in selectedFlightPlan.waypoints" :key="index" class="waypoint-item">
                  <span class="waypoint-index">{{ index + 1 }}</span>
                  <span class="waypoint-label">{{ wp.label || `Waypoint ${index + 1}` }}</span>
                  <span class="waypoint-coords">
                    X: {{ wp.x.toFixed(1) }}, Y: {{ wp.y.toFixed(1) }}, Z: {{ wp.z.toFixed(1) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div v-else class="no-flight-plan">
            Please select a flight plan to view details.
          </div>
        </div>
      </div>
      
      <div class="right-panel">
        <!-- Drone Control Panel -->
        <DroneControlPanel 
          :initialDroneId="selectedDroneId" 
          @drone-selected="onDroneSelected"
        />
        
        <!-- Mission Progress Panel -->
        <div class="mission-progress-panel" v-if="activeMission">
          <h2>Mission Progress</h2>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${missionProgress}%` }"></div>
          </div>
          <div class="progress-stats">
            <div class="stat-item">
              <span class="label">Completed:</span>
              <span class="value">{{ missionProgress }}%</span>
            </div>
            <div class="stat-item">
              <span class="label">Waypoint:</span>
              <span class="value">{{ activeMission.currentWaypoint || 0 }}/{{ activeMission.totalWaypoints }}</span>
            </div>
            <div class="stat-item">
              <span class="label">Time:</span>
              <span class="value">{{ formatDuration(activeMission.elapsedTime) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import DroneControlPanel from '../components/DroneControlPanel.vue';
import api from '../services/api';

export default {
  name: 'DashboardView',
  components: {
    DroneControlPanel
  },
  
  setup() {
    // State variables
    const backendConnected = ref(false);
    const rosConnected = ref(false);
    const mavlinkConnected = ref(false);
    
    const flightPlans = ref([]);
    const selectedFlightPlanId = ref('');
    const selectedFlightPlan = ref(null);
    
    const selectedDroneId = ref(null);
    
    const activeMission = ref(null);
    const missionProgress = ref(0);
    
    const viewer3d = ref(null);
    
    // Socket.io unsubscribe functions
    let unsubscribeRosStatus = null;
    let unsubscribeMissionStatus = null;
    
    // Lifecycle hooks
    onMounted(async () => {
      // Initialize connections
      await checkBackendConnection();
      
      // Load flight plans
      await loadFlightPlans();
      
      // Setup socket listeners
      setupSocketListeners();
    });
    
    onUnmounted(() => {
      // Cleanup socket listeners
      if (unsubscribeRosStatus) unsubscribeRosStatus();
      if (unsubscribeMissionStatus) unsubscribeMissionStatus();
    });
    
    // Load flight plans from API
    const loadFlightPlans = async () => {
      try {
        const response = await api.flightPlan.getAll();
        flightPlans.value = response;
      } catch (error) {
        console.error('Failed to load flight plans:', error);
      }
    };
    
    // Load specific flight plan details
    const loadFlightPlan = async () => {
      if (!selectedFlightPlanId.value) {
        selectedFlightPlan.value = null;
        return;
      }
      
      try {
        const response = await api.flightPlan.getById(selectedFlightPlanId.value);
        selectedFlightPlan.value = response;
        
        // Visualize flight plan
        visualizeFlightPlan(response);
      } catch (error) {
        console.error('Failed to load flight plan details:', error);
        selectedFlightPlan.value = null;
      }
    };
    
    // Check backend connection
    const checkBackendConnection = async () => {
      try {
        // Simple API call to check if backend is running
        await fetch('http://localhost:5000/api');
        backendConnected.value = true;
      } catch (error) {
        console.error('Backend connection failed:', error);
        backendConnected.value = false;
      }
    };
    
    // Setup socket.io listeners
    const setupSocketListeners = () => {
      // Subscribe to ROS connection status
      unsubscribeRosStatus = api.ros.subscribeStatus((status) => {
        rosConnected.value = status.connected;
      });
      
      // Subscribe to mission status updates
      unsubscribeMissionStatus = api.drone.subscribeCommandAck((data) => {
        // Check for mission-related commands
        if (['startMission', 'pauseMission', 'rtl'].includes(data.command)) {
          if (data.command === 'startMission' && data.result) {
            // Mission started
            activeMission.value = {
              startTime: Date.now(),
              elapsedTime: 0,
              currentWaypoint: 0,
              totalWaypoints: selectedFlightPlan.value?.waypoints?.length || 0
            };
            
            // Start progress tracking
            trackMissionProgress();
          } else if (data.command === 'rtl' && data.result) {
            // Mission aborted - reset
            activeMission.value = null;
            missionProgress.value = 0;
          }
        }
      });
    };
    
    // Track mission progress
    const trackMissionProgress = () => {
      if (!activeMission.value) return;
      
      // For now, just simulated progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 1;
        missionProgress.value = Math.min(progress, 100);
        
        // Update elapsed time
        if (activeMission.value) {
          activeMission.value.elapsedTime = Date.now() - activeMission.value.startTime;
          
          // Simulate waypoint progress
          const waypointProgress = Math.floor((missionProgress.value / 100) * activeMission.value.totalWaypoints);
          activeMission.value.currentWaypoint = waypointProgress;
        }
        
        if (progress >= 100 || !activeMission.value) {
          clearInterval(interval);
          if (progress >= 100) {
            // Mission complete
            activeMission.value.currentWaypoint = activeMission.value.totalWaypoints;
          }
        }
      }, 1000);
    };
    
    // Visualize flight plan in 3D (placeholder)
    const visualizeFlightPlan = (flightPlan) => {
      if (!flightPlan || !flightPlan.waypoints) return;
      
      // In a real implementation, this would update the 3D viewer
      console.log('Visualizing flight plan:', flightPlan.name);
      
      // If ROS is connected, visualize in ROS as well
      if (rosConnected.value) {
        api.ros.visualizeFlightPlan(flightPlan.id)
          .then(result => {
            console.log('ROS visualization result:', result);
          })
          .catch(error => {
            console.error('Failed to visualize in ROS:', error);
          });
      }
    };
    
    // Create a new flight plan
    const createNewFlightPlan = () => {
      // Navigate to flight plan creation page
      alert('Navigate to flight plan creation page');
    };
    
    // Handle events from child components
    const onDroneSelected = (droneId) => {
      selectedDroneId.value = droneId;
    };
    
    // Format duration from milliseconds to MM:SS
    const formatDuration = (ms) => {
      if (!ms) return '00:00';
      
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };
    
    return {
      backendConnected,
      rosConnected,
      mavlinkConnected,
      flightPlans,
      selectedFlightPlanId,
      selectedFlightPlan,
      selectedDroneId,
      activeMission,
      missionProgress,
      viewer3d,
      loadFlightPlan,
      createNewFlightPlan,
      onDroneSelected,
      formatDuration
    };
  }
};
</script>

<style scoped>
.dashboard {
  padding: 20px;
  height: 100%;
  background-color: #f9f9f9;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;
}

.dashboard-header h1 {
  margin: 0;
  font-size: 1.8rem;
  color: #333;
}

.connection-status {
  display: flex;
  gap: 15px;
}

.status-item {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  color: #666;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #ccc;
  margin-right: 6px;
}

.status-item.active .status-dot {
  background-color: #4caf50;
}

.dashboard-content {
  display: flex;
  gap: 20px;
  height: calc(100vh - 120px);
}

.left-panel {
  flex: 1.5;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.visualization-panel {
  flex: 1.5;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.visualization-panel h2 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.3rem;
}

.placeholder-3d-viewer {
  flex: 1;
  background-color: #f0f0f0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
}

.flight-plan-panel {
  flex: 1;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  overflow-y: auto;
}

.flight-plan-panel h2 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.3rem;
}

.flight-plan-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.flight-plan-controls select {
  flex: 1;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.btn-primary {
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: bold;
}

.flight-plan-details {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.flight-plan-info {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-item .label {
  font-size: 0.8rem;
  color: #888;
}

.info-item .value {
  font-weight: bold;
}

.flight-plan-waypoints h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1.1rem;
  padding-bottom: 5px;
  border-bottom: 1px solid #eee;
}

.waypoint-list {
  max-height: 200px;
  overflow-y: auto;
}

.waypoint-item {
  display: flex;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  align-items: center;
}

.waypoint-index {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #2196f3;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-right: 10px;
}

.waypoint-label {
  flex: 1;
  font-weight: bold;
}

.waypoint-coords {
  font-family: monospace;
  color: #666;
}

.no-flight-plan {
  padding: 20px;
  text-align: center;
  color: #888;
  font-style: italic;
}

.mission-progress-panel {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.mission-progress-panel h2 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.3rem;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background-color: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 15px;
}

.progress-fill {
  height: 100%;
  background-color: #4caf50;
  transition: width 0.5s ease;
}

.progress-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-item .label {
  font-size: 0.8rem;
  color: #888;
}

.stat-item .value {
  font-weight: bold;
  font-size: 1.1rem;
}

@media (max-width: 1200px) {
  .dashboard-content {
    flex-direction: column;
    height: auto;
  }
  
  .left-panel, .right-panel {
    width: 100%;
  }
  
  .visualization-panel {
    height: 400px;
  }
}
</style> 