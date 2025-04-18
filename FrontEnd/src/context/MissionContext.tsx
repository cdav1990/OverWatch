import React, { createContext, useContext, useReducer, ReactNode, useEffect, Dispatch, useMemo, useCallback } from 'react';
import { 
  Mission, 
  Waypoint, 
  PathSegment, 
  MissionModel,
  LatLng,
  GCP,
  LocalCoord,
  PathType,
  Region,
  AltitudeReference,
  SafetyParams
} from '../types/mission';
import { generateUUID } from '../utils/coordinateUtils';
import { Camera, Lens, DroneModel, SensorType } from '../types/hardware';
import { AppMode, useAppContext } from './AppContext';
import { getCameraById, getLensById, getCompatibleLenses, getDroneModelById, getLensFStops } from '../utils/hardwareDatabase';
import { calculateSensorDimensions, calculateFOV, feetToMeters } from '../utils/sensorCalculations';
import * as THREE from 'three';
import { SceneSettings, DEFAULT_SCENE_SETTINGS } from '../components/BabylonViewer/types/SceneSettings';
import { latLngToLocal } from '../utils/coordinateUtils';

// Define Hardware State Type
export interface HardwareState {
    drone: string | null; // DroneModel ID
    lidar: string | null; // LiDAR ID (e.g., 'ouster', 'none')
    camera: string | null; // Camera ID
    lens: string | null;   // Lens ID
    sensorType: SensorType | 'All' | null; // Sensor type used for filtering
    fStop: number | null;        // Allow null
    focusDistance: number; // Focus distance in meters
    shutterSpeed: string | null; // e.g., "1/1000", "1/500"
    iso: number | null;        // e.g., 100, 200, 400
    gimbalPitch?: number; // Add gimbal pitch (degrees)
    // Store detailed objects for easier access in components
    droneDetails: DroneModel | null;
    cameraDetails: Camera | null;
    lensDetails: Lens | null;
    // Calculated FOV (example - store as needed)
    calculatedFov?: number; // Optional calculated FOV number
    availableFStops: number[]; // Available f-stops for the selected lens
}

// Define Scene Object Type
export interface SceneObject {
    id: string;
    type: 'box' | 'model' | 'area' | 'ship' | 'dock'; // Add 'dock' type
    class?: 'obstacle' | 'neutral' | 'asset'; // ADDED: Object classification
    width?: number;   // Optional, might not apply to all types
    length?: number;  // Optional
    height?: number;  // Optional
    color?: string;   // Optional
    position: LocalCoord;
    rotation?: LocalCoord; // Optional rotation
    scale?: { x: number; y: number; z: number }; // Scale factor for imported models
    url?: string;     // For models
    points?: LocalCoord[]; // For polygons/areas
    realWorldLength?: number; // For accurate scaling of models (in feet)
    heightOffset?: number; // Height offset in feet (-50 to +50)
    createdAt: string;
    source: string; // Where it originated (e.g., 'build-scene-ui', 'import')
}

// Interface for selected face information
export interface SelectedFaceInfo {
  objectId: string;
  faceId: string;
  faceIndex: number;
  normal: { x: number; y: number; z: number };
  vertices: { x: number; y: number; z: number }[];
  area: number;
}

// Interface for mission area definition
export interface MissionArea {
  id: string;
  name: string;
  objectId: string;
  faceId: string;
  area: number;                    // Area in square meters
  vertices: THREE.Vector3[];       // Original face vertices
  offsetVertices: THREE.Vector3[]; // Vertices offset from the face by 5'
  normal: THREE.Vector3;           // Face normal vector
  color: string;                   // Color for visualization
  createdAt: string;
}

// NEW: Real-time Drone Telemetry
export interface RealtimeTelemetry {
    timestamp: number; // UNIX timestamp ms
    position?: LocalCoord; // Live local position
    gps?: { lat: number; lon: number; alt: number }; // Live global position
    attitude?: { roll: number; pitch: number; yaw: number }; // radians
    velocity?: { vx: number; vy: number; vz: number }; // m/s in local frame
    battery?: { voltage: number; remainingPercent: number };
    gpsFixType?: number; // e.g., 0: No Fix, 3: 3D Fix, 4: DGPS, 5: RTK Float, 6: RTK Fixed
    numSatellites?: number;
    flightMode?: string; // e.g., "POSITION", "MISSION", "RTL"
    armed?: boolean;
    heading?: number; // degrees, 0-360
    groundSpeed?: number; // m/s
    climbRate?: number; // m/s
}

// NEW: Live Sensor Status
export interface LiveSensorStatus {
    camera: {
        id: string; // Identifier for the camera (e.g., 'phaseone', 'sony-ilx')
        connected: boolean;
        recording?: boolean;
        storageRemaining?: number; // e.g., photos or GB
        lastCaptureTime?: number;
        statusText?: string; // e.g., "Ready", "Error", "Capturing"
        livePreviewUrl?: string; // Optional URL to an MJPEG/WebRTC stream
    };
    lidar: {
        id: string; // Identifier (e.g., 'ouster-os0')
        connected: boolean;
        scanning?: boolean;
        pointsPerSecond?: number;
        statusText?: string;
        // Note: Avoid storing dense point clouds directly in React state.
        // The backend should process/visualize, or send minimal data.
    };
    // Add other sensors as needed (e.g., secondary cameras)
}

// NEW: Mission Execution Status
export interface MissionExecutionStatus {
    state: 'idle' | 'connecting' | 'uploading' | 'arming' | 'taking_off' | 'running' | 'paused' | 'returning' | 'landing' | 'error' | 'disconnected';
    currentWaypointIndex: number | null; // Index of the waypoint the drone is *currently flying towards*
    currentSegmentId: string | null;
    lastError?: string;
    totalDistanceCovered: number; // meters
    estimatedTimeRemaining: number; // seconds
    connectionOk: boolean; // Overall connection health to drone/backend ROS bridge
    rosBridgeConnected: boolean; // Specific status of websocket connection
}

// Define action types
type MissionAction = 
  | { type: 'SET_MISSION'; payload: Mission }
  | { type: 'CREATE_MISSION'; payload: { name: string; region: Region } }
  | { type: 'SET_MISSIONS'; payload: Mission[] }
  | { type: 'SET_ACTIVE_MISSION'; payload: string }
  | { type: 'SELECT_WAYPOINT'; payload: Waypoint | null }
  | { type: 'SELECT_PATH_SEGMENT'; payload: PathSegment | null }
  | { type: 'ADD_WAYPOINT'; payload: Waypoint }
  | { type: 'UPDATE_WAYPOINT'; payload: Waypoint }
  | { type: 'DELETE_WAYPOINT'; payload: string }
  | { type: 'ADD_PATH_SEGMENT'; payload: PathSegment }
  | { type: 'UPDATE_PATH_SEGMENT'; payload: PathSegment }
  | { type: 'DELETE_PATH_SEGMENT'; payload: string }
  | { type: 'ADD_GCP'; payload: GCP }
  | { type: 'UPDATE_GCP'; payload: GCP }
  | { type: 'DELETE_GCP'; payload: string }
  | { type: 'ADD_MODEL'; payload: MissionModel }
  | { type: 'UPDATE_MODEL'; payload: MissionModel }
  | { type: 'DELETE_MODEL'; payload: string }
  | { type: 'SET_VIEW_MODE'; payload: 'CESIUM' | 'LOCAL_3D' }
  | { type: 'START_SIMULATION' }
  | { type: 'STOP_SIMULATION' }
  | { type: 'SET_SIMULATION_TIME'; payload: number }
  | { type: 'SET_SIMULATION_SPEED'; payload: number }
  | { type: 'SET_LIVE_MODE'; payload: boolean }
  | { type: 'SET_EDITING'; payload: boolean }
  | { type: 'SET_SELECTED_POINT'; payload: LatLng | null }
  | { type: 'SET_TEMP_REGION'; payload: { rectangle: any; area: { width: number; height: number; area: number } } | null }
  | { type: 'SET_REGION_NAME'; payload: string }
  | { type: 'SET_TAKEOFF_POINT'; payload: LocalCoord | null }
  | { type: 'SET_SAFETY_PARAMS'; payload: Partial<SafetyParams> }
  | { 
      type: 'SET_SIMULATION_PROGRESS'; 
      payload: { 
        segmentId: string | null; 
        waypointIndex: number; 
        totalWaypoints: number; 
      } 
    }
  // Actions for polygon drawing
  | { type: 'START_POLYGON_DRAWING' }
  | { type: 'ADD_POLYGON_POINT'; payload: LocalCoord }
  | { type: 'UPDATE_POLYGON_PREVIEW_POINT'; payload: LocalCoord | null }
  | { type: 'COMPLETE_POLYGON_DRAWING' }
  | { type: 'CANCEL_POLYGON_DRAWING' }
  // Actions for takeoff point selection
  | { type: 'START_SELECTING_TAKEOFF_POINT' }
  | { type: 'FINISH_SELECTING_TAKEOFF_POINT' }
  | { type: 'TOGGLE_DRONE_VISIBILITY' }
  | { type: 'TOGGLE_CAMERA_FRUSTUM_VISIBILITY' }
  | { type: 'TOGGLE_GCP_VISIBILITY'; payload: string }
  | { type: 'SET_ACTIVE_CONTROL_PANE'; payload: 'pre-checks' | 'build-scene' | 'mission-planning' | 'live-operation' | 'hardware' }
  | { type: 'UPDATE_SCENE_SETTINGS'; payload: Partial<SceneSettings> }
  | { type: 'SET_HARDWARE'; payload: Partial<HardwareState> }
  | { type: 'UPDATE_HARDWARE_FIELD'; payload: { field: keyof HardwareState; value: any } }
  | { type: 'ADD_SCENE_OBJECT'; payload: SceneObject }
  | { type: 'REMOVE_SCENE_OBJECT'; payload: string }
  | { type: 'UPDATE_SCENE_OBJECT'; payload: Partial<SceneObject> & { id: string } }
  | { type: 'LOAD_MISSION'; payload: any }
  | { type: 'SET_EDITING_SCENE_OBJECT_ID'; payload: string | null }
  | { type: 'SET_SELECTED_FACE'; payload: SelectedFaceInfo | null }
  | { type: 'TOGGLE_FACE_SELECTION_MODE'; payload: boolean }
  // Actions for mission areas
  | { type: 'ADD_MISSION_AREA'; payload: MissionArea }
  | { type: 'REMOVE_MISSION_AREA'; payload: string }
  | { type: 'UPDATE_MISSION_AREA'; payload: Partial<MissionArea> & { id: string } }
  | { type: 'TOGGLE_PATH_SEGMENT_SELECTION'; payload: string }
  | { type: 'SET_TRANSFORM_OBJECT_ID'; payload: string | null }
  // --- NEW ROS/Live Actions ---
  | { type: 'UPDATE_TELEMETRY'; payload: RealtimeTelemetry }
  | { type: 'UPDATE_SENSOR_STATUS'; payload: Partial<LiveSensorStatus> } // Allow partial updates for specific sensors
  | { type: 'UPDATE_EXECUTION_STATUS'; payload: Partial<MissionExecutionStatus> }
  | { type: 'SET_ROSBRIDGE_CONNECTION'; payload: { connected: boolean } }
  | { type: 'LOAD_OPERATIONAL_DEFAULTS'; payload: { profile: string } } // e.g., profile: 'alta-x-p1-os0'
  | { type: 'SET_HEAVY_OPERATION'; payload: boolean }
  | { type: 'START_HEAVY_OPERATION' }
  | { type: 'END_HEAVY_OPERATION' }
  | { type: 'MOVE_SCENE_OBJECT'; payload: { type: string; position: LocalCoord; heightOffset?: number } }

// Update the MissionState interface
export interface MissionState {
  missions: Mission[]; // Array to hold all missions
  currentMission: Mission | null; // The currently active/selected mission
  selectedPathSegmentIds: string[]; // IDs of segments selected for viewing/simulation
  selectedWaypoint: Waypoint | null;
  selectedPathSegment: PathSegment | null;
  models: MissionModel[];
  isSimulating: boolean;
  simulationTime: number;
  simulationSpeed: number;
  simulationProgress: {
    currentSegmentId: string | null;
    currentWaypointIndex: number; // Index the drone is heading TOWARDS
    totalWaypointsInSegment: number;
  };
  isLive: boolean;
  viewMode: 'CESIUM' | 'LOCAL_3D';
  isEditing: boolean;
  isPerformingHeavyOperation: boolean; // Flag for heavy computational operations
  // GEO page persistence
  selectedPoint: LatLng | null;
  tempRegion: {
    rectangle: any;
    area: {
      width: number;
      height: number;
      area: number;
    };
  } | null;
  regionName: string;
  // State for interactive drawing
  drawingMode: 'polygon' | null;
  polygonPoints: LocalCoord[];
  polygonPreviewPoint: LocalCoord | null;
  activeControlPane: 'pre-checks' | 'build-scene' | 'mission-planning' | 'live-operation' | 'hardware';
  isSelectingTakeoffPoint: boolean; // Added state for selection mode
  isDroneVisible: boolean; // <-- Add drone visibility state
  isCameraFrustumVisible: boolean; // <-- Add camera visibility state
  hiddenGcpIds: string[]; // <-- Add hidden GCP IDs state
  sceneSettings: SceneSettings; // <-- Add scene settings state
  hardware: HardwareState | null; // <-- Add hardware state
  sceneObjects: SceneObject[]; // <-- Add scene objects array
  editingSceneObjectId: string | null;
  selectedFace: SelectedFaceInfo | null;
  isFaceSelectionModeActive: boolean;
  missionAreas: MissionArea[]; // NEW: Track mission areas created from faces
  transformObjectId: string | null;

  // --- NEW SECTIONS for Live Operations ---
  realtimeTelemetry: RealtimeTelemetry | null;
  liveSensorStatus: LiveSensorStatus | null; // Will hold status for multiple sensors
  missionExecutionStatus: MissionExecutionStatus | null;
  // --- End NEW SECTIONS ---
}

// --- >>> DEV MODE: Default Mission Data <<< ---
const DEV_TAKEOFF_POINT: LocalCoord = { x: -287, y: 347, z: 12 }; // New point based on screenshot
const GCP_SIDE_LENGTH_METERS = feetToMeters(20); // 20 feet in meters

// Create default GCPs centered around the takeoff point
const createDefaultDevGcps = (center: LocalCoord, sideLength: number): GCP[] => {
    const gcps: GCP[] = [
        // GCP-A: At the takeoff point (center)
        {
            id: generateUUID(),
            name: 'GCP-A',
            lat: 0, lng: 0, altitude: 0, 
            local: { x: center.x, y: center.y, z: center.z }, // Positioned at takeoff height
            color: '#ff0000', // Red for center
            size: 1.5,
        },
        // GCP-B: East of GCP-A (along positive X axis relative to A)
        {
            id: generateUUID(),
            name: 'GCP-B',
            lat: 0, lng: 0, altitude: 0, 
            local: { x: center.x + sideLength, y: center.y, z: center.z }, 
            color: '#00ff00',
            size: 1,
        },
        // GCP-C: North of GCP-A (along positive Y axis relative to A)
        {
            id: generateUUID(),
            name: 'GCP-C',
            lat: 0, lng: 0, altitude: 0, 
            local: { x: center.x, y: center.y + sideLength, z: center.z }, 
            color: '#00ff00',
            size: 1,
        },
    ];
    return gcps;
};

const DEFAULT_DEV_GCPS = createDefaultDevGcps(DEV_TAKEOFF_POINT, GCP_SIDE_LENGTH_METERS);

// --- Re-add DEFAULT_DEV_HARDWARE ---
const DEFAULT_DEV_HARDWARE: HardwareState = {
    drone: 'freefly-alta-x',
    lidar: 'ouster', // Or 'none' if applicable
    camera: 'phase-one-ixm-100',
    lens: 'phaseone-rsm-80mm',
    sensorType: 'Medium Format', // Or deduced from camera
    fStop: 5.6, // Or lowest available from lens
    focusDistance: 30, // meters (~100 ft)
    shutterSpeed: '1/1000', 
    iso: 100,
    droneDetails: null,
    cameraDetails: null,
    lensDetails: null,
    availableFStops: [],
    calculatedFov: undefined,
};
// --- End Re-add ---

const DEFAULT_DEV_REGION: Region = {
    id: 'dev-region-01',
    name: 'Dev Test Area (SF)',
    center: { latitude: 37.7749, longitude: -122.4194 }, // San Francisco approx center
    bounds: { // <-- Added bounds property
        north: 37.8, 
        south: 37.7,
        east: -122.4,
        west: -122.5 
    }
};

// Default Dev mission
const DEFAULT_DEV_MISSION: Mission = {
    id: 'dev-mission-001',
    name: 'Default Dev Mission',
    region: DEFAULT_DEV_REGION,
    pathSegments: [], // Start empty
    gcps: DEFAULT_DEV_GCPS, // Use the dynamically created GCPs
    defaultAltitude: 30,
    defaultSpeed: 5,
    takeoffPoint: null, // Start with no takeoff point - user will select it manually
    safetyParams: {
        rtlAltitude: 50,
        climbSpeed: 2.5,
        failsafeAction: 'RTL',
        missionEndAction: 'RTL',
        climbToAltitude: 40 // Add default value (e.g., 40m AGL)
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    localOrigin: DEFAULT_DEV_REGION.center, // Crucial: Set localOrigin
};
// --- >>> END DEV MODE <<< ---

const DEFAULT_FOCUS_DISTANCE_FT = 20; // Added default constant

const initialState: MissionState = {
  missions: [DEFAULT_DEV_MISSION], // Initialize with the default mission
  currentMission: DEFAULT_DEV_MISSION, // Start with the default mission active
  selectedPathSegmentIds: [], // Initialize as empty
  selectedWaypoint: null,
  selectedPathSegment: null,
  models: [],
  isSimulating: false,
  simulationTime: 0,
  simulationSpeed: 1,
  simulationProgress: {
    currentSegmentId: null,
    currentWaypointIndex: 0,
    totalWaypointsInSegment: 0,
  },
  isLive: false,
  viewMode: 'LOCAL_3D',
  isEditing: false,
  isPerformingHeavyOperation: false, // Initialize as false
  selectedPoint: null,
  tempRegion: null,
  regionName: '',
  drawingMode: null,
  polygonPoints: [],
  polygonPreviewPoint: null,
  activeControlPane: 'pre-checks', // Changed from 'hardware' to 'pre-checks' to make it the default first step
  isSelectingTakeoffPoint: false,
  isDroneVisible: true, 
  isCameraFrustumVisible: false,
  hiddenGcpIds: [],
  sceneSettings: DEFAULT_SCENE_SETTINGS, // Initialize with default scene settings
  hardware: null, // Initialize hardware as null
  sceneObjects: [],
  editingSceneObjectId: null,
  selectedFace: null,
  isFaceSelectionModeActive: false,
  missionAreas: [],
  transformObjectId: null,

  // --- Initialize NEW SECTIONS ---
  realtimeTelemetry: null,
  liveSensorStatus: {
      // Default structure assumes one primary camera and lidar initially
      // These IDs should match what the backend ROS nodes use
      camera: { id: 'primary_camera', connected: false },
      lidar: { id: 'primary_lidar', connected: false }
      // Add placeholders if more sensors are standard
  },
  missionExecutionStatus: {
      state: 'disconnected', // Start as disconnected
      currentWaypointIndex: null,
      currentSegmentId: null,
      lastError: undefined,
      totalDistanceCovered: 0,
      estimatedTimeRemaining: 0,
      connectionOk: false, // Assume backend connection is down initially
      rosBridgeConnected: false, // Assume websocket is down initially
  },
  // --- End Initialize NEW SECTIONS ---
};

// Create the reducer
function missionReducer(state: MissionState, action: MissionAction): MissionState {
  // Safely log payload only if it exists
  console.log(
    '[MissionReducer] Action:', 
    action.type, 
    ('payload' in action ? action.payload : '(no payload)')
  );

  // Helper to update both currentMission and the missions array
  const updateMissionState = (updatedMission: Mission | null): Partial<MissionState> => {
    if (!updatedMission) {
      return { currentMission: null }; // Handle case where mission becomes null
    }
    // Update the mission in the missions array using ID
    const newMissions = state.missions.map(m => 
      m.id === updatedMission.id ? updatedMission : m // Use ID
    );
    return { currentMission: updatedMission, missions: newMissions };
  };

  switch (action.type) {
    case 'SET_MISSION':
      return {
        ...state,
        currentMission: action.payload,
        selectedWaypoint: null,
        selectedPathSegment: null,
        // Clear Geo page temp state when a mission is explicitly set/loaded
        selectedPoint: null, 
        tempRegion: null,
        regionName: 'New Mission Area',
      };
    
    case 'CREATE_MISSION': {
      const { name, region } = action.payload;
      const now = new Date();
      
      // Default takeoff point if no point is selected
      let newMissionTakeoffPoint: LocalCoord = { x: 0, y: 0, z: 0 }; 
      
      // Use selectedPoint if available to set takeoff position
      if (state.selectedPoint) {
        console.log("[MissionReducer] Using selected point for takeoff location:", state.selectedPoint);
        
        // If we have localOrigin from the region center, convert LatLng to local coordinates
        if (region.center) {
          try {
            // Use region center as reference origin for local coordinate system
            newMissionTakeoffPoint = latLngToLocal(state.selectedPoint, region.center);
            
            // Start with a default altitude of 0 (ground level)
            newMissionTakeoffPoint.z = 0;
            
            console.log("[MissionReducer] Converted selected point to local coordinates:", newMissionTakeoffPoint);
          } catch (err) {
            console.error("[MissionReducer] Error converting selected point to local coordinates:", err);
          }
        }
      }

      // Create GCPs using the takeoff point as the center
      const newMissionGcps = createDefaultDevGcps(newMissionTakeoffPoint, GCP_SIDE_LENGTH_METERS); 
      
      // If we have a selected point with lat/lng, update the lat/lng values for the GCPs
      if (state.selectedPoint && region.center) {
        // Update the first GCP (GCP-A at takeoff point) with the actual lat/lng
        if (newMissionGcps.length > 0) {
          newMissionGcps[0].lat = state.selectedPoint.latitude;
          newMissionGcps[0].lng = state.selectedPoint.longitude;
          
          // Calculate lat/lng for other GCPs if needed
          // This could be enhanced to calculate proper lat/lng for all GCPs
          // based on their local coordinate offsets
        }
      }

      const newMission: Mission = {
        id: generateUUID(),
        name: name || 'New Mission',
        region: region,
        pathSegments: [],
        gcps: newMissionGcps,
        defaultAltitude: 50, 
        defaultSpeed: 5, 
        createdAt: now,
        updatedAt: now,
        localOrigin: region.center,
        takeoffPoint: newMissionTakeoffPoint,
        safetyParams: {
          rtlAltitude: 50, 
          climbSpeed: 2.5, 
          failsafeAction: 'RTL',
          missionEndAction: 'RTL',
          climbToAltitude: 40
        }
      };
      
      // Add the first GCP to the missions array
      console.log(`[MissionReducer] Created mission "${newMission.name}" with takeoff at (${newMissionTakeoffPoint.x}, ${newMissionTakeoffPoint.y}, ${newMissionTakeoffPoint.z}) and ${newMissionGcps.length} GCPs`);
      
      const nextState: MissionState = {
        ...state,
        currentMission: newMission,
        viewMode: 'LOCAL_3D' as const,
        // Clear Geo page temp state now that mission is created
        selectedPoint: null, 
        tempRegion: null,
        regionName: 'New Mission Area',
      };
      return nextState;
    }
    
    case 'SET_MISSIONS': // Action to load/replace all missions
        // Use ID for comparison
        const currentStillExists = state.currentMission && action.payload.some(m => m.id === state.currentMission!.id);
        const newCurrent = currentStillExists ? state.currentMission : (action.payload.length > 0 ? action.payload[0] : null);
        return { ...state, missions: action.payload, currentMission: newCurrent };

    case 'SET_ACTIVE_MISSION': { // Handle selecting an active mission using ID
        const newActiveMission = state.missions.find(m => m.id === action.payload);
        if (newActiveMission) {
            // Reset selected segments when changing missions
            return { 
              ...state, 
              currentMission: newActiveMission, 
              selectedPathSegmentIds: [], // Reset selection
              selectedWaypoint: null, // Also reset waypoint/segment selection state
              selectedPathSegment: null, 
            };
        }
        return state; // If ID not found, return current state
    }
    
    case 'SELECT_WAYPOINT':
      return {
        ...state,
        selectedWaypoint: action.payload,
        selectedPathSegment: null // Deselect path segment
      };
    
    case 'SELECT_PATH_SEGMENT':
      return {
        ...state,
        selectedPathSegment: action.payload,
        selectedWaypoint: null // Deselect waypoint
      };
    
    case 'ADD_WAYPOINT': {
      if (!state.currentMission) return state;
      
      // Add waypoint to the current path segment if one is selected
      if (state.selectedPathSegment) {
        const updatedSegments = state.currentMission.pathSegments.map(segment => {
          if (segment.id === state.selectedPathSegment?.id) {
            return {
              ...segment,
              waypoints: [...segment.waypoints, action.payload]
            };
          }
          return segment;
        });
        
        return {
          ...state,
          currentMission: {
            ...state.currentMission,
            pathSegments: updatedSegments,
            updatedAt: new Date()
          },
          selectedWaypoint: action.payload
        };
      }
      
      // If no path segment is selected, create a new one
      const newSegment: PathSegment = {
        id: generateUUID(),
        type: PathType.STRAIGHT,
        waypoints: [action.payload],
        speed: state.currentMission.defaultSpeed
      };
      
      return {
        ...state,
        currentMission: {
          ...state.currentMission,
          pathSegments: [...state.currentMission.pathSegments, newSegment],
          updatedAt: new Date()
        },
        selectedWaypoint: action.payload,
        selectedPathSegment: newSegment
      };
    }
    
    case 'UPDATE_WAYPOINT': {
      if (!state.currentMission) return state;
      
      const updatedSegments = state.currentMission.pathSegments.map(segment => {
        const waypointIndex = segment.waypoints.findIndex(wp => wp.id === action.payload.id);
        if (waypointIndex >= 0) {
          const updatedWaypoints = [...segment.waypoints];
          updatedWaypoints[waypointIndex] = action.payload;
          return {
            ...segment,
            waypoints: updatedWaypoints
          };
        }
        return segment;
      });
      
      return {
        ...state,
        currentMission: {
          ...state.currentMission,
          pathSegments: updatedSegments,
          updatedAt: new Date()
        },
        selectedWaypoint: action.payload
      };
    }
    
    case 'DELETE_WAYPOINT': {
      if (!state.currentMission) return state;
      
      // Find and remove the waypoint
      const updatedSegments = state.currentMission.pathSegments.map(segment => {
        const waypointIndex = segment.waypoints.findIndex(wp => wp.id === action.payload);
        if (waypointIndex >= 0) {
          const updatedWaypoints = segment.waypoints.filter(wp => wp.id !== action.payload);
          return {
            ...segment,
            waypoints: updatedWaypoints
          };
        }
        return segment;
      }).filter(segment => segment.waypoints.length > 0); // Remove empty segments
      
      return {
        ...state,
        currentMission: {
          ...state.currentMission,
          pathSegments: updatedSegments,
          updatedAt: new Date()
        },
        selectedWaypoint: null
      };
    }
    
    case 'ADD_PATH_SEGMENT': {
      if (!state.currentMission) return state;
      const newSegment = action.payload;
      const updatedMission = {
        ...state.currentMission,
        pathSegments: [...state.currentMission.pathSegments, newSegment],
        updatedAt: new Date() // Also update mission timestamp
      };
      // Automatically select the new segment for viewing
      const newSelectedIds = [...state.selectedPathSegmentIds, newSegment.id];
      
      return { 
        ...state, 
        ...updateMissionState(updatedMission), // Use helper to update missions array too
        selectedPathSegment: newSegment, // Optionally select the new segment
        selectedPathSegmentIds: newSelectedIds // Add to visible segments
      };
    }
    
    case 'UPDATE_PATH_SEGMENT': {
      if (!state.currentMission) return state;
      
      const updatedSegments = state.currentMission.pathSegments.map(segment => {
        if (segment.id === action.payload.id) {
          return action.payload;
        }
        return segment;
      });
      
      return {
        ...state,
        currentMission: {
          ...state.currentMission,
          pathSegments: updatedSegments,
          updatedAt: new Date()
        },
        selectedPathSegment: action.payload
      };
    }
    
    case 'DELETE_PATH_SEGMENT': {
      if (!state.currentMission) return state;
      const segmentIdToDelete = action.payload;
      const updatedSegments = state.currentMission.pathSegments.filter(seg => seg.id !== segmentIdToDelete);
      const updatedMission = { ...state.currentMission, pathSegments: updatedSegments, updatedAt: new Date() };
      
      // Remove from selection if it was selected
      const newSelectedIds = state.selectedPathSegmentIds.filter(id => id !== segmentIdToDelete);
      
      // If the deleted segment was the *single* selectedPathSegment, deselect it
      const selectedSegmentUpdate = state.selectedPathSegment?.id === segmentIdToDelete ? { selectedPathSegment: null } : {};
      
      return { 
        ...state, 
        ...updateMissionState(updatedMission),
        selectedPathSegmentIds: newSelectedIds, 
        ...selectedSegmentUpdate 
      };
    }
    
    case 'ADD_GCP': {
      if (!state.currentMission) return state;
      
      return {
        ...state,
        currentMission: {
          ...state.currentMission,
          gcps: [...state.currentMission.gcps, action.payload],
          updatedAt: new Date()
        }
      };
    }
    
    case 'UPDATE_GCP': {
      if (!state.currentMission) return state;
      
      const updatedGCPs = state.currentMission.gcps.map(gcp => {
        if (gcp.id === action.payload.id) {
          return action.payload;
        }
        return gcp;
      });
      
      return {
        ...state,
        currentMission: {
          ...state.currentMission,
          gcps: updatedGCPs,
          updatedAt: new Date()
        }
      };
    }
    
    case 'DELETE_GCP': {
      if (!state.currentMission) return state;
      
      const updatedGCPs = state.currentMission.gcps.filter(gcp => gcp.id !== action.payload);
      
      return {
        ...state,
        currentMission: {
          ...state.currentMission,
          gcps: updatedGCPs,
          updatedAt: new Date()
        }
      };
    }
    
    case 'ADD_MODEL': {
      return {
        ...state,
        models: [...state.models, action.payload]
      };
    }
    
    case 'UPDATE_MODEL': {
      const updatedModels = state.models.map(model => {
        if (model.id === action.payload.id) {
          return action.payload;
        }
        return model;
      });
      
      return {
        ...state,
        models: updatedModels
      };
    }
    
    case 'DELETE_MODEL': {
      const updatedModels = state.models.filter(model => model.id !== action.payload);
      
      return {
        ...state,
        models: updatedModels
      };
    }
    
    case 'SET_VIEW_MODE':
      return {
        ...state,
        viewMode: action.payload
      };
    
    case 'START_SIMULATION':
      return { ...state, isSimulating: true };
    
    case 'STOP_SIMULATION':
      return { 
        ...state, 
        isSimulating: false, 
        simulationProgress: {
          currentSegmentId: null,
          currentWaypointIndex: 0,
          totalWaypointsInSegment: 0,
        }
      };
    
    case 'SET_SIMULATION_TIME':
      return {
        ...state,
        simulationTime: action.payload
      };
    
    case 'SET_SIMULATION_SPEED':
      return {
        ...state,
        simulationSpeed: action.payload
      };
    
    case 'SET_LIVE_MODE':
      return {
        ...state,
        isLive: action.payload,
        isSimulating: action.payload ? false : state.isSimulating // Stop simulation if going live
      };
    
    case 'SET_EDITING':
      return {
        ...state,
        isEditing: action.payload
      };
    
    case 'SET_SELECTED_POINT':
      return {
        ...state,
        selectedPoint: action.payload
      };
    
    case 'SET_TEMP_REGION':
      return {
        ...state,
        tempRegion: action.payload
      };
    
    case 'SET_REGION_NAME':
      return {
        ...state,
        regionName: action.payload
      };
    
    case 'SET_SAFETY_PARAMS': {
      if (!state.currentMission) return state;
      // Ensure climbToAltitude is handled if present in payload
      const updatedSafetyParams = {
          ...state.currentMission.safetyParams,
          ...action.payload 
      } as SafetyParams;
      
      // Update the specific mission in the missions array
      const updatedMission = {
        ...state.currentMission,
        safetyParams: updatedSafetyParams,
        updatedAt: new Date()
      };
      
      return { 
        ...state, 
        ...updateMissionState(updatedMission) // Use helper
      };
    }
    
    case 'SET_SIMULATION_PROGRESS':
      return { 
        ...state, 
        simulationProgress: { 
          currentSegmentId: action.payload.segmentId,
          currentWaypointIndex: action.payload.waypointIndex,
          totalWaypointsInSegment: action.payload.totalWaypoints
        } 
      };
      
    // --- Takeoff Point Selection Cases ---
    case 'START_SELECTING_TAKEOFF_POINT':
      console.log("[MissionContext] Starting takeoff point selection");
      return {
        ...state,
        isSelectingTakeoffPoint: true
      };

    case 'SET_TAKEOFF_POINT': { 
      console.log("[MissionContext] Setting takeoff point:", action.payload);
      if (!state.currentMission) return state;
      
      // Get current takeoff point count from mission state
      const hasPreviousTakeoffPoint = state.currentMission.takeoffPoint !== null;
      
      // If this is the first takeoff point (TCL-1), add 16 feet of elevation
      let newTakeoffPoint = action.payload;
      
      if (newTakeoffPoint && !hasPreviousTakeoffPoint) {
        // Add 16 feet (approx 4.8768 meters) to the Z coordinate for TCL-1
        console.log("[MissionContext] This is the first takeoff point (TCL-1), adding 16 feet of elevation");
        newTakeoffPoint = {
          ...newTakeoffPoint,
          z: newTakeoffPoint.z + feetToMeters(16) // Convert 16 feet to meters and add
        };
        
        // Calculate the offset from selected point to origin
        const offsetX = newTakeoffPoint.x;
        const offsetY = newTakeoffPoint.y;
        const offsetZ = newTakeoffPoint.z;
        
        console.log(`[MissionContext] First takeoff point at (${offsetX}, ${offsetY}, ${offsetZ})`);
        console.log(`[MissionContext] Adjusting scene to make TCL-1 the origin (0,0,0)`);
        
        // Reposition all GCPs relative to the new origin
        const updatedGcps = state.currentMission.gcps.map(gcp => ({
          ...gcp,
          local: {
            x: gcp.local.x - offsetX,
            y: gcp.local.y - offsetY,
            z: gcp.local.z - offsetZ
          }
        }));
        
        // Reposition all scene objects relative to the new origin
        const updatedSceneObjects = state.sceneObjects.map(obj => ({
          ...obj,
          position: {
            x: obj.position.x - offsetX,
            y: obj.position.y - offsetY,
            z: obj.position.z - offsetZ
          }
        }));
        
        // Reposition all waypoints in path segments relative to the new origin
        const updatedPathSegments = state.currentMission.pathSegments.map(segment => ({
          ...segment,
          waypoints: segment.waypoints.map(wp => ({
            ...wp,
            local: wp.local ? {
              x: wp.local.x - offsetX,
              y: wp.local.y - offsetY,
              z: wp.local.z - offsetZ
            } : undefined
          }))
        }));
        
        // Reposition all mission areas relative to the new origin
        const updatedMissionAreas = state.missionAreas.map(area => {
          // Update vertices
          const updatedVertices = area.vertices.map(v => 
            new THREE.Vector3(v.x - offsetX, v.y - offsetY, v.z - offsetZ)
          );
          
          // Update offset vertices (always exists in the MissionArea interface)
          const updatedOffsetVertices = area.offsetVertices.map(v => 
            new THREE.Vector3(v.x - offsetX, v.y - offsetY, v.z - offsetZ)
          );
          
          return {
            ...area,
            vertices: updatedVertices,
            offsetVertices: updatedOffsetVertices
          };
        });
        
        // Return updated state with repositioned scene and takeoff at origin
        return {
          ...state,
          isSelectingTakeoffPoint: false, // Exit selection mode
          currentMission: {
            ...state.currentMission,
            takeoffPoint: { x: 0, y: 0, z: 0 }, // TCL-1 becomes (0,0,0)
            gcps: updatedGcps,
            pathSegments: updatedPathSegments,
            updatedAt: new Date(),
          },
          sceneObjects: updatedSceneObjects,
          missionAreas: updatedMissionAreas
        };
      }
      
      // For subsequent takeoff points (not TCL-1), just set the position without shifting origin
      return {
        ...state,
        isSelectingTakeoffPoint: false, // Exit selection mode
        currentMission: {
          ...state.currentMission,
          takeoffPoint: newTakeoffPoint
        }
      };
    }
    
    // --- Polygon Drawing Cases ---
    case 'START_POLYGON_DRAWING':
      return {
        ...state,
        drawingMode: 'polygon',
        polygonPoints: [], // Clear previous points
        polygonPreviewPoint: null,
        selectedPathSegment: null, // Deselect any active segment
        selectedWaypoint: null,   // Deselect any active waypoint
      };
      
    case 'ADD_POLYGON_POINT': {
      if (state.drawingMode !== 'polygon') return state;
      
      const newPoints = [...state.polygonPoints, action.payload];
      
      // Check for closing the polygon (simple distance check to the start point)
      // Requires at least 3 points to close (start + 2 others + closing point)
      let isClosed = false;
      if (newPoints.length >= 3) {
          const firstPoint = newPoints[0];
          const lastPoint = action.payload;
          const dx = firstPoint.x - lastPoint.x;
          const dy = firstPoint.y - lastPoint.y;
          // Using z=0 for distance check as it's a ground polygon
          const distance = Math.sqrt(dx * dx + dy * dy); 
          
          // Define a threshold for closing (e.g., 5 units, adjust as needed)
          const closingThreshold = 5; 
          if (distance < closingThreshold) {
              isClosed = true;
          }
      }

      if (isClosed) {
          // Trigger completion logic (handled by COMPLETE_POLYGON_DRAWING)
          return {
              ...state,
              polygonPoints: newPoints,
          };
      } else {
          // Continue drawing
          return {
              ...state,
              polygonPoints: newPoints,
          };
      }
    }
      
    case 'UPDATE_POLYGON_PREVIEW_POINT':
      if (state.drawingMode !== 'polygon') return state;
      return {
        ...state,
        polygonPreviewPoint: action.payload,
      };
      
    case 'COMPLETE_POLYGON_DRAWING': {
      if (state.drawingMode !== 'polygon' || state.polygonPoints.length < 3 || !state.currentMission) {
        return {
          ...state,
          drawingMode: null, // Exit drawing mode even if failed
          polygonPoints: [],
          polygonPreviewPoint: null,
        };
      }
      
      // Create Waypoints from LocalCoords (polygons usually don't need altitude/camera details like flight paths)
      const polygonWaypoints: Waypoint[] = state.polygonPoints.map((p, index) => ({
        id: generateUUID(),
        lat: 0, // Global coords would need calculation if needed later
        lng: 0,
        altitude: 0, // Polygon on the ground
        altReference: AltitudeReference.RELATIVE, // Or TERRAIN if applicable
        local: p,
        camera: { fov: 0, aspectRatio: 1, near: 0, far: 0, heading: 0, pitch: 0 }, // Dummy camera
        // No speed, hold time etc. for polygon definition points usually
      }));
      
      // Ensure the polygon is explicitly closed by adding the first point to the end if not already there
      if (polygonWaypoints.length > 0) {
          const firstWp = polygonWaypoints[0];
          const lastWp = polygonWaypoints[polygonWaypoints.length - 1];
          if (firstWp.id !== lastWp.id) { // Check if already closed implicitly by clicking start
             // Create a new waypoint object referencing the first point's local coords
             polygonWaypoints.push({ ...firstWp, id: generateUUID(), local: firstWp.local }); 
          }
      }

      const newPolygonSegment: PathSegment = {
        id: generateUUID(),
        type: PathType.POLYGON,
        waypoints: polygonWaypoints,
        // Polygon segments typically don't have speed
      };
      
      const updatedSegments = [...state.currentMission.pathSegments, newPolygonSegment];
      
      return {
        ...state,
        currentMission: {
          ...state.currentMission,
          pathSegments: updatedSegments,
          updatedAt: new Date(),
        },
        drawingMode: null, // Exit drawing mode
        polygonPoints: [],
        polygonPreviewPoint: null,
        selectedPathSegment: newPolygonSegment, // Select the newly created polygon
      };
    }
      
    case 'CANCEL_POLYGON_DRAWING':
      return {
        ...state,
        drawingMode: null,
        polygonPoints: [],
        polygonPreviewPoint: null,
      };
    
    case 'SET_ACTIVE_CONTROL_PANE':
      // Ensure payload is one of the allowed types
      const validPanes: MissionState['activeControlPane'][] = ['pre-checks', 'build-scene', 'mission-planning', 'live-operation', 'hardware'];
      if (validPanes.includes(action.payload as any)) {
        return {
          ...state,
          activeControlPane: action.payload as MissionState['activeControlPane'],
        };
      }
      console.warn(`Invalid control pane value: ${action.payload}`);
      return state;
    
    // --- Drone Visibility --- 
    case 'TOGGLE_DRONE_VISIBILITY':
      return {
        ...state,
        isDroneVisible: !state.isDroneVisible,
      };

    // --- Camera Frustum Visibility --- 
    case 'TOGGLE_CAMERA_FRUSTUM_VISIBILITY':
      return {
        ...state,
        isCameraFrustumVisible: !state.isCameraFrustumVisible,
      };

    // --- GCP Visibility --- 
    case 'TOGGLE_GCP_VISIBILITY': {
      const gcpId = action.payload;
      const currentlyHidden = state.hiddenGcpIds.includes(gcpId);
      const nextHiddenGcpIds = currentlyHidden
        ? state.hiddenGcpIds.filter(id => id !== gcpId) // Remove ID -> Show
        : [...state.hiddenGcpIds, gcpId]; // Add ID -> Hide
      return {
        ...state,
        hiddenGcpIds: nextHiddenGcpIds,
      };
    }
    
    // --- Scene Settings --- 
    case 'UPDATE_SCENE_SETTINGS': {
        const validatedPayload: Partial<SceneSettings> = {};
        for (const key in action.payload) {
            const field = key as keyof SceneSettings;
            const value = (action.payload as any)[field];

            switch (field) {
                // Numbers (Sliders / Numeric Inputs)
                case 'gridSize':
                case 'gridDivisions':
                case 'gridMajorLineInterval':
                case 'fov':
                case 'gridFadeDistance':
                case 'waterWaveSpeed':
                case 'waterWaveScale':
                case 'groundOpacity':
                case 'waterOpacity':
                case 'ambientLightIntensity':
                case 'directionalLightIntensity':
                case 'environmentIntensity':
                    const numValue = Number(value);
                    // Use current state value as fallback if conversion fails
                    validatedPayload[field] = !isNaN(numValue) ? numValue : state.sceneSettings[field]; 
                    break;
                
                // Colors (Strings)
                case 'backgroundColor':
                case 'gridColorCenterLine':
                case 'gridColorGrid':
                case 'gridMinorColor':
                case 'gridMajorColor':
                case 'waterColor':
                     // Basic hex validation (starts with #, 3/4/6/8 hex chars)
                    if (typeof value === 'string' && /^#[0-9A-Fa-f]{3,8}$/.test(value)) {
                        validatedPayload[field] = value;
                    } else {
                        console.warn(`[MissionReducer] Invalid color value for ${field}: ${value}. Keeping existing.`);
                        validatedPayload[field] = state.sceneSettings[field]; // Keep old if invalid
                    }
                    break;
                
                // Booleans (Switches / Checkboxes)
                case 'gridVisible':
                case 'gridAutoScale':
                case 'gridShowUnderWater':
                case 'gridEnhancedVisibility':
                case 'axesVisible':
                case 'hideGroundPlane':
                case 'showBelowGround':
                case 'waterEnabled':
                case 'cameraDamping':
                case 'cameraInvertY':
                case 'skyEnabled':
                case 'shadowsEnabled':
                    validatedPayload[field] = Boolean(value);
                    break;
                
                // Specific Types
                case 'gridUnit':
                    if (value === 'meters' || value === 'feet') {
                        validatedPayload[field] = value;
                    } else {
                         validatedPayload[field] = state.sceneSettings[field];
                    }
                    break;
                case 'sunPosition':
                    // Ensure it's an array of 3 numbers
                    if (Array.isArray(value) && value.length === 3 && value.every(v => typeof v === 'number')) {
                         validatedPayload[field] = value as [number, number, number];
                    } else {
                         validatedPayload[field] = state.sceneSettings[field]; // Keep old if invalid
                    }
                    break;

                // NEW: Handle Environment Map settings
                case 'environmentMap':
                    // Allow setting to null or a string value
                    validatedPayload[field] = typeof value === 'string' || value === null ? value : state.sceneSettings[field];
                    break;

                // Ignore any unexpected fields silently
                default:
                    console.warn(`[MissionReducer] Ignoring unexpected field in UPDATE_SCENE_SETTINGS: ${field}`);
                    break;
            }
        }
        
        // Only update state if there are valid changes
        if (Object.keys(validatedPayload).length > 0) {
          console.log("[MissionReducer] Applying validated scene settings update:", validatedPayload);
          return {
              ...state,
              sceneSettings: { ...state.sceneSettings, ...validatedPayload },
          };
        } else {
          console.log("[MissionReducer] No valid scene settings changes detected in payload.");
          return state; // No valid changes, return current state
        }
    }
    
    case 'SET_HARDWARE': {
      console.log("[MissionContext] Reducer: SET_HARDWARE - Payload:", action.payload);
      // Provide a default structure if state.hardware is null
      const currentHardware: Partial<HardwareState> = state.hardware ?? { 
        drone: null, lidar: null, camera: null, lens: null, 
        sensorType: null, fStop: null, focusDistance: feetToMeters(DEFAULT_FOCUS_DISTANCE_FT), // Default focus distance
        shutterSpeed: null, iso: null, droneDetails: null, 
        cameraDetails: null, lensDetails: null, availableFStops: [] 
      };
      const newPartialHardware = action.payload;

      let updatedHardware: Partial<HardwareState> = { 
        ...currentHardware, 
        ...newPartialHardware 
      };

      // If camera ID changed or doesn't exist, fetch details
      if (newPartialHardware.camera !== undefined || !updatedHardware.cameraDetails) {
          const camId = updatedHardware.camera;
          updatedHardware.cameraDetails = camId ? getCameraById(camId) : null;
          console.log(`[MissionContext] Reducer: SET_HARDWARE - Fetched Camera Details for ID ${camId}:`, updatedHardware.cameraDetails);
          // FIX: Only reset lens if camera ID changes *and* there was a previous camera ID
          if (currentHardware.camera && currentHardware.camera !== updatedHardware.camera) { 
              console.log(`[MissionContext] Reducer: SET_HARDWARE - Camera changed from ${currentHardware.camera} to ${updatedHardware.camera}. Resetting lens.`);
              updatedHardware.lens = null;
              updatedHardware.lensDetails = null;
              updatedHardware.fStop = null;
              updatedHardware.availableFStops = [];
          }
      }

      // If lens ID changed or doesn't exist (and camera exists), fetch details
      if ((newPartialHardware.lens !== undefined || !updatedHardware.lensDetails) && updatedHardware.cameraDetails) {
          const lensId = updatedHardware.lens;
          updatedHardware.lensDetails = lensId ? (getLensById(lensId) ?? null) : null;
          console.log(`[MissionContext] Reducer: SET_HARDWARE - Fetched Lens Details for ID ${lensId}:`, updatedHardware.lensDetails);

          // FIX: Only update f-stop defaults if lens *actually* changed from a previous lens, or if fStop is missing
          const lensDidChange = currentHardware.lens !== updatedHardware.lens;
          const fStopIsMissing = !updatedHardware.fStop;

          if (updatedHardware.lensDetails && (lensDidChange || fStopIsMissing)) {
              console.log(`[MissionContext] Reducer: SET_HARDWARE - Lens changed (${lensDidChange}) or fStop missing (${fStopIsMissing}). Updating f-stops.`);
              try {
                  const fStops = getLensFStops(updatedHardware.lensDetails);
                  updatedHardware.availableFStops = fStops.filter(s => !isNaN(s)).sort((a, b) => a - b);
                  // Set default fStop to lowest available only if fStop is currently missing or lens changed
                  if (updatedHardware.availableFStops.length > 0 && (lensDidChange || fStopIsMissing)) { 
                     updatedHardware.fStop = updatedHardware.availableFStops[0];
                     console.log(`[MissionContext] Reducer: SET_HARDWARE - Setting default fStop: ${updatedHardware.fStop}`);
                  } else if (updatedHardware.availableFStops.length === 0) {
                      updatedHardware.fStop = null; // No valid stops
                  }
              } catch (error) {
                  console.error("Error setting f-stops:", error);
                  updatedHardware.availableFStops = [];
                  updatedHardware.fStop = null;
              }
          } else if (!updatedHardware.lensDetails) {
              // If lens is null, clear f-stops
              updatedHardware.availableFStops = [];
              updatedHardware.fStop = null;
          }
      }
      
      // Ensure focus distance exists, default if necessary
      if (updatedHardware.focusDistance === undefined || updatedHardware.focusDistance === null) {
          updatedHardware.focusDistance = feetToMeters(DEFAULT_FOCUS_DISTANCE_FT); // Default in meters
          console.log(`[MissionContext] Reducer: SET_HARDWARE - Setting default focusDistance: ${updatedHardware.focusDistance}m`);
      }

      // Ensure drone details are populated if ID exists
      if (newPartialHardware.drone !== undefined || !updatedHardware.droneDetails) {
          const droneId = updatedHardware.drone;
          updatedHardware.droneDetails = droneId ? getDroneModelById(droneId) : null;
          console.log(`[MissionContext] Reducer: SET_HARDWARE - Fetched Drone Details for ID ${droneId}:`, updatedHardware.droneDetails);
      }

      console.log("[MissionContext] Reducer: SET_HARDWARE - Final updatedHardware state:", updatedHardware);

      // --- Determine frustum visibility based on updated hardware --- 
      const newFrustumVisibility = !!(updatedHardware.camera && updatedHardware.lens);
      console.log(`[MissionContext] Reducer: SET_HARDWARE - Setting frustum visibility to: ${newFrustumVisibility}`);
      // --- End determination ---

      return { 
        ...state, 
        hardware: updatedHardware as HardwareState, // Assert final type
        isCameraFrustumVisible: newFrustumVisibility // <-- Set visibility state
      };
    }
    
    case 'UPDATE_HARDWARE_FIELD': {
        if (!state.hardware) return state; 

        const { field, value } = action.payload;
        let updatedHardware: HardwareState = { ...state.hardware };
        let recalculateFov = false;

        if (field === 'camera') {
            const newCameraId = value as string | null;
            updatedHardware.camera = newCameraId;
            // Ensure lookup defaults to null
            updatedHardware.cameraDetails = newCameraId ? (getCameraById(newCameraId) ?? null) : null;
            // Reset lens and related params
            updatedHardware.lens = null;
            updatedHardware.lensDetails = null;
            updatedHardware.availableFStops = [];
            updatedHardware.fStop = null;
            updatedHardware.calculatedFov = undefined; // Reset calculated FOV
            recalculateFov = !!(updatedHardware.cameraDetails && updatedHardware.lensDetails);
        } else if (field === 'lens') {
            const newLensId = value as string | null;
            updatedHardware.lens = newLensId;
             // Ensure lookup defaults to null
            updatedHardware.lensDetails = newLensId ? (getLensById(newLensId) ?? null) : null;
            updatedHardware.availableFStops = updatedHardware.lensDetails ? getLensFStops(updatedHardware.lensDetails) : [];
            // Reset fStop if needed
            if (!newLensId || !updatedHardware.availableFStops.includes(updatedHardware.fStop as number)) {
                updatedHardware.fStop = updatedHardware.availableFStops[0] ?? null;
            }
            recalculateFov = !!(updatedHardware.cameraDetails && updatedHardware.lensDetails);
        } else if (field === 'drone') {
            updatedHardware.drone = value as string | null;
             // Ensure lookup defaults to null
            updatedHardware.droneDetails = updatedHardware.drone ? (getDroneModelById(updatedHardware.drone) ?? null) : null;
        } else if (field === 'fStop' || field === 'iso') {
             const numValue = value !== null && value !== '' ? Number(value) : null;
             updatedHardware[field] = numValue;
        } else if (field === 'focusDistance') {
             const numValue = Number(value);
             updatedHardware[field] = isNaN(numValue) ? state.hardware.focusDistance : numValue;
        } else if (field === 'shutterSpeed') {
            updatedHardware[field] = value ? String(value) : null;
        } else {
             if (field in updatedHardware) {
                 (updatedHardware as any)[field] = value;
             }
        }
        
        // Recalculate FOV if needed
        if (recalculateFov && updatedHardware.cameraDetails && updatedHardware.lensDetails) {
            const sensorDimensions = calculateSensorDimensions(updatedHardware.cameraDetails, updatedHardware.lensDetails);
            // FIX: Handle focalLength potentially being a range
            const focalLengthToUse = typeof updatedHardware.lensDetails.focalLength === 'number' 
                                        ? updatedHardware.lensDetails.focalLength 
                                        : updatedHardware.lensDetails.focalLength[0]; // Use min value for zoom lens FOV calc?
            const fovResult = calculateFOV(focalLengthToUse, sensorDimensions.width);
            // FIX: Assume calculateFOV returns a number (e.g., horizontal or vertical FOV) - adjust if it returns object
            updatedHardware.calculatedFov = typeof fovResult === 'number' ? fovResult : undefined; 
        } else if (!updatedHardware.cameraDetails || !updatedHardware.lensDetails) {
             updatedHardware.calculatedFov = undefined;
        }

        // --- Determine frustum visibility based on updated hardware --- 
        const newFrustumVisibility = !!(updatedHardware.camera && updatedHardware.lens);
         console.log(`[MissionContext] Reducer: UPDATE_HARDWARE_FIELD (${field}) - Setting frustum visibility to: ${newFrustumVisibility}`);
        // --- End determination ---

        return { 
          ...state, 
          hardware: updatedHardware, 
          isCameraFrustumVisible: newFrustumVisibility // <-- Set visibility state
        };
    }
    
    case 'ADD_SCENE_OBJECT': {
        if (state.sceneObjects.some(obj => obj.id === action.payload.id)) {
            console.warn(`SceneObject with ID ${action.payload.id} already exists.`);
            return state;
        }
        return {
            ...state,
            sceneObjects: [...state.sceneObjects, action.payload]
        };
    }
    
    case 'REMOVE_SCENE_OBJECT': {
        return {
            ...state,
            sceneObjects: state.sceneObjects.filter(obj => obj.id !== action.payload)
        };
    }
    
    case 'UPDATE_SCENE_OBJECT': {
        // Add debugging for scale issues
        if (action.payload.scale) {
            console.log('[MissionReducer] UPDATE_SCENE_OBJECT scale values:', {
                objectId: action.payload.id,
                scaleX: action.payload.scale.x,
                scaleY: action.payload.scale.y,
                scaleZ: action.payload.scale.z,
                type: action.payload.type || 'unknown'
            });
        }

        return {
            ...state,
            sceneObjects: state.sceneObjects.map(obj => 
                obj.id === action.payload.id 
                    ? { ...obj, ...action.payload } // Merge updates
                    : obj
            ),
            editingSceneObjectId: null, // Optionally close editor on update
        };
    }
    
    case 'SET_EDITING_SCENE_OBJECT_ID': {
        return {
            ...state,
            editingSceneObjectId: action.payload,
        };
    }
    
    case 'SET_SELECTED_FACE':
      return {
        ...state,
        selectedFace: action.payload,
        // Optionally turn off selection mode when a face is successfully selected
        isFaceSelectionModeActive: action.payload ? false : state.isFaceSelectionModeActive 
      };
    
    case 'LOAD_MISSION': {
        // Add logic to merge mission data, potentially resetting other state parts
        return { ...state, currentMission: action.payload };
    }
    
    case 'TOGGLE_FACE_SELECTION_MODE':
      // When turning selection ON, clear any previously selected face
      const clearSelectedFace = action.payload ? { selectedFace: null } : {};
      return {
        ...state,
        isFaceSelectionModeActive: action.payload,
        ...clearSelectedFace
      };
    
    case 'ADD_MISSION_AREA':
      return {
        ...state,
        missionAreas: [...state.missionAreas, action.payload]
      };
    
    case 'REMOVE_MISSION_AREA':
      return {
        ...state,
        missionAreas: state.missionAreas.filter(area => area.id !== action.payload)
      };
    
    case 'UPDATE_MISSION_AREA':
      return {
        ...state,
        missionAreas: state.missionAreas.map(area => 
          area.id === action.payload.id 
            ? { ...area, ...action.payload } 
            : area
        )
      };
    
    case 'TOGGLE_PATH_SEGMENT_SELECTION': {
        const segmentId = action.payload;
        
        // Validate that the segment exists in the current mission first
        if (!state.currentMission || !state.currentMission.pathSegments.some(segment => segment.id === segmentId)) {
            console.warn(`Cannot toggle selection for segment ID that doesn't exist: ${segmentId}`);
            return state; // Return current state without changes
        }
        
        const isSelected = state.selectedPathSegmentIds.includes(segmentId);
        let newSelectedIds;
        if (isSelected) {
            newSelectedIds = state.selectedPathSegmentIds.filter(id => id !== segmentId);
        } else {
            newSelectedIds = [...state.selectedPathSegmentIds, segmentId];
        }
        return {
            ...state,
            selectedPathSegmentIds: newSelectedIds,
        };
    }
    
    case 'SET_TRANSFORM_OBJECT_ID': {
        return { ...state, transformObjectId: action.payload };
    }

    // --- NEW Reducer Cases for ROS/Live Data ---

    case 'UPDATE_TELEMETRY':
        // Simple update, assumes payload is the full telemetry state
        return { ...state, realtimeTelemetry: action.payload };

    case 'UPDATE_SENSOR_STATUS': {
        // Deep merge partial updates for sensors
        // Assumes payload might contain updates for EITHER camera or lidar
        const updatedStatus: LiveSensorStatus = {
            // Important: Carry over the existing state for sensors *not* in the payload
            camera: { 
                ...state.liveSensorStatus?.camera,
                ...(action.payload.camera ?? {})
            },
            lidar: { 
                ...state.liveSensorStatus?.lidar, 
                ...(action.payload.lidar ?? {})
            },
            // Extend this pattern if more sensor types are added
        } as LiveSensorStatus; // Assert type after potential partial merge
        return { ...state, liveSensorStatus: updatedStatus };
    }

    case 'UPDATE_EXECUTION_STATUS': {
        // Merge partial updates into the existing execution status
        const updatedStatus: MissionExecutionStatus = {
            ...state.missionExecutionStatus!,
            ...action.payload, // Overwrite properties provided in payload
        };
        return { ...state, missionExecutionStatus: updatedStatus };
    }

    case 'SET_ROSBRIDGE_CONNECTION': {
        const isConnected = action.payload.connected;
        return {
            ...state,
            missionExecutionStatus: {
                ...state.missionExecutionStatus!,
                rosBridgeConnected: isConnected,
                // If disconnecting, maybe update overall state?
                state: isConnected ? state.missionExecutionStatus!.state : 'disconnected',
                lastError: isConnected ? state.missionExecutionStatus!.lastError : 'ROSBridge disconnected',
            },
            // Optionally reset sensor status/telemetry if websocket disconnects
            ...(!isConnected && {
                liveSensorStatus: {
                    camera: { ...state.liveSensorStatus!.camera, connected: false },
                    lidar: { ...state.liveSensorStatus!.lidar, connected: false }
                },
                realtimeTelemetry: null
             })
        };
    }

    case 'LOAD_OPERATIONAL_DEFAULTS': {
        // TODO: Implement logic to fetch/load defaults based on profile name
        // This might involve setting specific hardware IDs, safety params, etc.
        // For now, just log it.
        console.log(`[MissionReducer] TODO: Load defaults for profile: ${action.payload.profile}`);
        // Example: You might fetch config from an API or file here
        // const defaults = await fetchDefaults(action.payload.profile);
        // dispatch({ type: 'SET_HARDWARE', payload: defaults.hardware });
        // dispatch({ type: 'SET_SAFETY_PARAMS', payload: defaults.safetyParams });
        return state; // Placeholder
    }

    case 'START_HEAVY_OPERATION':
      return {
        ...state,
        isPerformingHeavyOperation: true
      };
      
    case 'END_HEAVY_OPERATION':
      return {
        ...state,
        isPerformingHeavyOperation: false
      };
      
    case 'SET_HEAVY_OPERATION':
      return {
        ...state,
        isPerformingHeavyOperation: action.payload
      };

    case 'MOVE_SCENE_OBJECT': {
        const { type, position, heightOffset } = action.payload;
        
        // Find all objects of the specified type and update their positions
        const updatedObjects = state.sceneObjects.map(obj => {
            if (obj.type === type) {
                return {
                    ...obj,
                    position: position,
                    ...(heightOffset !== undefined ? { heightOffset } : {})
                };
            }
            return obj;
        });
        
        return {
            ...state,
            sceneObjects: updatedObjects
        };
    }

    default:
      return state;
  }
}

// Create separate contexts for different parts of the state to prevent unnecessary re-renders
const MissionDataContext = createContext<{
  missions: Mission[];
  currentMission: Mission | null;
  selectedPathSegmentIds: string[];
  selectedWaypoint: Waypoint | null;
  selectedPathSegment: PathSegment | null;
  models: MissionModel[];
} | undefined>(undefined);

const MissionUIContext = createContext<{
  isSimulating: boolean;
  simulationTime: number;
  simulationSpeed: number;
  simulationProgress: MissionState['simulationProgress'];
  isLive: boolean;
  viewMode: 'CESIUM' | 'LOCAL_3D';
  isEditing: boolean;
  isPerformingHeavyOperation: boolean;
  selectedPoint: LatLng | null;
  tempRegion: MissionState['tempRegion'];
  regionName: string;
  drawingMode: 'polygon' | null;
  polygonPoints: LocalCoord[];
  polygonPreviewPoint: LocalCoord | null;
  activeControlPane: 'pre-checks' | 'build-scene' | 'mission-planning' | 'live-operation' | 'hardware';
  isSelectingTakeoffPoint: boolean; // Added state for selection mode
  isDroneVisible: boolean;
  isCameraFrustumVisible: boolean;
  hiddenGcpIds: string[];
  sceneSettings: SceneSettings;
} | undefined>(undefined);

const MissionHardwareContext = createContext<{
  hardware: HardwareState | null;
} | undefined>(undefined);

const MissionSceneContext = createContext<{
  sceneObjects: SceneObject[];
  editingSceneObjectId: string | null;
  selectedFace: SelectedFaceInfo | null;
  isFaceSelectionModeActive: boolean;
  missionAreas: MissionArea[];
  transformObjectId: string | null;
} | undefined>(undefined);

const MissionRealTimeContext = createContext<{
  realtimeTelemetry: RealtimeTelemetry | null;
  liveSensorStatus: LiveSensorStatus | null;
  missionExecutionStatus: MissionExecutionStatus | null;
} | undefined>(undefined);

// Original full context for dispatch operations
export interface MissionContextType {
  state: MissionState;
  dispatch: React.Dispatch<MissionAction>;
}

const MissionContext = createContext<MissionContextType | undefined>(undefined);

// --- Context Provider ---
interface MissionProviderProps { 
    children: ReactNode; 
}

export const MissionProvider: React.FC<MissionProviderProps> = ({ children }) => {
    const [state, dispatch] = useReducer(missionReducer, initialState);
    const { appMode } = useAppContext();

    // Memoize dispatch actions to prevent recreation of function references
    const memoizedDispatch = useCallback((action: MissionAction) => {
        // Add performance tracking for expensive operations
        if (
            action.type === 'ADD_SCENE_OBJECT' || 
            action.type === 'UPDATE_SCENE_OBJECT' || 
            action.type === 'SET_ACTIVE_MISSION'
        ) {
            console.time(`Action: ${action.type}`);
            dispatch(action);
            console.timeEnd(`Action: ${action.type}`);
        } else {
            dispatch(action);
        }
    }, []);

    // Split state into memoized chunks to prevent unnecessary re-renders
    const missionDataValue = useMemo(() => ({
        missions: state.missions,
        currentMission: state.currentMission,
        selectedPathSegmentIds: state.selectedPathSegmentIds,
        selectedWaypoint: state.selectedWaypoint,
        selectedPathSegment: state.selectedPathSegment,
        models: state.models
    }), [
        state.missions, 
        state.currentMission, 
        state.selectedPathSegmentIds,
        state.selectedWaypoint,
        state.selectedPathSegment,
        state.models
    ]);

    const missionUIValue = useMemo(() => ({
        isSimulating: state.isSimulating,
        simulationTime: state.simulationTime,
        simulationSpeed: state.simulationSpeed,
        simulationProgress: state.simulationProgress,
        isLive: state.isLive,
        viewMode: state.viewMode,
        isEditing: state.isEditing,
        isPerformingHeavyOperation: state.isPerformingHeavyOperation,
        selectedPoint: state.selectedPoint,
        tempRegion: state.tempRegion,
        regionName: state.regionName,
        drawingMode: state.drawingMode,
        polygonPoints: state.polygonPoints,
        polygonPreviewPoint: state.polygonPreviewPoint,
        activeControlPane: state.activeControlPane,
        isSelectingTakeoffPoint: state.isSelectingTakeoffPoint,
        isDroneVisible: state.isDroneVisible,
        isCameraFrustumVisible: state.isCameraFrustumVisible,
        hiddenGcpIds: state.hiddenGcpIds,
        sceneSettings: state.sceneSettings
    }), [
        state.isSimulating,
        state.simulationTime,
        state.simulationSpeed,
        state.simulationProgress,
        state.isLive,
        state.viewMode,
        state.isEditing,
        state.isPerformingHeavyOperation,
        state.selectedPoint,
        state.tempRegion,
        state.regionName,
        state.drawingMode,
        state.polygonPoints,
        state.polygonPreviewPoint,
        state.activeControlPane,
        state.isSelectingTakeoffPoint,
        state.isDroneVisible,
        state.isCameraFrustumVisible,
        state.hiddenGcpIds,
        state.sceneSettings
    ]);

    const missionHardwareValue = useMemo(() => ({
        hardware: state.hardware
    }), [state.hardware]);

    const missionSceneValue = useMemo(() => ({
        sceneObjects: state.sceneObjects,
        editingSceneObjectId: state.editingSceneObjectId,
        selectedFace: state.selectedFace,
        isFaceSelectionModeActive: state.isFaceSelectionModeActive,
        missionAreas: state.missionAreas,
        transformObjectId: state.transformObjectId
    }), [
        state.sceneObjects,
        state.editingSceneObjectId,
        state.selectedFace,
        state.isFaceSelectionModeActive,
        state.missionAreas,
        state.transformObjectId
    ]);

    const missionRealTimeValue = useMemo(() => ({
        realtimeTelemetry: state.realtimeTelemetry,
        liveSensorStatus: state.liveSensorStatus,
        missionExecutionStatus: state.missionExecutionStatus
    }), [
        state.realtimeTelemetry,
        state.liveSensorStatus,
        state.missionExecutionStatus
    ]);

    // Original context value for backward compatibility
    const contextValue = useMemo(() => ({
        state,
        dispatch: memoizedDispatch
    }), [state, memoizedDispatch]);

    // --- Load Default Mission Effect based on AppContext ---
    useEffect(() => {
        // Check if appMode is 'dev' and if no mission or no hardware is currently loaded
        if (appMode === 'dev' && (!state.currentMission || !state.hardware)) {
            // Only dispatch if we need to load default data
            if (!state.currentMission) {
                dispatch({ type: 'SET_MISSION', payload: DEFAULT_DEV_MISSION });
            }

            // Load default hardware if needed
            if (!state.hardware) {
                const defaultCamera = getCameraById(DEFAULT_DEV_HARDWARE.camera!);
                const defaultLens = getLensById(DEFAULT_DEV_HARDWARE.lens!);
                const defaultDrone = getDroneModelById(DEFAULT_DEV_HARDWARE.drone!);
                const defaultFStops = defaultLens ? getLensFStops(defaultLens).filter(s => !isNaN(s)).sort((a,b) => a-b) : [];
                const defaultFStop = defaultFStops.length > 0 ? defaultFStops[0] : null;
                
                dispatch({
                    type: 'SET_HARDWARE', 
                    payload: {
                        ...DEFAULT_DEV_HARDWARE,
                        cameraDetails: defaultCamera,
                        lensDetails: defaultLens,
                        droneDetails: defaultDrone,
                        availableFStops: defaultFStops,
                        fStop: defaultFStop,
                    }
                });
            }
        }
    }, [appMode]); // Only depend on appMode, otherwise will rerun on every state change

    return (
        <MissionContext.Provider value={contextValue}>
            <MissionDataContext.Provider value={missionDataValue}>
                <MissionUIContext.Provider value={missionUIValue}>
                    <MissionHardwareContext.Provider value={missionHardwareValue}>
                        <MissionSceneContext.Provider value={missionSceneValue}>
                            <MissionRealTimeContext.Provider value={missionRealTimeValue}>
                                {children}
                            </MissionRealTimeContext.Provider>
                        </MissionSceneContext.Provider>
                    </MissionHardwareContext.Provider>
                </MissionUIContext.Provider>
            </MissionDataContext.Provider>
        </MissionContext.Provider>
    );
};

// Custom hooks for using different parts of context to prevent unnecessary re-renders
export function useMission() {
    const context = useContext(MissionContext);
    if (context === undefined) {
        throw new Error('useMission must be used within a MissionProvider');
    }
    return context;
}

export function useMissionData() {
    const context = useContext(MissionDataContext);
    if (context === undefined) {
        throw new Error('useMissionData must be used within a MissionProvider');
    }
    return context;
}

export function useMissionUI() {
    const context = useContext(MissionUIContext);
    if (context === undefined) {
        throw new Error('useMissionUI must be used within a MissionProvider');
    }
    return context;
}

export function useMissionHardware() {
    const context = useContext(MissionHardwareContext);
    if (context === undefined) {
        throw new Error('useMissionHardware must be used within a MissionProvider');
    }
    return context;
}

export function useMissionScene() {
    const context = useContext(MissionSceneContext);
    if (context === undefined) {
        throw new Error('useMissionScene must be used within a MissionProvider');
    }
    return context;
}

export function useMissionRealTime() {
    const context = useContext(MissionRealTimeContext);
    if (context === undefined) {
        throw new Error('useMissionRealTime must be used within a MissionProvider');
    }
    return context;
}

// Regular action creator functions instead of hooks
export const startEditSceneObject = (dispatch: Dispatch<MissionAction>, objectId: string) => {
   dispatch({ type: 'SET_EDITING_SCENE_OBJECT_ID', payload: objectId });
};

export const finishEditSceneObject = (dispatch: Dispatch<MissionAction>) => {
   dispatch({ type: 'SET_EDITING_SCENE_OBJECT_ID', payload: null });
}; 