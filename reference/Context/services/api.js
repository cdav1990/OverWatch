/**
 * API Service
 * Handles communication with the backend API
 */
import io from 'socket.io-client';

// Base API URL
const API_URL = 'http://localhost:5000/api';

// Socket.io connection
let socket = null;

// Connect to the socket server
const connectSocket = () => {
  if (socket) return socket;
  
  socket = io('http://localhost:5000');
  
  socket.on('connect', () => {
    console.log('Connected to server via Socket.io');
  });
  
  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });
  
  return socket;
};

// Generic error handler
const handleError = (error) => {
  console.error('API Error:', error);
  
  if (error.response) {
    // Server responded with an error status
    return Promise.reject({
      status: error.response.status,
      message: error.response.data.message || 'Server error',
      data: error.response.data
    });
  } else if (error.request) {
    // Request was made but no response received
    return Promise.reject({
      status: 0,
      message: 'Network error - no response from server',
      data: null
    });
  } else {
    // Error in setting up the request
    return Promise.reject({
      status: 0,
      message: error.message,
      data: null
    });
  }
};

/**
 * Mission API
 */
export const missionApi = {
  // Get all missions
  getAll: async () => {
    try {
      const response = await fetch(`${API_URL}/missions`);
      
      if (!response.ok) {
        const error = await response.json();
        throw { response: { status: response.status, data: error } };
      }
      
      return await response.json();
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Get mission by ID
  getById: async (id) => {
    try {
      const response = await fetch(`${API_URL}/missions/${id}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw { response: { status: response.status, data: error } };
      }
      
      return await response.json();
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Create a new mission
  create: async (data) => {
    try {
      const response = await fetch(`${API_URL}/missions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw { response: { status: response.status, data: error } };
      }
      
      return await response.json();
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Update a mission
  update: async (id, data) => {
    try {
      const response = await fetch(`${API_URL}/missions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw { response: { status: response.status, data: error } };
      }
      
      return await response.json();
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Delete a mission
  delete: async (id) => {
    try {
      const response = await fetch(`${API_URL}/missions/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw { response: { status: response.status, data: error } };
      }
      
      return await response.json();
    } catch (error) {
      return handleError(error);
    }
  }
};

/**
 * Drone API
 */
export const droneApi = {
  // Get all drones
  getAll: async () => {
    try {
      const response = await fetch(`${API_URL}/drones`);
      
      if (!response.ok) {
        const error = await response.json();
        throw { response: { status: response.status, data: error } };
      }
      
      return await response.json();
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Get drone by ID
  getById: async (id) => {
    try {
      const response = await fetch(`${API_URL}/drones/${id}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw { response: { status: response.status, data: error } };
      }
      
      return await response.json();
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Register a new drone
  register: async (data) => {
    try {
      const response = await fetch(`${API_URL}/drones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw { response: { status: response.status, data: error } };
      }
      
      return await response.json();
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Update drone position
  updatePosition: async (id, position) => {
    try {
      const response = await fetch(`${API_URL}/drones/${id}/position`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(position)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw { response: { status: response.status, data: error } };
      }
      
      return await response.json();
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Update drone status
  updateStatus: async (id, status) => {
    try {
      const response = await fetch(`${API_URL}/drones/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(status)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw { response: { status: response.status, data: error } };
      }
      
      return await response.json();
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Update drone telemetry
  updateTelemetry: async (id, telemetryData) => {
    try {
      const response = await fetch(`${API_URL}/drones/${id}/telemetry`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(telemetryData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw { response: { status: response.status, data: error } };
      }
      
      return await response.json();
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Send a command to the drone
  sendCommand: async (id, command, params = {}) => {
    try {
      const response = await fetch(`${API_URL}/drones/${id}/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command, params })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw { response: { status: response.status, data: error } };
      }
      
      return await response.json();
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Subscribe to drone telemetry updates
  subscribeTelemetry: (callback) => {
    const socket = connectSocket();
    socket.on('drone-telemetry', callback);
    return () => socket.off('drone-telemetry', callback);
  },
  
  // Subscribe to drone position updates
  subscribePosition: (callback) => {
    const socket = connectSocket();
    socket.on('drone-position-update', callback);
    return () => socket.off('drone-position-update', callback);
  },
  
  // Subscribe to drone status updates
  subscribeStatus: (callback) => {
    const socket = connectSocket();
    socket.on('drone-status-update', callback);
    return () => socket.off('drone-status-update', callback);
  },
  
  // Subscribe to drone command acknowledgements
  subscribeCommandAck: (callback) => {
    const socket = connectSocket();
    socket.on('command-ack', callback);
    return () => socket.off('command-ack', callback);
  }
};

/**
 * Flight Plan API
 */
export const flightPlanApi = {
  // Get all flight plans
  getAll: async () => {
    try {
      const response = await fetch(`${API_URL}/flight-plans`);
      
      if (!response.ok) {
        const error = await response.json();
        throw { response: { status: response.status, data: error } };
      }
      
      return await response.json();
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Get flight plan by ID
  getById: async (id) => {
    try {
      const response = await fetch(`${API_URL}/flight-plans/${id}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw { response: { status: response.status, data: error } };
      }
      
      return await response.json();
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Create a new flight plan
  create: async (data) => {
    try {
      const response = await fetch(`${API_URL}/flight-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw { response: { status: response.status, data: error } };
      }
      
      return await response.json();
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Update a flight plan
  update: async (id, data) => {
    try {
      const response = await fetch(`${API_URL}/flight-plans/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw { response: { status: response.status, data: error } };
      }
      
      return await response.json();
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Delete a flight plan
  delete: async (id) => {
    try {
      const response = await fetch(`${API_URL}/flight-plans/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw { response: { status: response.status, data: error } };
      }
      
      return await response.json();
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Generate grid flight path
  generateGridPath: async (data) => {
    try {
      const response = await fetch(`${API_URL}/flight-plans/generate/grid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw { response: { status: response.status, data: error } };
      }
      
      return await response.json();
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Generate orbit flight path
  generateOrbitPath: async (data) => {
    try {
      const response = await fetch(`${API_URL}/flight-plans/generate/orbit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw { response: { status: response.status, data: error } };
      }
      
      return await response.json();
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Generate facade flight path
  generateFacadePath: async (data) => {
    try {
      const response = await fetch(`${API_URL}/flight-plans/generate/facade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw { response: { status: response.status, data: error } };
      }
      
      return await response.json();
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Generate spiral flight path
  generateSpiralPath: async (data) => {
    try {
      const response = await fetch(`${API_URL}/flight-plans/generate/spiral`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw { response: { status: response.status, data: error } };
      }
      
      return await response.json();
    } catch (error) {
      return handleError(error);
    }
  }
};

// Export the API services
export default {
  mission: missionApi,
  drone: droneApi,
  flightPlan: flightPlanApi
}; 