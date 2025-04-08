import { useMemo } from 'react';
import { useMission, MissionState } from '../context/MissionContext';
import { metersToFeet } from '../utils/sensorCalculations';
import { formatTimeMMSS } from '../utils/pathUtils';
import { PathSegment } from '../types/mission';

export interface MissionSummary {
  // Mission and hardware basics
  missionName: string;
  missionId: string | null;
  createdAt: string;
  droneName: string;
  cameraName: string;
  lensName: string;
  
  // Mission stats
  pathSegmentCount: number;
  waypointCount: number;
  gcpCount: number;
  
  // Distance and time calculations
  totalDistanceMeters: number;
  totalDistanceFeet: number;
  estimatedFlightTimeSeconds: number;
  estimatedFlightTimeFormatted: string;
  
  // Area information
  missionAreaCount: number;
  
  // Status
  isHardwareConfigured: boolean;
  isSimulationReady: boolean;
}

/**
 * Calculates the distance of a path segment in meters
 */
function calculatePathDistance(segment: PathSegment): number {
  if (!segment.waypoints || segment.waypoints.length < 2) {
    return 0;
  }
  
  let totalDistance = 0;
  for (let i = 1; i < segment.waypoints.length; i++) {
    const prevWaypoint = segment.waypoints[i-1];
    const currentWaypoint = segment.waypoints[i];
    
    // Ensure both waypoints and their local coords exist
    if (!prevWaypoint?.local || !currentWaypoint?.local) {
      continue;
    }
    
    const p1 = prevWaypoint.local;
    const p2 = currentWaypoint.local;
    
    // Calculate 3D distance
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    totalDistance += distance;
  }
  
  return totalDistance;
}

/**
 * Custom hook that provides a summary of the current mission
 */
export function useMissionSummary() {
  const { state } = useMission();
  
  const missionSummary = useMemo<MissionSummary>(() => {
    const mission = state.currentMission;
    const hardware = state.hardware;
    
    if (!mission) {
      return {
        missionName: 'No Mission Selected',
        missionId: null,
        createdAt: '',
        droneName: 'None',
        cameraName: 'None',
        lensName: 'None',
        pathSegmentCount: 0,
        waypointCount: 0,
        gcpCount: 0,
        totalDistanceMeters: 0,
        totalDistanceFeet: 0,
        estimatedFlightTimeSeconds: 0,
        estimatedFlightTimeFormatted: '00:00',
        missionAreaCount: 0,
        isHardwareConfigured: false,
        isSimulationReady: false
      };
    }
    
    // Calculate total waypoints
    const waypointCount = mission.pathSegments.reduce(
      (total, segment) => total + (segment.waypoints?.length || 0), 
      0
    );
    
    // Calculate total distance
    let totalDistanceMeters = 0;
    for (const segment of mission.pathSegments) {
      totalDistanceMeters += calculatePathDistance(segment);
    }
    
    // Estimate flight time based on default speed
    const defaultSpeed = mission.defaultSpeed || 5; // m/s, default to 5 if not set
    const estimatedFlightTimeSeconds = totalDistanceMeters / defaultSpeed;
    
    // Check if hardware is fully configured
    const isHardwareConfigured = !!(
      hardware && 
      hardware.drone && 
      hardware.camera && 
      hardware.lens
    );
    
    // Check if mission is ready for simulation
    const isSimulationReady = !!(
      mission.pathSegments.length > 0 && 
      waypointCount > 1 &&
      isHardwareConfigured
    );
    
    return {
      missionName: mission.name,
      missionId: mission.id,
      createdAt: mission.createdAt ? new Date(mission.createdAt).toLocaleString() : 'Unknown',
      droneName: hardware?.droneDetails ? `${hardware.droneDetails.brand} ${hardware.droneDetails.name}` : 'Not Selected',
      cameraName: hardware?.cameraDetails ? `${hardware.cameraDetails.brand} ${hardware.cameraDetails.model}` : 'Not Selected',
      lensName: hardware?.lensDetails ? `${hardware.lensDetails.brand} ${hardware.lensDetails.model}` : 'Not Selected',
      pathSegmentCount: mission.pathSegments.length,
      waypointCount,
      gcpCount: mission.gcps?.length || 0,
      totalDistanceMeters,
      totalDistanceFeet: metersToFeet(totalDistanceMeters),
      estimatedFlightTimeSeconds,
      estimatedFlightTimeFormatted: formatTimeMMSS(estimatedFlightTimeSeconds),
      missionAreaCount: state.missionAreas.length,
      isHardwareConfigured,
      isSimulationReady
    };
  }, [state.currentMission, state.hardware, state.missionAreas]);
  
  return missionSummary;
} 