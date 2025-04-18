// Geographic coordinates
export interface LatLng {
  latitude: number;
  longitude: number;
}

// Altitude reference
export enum AltitudeReference {
  TERRAIN = 'TERRAIN',
  SEA_LEVEL = 'SEA_LEVEL',
  RELATIVE = 'RELATIVE'
}

// Geographic region selection
export interface Region {
  id: string;
  name: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  center: LatLng;
  zoomLevel?: number;
}

// Local coordinates
export interface LocalCoord {
  x: number; // East
  y: number; // North
  z: number; // Up
}

/**
 * TakeoffLocation represents a takeoff point, with tracking for multiple points
 * All subsequent points are stored relative to the first point (TOL-1)
 */
export interface TakeoffLocation {
    id: string;
    name: string; // Will be TOL-1, TOL-2, etc.
    position: LocalCoord; // Absolute position in 3D space
    relativePosition: LocalCoord | null; // Position relative to TOL-1 (null for TOL-1 itself)
    timestamp: string; // When this point was created
}

// Camera parameters
export interface CameraParams {
  fov: number;           // Field of view in degrees
  aspectRatio: number;   // Aspect ratio (width/height)
  near: number;          // Near clipping plane
  far: number;           // Far clipping plane
  heading: number;       // Camera heading in degrees
  pitch: number;         // Camera pitch in degrees
  roll?: number;         // Camera roll in degrees (optional)
}

// Waypoint in a mission
export interface Waypoint {
  id: string;
  // Global coordinates
  lat: number;
  lng: number;
  altitude: number;
  altReference: AltitudeReference;
  // Local coordinates (for 3D visualization)
  local?: LocalCoord;
  // Camera parameters at this waypoint
  camera: CameraParams;
  // Speed to reach this waypoint
  speed?: number;
  // Hold time at this waypoint in seconds
  holdTime?: number;
  // Actions to perform at this waypoint
  actions?: MissionAction[];
  // Display options for visualization (optional)
  displayOptions?: {
    isGroundProjection?: boolean;
    projectionOfWaypoint?: string;
    displayColor?: string;
    displayStyle?: string;
    [key: string]: any; // Allow for additional custom properties
  };
}

// Actions that can be performed at a waypoint
export enum ActionType {
  TAKE_PHOTO = 'TAKE_PHOTO',
  START_VIDEO = 'START_VIDEO',
  STOP_VIDEO = 'STOP_VIDEO',
  START_RECORDING = 'START_RECORDING',
  STOP_RECORDING = 'STOP_RECORDING',
  ROTATE_GIMBAL = 'ROTATE_GIMBAL',
  CUSTOM_PAYLOAD = 'CUSTOM_PAYLOAD'
}

export interface MissionAction {
  type: ActionType;
  params?: Record<string, any>;
}

// Path types in 3D space
export enum PathType {
  STRAIGHT = 'STRAIGHT',
  BEZIER = 'BEZIER',
  ORBIT = 'ORBIT',
  GRID = 'GRID',
  POLYGON = 'POLYGON',
  PERIMETER = 'PERIMETER',
  CUSTOM = 'CUSTOM'
}

// Mission path segment
export interface PathSegment {
  id: string;
  type: PathType;
  waypoints: Waypoint[];
  // Control points for Bezier curves, etc.
  controlPoints?: LocalCoord[];
  // Speed for the entire segment
  speed?: number;
  // Ground projection waypoints (visualization only, not part of the actual flight path)
  groundProjections?: Waypoint[];
  // Optional display properties for visualization
  displayOptions?: {
    enforcePathOrder?: boolean;      // Ensure waypoints are rendered in exact order
    flightLineOrientation?: 'long_axis' | 'short_axis' | 'custom'; // Hint for renderer
    [key: string]: any;             // Allow additional custom properties
  };
  // Optional metadata for additional segment properties and customization
  metadata?: {
    isPhotogrammetry?: boolean;  // Indicates if this is a photogrammetry path
    isLidarMission?: boolean;    // Indicates if this is a LiDAR-only mission (corners only, no photo waypoints)
    originalSegmentId?: string;  // Used for path chunking
    chunkIndex?: number;         // Used for path chunking
    totalChunks?: number;        // Used for path chunking
    isPreview?: boolean;         // Indicates if this is a preview/simplified version
    originalLength?: number;     // Original waypoint count for previews
    [key: string]: any;          // Allow any additional metadata properties
  };
}

// GCP (Ground Control Point)
export interface GCP {
  id: string;
  name: string;
  // Global coordinates
  lat: number;
  lng: number;
  altitude: number;
  // Local coordinates
  local: LocalCoord;
  // Accuracy in meters
  accuracy?: number;
  // Visual properties
  color?: string;
  size?: number;
}

// Type definition for common safety parameters
export interface SafetyParams {
  rtlAltitude: number; // Return-to-Launch Altitude (meters, likely relative to home/takeoff)
  climbSpeed: number; // Default climb speed (m/s)
  failsafeAction: 'RTL' | 'LAND' | 'HOLD'; // Action on connection loss, etc.
  missionEndAction: 'RTL' | 'LAND' | 'HOLD'; // Action after final waypoint
  climbToAltitude: number; // Adding this property
  // Add other relevant parameters like geofence radius, max altitude, etc.
}

// Complete mission definition
export interface Mission {
  id: string;
  name: string;
  description?: string;
  // The region this mission is in
  region: Region;
  // All path segments in this mission
  pathSegments: PathSegment[];
  // Ground control points
  gcps: GCP[];
  // Start time (optional)
  startTime?: Date;
  // Estimated duration in seconds
  estimatedDuration?: number;
  // Default altitude (AGL) for new waypoints
  defaultAltitude: number;
  // Default speed (m/s) for segments
  defaultSpeed: number;
  // Created/modified timestamps
  createdAt: Date;
  updatedAt: Date;
  // Local coordinate system origin (lat/lng of 0,0,0)
  localOrigin: LatLng;
  takeoffPoint?: LocalCoord | null; // NEW: Optional takeoff point in local coords
  safetyParams?: SafetyParams; // NEW: Optional safety parameters
}

// Type for imported LiDAR or 3D model data
export interface MissionModel {
  id: string;
  name: string;
  type: 'LIDAR' | 'MESH' | 'POINTCLOUD' | 'TERRAIN';
  // URL to the model data
  url?: string;
  // URL to the thumbnail
  thumbnailUrl?: string;
  // For large models, specify level of detail
  lod?: number;
  // Position in local coordinates
  position: LocalCoord;
  // Rotation in degrees
  rotation: LocalCoord;
  // Scale factors
  scale: LocalCoord;
  // Loaded state
  isLoaded: boolean;
  // Visibility state
  isVisible: boolean;
}

export interface MissionState {
  currentMission: Mission | null;
  selectedWaypoint: Waypoint | null;
  selectedPathSegment: PathSegment | null;
  models: MissionModel[];
  // Simulation state
  isSimulating: boolean;
  simulationTime: number;
  simulationSpeed: number;
  // Live mode state
  isLive: boolean;
  // Current view mode
  viewMode: 'CESIUM' | 'LOCAL_3D';
  // Editing state
  isEditing: boolean;
} 