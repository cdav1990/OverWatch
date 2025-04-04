import React, { createContext, useContext, useReducer, ReactNode, useEffect, Dispatch } from 'react';
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
import { Camera, Lens, DroneModel, SensorType, CameraParameters } from '../types/hardware';
import { AppMode, useAppContext } from './AppContext';
import { getCameraById, getLensById, getCompatibleLenses, getDroneModelById, getLensFStops } from '../utils/hardwareDatabase';
import { calculateSensorDimensions, calculateFOV } from '../utils/sensorCalculations';

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
    cameraParameters: CameraParameters | null; // Calculated camera params
    availableFStops: number[]; // Available f-stops for the selected lens
}

// Define Scene Settings Type
export interface SceneSettings {
  gridSize: number;
  gridDivisions: number;
  fov: number;
  backgroundColor: string; // Hex color string e.g., '#ffffff'
  gridColorCenterLine: string;
  gridColorGrid: string;
  // New Settings
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
  | { type: 'SET_ACTIVE_CONTROL_PANE'; payload: 'pre-checks' | 'build-scene' | 'raster-pattern' }
  | { type: 'UPDATE_SCENE_SETTINGS'; payload: Partial<SceneSettings> }
  | { type: 'SET_HARDWARE'; payload: Partial<HardwareState> }
  | { type: 'UPDATE_HARDWARE_FIELD'; payload: { field: keyof HardwareState; value: any } }
  | { type: 'ADD_SCENE_OBJECT'; payload: SceneObject }
  | { type: 'REMOVE_SCENE_OBJECT'; payload: string }
  | { type: 'UPDATE_SCENE_OBJECT'; payload: Partial<SceneObject> & { id: string } }
  | { type: 'LOAD_MISSION'; payload: any };

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
  activeControlPane: 'pre-checks' | 'build-scene' | 'raster-pattern';
  isSelectingTakeoffPoint: boolean; // Added state for selection mode
  isDroneVisible: boolean; // <-- Add drone visibility state
  isCameraFrustumVisible: boolean; // <-- Add camera visibility state
  hiddenGcpIds: string[]; // <-- Add hidden GCP IDs state
  sceneSettings: SceneSettings; // <-- Add scene settings state
  hardware: HardwareState | null; // <-- Add hardware state
  sceneObjects: SceneObject[]; // <-- Add scene objects array
}

// Default Scene Settings
const defaultLightSceneSettings: SceneSettings = {
    gridSize: 200,
    gridDivisions: 20,
    fov: 50,
    backgroundColor: '#e0e0e0', // Light grey background
    gridColorCenterLine: '#888888',
    gridColorGrid: '#cccccc',
    // Add Missing Defaults
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
    fov: 50,
    backgroundColor: '#121212', // Darker background
    gridColorCenterLine: '#333333',
    gridColorGrid: '#1e1e1e',
    // Add Missing Defaults
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
    cameraParameters: null,
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
        climbSpeed: 2.0,
        failsafeAction: 'RTL',
        missionEndAction: 'RTL',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    localOrigin: DEFAULT_DEV_REGION.center, // Crucial: Set localOrigin
};
// --- >>> END DEV MODE <<< ---

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
  activeControlPane: 'pre-checks',
  isSelectingTakeoffPoint: false,
  isDroneVisible: true,
  isCameraFrustumVisible: true,
  hiddenGcpIds: [],
  sceneSettings: {
      gridSize: 200,
      gridDivisions: 20,
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
};

// Create the reducer
function missionReducer(state: MissionState, action: MissionAction): MissionState {
  // --- ADD LOG FOR ALL ACTIONS (Optional but helpful for debugging) ---
  // console.log(`[MissionReducer] Action: ${action.type}`, action);
  
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
      
      // Create default GCPs (15' triangle ~ 4.57m)
      const feetToMeters = 0.3048;
      const sideLength = 15 * feetToMeters; 
      const defaultGcpPoints: Array<{ name: string; x: number; y: number; z: number }> = [
        { name: 'GCP-A', x: 0, y: 0, z: 0 }, // Origin GCP
        { name: 'GCP-B', x: sideLength, y: 0, z: 0 }, // Along X axis
        { name: 'GCP-C', x: sideLength / 2, y: Math.sqrt(3) * sideLength / 2, z: 0 }, // Equilateral triangle point
      ];
      const defaultGcps: GCP[] = defaultGcpPoints.map(p => ({
        id: generateUUID(),
        name: p.name,
        lat: 0, lng: 0, altitude: 0, // Global coords TBD/calculated later if needed
        local: { x: p.x, y: p.y, z: p.z },
        color: '#00ff00', size: 1,
      }));

      const newMission: Mission = {
        id: generateUUID(),
        name,
        region,
        pathSegments: [],
        gcps: defaultGcps, // Add default GCPs
        defaultAltitude: 50, 
        defaultSpeed: 5, 
        takeoffPoint: null, // Initialize takeoff point
        safetyParams: { // Initialize default safety params
          rtlAltitude: 100, // Default RTL Altitude (meters)
          climbSpeed: 2.0, // Default climb speed (m/s)
          failsafeAction: 'RTL', // Default action
          missionEndAction: 'RTL', // Default action
        },
        createdAt: now,
        updatedAt: now,
        localOrigin: region.center,
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
        // Ensure details are populated if only IDs were passed
        let fullPayload: Partial<HardwareState> = { ...action.payload };
        
        // Define defaults for potentially missing optional fields
        const defaults: Partial<HardwareState> = {
            fStop: 5.6,
            focusDistance: 10,
            shutterSpeed: '1/1000',
            iso: 100,
        };

        // Merge payload with defaults, only adding defaults if the key is missing in the payload
        let mergedPayload = { ...defaults, ...fullPayload };
        
        // Populate details based on IDs if needed
        if (mergedPayload.camera && !mergedPayload.cameraDetails) {
            mergedPayload.cameraDetails = getCameraById(mergedPayload.camera);
        }
        if (mergedPayload.lens && !mergedPayload.lensDetails) {
            mergedPayload.lensDetails = getLensById(mergedPayload.lens);
        }
        // Add drone details if missing (optional)
        // if (mergedPayload.drone && !mergedPayload.droneDetails) {
        //     mergedPayload.droneDetails = getDroneModelById(mergedPayload.drone);
        // }

        return {
            ...state,
            // Ensure the final hardware state matches the HardwareState interface fully
            hardware: mergedPayload as HardwareState 
        };
    }
    
    case 'UPDATE_HARDWARE_FIELD': {
        if (!state.hardware) return state; 

        const { field, value } = action.payload;
        // Create a mutable copy typed correctly
        let updatedHardware: HardwareState = { ...state.hardware };

        // Handle cascading updates for camera/lens changes
        if (field === 'camera') {
            const newCameraId = value as string | null;
            updatedHardware.camera = newCameraId;
            updatedHardware.cameraDetails = newCameraId ? getCameraById(newCameraId) : null;
            // Reset lens and related params when camera changes
            updatedHardware.lens = null;
            updatedHardware.lensDetails = null;
            updatedHardware.availableFStops = [];
            updatedHardware.fStop = null;
            updatedHardware.cameraParameters = null;
            // If a camera is selected, check compatible lenses
            if (newCameraId) {
                const compatible = getCompatibleLenses(newCameraId);
                // Optionally auto-select the first compatible lens
                // if (compatible.length > 0) {
                //     updatedHardware.lens = compatible[0].id;
                //     updatedHardware.lensDetails = compatible[0];
                //     updatedHardware.availableFStops = getLensFStops(compatible[0]);
                //     updatedHardware.fStop = updatedHardware.availableFStops[0] ?? null;
                // }
            }
        } else if (field === 'lens') {
            const newLensId = value as string | null;
            updatedHardware.lens = newLensId;
            updatedHardware.lensDetails = newLensId ? getLensById(newLensId) : null;
            updatedHardware.availableFStops = updatedHardware.lensDetails ? getLensFStops(updatedHardware.lensDetails) : [];
            // Reset fStop if current is not available or no lens selected
            if (!newLensId || !updatedHardware.availableFStops.includes(updatedHardware.fStop as number)) {
                updatedHardware.fStop = updatedHardware.availableFStops[0] ?? null;
            }
            // Recalculate camera params if possible
            if (updatedHardware.cameraDetails && updatedHardware.lensDetails) {
                const sensorDimensions = calculateSensorDimensions(updatedHardware.cameraDetails, updatedHardware.lensDetails);
                const fov = calculateFOV(updatedHardware.lensDetails.focalLength, sensorDimensions.width);
                updatedHardware.cameraParameters = {
                    sensorWidth: sensorDimensions.width,
                    sensorHeight: sensorDimensions.height,
                    focalLength: updatedHardware.lensDetails.focalLength,
                    fovHorizontal: fov.horizontal,
                    fovVertical: fov.vertical,
                };
            } else {
                updatedHardware.cameraParameters = null;
            }
        } else if (field === 'drone') {
            updatedHardware.drone = value as string | null;
            updatedHardware.droneDetails = updatedHardware.drone ? getDroneModelById(updatedHardware.drone) : null;
        } else if (field === 'fStop' || field === 'iso') {
             const numValue = value !== null && value !== '' ? Number(value) : null;
             updatedHardware[field] = numValue;
        } else if (field === 'focusDistance') {
             // Ensure focusDistance is always a number, defaulting if invalid
             const numValue = Number(value);
             updatedHardware[field] = isNaN(numValue) ? state.hardware.focusDistance : numValue; // Keep old value if invalid
        } else if (field === 'shutterSpeed') {
            updatedHardware[field] = value ? String(value) : null;
        } else {
            // Handle other simple fields like 'lidar', 'sensorType'
            if (field in updatedHardware) {
                 (updatedHardware as any)[field] = value;
            }
        }
        
        // Recalculate camera params after any relevant change (camera, lens, fStop, focusDistance could potentially affect it in future)
        // Moved the calculation inside lens update, but could be abstracted
        if (!updatedHardware.cameraDetails || !updatedHardware.lensDetails) {
             updatedHardware.cameraParameters = null;
        } else if (!updatedHardware.cameraParameters) { // Recalculate if null
            const sensorDimensions = calculateSensorDimensions(updatedHardware.cameraDetails, updatedHardware.lensDetails);
            const fov = calculateFOV(updatedHardware.lensDetails.focalLength, sensorDimensions.width);
            updatedHardware.cameraParameters = {
                sensorWidth: sensorDimensions.width,
                sensorHeight: sensorDimensions.height,
                focalLength: updatedHardware.lensDetails.focalLength,
                fovHorizontal: fov.horizontal,
                fovVertical: fov.vertical,
            };
        }

        return { ...state, hardware: updatedHardware };
    }
    
    case 'ADD_SCENE_OBJECT': {
        // Prevent adding duplicates by ID
        if (state.sceneObjects.some(obj => obj.id === action.payload.id)) {
            console.warn(`Scene object with ID ${action.payload.id} already exists. Ignoring.`);
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
                obj.id === action.payload.id ? { ...obj, ...action.payload } : obj
            )
        };
    }
    
    case 'LOAD_MISSION': {
        // Add logic to merge mission data, potentially resetting other state parts
        return { ...state, currentMission: action.payload };
    }
    
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
        // Check if appMode is 'dev' and if no mission is currently loaded
        if (appMode === 'dev' && !state.currentMission) {
            console.warn("[Dev Mode] App mode set to 'dev'. Loading default mission and hardware..."); 
            // Dispatch both mission and hardware defaults
            dispatch({ type: 'SET_MISSION', payload: DEFAULT_DEV_MISSION });
            dispatch({ type: 'SET_HARDWARE', payload: DEFAULT_DEV_HARDWARE });
        }
        // Optional: Add logic here to reset state if mode changes from dev?
        // else if (appMode === 'ops' && state.currentMission?.id === DEFAULT_DEV_MISSION.id) {
        //     // Reset if switching to ops and the dev mission is loaded?
        // }

    }, [appMode, state.currentMission]); // Re-run if appMode or mission state changes
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