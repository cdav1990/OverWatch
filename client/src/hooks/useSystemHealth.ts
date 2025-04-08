import { useState, useEffect, useCallback, useRef } from 'react';
import apiService, { SystemHealth } from '../services/apiService';
import socketService from '../services/socketService';

/**
 * Initial empty state for system health
 */
const initialSystemHealth: SystemHealth = {
  cpu: 0,
  memory: 0,
  storage: 0,
  network: 0,
  processes: 0,
  temperature: 0,
  timestamp: 0
};

/**
 * Options for the useSystemHealth hook
 */
interface UseSystemHealthOptions {
  pollingInterval?: number; // in milliseconds
  enableRealtime?: boolean; // whether to use websocket updates when available
  suppressErrors?: boolean; // whether to suppress error states in development
}

/**
 * Hook for accessing real-time system health data
 */
export function useSystemHealth(options: UseSystemHealthOptions = {}) {
  const { 
    pollingInterval = 5000, // Default to 5 seconds
    enableRealtime = true,  // Default to use realtime updates when available
    suppressErrors = true,  // Default to suppress errors in development
  } = options;

  const [systemHealth, setSystemHealth] = useState<SystemHealth>(initialSystemHealth);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Using useRef to track interval ID for proper cleanup
  const intervalRef = useRef<number | null>(null);

  // Function to fetch system health data
  const fetchSystemHealth = useCallback(async () => {
    try {
      setError(null);
      const data = await apiService.getSystemHealth();
      setSystemHealth(data);
      setLastUpdated(new Date());
    } catch (err) {
      // Only set error if we're not suppressing errors
      if (!suppressErrors) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Error fetching system health:', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [suppressErrors]);

  // Set up polling for system health updates
  useEffect(() => {
    // Initial fetch
    fetchSystemHealth();

    // Clear existing interval if it exists
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
    }

    // Set up new polling interval with current pollingInterval value
    intervalRef.current = window.setInterval(fetchSystemHealth, pollingInterval);

    // Cleanup on unmount or when pollingInterval changes
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchSystemHealth, pollingInterval]); // Include pollingInterval in dependencies

  // Set up websocket listeners for real-time updates if enabled
  useEffect(() => {
    if (!enableRealtime) return;

    // Handler for system health updates via websocket
    const handleSystemHealthUpdate = (data: SystemHealth) => {
      setSystemHealth(data);
      setLastUpdated(new Date());
      setIsLoading(false);
    };

    // Connect to socket if not already connected
    if (!socketService.isConnected()) {
      socketService.connect();
    }

    // Subscribe to system health updates
    socketService.on('system:health', handleSystemHealthUpdate);

    // Cleanup
    return () => {
      socketService.off('system:health', handleSystemHealthUpdate);
    };
  }, [enableRealtime]);

  // Function to manually refresh the data
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchSystemHealth();
  }, [fetchSystemHealth]);

  return {
    systemHealth,
    isLoading,
    error,
    lastUpdated,
    refresh,
  };
} 