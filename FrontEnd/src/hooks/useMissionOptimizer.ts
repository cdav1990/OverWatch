import { useCallback, useMemo } from 'react';
import { PathSegment, Waypoint } from '../types/mission';
import { useMission } from '../context/MissionContext';

const LARGE_PATH_THRESHOLD = 200; // Number of waypoints considered "large"
const PREVIEW_POINT_LIMIT = 50; // Max number of points to display in preview mode
const CHUNK_SIZE = 200; // Size of chunks for processing large paths

/**
 * Custom hook for optimizing mission paths with large numbers of waypoints
 * Provides functions for efficient path handling, processing, and visualization
 */
export const useMissionOptimizer = () => {
  const { state, dispatch } = useMission();
  const { currentMission } = state;
  
  // Identify which paths are "large" and might need special handling
  const largePathSegments = useMemo(() => {
    if (!currentMission?.pathSegments) return [];
    
    return currentMission.pathSegments.filter(segment => 
      segment.waypoints && segment.waypoints.length > LARGE_PATH_THRESHOLD
    );
  }, [currentMission?.pathSegments]);

  // Calculate if the current mission has performance concerns
  const hasPerformanceConcerns = useMemo(() => {
    return largePathSegments.length > 0;
  }, [largePathSegments]);

  // Total waypoint count in mission
  const totalWaypointCount = useMemo(() => {
    if (!currentMission?.pathSegments) return 0;
    
    return currentMission.pathSegments.reduce((total, segment) => 
      total + (segment.waypoints?.length || 0), 0
    );
  }, [currentMission?.pathSegments]);

  // Create optimized versions of paths for visualization
  const getPathPreviews = useCallback(() => {
    if (!currentMission?.pathSegments) return [];
    
    return currentMission.pathSegments.map(segment => {
      if (!segment.waypoints || segment.waypoints.length <= PREVIEW_POINT_LIMIT) {
        return segment; // Small enough, no need for preview
      }
      
      // Create a simplified preview with fewer points
      const skipFactor = Math.ceil(segment.waypoints.length / PREVIEW_POINT_LIMIT);
      const previewWaypoints = segment.waypoints.filter((_, index) => 
        index % skipFactor === 0 || index === segment.waypoints.length - 1
      );
      
      return {
        ...segment,
        isPreview: true, // Mark as preview
        originalLength: segment.waypoints.length,
        waypoints: previewWaypoints
      };
    });
  }, [currentMission?.pathSegments]);

  // Process a function across a large path in chunks to avoid blocking the UI
  const processLargePathInChunks = useCallback(async (
    segment: PathSegment,
    processFn: (waypoint: Waypoint) => Waypoint,
    onProgress?: (progress: number) => void,
    onComplete?: (result: PathSegment) => void
  ) => {
    if (!segment.waypoints || segment.waypoints.length === 0) {
      if (onComplete) onComplete(segment);
      return segment;
    }

    const totalWaypoints = segment.waypoints.length;
    const processedWaypoints: Waypoint[] = [];
    
    // Process in chunks using setTimeout to avoid blocking UI
    const processChunk = (startIndex: number) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const endIndex = Math.min(startIndex + CHUNK_SIZE, totalWaypoints);
          
          // Process this chunk
          for (let i = startIndex; i < endIndex; i++) {
            const waypoint = segment.waypoints[i];
            if (waypoint) {
              processedWaypoints.push(processFn(waypoint));
            }
          }
          
          // Report progress
          if (onProgress) {
            const progress = endIndex / totalWaypoints;
            onProgress(progress);
          }
          
          if (endIndex < totalWaypoints) {
            // Process next chunk
            processChunk(endIndex).then(resolve);
          } else {
            // All done
            resolve();
          }
        }, 0); // Yield to browser
      });
    };
    
    // Start processing
    await processChunk(0);
    
    // Create the processed segment
    const processedSegment = {
      ...segment,
      waypoints: processedWaypoints
    };
    
    if (onComplete) {
      onComplete(processedSegment);
    }
    
    return processedSegment;
  }, []);

  // Simplify a path to reduce points while maintaining shape
  const simplifyPath = useCallback((
    segment: PathSegment, 
    tolerance: number = 0.5,
    onComplete?: (result: PathSegment) => void
  ) => {
    if (!segment.waypoints || segment.waypoints.length <= 2) {
      if (onComplete) onComplete(segment);
      return segment;
    }

    // This is a simplified version - for production code,
    // you would implement a more sophisticated algorithm like Douglas-Peucker
    const result = { ...segment };
    
    // For simplicity in this demo, just keep every nth point and endpoints
    const simplifiedWaypoints: Waypoint[] = [];
    const factor = Math.max(2, Math.floor(segment.waypoints.length / 100));
    
    segment.waypoints.forEach((waypoint, index) => {
      if (index === 0 || index === segment.waypoints.length - 1 || index % factor === 0) {
        simplifiedWaypoints.push(waypoint);
      }
    });
    
    result.waypoints = simplifiedWaypoints;
    
    if (onComplete) {
      onComplete(result);
    }
    
    return result;
  }, []);

  // Find the optimal waypoint density based on path characteristics
  const optimizePathDensity = useCallback((
    segment: PathSegment,
    targetDistance: number = 2.0 // meters between points
  ) => {
    if (!segment.waypoints || segment.waypoints.length <= 2) {
      return segment;
    }
    
    // This would implement a more sophisticated algorithm in production
    // For now, we'll just use a simple distance-based approach
    
    const optimizedSegment = { ...segment };
    // Implementation would go here
    
    return optimizedSegment;
  }, []);

  // Add a large set of waypoints efficiently
  const addWaypointsBatch = useCallback((
    segmentId: string,
    newWaypoints: Waypoint[],
    onProgress?: (progress: number) => void
  ) => {
    if (!currentMission) return;
    
    // Find the target segment
    const segmentIndex = currentMission.pathSegments.findIndex(
      segment => segment.id === segmentId
    );
    
    if (segmentIndex === -1) return;
    
    // Create a new segment with the combined waypoints
    const segment = currentMission.pathSegments[segmentIndex];
    const updatedSegment = {
      ...segment,
      waypoints: [...(segment.waypoints || []), ...newWaypoints]
    };
    
    // Create the updated mission with the new segment
    const updatedSegments = [...currentMission.pathSegments];
    updatedSegments[segmentIndex] = updatedSegment;
    
    // Update the mission
    dispatch({
      type: 'SET_MISSION',
      payload: {
        ...currentMission,
        pathSegments: updatedSegments,
        updatedAt: new Date()
      }
    });
  }, [currentMission, dispatch]);

  // Performance monitoring stats
  const performanceStats = useMemo(() => {
    return {
      totalWaypointCount,
      largeSegmentCount: largePathSegments.length,
      memoryEstimate: totalWaypointCount * 0.5, // Rough KB estimate
      isPerformanceCritical: totalWaypointCount > 5000
    };
  }, [totalWaypointCount, largePathSegments.length]);

  return {
    hasPerformanceConcerns,
    largePathSegments,
    totalWaypointCount,
    performanceStats,
    getPathPreviews,
    processLargePathInChunks,
    simplifyPath,
    optimizePathDensity,
    addWaypointsBatch
  };
};

export default useMissionOptimizer; 