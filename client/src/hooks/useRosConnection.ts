import { useEffect, useState, useRef, useCallback } from 'react';
import * as ROSLIB from 'roslib';
import { useMission } from '../context/MissionContext';

// Default URL for rosbridge_websocket
// TODO: Make this configurable via environment variables or settings
const ROSBRIDGE_URL = process.env.REACT_APP_ROSBRIDGE_URL || 'ws://localhost:9090';

interface UseRosConnectionReturn {
  ros: ROSLIB.Ros | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

export function useRosConnection(): UseRosConnectionReturn {
  const { dispatch } = useMission();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const rosInstance = useRef<ROSLIB.Ros | null>(null);

  const connect = useCallback(() => {
    if (rosInstance.current && isConnected) {
      console.log('ROS is already connected.');
      return;
    }

    console.log(`Attempting to connect to ROSBridge at ${ROSBRIDGE_URL}...`);
    
    // Ensure previous instance is cleaned up if attempting reconnect
    if (rosInstance.current) {
        try {
            rosInstance.current.close();
        } catch (e) {
            console.warn("Error closing previous ROS connection:", e);
        }
    }

    const ros = new ROSLIB.Ros({ url: ROSBRIDGE_URL });
    rosInstance.current = ros;

    ros.on('connection', () => {
      console.log('Connected to ROSBridge websocket server.');
      setIsConnected(true);
      dispatch({ type: 'SET_ROSBRIDGE_CONNECTION', payload: { connected: true } });
    });

    ros.on('error', (error: Error) => {
      console.error('Error connecting to ROSBridge websocket server: ', error);
      setIsConnected(false);
      // Dispatch connection status update even on error
      dispatch({ type: 'SET_ROSBRIDGE_CONNECTION', payload: { connected: false } });
      // Optional: Implement retry logic here
    });

    ros.on('close', () => {
      console.log('Connection to ROSBridge websocket server closed.');
      setIsConnected(false);
      rosInstance.current = null; // Clear the instance on close
      dispatch({ type: 'SET_ROSBRIDGE_CONNECTION', payload: { connected: false } });
      // Optional: Attempt to reconnect after a delay
    });

    // Note: Actual connection attempt happens implicitly when ROSLIB.Ros is instantiated
    // and event listeners are attached.

  }, [dispatch]);

  const disconnect = useCallback(() => {
    if (rosInstance.current) {
      console.log('Disconnecting from ROSBridge...');
      rosInstance.current.close(); // This will trigger the 'close' event handler
      // State updates (isConnected, dispatch) happen within the 'close' handler
    }
  }, []);

  // Optional: Auto-connect on hook mount? Or require manual connect call?
  // For now, let's require manual connection via the connect function.
  // If auto-connect is desired, call connect() inside a useEffect:
  // useEffect(() => {
  //   connect();
  //   // Cleanup function to disconnect on unmount
  //   return () => {
  //       disconnect();
  //   };
  // }, [connect, disconnect]); // Add dependencies

  return {
    ros: rosInstance.current,
    isConnected,
    connect,
    disconnect,
  };
} 