import { useState, useEffect, useMemo } from 'react';
import socketService from '../services/socketService';

export interface RosTopic {
  name: string;
  type: string;
  latestMessage?: any;
  lastUpdated?: Date;
  status: 'active' | 'inactive' | 'error';
}

export interface RosTopicSummary {
  connectedToRos: boolean;
  availableTopics: RosTopic[];
  subscribedTopics: RosTopic[];
  error: string | null;
  isLoading: boolean;
  isDevelopmentMode: boolean;
}

// Sample topics to show in development mode
const DEV_MODE_TOPICS: RosTopic[] = [
  { name: '/drone/state', type: 'std_msgs/String', status: 'inactive' },
  { name: '/drone/position', type: 'geometry_msgs/PoseStamped', status: 'inactive' },
  { name: '/drone/velocity', type: 'geometry_msgs/TwistStamped', status: 'inactive' },
  { name: '/camera/image_raw', type: 'sensor_msgs/Image', status: 'inactive' },
  { name: '/tf', type: 'tf2_msgs/TFMessage', status: 'inactive' },
  { name: '/rosout', type: 'rosgraph_msgs/Log', status: 'inactive' },
  { name: '/mavros/global_position/global', type: 'sensor_msgs/NavSatFix', status: 'inactive' },
  { name: '/mavros/imu/data', type: 'sensor_msgs/Imu', status: 'inactive' },
  { name: '/mavros/rc/in', type: 'mavros_msgs/RCIn', status: 'inactive' },
  { name: '/mavros/battery', type: 'sensor_msgs/BatteryState', status: 'inactive' },
];

/**
 * Custom hook for accessing ROS topics
 * Provides a dev mode experience when ROS is not connected
 */
export function useRosTopics() {
  const [availableTopics, setAvailableTopics] = useState<RosTopic[]>([]);
  const [subscribedTopics, setSubscribedTopics] = useState<RosTopic[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDevelopmentMode, setIsDevelopmentMode] = useState<boolean>(true);

  // Initialize connection on mount
  useEffect(() => {
    let isMounted = true;
    
    const initRosConnection = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Try to connect to ROS via WebSocket
        try {
          // This would be a real connection in production
          await socketService.connect();
          
          if (isMounted) {
            setIsConnected(socketService.isConnected());
            
            // If connected, we'd fetch real topics
            // For now, set dev mode based on connection status
            setIsDevelopmentMode(!socketService.isConnected());
            
            // In production, we would get real topics from the ROS bridge
            if (socketService.isConnected()) {
              // Fetch topics would go here in production
              // For now, just use empty arrays
              setAvailableTopics([]);
              setSubscribedTopics([]);
            } else {
              // In dev mode, use sample topics
              setAvailableTopics(DEV_MODE_TOPICS);
              setSubscribedTopics([]);
            }
          }
        } catch (err) {
          console.warn('Could not connect to ROS:', err);
          if (isMounted) {
            setIsDevelopmentMode(true);
            setAvailableTopics(DEV_MODE_TOPICS);
          }
        }

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        if (isMounted) {
          setError(errorMessage);
          setIsLoading(false);
          setIsDevelopmentMode(true);
          setAvailableTopics(DEV_MODE_TOPICS);
        }
      }
    };

    initRosConnection();

    return () => {
      isMounted = false;
      socketService.disconnect();
    };
  }, []);

  // Subscribe/Unsubscribe functions (would be implemented in production)
  const subscribeToTopic = (topicName: string) => {
    console.log(`[DEV] Would subscribe to ${topicName} in production mode`);
    
    // In production, this would actually subscribe via ROS bridge
    if (isDevelopmentMode) {
      // In dev mode, just add to subscribed list with fake data
      const topic = availableTopics.find(t => t.name === topicName);
      if (topic && !subscribedTopics.some(t => t.name === topicName)) {
        const updatedTopic: RosTopic = { 
          ...topic, 
          status: 'active' as const,
          latestMessage: { data: 'Sample data (dev mode)' },
          lastUpdated: new Date()
        };
        setSubscribedTopics([...subscribedTopics, updatedTopic]);
      }
    }
  };

  const unsubscribeFromTopic = (topicName: string) => {
    console.log(`[DEV] Would unsubscribe from ${topicName} in production mode`);
    
    // In production, this would unsubscribe via ROS bridge
    if (isDevelopmentMode) {
      // In dev mode, just remove from subscribed list
      setSubscribedTopics(subscribedTopics.filter(t => t.name !== topicName));
    }
  };

  // Return the summary object
  const summary: RosTopicSummary = {
    connectedToRos: isConnected,
    availableTopics,
    subscribedTopics,
    error,
    isLoading,
    isDevelopmentMode
  };

  return {
    ...summary,
    subscribeToTopic,
    unsubscribeFromTopic
  };
} 