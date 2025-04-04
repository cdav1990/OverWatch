import { DroneState } from '../types/drone';

// Define the API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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