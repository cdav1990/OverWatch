import { DroneState } from '../types/drone';

// Define the API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Define system health interface
export interface SystemHealth {
  cpu: number; // CPU usage percentage
  memory: number; // Memory usage percentage 
  storage: number; // Storage usage percentage
  network: number; // Network bandwidth utilization percentage
  processes: number; // Number of active system processes
  temperature: number; // CPU temperature (°C)
  timestamp: number; // Timestamp of the measurement
}

/**
 * API Service for making REST requests to the server
 */
class ApiService {
  /**
   * Check if the server is healthy
   */
  async healthCheck(): Promise<{ status: string; connections: { ros: boolean; mavlink: boolean } }> {
    const response = await fetch(`${API_URL}/health`);
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Get system resource usage
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const response = await fetch(`${API_URL}/api/system/health`);
      
      if (!response.ok) {
        throw new Error(`Failed to get system health: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      // Only log in production to avoid console spam during development
      const isDevelopment = import.meta.env.DEV || !API_URL.includes('production');
      
      if (!isDevelopment) {
        console.error('Error fetching system health:', error);
      } else {
        // In development, show a more helpful message about the backend server
        console.warn(
          'Could not connect to system monitoring backend server. ' +
          'Make sure the server is running with: cd server && npm run dev'
        );
      }
      
      // Generate simulated data as a last resort
      return this.getSimulatedSystemHealth();
    }
  }

  /**
   * Generate simulated system health data for development
   * This will be used if the actual endpoint isn't available
   */
  private getSimulatedSystemHealth(): SystemHealth {
    // Add some randomness to simulate fluctuating values
    const getRandomValue = (base: number, variance: number) => {
      return Math.min(100, Math.max(0, base + (Math.random() * variance * 2 - variance)));
    };
    
    return {
      cpu: getRandomValue(40, 15),
      memory: getRandomValue(60, 10),
      storage: getRandomValue(70, 5),
      network: getRandomValue(50, 20),
      processes: Math.floor(Math.random() * 100) + 150, // Between 150-250 processes
      temperature: Math.floor(Math.random() * 20) + 40, // Between 40-60°C
      timestamp: Date.now()
    };
  }

  /**
   * Get the current drone state
   */
  async getDroneState(): Promise<DroneState> {
    const response = await fetch(`${API_URL}/api/drone/state`);
    
    if (!response.ok) {
      throw new Error(`Failed to get drone state: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * Send a command to arm the drone (only in development)
   */
  async armDrone(): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_URL}/api/dev/sim/arm`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to arm drone: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * Send a command to disarm the drone (only in development)
   */
  async disarmDrone(): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_URL}/api/dev/sim/disarm`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to disarm drone: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * Set the drone's flight mode (only in development)
   */
  async setDroneMode(mode: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_URL}/api/dev/sim/mode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to set drone mode: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
}

// Create a singleton instance
const apiService = new ApiService();

export default apiService; 