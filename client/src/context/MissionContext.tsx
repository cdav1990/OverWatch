import React, { createContext, useContext, useReducer, ReactNode, useEffect, Dispatch, useMemo } from 'react';
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
    // Store detailed objects for easier access in components
    droneDetails: DroneModel | null;
    cameraDetails: Camera | null;
    lensDetails: Lens | null;
    // Calculated FOV (example - store as needed)
    calculatedFov?: number; // Optional calculated FOV number
    availableFStops: number[]; // Available f-stops for the selected lens
}

// Define Scene Settings Type
export interface SceneSettings {
  gridSize: number;
  gridDivisions: number;
  gridUnit: 'meters' | 'feet'; // Add unit option for the grid
  fov: number;
  backgroundColor: string; // Hex color string e.g., '#ffffff'
  gridColorCenterLine: string;
  gridColorGrid: string;
  gridVisible: boolean;
  gridFadeDistance: number;
  ambientLightIntensity: number;
  directionalLightIntensity: number;
  skyEnabled: boolean;
  sunPosition: [number, number, number];
  axesVisible: boolean;
}

// Define Scene Object Type
export interface SceneObject {
    id: string;
    type: 'box' | 'model' | 'area'; // Add other types as needed (e.g., 'cylinder', 'polygon')
    class?: 'obstacle' | 'neutral' | 'asset'; // ADDED: Object classification
    width?: number;   // Optional, might not apply to all types
    length?: number;  // Optional
    height?: number;  // Optional
    color?: string;   // Optional
    position: LocalCoord;
    rotation?: LocalCoord; // Optional rotation
    url?: string;     // For models
    points?: LocalCoord[]; // For polygons/areas
    createdAt: string;
    source: string; // Where it originated (e.g., 'build-scene-ui', 'import')
}

// Interface for selected face information
export interface SelectedFaceInfo {
  objectId: string;
  faceId: string;
  faceIndex: number;
  normal: THREE.Vector3;
  vertices: THREE.Vector3[];
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

// Define action types
type MissionAction = 
  | { type: 'SET_MISSION'; payload: Mission }
  | { type: 'CREATE_MISSION'; payload: { name: string; region: Region } }
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
  | { type: 'SET_ACTIVE_CONTROL_PANE'; payload: 'pre-checks' | 'build-scene' | 'mission-planning' }
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
  | { type: 'UPDATE_MISSION_AREA'; payload: Partial<MissionArea> & { id: string } };

// Update the MissionState interface
export interface MissionState {
  currentMission: Mission | null;
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
  activeControlPane: 'pre-checks' | 'build-scene' | 'mission-planning';
  isSelectingTakeoffPoint: boolean; // Added state for selection mode
  isDroneVisible: boolean; // <-- Add drone visibility state
  isCameraFrustumVisible: boolean; // <-- Add camera visibility state
  hiddenGcpIds: string[]; // <-- Add hidden GCP IDs state
  sceneSettings: SceneSettings; // <-- Add scene settings state
  hardware: HardwareState | null; // <-- Add hardware state
  sceneObjects: SceneObject[]; // <-- Add scene objects array
  editingSceneObjectId: string | null; // ADDED: Track object being edited
  selectedFace: SelectedFaceInfo | null; // ADDED: Track selected face information
  isFaceSelectionModeActive: boolean; // ADDED: Track whether face selection mode is active
  missionAreas: MissionArea[]; // NEW: Track mission areas created from faces
}

// Default Scene Settings
const defaultLightSceneSettings: SceneSettings = {
    gridSize: 200,
    gridDivisions: 20,
    gridUnit: 'meters', // Default to meters
    fov: 50,
    backgroundColor: '#e0e0e0', // Light grey background
    gridColorCenterLine: '#888888',
    gridColorGrid: '#cccccc',
    gridVisible: true,
    gridFadeDistance: 25,
    ambientLightIntensity: 0.6,
    directionalLightIntensity: 1.0,
    skyEnabled: true,
    sunPosition: [100, 10, 100],
    axesVisible: true,
};

const defaultDarkSceneSettings: SceneSettings = {
    gridSize: 200,
    gridDivisions: 20,
    gridUnit: 'meters', // Default to meters
    fov: 50,
    backgroundColor: '#121212', // Darker background
    gridColorCenterLine: '#333333',
    gridColorGrid: '#1e1e1e',
    gridVisible: true,
    gridFadeDistance: 25,
    ambientLightIntensity: 0.25, // Reduced ambient in dark
    directionalLightIntensity: 0.7,
    skyEnabled: true,
    sunPosition: [100, 10, 100], // Same sun position
    axesVisible: true,
};

const defaultGeckoSceneSettings: SceneSettings = {
    ...defaultDarkSceneSettings, // Start with dark defaults
    gridColorCenterLine: '#4CAF50', // Gecko green accents
    gridColorGrid: '#388E3C',
    backgroundColor: '#1B2631', // Darker blue/grey background
    axesVisible: true,
};

// --- >>> DEV MODE: Default Mission Data <<< ---
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

const DEFAULT_DEV_HARDWARE: HardwareState = {
    drone: 'freefly-alta-x',
    lidar: 'ouster',
    camera: 'phase-one-ixm-100',
    lens: 'phaseone-rsm-80mm',
    sensorType: 'Medium Format',
    fStop: 5.6,
    focusDistance: 30, // meters (~100 ft)
    shutterSpeed: '1/1000', // Default shutter
    iso: 100,           // Default ISO
    droneDetails: null, // Will be populated later
    cameraDetails: null,
    lensDetails: null,
    availableFStops: [],
};

const DEFAULT_DEV_MISSION: Mission = {
    id: 'dev-mission-001',
    name: 'Default Dev Mission',
    region: DEFAULT_DEV_REGION,
    pathSegments: [ 
        // Optional: Add a simple default path segment
        // { 
        //     id: generateUUID(), 
        //     type: PathType.STRAIGHT, 
        //     waypoints: [
        //         { id: generateUUID(), local: { x: 0, y: 0, z: 30 }, altitudeReference: AltitudeReference.RELATIVE, speed: 5 },
        //         { id: generateUUID(), local: { x: 50, y: 0, z: 30 }, altitudeReference: AltitudeReference.RELATIVE, speed: 5 },
        //     ],
        //     color: '#ff0000\'
        // }
    ],
    gcps: [], // Start with no GCPs for simplicity, or add defaults
    defaultAltitude: 30,
    defaultSpeed: 5,
    takeoffPoint: { x: 0, y: 0, z: 0 }, // Default takeoff at origin
    safetyParams: {
        rtlAltitude: 50,
        climbSpeed: 2.5,
        failsafeAction: 'RTL',
        missionEndAction: 'RTL',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    localOrigin: DEFAULT_DEV_REGION.center, // Crucial: Set localOrigin
};
// --- >>> END DEV MODE <<< ---

const DEFAULT_FOCUS_DISTANCE_FT = 20; // Added default constant

const initialState: MissionState = {
  currentMission: null,
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
  viewMode: 'CESIUM',
  isEditing: false,
  selectedPoint: null,
  tempRegion: null,
  regionName: 'New Mission Area',
  drawingMode: null,
  polygonPoints: [],
  polygonPreviewPoint: null,
  activeControlPane: 'mission-planning',
  isSelectingTakeoffPoint: false,
  isDroneVisible: true,
  isCameraFrustumVisible: true,
  hiddenGcpIds: [],
  sceneSettings: {
      gridSize: 200,
      gridDivisions: 20,
      gridUnit: 'meters', // Default to meters
      fov: 50,
      backgroundColor: '#121212', // Default to dark theme initially
      gridColorCenterLine: '#333333',
      gridColorGrid: '#1e1e1e',
      gridVisible: true,
      gridFadeDistance: 25,
      ambientLightIntensity: 0.25,
      directionalLightIntensity: 0.7,
      skyEnabled: true,
      sunPosition: [100, 10, 100],
      axesVisible: true,
  },
  hardware: null,
  sceneObjects: [],
  editingSceneObjectId: null,
  selectedFace: null,
  isFaceSelectionModeActive: false,
  missionAreas: [], // Initialize with empty array
};

// Create the reducer
function missionReducer(state: MissionState, action: MissionAction): MissionState {
  // FIX: Log payload only if it exists
  console.log(`[MissionContext] Action: ${action.type}`, ('payload' in action) ? action.payload : '(no payload)'); 
  
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
      
      // Create default GCPs - always center scene at GCP-A (0,0,0)
      // Use a triangle with GCP-A at the center/origin
      const feetToMeters = 0.3048;
      const sideLength = 15 * feetToMeters; // 15 feet in meters
      const defaultGcpPoints: Array<{ name: string; x: number; y: number; z: number }> = [
        { name: 'GCP-A', x: 0, y: 0, z: 0 }, // Origin GCP - Center of the scene
        { name: 'GCP-B', x: sideLength, y: 0, z: 0 }, // To the right (East) of GCP-A
        { name: 'GCP-C', x: 0, y: sideLength, z: 0 }, // To the front (North) of GCP-A
      ];

      // Create GCP objects
      const defaultGcps: GCP[] = defaultGcpPoints.map(p => ({
        id: generateUUID(),
        name: p.name,
        lat: 0, lng: 0, altitude: 0, // Global coords TBD/calculated later if needed
        local: { x: p.x, y: p.y, z: p.z },
        color: p.name === 'GCP-A' ? '#ff0000' : '#00ff00', // Make GCP-A red for visibility
        size: p.name === 'GCP-A' ? 1.5 : 1, // Make GCP-A slightly larger
      }));

      const newMission: Mission = {
        id: generateUUID(),
        name: name || 'New Mission',
        region: region,
        pathSegments: [],
        gcps: defaultGcps,
        defaultAltitude: 50, // Default altitude (meters AGL)
        defaultSpeed: 5, // Default speed (m/s)
        createdAt: now,
        updatedAt: now,
        localOrigin: region.center,
        // Set default takeoff point at the center (GCP-A location)
        takeoffPoint: { x: 0, y: 0, z: 0 },
        // Add default safety parameters
        safetyParams: {
          rtlAltitude: 50, // Meters
          climbSpeed: 2.5, // m/s
          failsafeAction: 'RTL', // Default action on failsafe
          missionEndAction: 'RTL' // Default action at mission end
        }
      };
      
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
      
      return {
        ...state,
        currentMission: {
          ...state.currentMission,
          pathSegments: [...state.currentMission.pathSegments, action.payload],
          updatedAt: new Date()
        },
        selectedPathSegment: action.payload
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
      
      const updatedSegments = state.currentMission.pathSegments.filter(
        segment => segment.id !== action.payload
      );
      
      return {
        ...state,
        currentMission: {
          ...state.currentMission,
          pathSegments: updatedSegments,
          updatedAt: new Date()
        },
        selectedPathSegment: null
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
      // Ensure the final object type is asserted correctly
      const updatedSafetyParams = {
          ...state.currentMission.safetyParams, // Keep existing params
          ...action.payload // Overwrite with new partial params
      } as SafetyParams; // Assert the final type
      
      return {
        ...state,
        currentMission: {
          ...state.currentMission,
          safetyParams: updatedSafetyParams,
          updatedAt: new Date()
        }
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
      return {
        ...state,
        isSelectingTakeoffPoint: true,
      };

    case 'FINISH_SELECTING_TAKEOFF_POINT':
      return {
        ...state,
        isSelectingTakeoffPoint: false,
      };
    
    case 'SET_TAKEOFF_POINT': { // Modified existing case
      if (!state.currentMission) return state;
      return {
        ...state,
        currentMission: {
          ...state.currentMission,
          takeoffPoint: action.payload,
          updatedAt: new Date(),
        },
        isSelectingTakeoffPoint: false, // Ensure we exit selection mode after setting
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
      return {
        ...state,
        activeControlPane: action.payload,
      };
    
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
        // Ensure payload values have correct types before merging
        const validatedPayload: Partial<SceneSettings> = {};
        for (const key in action.payload) {
            const field = key as keyof SceneSettings;
            const value = (action.payload as any)[field];

            switch (field) {
                case 'gridSize':
                case 'gridDivisions':
                case 'fov':
                case 'gridFadeDistance':
                case 'ambientLightIntensity':
                case 'directionalLightIntensity':
                    validatedPayload[field] = Number(value) || state.sceneSettings[field];
                    break;
                case 'backgroundColor':
                case 'gridColorCenterLine':
                case 'gridColorGrid':
                     // Basic hex validation (starts with #, 3/4/6/8 hex chars)
                    if (/^#[0-9A-Fa-f]{3,8}$/.test(value)) {
                        validatedPayload[field] = String(value);
                    } else {
                        validatedPayload[field] = state.sceneSettings[field]; // Keep old if invalid
                    }
                    break;
                case 'gridVisible':
                case 'skyEnabled':
                    validatedPayload[field] = Boolean(value);
                    break;
                case 'sunPosition':
                    // Ensure it's an array of 3 numbers
                    if (Array.isArray(value) && value.length === 3 && value.every(v => typeof v === 'number')) {
                         validatedPayload[field] = value as [number, number, number];
                    } else {
                         validatedPayload[field] = state.sceneSettings[field]; // Keep old if invalid
                    }
                    break;
                default:
                    // Ignore unexpected fields
                    break;
            }
        }

        return {
            ...state,
            sceneSettings: { ...state.sceneSettings, ...validatedPayload },
        };
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
          updatedHardware.lensDetails = lensId ? getLensById(lensId) : null;
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

      return { 
        ...state, 
        hardware: updatedHardware as HardwareState // Assert final type
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

        return { ...state, hardware: updatedHardware };
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
        // When a face is selected, automatically disable face selection mode
        isFaceSelectionModeActive: action.payload !== null
      };
    
    case 'LOAD_MISSION': {
        // Add logic to merge mission data, potentially resetting other state parts
        return { ...state, currentMission: action.payload };
    }
    
    case 'TOGGLE_FACE_SELECTION_MODE':
      return {
        ...state,
        isFaceSelectionModeActive: action.payload,
        // Clear selected face when disabling face selection mode
        ...(action.payload === false ? { selectedFace: null } : {})
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
    
    default:
      return state;
  }
}

// Create the context
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
    const { appMode } = useAppContext(); // <-- Get appMode from AppContext

    // --- Load Default Mission Effect based on AppContext ---
    useEffect(() => {
        // Check if appMode is 'dev' and if no mission or no hardware is currently loaded
        if (appMode === 'dev' && (!state.currentMission || !state.hardware)) {
            console.warn("[Dev Mode] App mode set to 'dev'. Loading default mission and hardware..."); 
            
            // Load default mission if needed
            if (!state.currentMission) {
                dispatch({ type: 'SET_MISSION', payload: DEFAULT_DEV_MISSION });
                console.log("[Dev Mode] Dispatched SET_MISSION with default.");
            }

            // Load default hardware if needed
            if (!state.hardware) {
                const defaultCamera = getCameraById(DEFAULT_DEV_HARDWARE.camera!);
                const defaultLens = getLensById(DEFAULT_DEV_HARDWARE.lens!);
                const defaultDrone = getDroneModelById(DEFAULT_DEV_HARDWARE.drone!);
                const defaultFStops = defaultLens ? getLensFStops(defaultLens).filter(s => !isNaN(s)).sort((a,b) => a-b) : [];
                const defaultFStop = defaultFStops.length > 0 ? defaultFStops[0] : null;
                
                console.log("[Dev Mode] Preparing default hardware object:", {
                    ...DEFAULT_DEV_HARDWARE,
                    cameraDetails: defaultCamera,
                    lensDetails: defaultLens,
                    droneDetails: defaultDrone,
                    availableFStops: defaultFStops,
                    fStop: defaultFStop, // Ensure default fStop is included
                });

                dispatch({
                    type: 'SET_HARDWARE', 
                    payload: {
                        ...DEFAULT_DEV_HARDWARE,
                        cameraDetails: defaultCamera,
                        lensDetails: defaultLens,
                        droneDetails: defaultDrone,
                        availableFStops: defaultFStops,
                        fStop: defaultFStop, // Pass calculated default fStop
                        // focusDistance is already set in meters in DEFAULT_DEV_HARDWARE
                    }
                });
                console.log("[Dev Mode] Dispatched SET_HARDWARE with default.");
            }
        }
    }, [appMode, state.currentMission, state.hardware, dispatch]); // Add state.hardware dependency
    // --- End Load Default Mission Effect ---

    return (
        <MissionContext.Provider value={{ state, dispatch }}>
            {children}
        </MissionContext.Provider>
    );
};

// Custom hook to use the mission context
export function useMission() {
  const context = useContext(MissionContext);
  if (context === undefined) {
    throw new Error('useMission must be used within a MissionProvider');
  }
  return context;
}

// ADD Action to start/stop editing
export const startEditSceneObject = (dispatch: Dispatch<MissionAction>, objectId: string) => {
   // In a real implementation, this might dispatch an action like:
   // dispatch({ type: 'SET_EDITING_SCENE_OBJECT_ID', payload: objectId });
   // For now, we'll just log it as the state isn't fully implemented yet.
   console.log(`[MissionContext] Placeholder: Start editing object ${objectId}`);
   // We would also need state like `isEditModalOpen` managed here or locally.
};

export const finishEditSceneObject = (dispatch: Dispatch<MissionAction>) => {
   // dispatch({ type: 'SET_EDITING_SCENE_OBJECT_ID', payload: null });
   console.log(`[MissionContext] Placeholder: Finish editing object`);
}; 