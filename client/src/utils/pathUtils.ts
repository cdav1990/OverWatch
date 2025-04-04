import { LocalCoord, Waypoint, PathSegment, PathType, AltitudeReference, CameraParams } from '../types/mission';
import { generateUUID } from './coordinateUtils';

/**
 * Defines the parameters needed to generate a raster path.
 */
export interface RasterParams {
  startPos: LocalCoord;     // Starting local coordinates (x, y, z - path generated relative to this at z=0 initially)
  rowLength: number;        // Length of each primary pass (along X for horizontal, Y for vertical)
  rowSpacing: number;       // Distance between passes (along Y for horizontal, X for vertical)
  numRows: number;          // Total number of passes (rows for horizontal, columns for vertical)
  altitude: number;         // Altitude for all waypoints (relative or absolute depends on altReference)
  altReference: AltitudeReference; // Altitude reference
  orientation: 'horizontal' | 'vertical'; // Direction of primary passes
  snakePattern: boolean;    // True for zigzag, false for return-to-start
  defaultSpeed?: number;    // Optional default speed for the segment
  cameraParams?: Partial<CameraParams>; // Optional default camera params
}

/**
 * Generates a single PathSegment representing a raster (lawnmower) pattern.
 * 
 * @param params - The parameters defining the raster pattern.
 * @returns A PathSegment containing the waypoints for the raster pattern.
 */
export function generateRasterPathSegment(params: RasterParams): PathSegment {
  const { 
    startPos,
    rowLength,
    rowSpacing,
    numRows,
    altitude,
    altReference,
    orientation,
    snakePattern,
    defaultSpeed = 5,
    cameraParams = { fov: 60, aspectRatio: 16/9, near: 0.1, far: 1000, heading: 0, pitch: -90 } // Default camera looking down
  } = params;

  const waypoints: Waypoint[] = [];

  if (numRows <= 0 || rowLength === 0 || rowSpacing === 0) {
    // Return an empty segment if parameters are invalid
    return {
      id: generateUUID(),
      type: PathType.GRID,
      waypoints: [],
      speed: defaultSpeed,
    };
  }

  let startX = startPos.x;
  let startY = startPos.y;
  // We use startPos.z from params later when creating waypoints, applying altitude directly
  // Assumes a local coordinate system where X is East, Y is North, Z is Up relative to startPos

  // Determine initial heading based on orientation
  let initialHeading = orientation === 'horizontal' ? 90 : 0; // 90 (East) for horizontal, 0 (North) for vertical

  for (let i = 0; i < numRows; i++) {
    let passStartX: number, passStartY: number, passEndX: number, passEndY: number;
    let headingThisPass = initialHeading;
    let isReversePass = snakePattern && (i % 2 !== 0);

    if (orientation === 'horizontal') {
      passStartY = startY + i * rowSpacing;
      passEndY = passStartY;
      if (isReversePass) {
        passStartX = startX + rowLength;
        passEndX = startX;
        headingThisPass = -90; // West
      } else {
        passStartX = startX;
        passEndX = startX + rowLength;
        headingThisPass = 90; // East
      }
      
      // Add return-to-start waypoints if not snake pattern and not the first row
      if (!snakePattern && i > 0) {
        const prevPassEndY = startY + (i - 1) * rowSpacing;
        // 1. Go from end of previous pass back to start X, at previous Y
        waypoints.push(createWaypoint(passStartX, prevPassEndY, altitude, altReference, defaultSpeed, cameraParams, headingThisPass));
        // 2. Go from start X, previous Y to start X, current Y (transition row)
        waypoints.push(createWaypoint(passStartX, passStartY, altitude, altReference, defaultSpeed, cameraParams, headingThisPass));
      }

    } else { // Vertical orientation
      passStartX = startX + i * rowSpacing;
      passEndX = passStartX;
      if (isReversePass) {
        passStartY = startY + rowLength;
        passEndY = startY;
        headingThisPass = 180; // South
      } else {
        passStartY = startY;
        passEndY = startY + rowLength;
        headingThisPass = 0; // North
      }

      // Add return-to-start waypoints if not snake pattern and not the first column
      if (!snakePattern && i > 0) {
        const prevPassEndX = startX + (i - 1) * rowSpacing;
        // 1. Go from end of previous pass back to start Y, at previous X
        waypoints.push(createWaypoint(prevPassEndX, passStartY, altitude, altReference, defaultSpeed, cameraParams, headingThisPass));
        // 2. Go from previous X, start Y to current X, start Y (transition column)
        waypoints.push(createWaypoint(passStartX, passStartY, altitude, altReference, defaultSpeed, cameraParams, headingThisPass));
      }
    }

    // Add waypoints for the start and end of the main pass
    // If it's the very first point and not snake, or any point in snake
    if (snakePattern || i === 0) {
         waypoints.push(createWaypoint(passStartX, passStartY, altitude, altReference, defaultSpeed, cameraParams, headingThisPass));
    }
    waypoints.push(createWaypoint(passEndX, passEndY, altitude, altReference, defaultSpeed, cameraParams, headingThisPass));
  }

  // Create the PathSegment
  const rasterSegment: PathSegment = {
    id: generateUUID(),
    type: PathType.GRID,
    waypoints: waypoints,
    speed: defaultSpeed,
  };

  return rasterSegment;
}

/**
 * Helper function to create a Waypoint object.
 */
function createWaypoint(
  x: number, 
  y: number, 
  altitude: number, 
  altReference: AltitudeReference,
  speed: number | undefined,
  baseCameraParams: Partial<CameraParams>,
  heading: number
): Waypoint {
  return {
    id: generateUUID(),
    lat: 0, // Global coords need calculation later if required
    lng: 0,
    altitude: altitude,
    altReference: altReference,
    local: { x: x, y: y, z: altitude }, // Apply altitude directly to z
    camera: { 
      fov: baseCameraParams.fov ?? 60,
      aspectRatio: baseCameraParams.aspectRatio ?? 16/9,
      near: baseCameraParams.near ?? 0.1,
      far: baseCameraParams.far ?? 1000,
      heading: heading, // Use calculated heading
      pitch: baseCameraParams.pitch ?? -90, // Default looking down
      roll: baseCameraParams.roll ?? 0
    },
    speed: speed,
    holdTime: 0, // Default hold time
  };
} 