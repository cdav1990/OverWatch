import { useState, useEffect } from 'react';
import socketService from '../services/socketService';
import apiService from '../services/apiService';
import { DroneState, HeartbeatMessage } from '../types/drone';

/**
 * Custom hook for accessing drone telemetry data
 */
export function useDroneTelemetry() {
  const [droneState, setDroneState] = useState<DroneState | null>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<HeartbeatMessage | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize connection on mount
  useEffect(() => {
    const initConnection = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // First, get initial state from REST API
        try {
          const initialState = await apiService.getDroneState();
          setDroneState(initialState);
        } catch (err) {
          console.warn('Could not fetch initial drone state:', err);
          // Continue anyway, we'll get updates from WebSocket
        }

        // Connect to WebSocket for real-time updates
        socketService.connect();

        // Update connection status
        setIsConnected(socketService.isConnected());
        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    initConnection();

    // Clean up on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  // Set up listeners for drone state and heartbeat
  useEffect(() => {
    const handleDroneState = (state: DroneState) => {
      setDroneState(state);
    };

    const handleHeartbeat = (heartbeat: HeartbeatMessage) => {
      setLastHeartbeat(heartbeat);
      // If we're receiving heartbeats, we're connected
      setIsConnected(true);
    };

    socketService.onDroneState(handleDroneState);
    socketService.onHeartbeat(handleHeartbeat);

    return () => {
      socketService.offDroneState(handleDroneState);
      socketService.offHeartbeat(handleHeartbeat);
    };
  }, []);

  // Function to send arm command
  const armDrone = async () => {
    try {
      await apiService.armDrone();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    }
  };

  // Function to send disarm command
  const disarmDrone = async () => {
    try {
      await apiService.disarmDrone();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    }
  };

  // Function to send mode change command
  const setDroneMode = async (mode: string) => {
    try {
      await apiService.setDroneMode(mode);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    }
  };

  return {
    droneState,
    lastHeartbeat,
    isConnected,
    isLoading,
    error,
    armDrone,
    disarmDrone,
    setDroneMode
  };
} 