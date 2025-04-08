import { LocalCoord, Waypoint, PathSegment, PathType, AltitudeReference, CameraParams } from '../types/mission';
import { generateUUID } from './coordinateUtils';
import * as THREE from 'three';
import { ActionType } from '../types/mission';
import { Mission, SafetyParams } from '../types/mission';
import { SceneObject, SelectedFaceInfo, HardwareState } from '../context/MissionContext';
import { calculateFOV, calculateSensorDimensions, getDOFCalculations, getEffectiveFocalLength, calculateFieldOfView } from './sensorCalculations';

/**
 * Defines different types of AGL (Above Ground Level) references.
 */
export enum AglReferenceType {
    GROUND_LEVEL = 'ground_level',  // Absolute ground level (Z=0)
    FACE_LOWEST = 'face_lowest',    // Lowest point of selected face
    FACE_AVERAGE = 'face_average',  // Average Z value of selected face
    TAKEOFF_POINT = 'takeoff_point' // Relative to takeoff point Z
}

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

/**
 * Calculates the total 3D distance of a path segment.
 * @param waypoints Array of waypoints in the segment.
 * @returns Total distance in meters, or 0 if fewer than 2 waypoints with local coords.
 */
export function calculateSegmentDistance(waypoints: Waypoint[]): number {
  if (!waypoints || waypoints.length < 2) {
    return 0;
  }

  let totalDistance = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const p1 = waypoints[i - 1]?.local;
    const p2 = waypoints[i]?.local;

    if (p1 && p2) {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;
      totalDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  }
  return totalDistance;
}

/**
 * Counts the number of TAKE_PHOTO actions within a segment's waypoints.
 * @param waypoints Array of waypoints in the segment.
 * @returns Total count of photo actions.
 */
export function countPhotosInSegment(waypoints: Waypoint[]): number {
  if (!waypoints) {
    return 0;
  }
  return waypoints.reduce((count, wp) => {
    if (wp.actions) {
      count += wp.actions.filter(action => action.type === ActionType.TAKE_PHOTO).length;
    }
    return count;
  }, 0);
}

/**
 * Calculates the estimated execution time for a segment.
 * @param distanceMeters Total segment distance in meters.
 * @param segmentSpeed Optional speed specific to the segment (m/s).
 * @param defaultMissionSpeed Default speed for the mission (m/s).
 * @returns Estimated time in seconds, or 0 if speed is invalid.
 */
export function calculateSegmentTime(distanceMeters: number, segmentSpeed: number | undefined, defaultMissionSpeed: number | undefined): number {
  const speed = segmentSpeed ?? defaultMissionSpeed ?? 1.0;
  if (speed <= 0 || !Number.isFinite(speed)) {
    console.warn(`Invalid speed calculated (${speed}), defaulting time to 0.`);
    return 0;
  }
  return distanceMeters / speed;
}

/**
 * Formats seconds into a MM:SS string.
 * @param totalSeconds Time in seconds.
 * @returns Formatted string (e.g., "02:35").
 */
export function formatTimeMMSS(totalSeconds: number): string {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
        return "00:00";
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// --- Placeholder for 2D Path Generation from Face ---

/**
 * Parameters for 2D path generation based on a selected face.
 */
export interface Generate2DPathParams {
    altitudeAGL: number;
    overlap: number; // Percentage (can exceed 100% for extreme edge coverage)
    aglReferenceType?: AglReferenceType; // Optional, defaults to FACE_LOWEST if not specified
    enableTerrainFollow?: boolean; // Whether to follow terrain contours
    useObstacleAvoidance?: boolean; // Whether to use obstacle avoidance for transit paths
    customPathWidth?: number; // Optional, width of the path in meters (overrides calculations)
    minSafeHeight?: number; // Optional, minimum safe flying height above ground (default: 2m)
    showGroundPath?: boolean; // Optional, whether to show a shadow of the path on the ground
    coverageMethod?: 'image-centers' | 'raster-lines'; // Optional, method used for generating coverage
    // Add other relevant params like camera angle, speed etc. later
}

// --- Helper Function Stubs ---

interface FootprintDimensions {
    footprintWidth: number;  // Width perpendicular to drone heading (usually sensor width projection)
    footprintHeight: number; // Height parallel to drone heading (usually sensor height projection)
}

/** Calculates camera footprint on the ground. */
function calculateFootprint(hardware: HardwareState, altitudeAGL: number): FootprintDimensions {
    if (!hardware.cameraDetails || !hardware.lensDetails) return { footprintWidth: 10, footprintHeight: 7 };
    
    // Ensure we have a minimum altitude for calculation purposes
    // This prevents division issues and ensures valid footprint
    const minAltitude = 1.0; // 1 meter minimum
    const safeAltitude = Math.max(altitudeAGL, minAltitude);
    
    try {
        const focalLength = getEffectiveFocalLength(hardware.lensDetails);
        // Horizontal FOV first (width)
        const hFovDeg = calculateFieldOfView(focalLength, hardware.cameraDetails.sensorWidth);
        // Vertical FOV (height)
        const vFovDeg = calculateFieldOfView(focalLength, hardware.cameraDetails.sensorHeight);

        const hFovRad = THREE.MathUtils.degToRad(hFovDeg);
        const vFovRad = THREE.MathUtils.degToRad(vFovDeg);

        const footprintWidth = 2 * safeAltitude * Math.tan(hFovRad / 2);
        const footprintHeight = 2 * safeAltitude * Math.tan(vFovRad / 2);
        
        // Ensure minimum footprint dimensions
        return { 
            footprintWidth: Math.max(footprintWidth, 1.0),
            footprintHeight: Math.max(footprintHeight, 0.75) 
        };
    } catch (e) {
        console.error("Error in calculateFootprint:", e);
        return { footprintWidth: 10, footprintHeight: 7 }; // Dummy fallback
    }
}

/** Projects 3D vertices onto the plane defined by the face normal and center. */
function projectFaceVerticesToPlane(vertices: THREE.Vector3[], center: THREE.Vector3, normal: THREE.Vector3): THREE.Vector3[] {
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, center);
    return vertices.map(v => {
        const projectedPoint = new THREE.Vector3();
        plane.projectPoint(v, projectedPoint); // Project onto the defined plane
        return projectedPoint;
    });
}

interface OBBResult {
    center: LocalCoord;
    axis1: THREE.Vector2; // Normalized direction of longest side in XY plane
    axis2: THREE.Vector2; // Normalized direction of shorter side in XY plane
    width: number;  // Length along axis2 (shorter side)
    length: number; // Length along axis1 (longer side)
}

// --- Convex Hull Helper (using Monotone Chain algorithm) ---

/** Computes the 2D convex hull of a set of points using Monotone Chain algorithm. */
function computeConvexHull(points: THREE.Vector2[]): THREE.Vector2[] {
    if (points.length <= 2) {
        return [...points]; // Hull is just the points themselves if 0, 1, or 2 points
    }

    // Sort points lexicographically (by x, then y)
    points.sort((a, b) => a.x - b.x || a.y - b.y);

    const lower: THREE.Vector2[] = [];
    const upper: THREE.Vector2[] = [];

    // Helper for cross product check (orientation)
    const cross_product = (o: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2): number => {
        return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    }

    // Build lower hull
    for (const p of points) {
        while (lower.length >= 2 && cross_product(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
            lower.pop();
        }
        lower.push(p);
    }

    // Build upper hull
    for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];
        while (upper.length >= 2 && cross_product(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
            upper.pop();
        }
        upper.push(p);
    }

    // Remove duplicates (last point of lower is first point of upper, first point of lower is last point of upper)
    lower.pop();
    upper.pop();

    return lower.concat(upper);
}

/** Calculates Oriented Bounding Box (OBB) of 2D points using Rotating Calipers on Convex Hull. */
function calculateOBB(points2D: THREE.Vector2[]): OBBResult {
    // Handle degenerate cases first
    if (points2D.length < 3) {
        console.warn(`Degenerate input (${points2D.length} points), using Axis-Aligned Bounding Box for OBB.`);
        return calculateAABB(points2D);
    }
    
    // Compute convex hull
    const hullPoints = computeConvexHull(points2D);
    const numHullPoints = hullPoints.length;
    
    if (numHullPoints < 3) {
        console.warn("Degenerate hull (< 3 points), using Axis-Aligned Bounding Box for OBB.");
        return calculateAABB(points2D);
    }

    // Rotating calipers algorithm to find minimum area enclosing rectangle
    let minArea = Infinity;
    let bestOBBResult: { 
        center: LocalCoord;
        axisA: THREE.Vector2; // Direction along which currentLength was measured
        axisB: THREE.Vector2; // Direction along which currentWidth was measured
        length: number;
        width: number;
    } | null = null;

    // Enhanced validation of hull edges
    // Check if points are too close together, which can cause numerical issues
    let hasValidEdges = false;
    for (let i = 0; i < numHullPoints; i++) {
        const p1 = hullPoints[i];
        const p2 = hullPoints[(i + 1) % numHullPoints]; // Next vertex, wrap around
        
        // Edge vector
        const edgeVec = new THREE.Vector2().subVectors(p2, p1);
        if (edgeVec.lengthSq() > 0.001) { // Threshold for valid edge length
            hasValidEdges = true;
            break;
        }
    }
    
    if (!hasValidEdges) {
        console.warn("Hull has no valid edges (all points too close), using AABB");
        return calculateAABB(points2D);
    }

    // Examine each edge of the convex hull
    for (let i = 0; i < numHullPoints; i++) {
        const p1 = hullPoints[i];
        const p2 = hullPoints[(i + 1) % numHullPoints]; // Next vertex, wrap around

        // Create edge vector and check if it's valid
        const edgeVector = new THREE.Vector2().subVectors(p2, p1);
        const edgeLengthSq = edgeVector.lengthSq();
        
        // Skip extremely short edges to avoid numerical issues
        if (edgeLengthSq < 0.001) continue; 
        
        // Normalize edge vector and calculate perpendicular vector
        // Clone to avoid modifying the original vectors
        const edgeDir = edgeVector.clone().normalize();
        // IMPORTANT: Ensure perpendicular vector is exactly perpendicular (numerical stability)
        const perpDir = new THREE.Vector2(-edgeDir.y, edgeDir.x).normalize();
        
        // Verify orthogonality - this is critical for consistent results
        const dotProduct = edgeDir.dot(perpDir);
        if (Math.abs(dotProduct) > 1e-6) {
            console.warn(`Edge and perpendicular vectors not fully orthogonal: ${dotProduct}`);
            // Force exact orthogonality by recalculating
            perpDir.set(-edgeDir.y, edgeDir.x).normalize();
        }

        // Project all hull points onto the current axes
        let minEdgeProj = Infinity;
        let maxEdgeProj = -Infinity;
        let minPerpProj = Infinity;
        let maxPerpProj = -Infinity;

        for (const point of hullPoints) {
            const edgeProj = point.dot(edgeDir);
            const perpProj = point.dot(perpDir);

            minEdgeProj = Math.min(minEdgeProj, edgeProj);
            maxEdgeProj = Math.max(maxEdgeProj, edgeProj);
            minPerpProj = Math.min(minPerpProj, perpProj);
            maxPerpProj = Math.max(maxPerpProj, perpProj);
        }

        const currentLength = maxEdgeProj - minEdgeProj;
        const currentWidth = maxPerpProj - minPerpProj;
        
        // Validate dimensions to avoid degenerate cases
        if (currentLength < 0.001 || currentWidth < 0.001) {
            console.warn(`Skipping degenerate OBB with length=${currentLength.toFixed(4)}, width=${currentWidth.toFixed(4)}`);
            continue;
        }
        
        const area = currentLength * currentWidth;

        // Check if this orientation gives a better (smaller area) OBB
        if (area < minArea && area > 0) {
            minArea = area;
            
            // Calculate center point in the rotated frame and transform back
            const centerEdgeProj = (minEdgeProj + maxEdgeProj) / 2;
            const centerPerpProj = (minPerpProj + maxPerpProj) / 2;
            
            // Use clean vectors for this calculation to prevent accumulating errors
            const centerVec = new THREE.Vector2()
                .addScaledVector(edgeDir, centerEdgeProj)
                .addScaledVector(perpDir, centerPerpProj);

            bestOBBResult = {
                center: { x: centerVec.x, y: centerVec.y, z: 0 },
                axisA: edgeDir.clone(), 
                axisB: perpDir.clone(), 
                length: currentLength,
                width: currentWidth,
            };
        }
    }

    if (!bestOBBResult) {
         console.error("OBB calculation failed unexpectedly after hull check, falling back to AABB.");
         return calculateAABB(points2D);
    }

    // --- Final OBB Construction with Axis Assignment --- 
    let finalOBB: OBBResult;
    
    // Make fresh copies of axes to avoid mutation issues
    // IMPORTANT: Create new vectors and ensure they're properly normalized
    const finalAxisA = new THREE.Vector2(bestOBBResult.axisA.x, bestOBBResult.axisA.y).normalize();
    const finalAxisB = new THREE.Vector2(bestOBBResult.axisB.x, bestOBBResult.axisB.y).normalize();
    
    // Verify orthogonality with improved precision
    const dotProduct = finalAxisA.dot(finalAxisB);
    if (Math.abs(dotProduct) > 1e-8) { // Stricter orthogonality check
        console.warn(`OBB axes not perfectly orthogonal, dot product: ${dotProduct.toFixed(10)}`);
        // Force exact orthogonality by recalculating the second axis
        finalAxisB.set(-finalAxisA.y, finalAxisA.x).normalize();
    }

    // Ensure consistent orientation (positive Z cross product)
    const crossZ = finalAxisA.x * finalAxisB.y - finalAxisA.y * finalAxisB.x;
    if (crossZ < 0) {
        finalAxisB.multiplyScalar(-1);
    }

    // Assign axes to ensure axis1 is always the longer dimension
    if (bestOBBResult.length >= bestOBBResult.width) {
        finalOBB = {
            center: bestOBBResult.center,
            axis1: finalAxisA,       // axis1 = length axis (longer)
            axis2: finalAxisB,       // axis2 = width axis (shorter)
            length: bestOBBResult.length,
            width: bestOBBResult.width,
        };
    } else {
        finalOBB = {
            center: bestOBBResult.center,
            axis1: finalAxisB,       // axis1 = length axis (originally width)
            axis2: finalAxisA,       // axis2 = width axis (originally length)
            length: bestOBBResult.width, // Swap dimensions
            width: bestOBBResult.length,
        };
    }
    
    // --- Force minimum dimensions ---
    if (finalOBB.length < 0.1) finalOBB.length = 0.1;
    if (finalOBB.width < 0.1) finalOBB.width = 0.1;
    
    // --- Verify OBB properties ---
    console.log("Calculated OBB (Final):");
    console.log(`  Center: (${finalOBB.center.x.toFixed(2)}, ${finalOBB.center.y.toFixed(2)})`);
    console.log(`  Length: ${finalOBB.length.toFixed(2)}, Width: ${finalOBB.width.toFixed(2)}`);
    console.log(`  Axis1 (length): (${finalOBB.axis1.x.toFixed(4)}, ${finalOBB.axis1.y.toFixed(4)}), magnitude: ${finalOBB.axis1.length().toFixed(4)}`);
    console.log(`  Axis2 (width): (${finalOBB.axis2.x.toFixed(4)}, ${finalOBB.axis2.y.toFixed(4)}), magnitude: ${finalOBB.axis2.length().toFixed(4)}`);
    console.log(`  Orthogonality check (dot product): ${finalOBB.axis1.dot(finalOBB.axis2).toFixed(10)}`);
    console.log(`  Cross product check (should be positive): ${(finalOBB.axis1.x * finalOBB.axis2.y - finalOBB.axis1.y * finalOBB.axis2.x).toFixed(6)}`);
    // --- End Verification ---

    return finalOBB;
}

/**
 * Calculate Axis-Aligned Bounding Box as fallback when OBB calculation fails
 */
function calculateAABB(points2D: THREE.Vector2[]): OBBResult {
    if (points2D.length === 0) {
        console.error("No points provided to calculateAABB, returning default box");
        return {
            center: { x: 0, y: 0, z: 0 },
            axis1: new THREE.Vector2(1, 0),
            axis2: new THREE.Vector2(0, 1),
            length: 1,
            width: 1
        };
    }
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points2D.forEach(v => {
        minX = Math.min(minX, v.x);
        minY = Math.min(minY, v.y);
        maxX = Math.max(maxX, v.x);
        maxY = Math.max(maxY, v.y);
    });
    
    // Ensure we have at least some dimensions even in degenerate cases
    const length = Math.max(0.1, maxX - minX);
    const width = Math.max(0.1, maxY - minY);
    const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: 0 };
    
    // Standard aligned axes
    const axis1 = new THREE.Vector2(1, 0);
    const axis2 = new THREE.Vector2(0, 1);
    
    return { center, axis1, axis2, width, length };
}

/** Generates coverage waypoints using a raster pattern based on OBB. */
function generateCoverageWaypoints(
    obb: OBBResult,
    footprint: FootprintDimensions,
    overlap: number,
    altitude: number, // Ignored
    turnaroundBuffer: number
): LocalCoord[] {
    console.log("Generating Coverage Waypoints v11 - OBB:", obb, "Footprint:", footprint, "Overlap:", overlap);

    const waypoints: LocalCoord[] = [];
    
    // --- Verify OBB validity ---
    if (!obb || !obb.center || !obb.axis1 || !obb.axis2 || obb.length <= 0 || obb.width <= 0) {
        console.error("Invalid OBB provided to generateCoverageWaypoints");
        return [];
    }
    
    // --- CRITICAL: Create fresh copies of all vectors to prevent mutation issues ---
    const center = new THREE.Vector2(obb.center.x, obb.center.y);
    // Force normalize the axes to ensure consistent behavior
    const axis1 = new THREE.Vector2(obb.axis1.x, obb.axis1.y).normalize();
    const axis2 = new THREE.Vector2(obb.axis2.x, obb.axis2.y).normalize();
    
    // --- Verify orthogonality of axes with higher precision---
    const axisDot = axis1.dot(axis2);
    if (Math.abs(axisDot) > 1e-8) {
        console.warn(`Axes not sufficiently orthogonal (dot=${axisDot.toFixed(10)}), correcting axis2`);
        // Force axis2 to be perpendicular to axis1 with precise orthogonality
        axis2.set(-axis1.y, axis1.x).normalize();
    }
    
    // --- Determine Flight Direction & Dimensions --- 
    let flightDirectionAxis: THREE.Vector2;
    let perpendicularAxis: THREE.Vector2;
    let scanLength: number;
    let scanWidth: number;
    let footprintScanWidth: number; 

    // Choose flight direction along the longer dimension
    if (obb.length >= obb.width) {
        flightDirectionAxis = axis1.clone();
        perpendicularAxis = axis2.clone();
        scanLength = obb.length;
        scanWidth = obb.width;
        footprintScanWidth = footprint.footprintWidth; 
        console.log(`Flying along OBB Length (axis1), scanWidth=${scanWidth.toFixed(2)}, footprintScanWidth=${footprintScanWidth.toFixed(2)}`);
    } else {
        flightDirectionAxis = axis2.clone();
        perpendicularAxis = axis1.clone();
        scanLength = obb.width; 
        scanWidth = obb.length; 
        footprintScanWidth = footprint.footprintHeight; 
        console.log(`Flying along OBB Width (axis2), scanWidth=${scanWidth.toFixed(2)}, footprintScanWidth=${footprintScanWidth.toFixed(2)}`);
    }
    
    // --- Debug log vectors ---
    console.log(`OBB Center: x=${center.x.toFixed(2)}, y=${center.y.toFixed(2)}`);
    console.log("Flight Direction Axis (normalized):", 
        `x=${flightDirectionAxis.x.toFixed(6)}, y=${flightDirectionAxis.y.toFixed(6)}, magnitude=${flightDirectionAxis.length().toFixed(6)}`);
    console.log("Perpendicular Axis (normalized):", 
        `x=${perpendicularAxis.x.toFixed(6)}, y=${perpendicularAxis.y.toFixed(6)}, magnitude=${perpendicularAxis.length().toFixed(6)}`);
    
    // --- Check axis direction with higher precision ---
    // This is a verification step to ensure our axes are properly oriented
    const crossZ = flightDirectionAxis.x * perpendicularAxis.y - flightDirectionAxis.y * perpendicularAxis.x;
    if (Math.abs(crossZ) < 1e-8) {
        console.warn("Axes appear to be parallel, fixing perpendicular axis");
        perpendicularAxis.set(-flightDirectionAxis.y, flightDirectionAxis.x).normalize();
    } else if (crossZ < 0) {
        console.warn("Axis cross product is negative, flipping perpendicular axis for consistent orientation");
        perpendicularAxis.multiplyScalar(-1);
    }
    
    // --- End Flight Direction --- 

    // Validate footprint dimensions
    if (footprintScanWidth <= 0 || scanWidth <= 0) { 
        console.warn("Invalid dimensions for coverage generation. footprintScanWidth:", footprintScanWidth, "scanWidth:", scanWidth);
        return []; 
    }

    // Calculate line spacing based on overlap percentage with validation
    const lineSpacing = Math.max(0.1, footprintScanWidth * (1 - overlap / 100));
    if (lineSpacing <= 0) { 
        console.warn(`Line spacing (${lineSpacing}) must be positive. Check overlap %.`);
        return []; 
    }

    // --- Line Count Calculation (v11 - Improved Precision) ---
    // Always have minimum 2 lines for better coverage
    let numLines = Math.max(2, Math.ceil(scanWidth / lineSpacing));
    
    console.log(`Calculated numLines: ${numLines}, lineSpacing: ${lineSpacing.toFixed(2)}m, scanWidth: ${scanWidth.toFixed(2)}m`);
    
    // --- Layout Lines Evenly with Improved Precision ---
    // Distribute lines evenly across the width
    let actualSpacing = numLines > 1 ? scanWidth / (numLines - 1) : scanWidth;
    
    // Use half-length with buffer for flight lines
    const halfScanLength = scanLength / 2;
    const startAlongFlightAxis = -halfScanLength - turnaroundBuffer;
    const endAlongFlightAxis = halfScanLength + turnaroundBuffer;

    // Start from negative half width and distribute lines
    const startOffset = -scanWidth / 2;
    
    // Create test vectors to verify calculations
    const testPerpVec = center.clone().addScaledVector(perpendicularAxis, scanWidth/2);
    const testFlightVec = center.clone().addScaledVector(flightDirectionAxis, scanLength/2);
    console.log(`Test vectors from OBB center:`);
    console.log(`  Perp (+width/2): x=${testPerpVec.x.toFixed(4)}, y=${testPerpVec.y.toFixed(4)}`);
    console.log(`  Flight (+length/2): x=${testFlightVec.x.toFixed(4)}, y=${testFlightVec.y.toFixed(4)}`);

    // --- Generate lines and waypoints with improved precision ---
    for (let i = 0; i < numLines; i++) {
        // Calculate offset perpendicular to flight direction
        const currentOffsetOnPerpendicularAxis = 
            numLines > 1 ? startOffset + i * actualSpacing : 0;

        // Create start and end vectors fresh (don't reuse or modify existing vectors)
        const startPointVec = new THREE.Vector2();
        startPointVec.copy(center);
        startPointVec.addScaledVector(perpendicularAxis, currentOffsetOnPerpendicularAxis);
        startPointVec.addScaledVector(flightDirectionAxis, startAlongFlightAxis);

        const endPointVec = new THREE.Vector2();
        endPointVec.copy(center);
        endPointVec.addScaledVector(perpendicularAxis, currentOffsetOnPerpendicularAxis);
        endPointVec.addScaledVector(flightDirectionAxis, endAlongFlightAxis);

        // Log waypoints for diagnostics (first, last and middle lines)
        if (i === 0 || i === numLines - 1 || i === Math.floor(numLines/2)) {
            console.log(`Line ${i} waypoints:`);
            console.log(`  Start: x=${startPointVec.x.toFixed(4)}, y=${startPointVec.y.toFixed(4)}`);
            console.log(`  End: x=${endPointVec.x.toFixed(4)}, y=${endPointVec.y.toFixed(4)}`);
            
            // Also log the vector along the flight line to verify direction consistency
            const lineVec = new THREE.Vector2().subVectors(endPointVec, startPointVec).normalize();
            console.log(`  Flight line vector: x=${lineVec.x.toFixed(6)}, y=${lineVec.y.toFixed(6)}`);
            
            // Verify this vector matches expected flight direction
            const dotWithExpected = lineVec.dot(flightDirectionAxis);
            console.log(`  Direction match check (dot with expected): ${dotWithExpected.toFixed(6)}`);
        }

        // Add waypoints with snake pattern (alternate flight direction)
        if (i % 2 === 0) { 
            waypoints.push({ x: startPointVec.x, y: startPointVec.y, z: 0 });
            waypoints.push({ x: endPointVec.x, y: endPointVec.y, z: 0 });
        } else { 
            waypoints.push({ x: endPointVec.x, y: endPointVec.y, z: 0 });
            waypoints.push({ x: startPointVec.x, y: startPointVec.y, z: 0 });
        }
    }

    console.log(`Generated ${waypoints.length} waypoints for coverage pattern`);
    
    if (waypoints.length === 0) {
        console.warn("No waypoints were generated!");
    }
    
    return waypoints;
}

/**
 * Generates a 2D raster path segment covering a selected face.
 */
export function generate2DPathFromFace(
    selectedFace: SelectedFaceInfo,
    mission: Mission,
    hardware: HardwareState | null,
    sceneObjects: SceneObject[], 
    params: Generate2DPathParams
): PathSegment | null {
    console.log("Generating 2D path from face with params:", params);

    if (!selectedFace || !hardware?.cameraDetails || !hardware?.lensDetails || !mission.takeoffPoint) {
        console.error("Missing required data for 2D path generation (face, hardware, takeoff point).");
        return null;
    }
    
    // Find the actual scene object to get its rotation information
    const sceneTargetObject = sceneObjects.find(obj => obj.id === selectedFace.objectId);
    if (sceneTargetObject) {
        console.log("Target object found in scene:", {
            id: sceneTargetObject.id,
            rotation: sceneTargetObject.rotation,
            position: sceneTargetObject.position
        });
    } else {
        console.warn("Target object not found in scene objects!");
    }
    
    // Check if we have enough vertices to define a face
    if (!selectedFace.vertices || selectedFace.vertices.length < 3) {
        console.error("Selected face must have at least 3 vertices to generate a path.");
        return null;
    }

    const DEFAULT_FLIGHT_SPEED = 1.0;
    const takeoffPoint = mission.takeoffPoint!;
    const targetAltitudeAGL = params.altitudeAGL;
    const missionEndAction = mission.safetyParams?.missionEndAction ?? 'RTL';
    
    // Set default values for new parameters if not provided
    const aglReferenceType = params.aglReferenceType || AglReferenceType.FACE_LOWEST;
    const enableTerrainFollow = params.enableTerrainFollow || false;
    const useObstacleAvoidance = params.useObstacleAvoidance || false;
    const minSafeHeight = params.minSafeHeight || 2.0; // Default minimum safe height is 2m
    const showGroundPath = params.showGroundPath || false;

    // --- Altitude Calculations ---
    const faceVerticesVec = selectedFace.vertices.map(v => new THREE.Vector3(v.x, v.y, v.z));
    
    // Calculate face center and statistics
    const faceCenterVec = new THREE.Vector3();
    faceVerticesVec.forEach(v => faceCenterVec.add(v));
    faceCenterVec.divideScalar(faceVerticesVec.length);
    
    // Find min, max, and average Z values of the face
    const minFaceZ = faceVerticesVec.reduce((min, v) => Math.min(min, v.z), Infinity);
    const maxFaceZ = faceVerticesVec.reduce((max, v) => Math.max(max, v.z), -Infinity);
    const averageFaceZ = faceVerticesVec.reduce((sum, v) => sum + v.z, 0) / faceVerticesVec.length;
    
    if (isNaN(averageFaceZ)) { console.error("Average Face Z is NaN"); return null; }
    
    // Determine AGL reference point based on selected type
    let aglReference: number;
    switch (aglReferenceType) {
        case AglReferenceType.GROUND_LEVEL:
            aglReference = 0; // Absolute ground at Z=0
            break;
        case AglReferenceType.FACE_LOWEST:
            aglReference = minFaceZ;
            break;
        case AglReferenceType.FACE_AVERAGE:
            aglReference = averageFaceZ;
            break;
        case AglReferenceType.TAKEOFF_POINT:
            aglReference = takeoffPoint.z;
            break;
        default:
            aglReference = minFaceZ; // Default to lowest point of face
    }
    
    // Apply a minimum positive AGL reference to prevent flying too low
    // This ensures that even if the reference height is negative, we'll use a higher value
    const safetyMinimumAGL = Math.max(aglReference, 0);
    
    // Calculate target altitude by adding AGL to the reference point
    // Ensure minimum altitude is positive and above the object
    const targetAltitude = Math.max(
        safetyMinimumAGL + targetAltitudeAGL,
        maxFaceZ + minSafeHeight // Apply the configurable minimum safe height
    );
    
    console.log(`Face Stats - Min Z: ${minFaceZ.toFixed(2)}, Max Z: ${maxFaceZ.toFixed(2)}, Avg Z: ${averageFaceZ.toFixed(2)}`);
    console.log(`Raw AGL Reference: ${aglReference.toFixed(2)}, Safety Minimum: ${safetyMinimumAGL.toFixed(2)}`);
    console.log(`AGL Value: ${targetAltitudeAGL}, Min Safe Height: ${minSafeHeight}m, Target Abs Alt: ${targetAltitude.toFixed(2)}`);
    console.log(`Terrain Following: ${enableTerrainFollow}, Obstacle Avoidance: ${useObstacleAvoidance}, Show Ground Path: ${showGroundPath}`);
    
    // --- Identify potential obstacles for avoidance ---
    const obstacles: SceneObject[] = [];
    if (useObstacleAvoidance) {
        obstacles.push(...sceneObjects.filter(obj => 
            obj.id !== selectedFace.objectId && // Not the currently selected object
            obj.class === 'obstacle' // Explicitly marked as obstacle
        ));
        console.log(`Found ${obstacles.length} obstacle(s) for path planning.`);
    }
    
    // Find the actual scene object to get its max height
    const objectHeightSource = sceneObjects.find(obj => obj.id === selectedFace.objectId);
    // Estimate object top Z (assuming centered origin for box type)
    const sceneObjectMaxZ = objectHeightSource ? (objectHeightSource.position.z + (objectHeightSource.height || 0) / 2) : maxFaceZ;
    console.log(`Object Estimated Max Z: ${sceneObjectMaxZ.toFixed(2)}`);

    const safetyClimbAltAGL = mission.safetyParams?.climbToAltitude ?? 40;
    const safetyRtlAltAGL = mission.safetyParams?.rtlAltitude ?? 50;
    const higherSafetyAltAGL = Math.max(safetyClimbAltAGL, safetyRtlAltAGL);
    // Safe altitude: Max of (Safety Alt above Takeoff, Safety Alt above Object Top, Target Coverage Alt) + Buffer
    const safeAltitude = Math.max(
        takeoffPoint.z + higherSafetyAltAGL,
        sceneObjectMaxZ + higherSafetyAltAGL, 
        targetAltitude
    ) + 5; 
    console.log(`Safe Abs Alt: ${safeAltitude.toFixed(2)}`);
    
    // --- Project Face Using Normal Vector (if available) ---
    // MODIFIED: Now always projects to World XY plane
    const faceProjection = projectFaceForPath(
        faceVerticesVec,
        faceCenterVec,
        selectedFace.normal,
        sceneTargetObject?.rotation
    );

    const projectedVerticesXY = faceProjection.projectedPoints;

    console.log("Face Points projected for path planning (World XY):"); // Updated log message
    projectedVerticesXY.forEach((p, i) => {
        if (i < 5) { // Limit output to first 5 points
            console.log(`  [${i}]: x: ${p.x.toFixed(2)}, y: ${p.y.toFixed(2)}`);
        }
    });
    if (projectedVerticesXY.length > 5) {
        console.log(`  ... and ${projectedVerticesXY.length - 5} more points`);
    }

    // *** ADD: Calculate the XY projection of the 3D face center ***
    const faceCenterXY = new THREE.Vector2(faceCenterVec.x, faceCenterVec.y);
    console.log(`Projected 3D Face Center (XY): (${faceCenterXY.x.toFixed(2)}, ${faceCenterXY.y.toFixed(2)})`);

    // 1. Calculate Footprint
    const footprint = calculateFootprint(hardware, targetAltitudeAGL);
    if (!footprint || footprint.footprintWidth <= 0 || footprint.footprintHeight <= 0) {
        console.error("Invalid footprint calculated.");
        return null;
    }
    
    // Apply custom path width if provided
    if (params.customPathWidth && params.customPathWidth > 0) {
        const customWidth = params.customPathWidth;
        console.log(`Using custom path width: ${customWidth}m (original: ${footprint.footprintWidth.toFixed(2)}m)`);
        footprint.footprintWidth = customWidth;
        const aspectRatio = footprint.footprintHeight / footprint.footprintWidth;
        footprint.footprintHeight = customWidth * aspectRatio;
    }
    
    console.log("Final Footprint (m):", footprint);
    
    // 2. Calculate OBB using the world XY projected points
    const obbResult = calculateOBB(projectedVerticesXY);

    // --- Simplified Axis Determination using OBB result --- 
    // calculateOBB guarantees axis1 is the longer dimension in the XY plane
    console.log("Using OBB results directly from World XY projection.");
    const obbAxis1 = new THREE.Vector2(obbResult.axis1.x, obbResult.axis1.y).normalize();
    const obbAxis2 = new THREE.Vector2(obbResult.axis2.x, obbResult.axis2.y).normalize();

    let faceCoordinateSystem: { 
        center: THREE.Vector2;
        xAxis: THREE.Vector2; // Always the longer dimension
        yAxis: THREE.Vector2; // Always the shorter dimension
        length: number;       // Measurement along xAxis
        width: number;        // Measurement along yAxis
    };
    
    faceCoordinateSystem = {
        center: new THREE.Vector2(obbResult.center.x, obbResult.center.y), 
        xAxis: obbAxis1, // Use OBB long axis (in XY plane) as primary
        yAxis: obbAxis2, // Use OBB short axis (in XY plane) as secondary
        length: obbResult.length, // Dimension along primary axis
        width: obbResult.width,   // Dimension along secondary axis
    };
    
    // --- Final Orthogonality & Handedness Check --- 
    // Ensures the coordinate system is well-behaved
    const finalAxisDot = faceCoordinateSystem.xAxis.dot(faceCoordinateSystem.yAxis);
    if (Math.abs(finalAxisDot) > 1e-8) {
        console.warn(`Final axes not perfectly orthogonal (dot=${finalAxisDot.toFixed(10)}), fixing Y axis`);
        faceCoordinateSystem.yAxis.set(
            -faceCoordinateSystem.xAxis.y,
            faceCoordinateSystem.xAxis.x
        ).normalize();
    }
    const crossZCheck = faceCoordinateSystem.xAxis.x * faceCoordinateSystem.yAxis.y - faceCoordinateSystem.yAxis.y * faceCoordinateSystem.xAxis.x; // Check cross product sign
    if (crossZCheck < 0) {
        console.log("Flipping final Y axis for consistent orientation");
        faceCoordinateSystem.yAxis.multiplyScalar(-1);
    }

    // Log the final chosen coordinate system
    console.log("Unified Face Coordinate System (OBB Direct from XY Projection):");
    console.log(`  Center: (${faceCoordinateSystem.center.x.toFixed(2)}, ${faceCoordinateSystem.center.y.toFixed(2)})`);
    console.log(`  Primary Axis (Flight Dir - xAxis): (${faceCoordinateSystem.xAxis.x.toFixed(4)}, ${faceCoordinateSystem.xAxis.y.toFixed(4)})`);
    console.log(`  Secondary Axis (yAxis): (${faceCoordinateSystem.yAxis.x.toFixed(4)}, ${faceCoordinateSystem.yAxis.y.toFixed(4)})`);
    console.log(`  Length (along xAxis): ${faceCoordinateSystem.length.toFixed(2)}, Width (along yAxis): ${faceCoordinateSystem.width.toFixed(2)}`);

    // 3. Define Turnaround Buffer
    const turnaroundBufferDistance = 5.0;

    // 4. Generate Coverage Waypoints
    let coverageWaypointsCoordsXY: LocalCoord[] = [];

    // Determine which coverage algorithm to use
    const coverageMethod = params.coverageMethod || 'image-centers';

    if (coverageMethod === 'image-centers') {
        // Use the improved image-center approach
        const faceNormal = selectedFace.normal ?
            new THREE.Vector3(selectedFace.normal.x, selectedFace.normal.y, selectedFace.normal.z) :
            undefined;

        // console.log("Calling generateImageCenterCoverage with OBB Direct system and Projected Face Center");
        // *** UPDATED Call to use the new function name (or modified generateImageCenterCoverage) ***
        console.log("Calling generateCoverageGridFromCenter...");
        coverageWaypointsCoordsXY = generateCoverageGridFromCenter( // <--- Updated function name
            faceVerticesVec,
            projectedVerticesXY,
            { // OBB structure (used for orientation)
                center: obbResult.center,
                axis1: faceCoordinateSystem.xAxis,
                axis2: faceCoordinateSystem.yAxis,
                length: faceCoordinateSystem.length,
                width: faceCoordinateSystem.width
            },
            faceCenterXY, // Pass the actual projected face center
            footprint,
            params.overlap,
            targetAltitude,
            faceNormal,
            faceProjection.projectionAxes
        );
    } else {
       // Use the raster-line approach
        console.log("Using traditional raster-line coverage algorithm");
        coverageWaypointsCoordsXY = generateCoverageWaypoints(
             obbResult, // Pass the original OBB result (axis1 guaranteed longer in XY)
            footprint,
            params.overlap,
            0, // Altitude added later
            turnaroundBufferDistance
        );
    }
    
    if (!coverageWaypointsCoordsXY || coverageWaypointsCoordsXY.length === 0) {
        console.error(`Failed to generate coverage waypoints with ${coverageMethod} algorithm`);
        return null;
    }
    
    console.log(`Generated ${coverageWaypointsCoordsXY.length} coverage waypoints using ${coverageMethod} method`);
    
    // Add Z-coordinate elevation with terrain following if needed
    let coverageWaypoints3D: LocalCoord[] = [];
    
    if (enableTerrainFollow) {
        // --- Improved Terrain Following Implementation ---
        console.log("Using improved terrain following mode");
        
        // Sample face at each waypoint to get appropriate height
        for (const wpXY of coverageWaypointsCoordsXY) {
            const xyPos = new THREE.Vector2(wpXY.x, wpXY.y);
            
            // Start with default target altitude (which already includes safety margin)
            let waypointZ = targetAltitude;
            
            // Find the nearest face vertices for interpolation
            const vertexDistances: {vertex: THREE.Vector3, distance: number}[] = [];
            for (const vertex of faceVerticesVec) {
                const vertexXY = new THREE.Vector2(vertex.x, vertex.y);
                const distance = xyPos.distanceTo(vertexXY);
                vertexDistances.push({vertex, distance});
            }
            
            // Sort by distance (closest first)
            vertexDistances.sort((a, b) => a.distance - b.distance);
            
            // Check if waypoint is above the face
            const isOverFace = isPointInPolygon(xyPos, projectedVerticesXY);
            
            if (isOverFace) {
                // Use inverse distance weighted interpolation from the 3 closest vertices
                // This creates a more natural terrain following effect
                const nearestThree = vertexDistances.slice(0, 3);
                
                // Ensure we have valid distances to avoid division by zero
                const totalWeights = nearestThree.reduce((sum, {distance}) => {
                    return sum + (distance > 0.001 ? 1/distance : 1000);
                }, 0);
                
                if (totalWeights > 0) {
                    let interpolatedZ = 0;
                    for (const {vertex, distance} of nearestThree) {
                        const weight = distance > 0.001 ? 1/distance : 1000;
                        interpolatedZ += (vertex.z * weight) / totalWeights;
                    }
                    
                    // Apply AGL offset to the interpolated terrain height
                    // Ensure we never go below the original target altitude 
                    // (which already includes safety margins)
                    waypointZ = Math.max(
                        interpolatedZ + targetAltitudeAGL,
                        targetAltitude
                    );
                }
            }
            
            // Add final waypoint with calculated height
            coverageWaypoints3D.push({ x: wpXY.x, y: wpXY.y, z: waypointZ });
        }
    } else {
        // Standard fixed-altitude waypoints
        // If waypoints already have Z values from image-centers method, preserve them
        coverageWaypoints3D = coverageWaypointsCoordsXY.map(wpXY => {
            // If the point already has a valid Z coordinate, use it
            // Otherwise apply the target altitude
            const z = (wpXY.z !== undefined && wpXY.z > 0) ? wpXY.z : targetAltitude;
            return { x: wpXY.x, y: wpXY.y, z: z };
        });
    }
    
    console.log("Generated Coverage Waypoints (3D World Coords):");
    // Only log a sample of points to avoid flooding console
    const maxLogPoints = Math.min(5, coverageWaypoints3D.length);
    for (let i = 0; i < maxLogPoints; i++) {
        const p = coverageWaypoints3D[i];
        console.log(`  [${i}]: x: ${p.x.toFixed(2)}, y: ${p.y.toFixed(2)}, z: ${p.z.toFixed(2)}`);
    }
    if (coverageWaypoints3D.length > maxLogPoints) {
        console.log(`  ... and ${coverageWaypoints3D.length - maxLogPoints} more points`);
    }
    
    // Rest of the function remains the same...
    
    // Create Waypoint objects for coverage, add actions
    const coverageWaypoints: Waypoint[] = coverageWaypoints3D.map(coord => {
        const relativeAltitude = coord.z - aglReference; // Calculate relative altitude from AGL reference point
        return {
            id: generateUUID(),
            lat: 0, lng: 0,
            local: coord,
            altitude: relativeAltitude, // Store AGL altitude
            altReference: AltitudeReference.RELATIVE, // Always use AGL
            camera: {
                fov: 60,
                aspectRatio: 16/9,
                near: 0.1,
                far: 1000,
                heading: calculateCameraHeading(hardware), // Calculate from drone direction
                pitch: -90, // Directly downward
                roll: 0
            } as CameraParams,
            actions: [{ type: ActionType.TAKE_PHOTO }]
        };
    });
    
    // Calculate camera heading based on flight direction
    function calculateCameraHeading(hardware: HardwareState | null): number {
        // Default heading pointing down (nadir)
        if (!hardware) return 0;
        
        // Use drone's default heading or sensor alignment if available
        // For now just return 0 (North) as default
        return 0;
    }
    
    // --- Create Ground Path Projection if requested ---
    const groundPathWaypoints: Waypoint[] = [];
    
    if (showGroundPath) {
        console.log("Generating ground path projection");
        
        // Create a projection of the path on the ground (Z=0 or lowest face point)
        const groundZ = Math.min(0, minFaceZ); // Use minimum of 0 or lowest face point
        
        // Get the waypoints from the generated coverage pattern 
        // and simply project them down to ground level
        // This ensures the ground projection follows EXACTLY the same pattern
        // as the flight path
        const groundProjections = coverageWaypoints.map(wp => {
            if (!wp.local) return null;
            
            return {
                id: generateUUID(),
                lat: 0, lng: 0,
                local: { 
                    x: wp.local.x, 
                    y: wp.local.y, 
                    z: groundZ
                },
                altitude: 0,
                altReference: AltitudeReference.RELATIVE,
                camera: {} as CameraParams,
                displayOptions: { 
                    isGroundProjection: true,
                    projectionOfWaypoint: wp.id,
                    displayColor: 'rgba(255, 255, 0, 0.5)',
                    displayStyle: 'dashed',
                    pathOrder: groundPathWaypoints.length // Maintain exact ordering
                }
            };
        }).filter(wp => wp !== null) as Waypoint[];
        
        // Add all valid ground projections to our waypoints array
        groundPathWaypoints.push(...groundProjections);
        
        console.log(`Created ${groundPathWaypoints.length} ground projection waypoints in the same path order as flight path`);
    }
    
    // Ensure coverage waypoints were created and have local coords
    if (coverageWaypoints.length === 0 || !coverageWaypoints[0].local || !coverageWaypoints[coverageWaypoints.length - 1].local) {
        console.error("Failed to create valid coverage waypoints with local coordinates.");
        return null;
    }
    const firstCoverageWp = coverageWaypoints[0];
    const lastCoverageWp = coverageWaypoints[coverageWaypoints.length - 1];

    // --- Create Transit Paths (With Optional Obstacle Avoidance) ---
    const takeoffWp: Waypoint = { id: generateUUID(), lat: 0, lng: 0, local: takeoffPoint, altitude: 0, altReference: AltitudeReference.RELATIVE, camera: {} as CameraParams };
    const climbWpLocal = { x: takeoffPoint.x, y: takeoffPoint.y, z: safeAltitude }; 
    const climbWp: Waypoint = { id: generateUUID(), lat: 0, lng: 0, local: climbWpLocal, altitude: safeAltitude - takeoffPoint.z, altReference: AltitudeReference.RELATIVE, camera: {} as CameraParams };

    let transitStartWaypoints: Waypoint[] = [];
    let transitEndWaypoints: Waypoint[] = [];
    
    if (useObstacleAvoidance && obstacles.length > 0) {
        // --- Implement Obstacle Avoidance for Transit Paths ---
        
        // Generate path from climb point to first coverage waypoint
        const startTransitPath = generateObstacleAvoidingPath(
            { x: takeoffPoint.x, y: takeoffPoint.y, z: safeAltitude },
            { x: firstCoverageWp.local!.x, y: firstCoverageWp.local!.y, z: safeAltitude },
            obstacles,
            safeAltitude
        );
        
        // Add first coverage point after descending from safe altitude
        startTransitPath.push({ 
            x: firstCoverageWp.local!.x, 
            y: firstCoverageWp.local!.y, 
            z: firstCoverageWp.local!.z 
        });
        
        // Generate path from last coverage waypoint to takeoff/landing point
        const endTransitPath = generateObstacleAvoidingPath(
            { x: lastCoverageWp.local!.x, y: lastCoverageWp.local!.y, z: safeAltitude },
            { x: takeoffPoint.x, y: takeoffPoint.y, z: safeAltitude },
            obstacles,
            safeAltitude
        );
        
        // Convert transit paths to Waypoints
        transitStartWaypoints = startTransitPath.map(point => ({
            id: generateUUID(),
            lat: 0, lng: 0,
            local: point,
            altitude: point.z - aglReference,
            altReference: AltitudeReference.RELATIVE,
            camera: {} as CameraParams
        }));
        
        transitEndWaypoints = [lastCoverageWp, ...endTransitPath.map(point => ({
            id: generateUUID(),
            lat: 0, lng: 0,
            local: point,
            altitude: point.z - aglReference,
            altReference: AltitudeReference.RELATIVE,
            camera: {} as CameraParams
        }))];
    } else {
        // Standard direct transit paths
        const transitStartWpLocal = { x: firstCoverageWp.local!.x, y: firstCoverageWp.local!.y, z: safeAltitude };
        const transitStartWp: Waypoint = { 
            id: generateUUID(), 
            lat: 0, lng: 0, 
            local: transitStartWpLocal, 
            altitude: safeAltitude - takeoffPoint.z, 
            altReference: AltitudeReference.RELATIVE, 
            camera: {} as CameraParams 
        };
        
        transitStartWaypoints = [climbWp, transitStartWp, firstCoverageWp];
        
        const transitEndWpLocal = { x: lastCoverageWp.local!.x, y: lastCoverageWp.local!.y, z: safeAltitude };
        const transitEndWp: Waypoint = { 
            id: generateUUID(), 
            lat: 0, lng: 0, 
            local: transitEndWpLocal, 
            altitude: safeAltitude - aglReference, 
            altReference: AltitudeReference.RELATIVE, 
            camera: {} as CameraParams 
        };
        
        transitEndWaypoints = [lastCoverageWp, transitEndWp];
    }

    // Landing sequence
    let landingWaypoints: Waypoint[] = [];
    if (missionEndAction === 'RTL') {
        const rtlTransitWpLocal = { x: takeoffPoint.x, y: takeoffPoint.y, z: safeAltitude };
        const rtlTransitWp: Waypoint = { 
            id: generateUUID(), 
            lat: 0, lng: 0, 
            local: rtlTransitWpLocal, 
            altitude: safeAltitude - aglReference, 
            altReference: AltitudeReference.RELATIVE, 
            camera: {} as CameraParams 
        };
        landingWaypoints = [transitEndWaypoints[transitEndWaypoints.length-1], rtlTransitWp, takeoffWp];
    } else if (missionEndAction === 'LAND') {
        const landAtWpLocal = { x: lastCoverageWp.local!.x, y: lastCoverageWp.local!.y, z: takeoffPoint.z };
        const landAtWp: Waypoint = { ...lastCoverageWp, id: generateUUID(), lat:0, lng: 0, local: landAtWpLocal, altitude: 0 };
        landingWaypoints = [transitEndWaypoints[transitEndWaypoints.length-1], landAtWp];
    } else { /* HOLD */ 
        landingWaypoints = [transitEndWaypoints[transitEndWaypoints.length-1]];
    }

    // Combine all flight path waypoints (excluding ground projections)
    const allWaypoints = [
        takeoffWp,
        // Add transit start waypoints (includes climb)
        ...transitStartWaypoints,
        // Add coverage waypoints (excluding first, which is already in transitStartWaypoints)
        ...coverageWaypoints.slice(1), 
        // Add transit end and landing waypoints (excluding first which is last coverage point)
        ...transitEndWaypoints.slice(1),
        // Add landing (excluding first which is last transit point)
        ...landingWaypoints.slice(1)
        // Ground projections are no longer included in the flight path
    ];
    
    // Filter duplicates
    const finalWaypoints = allWaypoints.filter((wp, index, self) => {
        if (!wp.local) return true; 
        // For regular waypoints, filter duplicates
        return index === self.findIndex(w => 
            w.local && 
            Math.abs(w.local.x - wp.local!.x) < 0.1 &&
            Math.abs(w.local.y - wp.local!.y) < 0.1 &&
            Math.abs(w.local.z - wp.local!.z) < 0.1
        );
    });
    
    // Add explicit path order to all waypoints to prevent any reordering
    finalWaypoints.forEach((wp, index) => {
        if (!wp.displayOptions) wp.displayOptions = {};
        wp.displayOptions.pathOrder = index;
    });

    // Create final path segment with separate groundProjections field
    const newSegment: PathSegment = {
        id: generateUUID(),
        type: PathType.GRID,
        waypoints: finalWaypoints,
        speed: mission.defaultSpeed ?? DEFAULT_FLIGHT_SPEED,
        groundProjections: showGroundPath ? groundPathWaypoints : undefined, // Store separately
        displayOptions: {
            enforcePathOrder: true, // Signal to renderer to use explicit path order
            flightLineOrientation: 'long_axis' // Always use long axis orientation
        }
    };

    console.log(`Generated Path Segment: ${finalWaypoints.length} waypoints${showGroundPath ? ` with ${groundPathWaypoints.length} ground projections` : ''}`);
    
    // Log waypoint altitudes for verification
    console.log("Waypoint Altitudes Check:");
    console.log(`  Takeoff Z: ${takeoffWp.local?.z?.toFixed(2) ?? 'N/A'}`);
    console.log(`  Climb Z: ${climbWp.local?.z?.toFixed(2) ?? 'N/A'}`);
    console.log(`  First Coverage Z: ${firstCoverageWp?.local?.z?.toFixed(2) ?? 'N/A'}`);
    console.log(`  Last Coverage Z: ${lastCoverageWp?.local?.z?.toFixed(2) ?? 'N/A'}`);
    console.log(`  Landing End Z: ${landingWaypoints[landingWaypoints.length-1]?.local?.z?.toFixed(2) ?? 'N/A'}`);
    
    return newSegment;
}

/**
 * Helper function to check if a point is inside a polygon using ray casting algorithm
 */
function isPointInPolygon(point: THREE.Vector2, polygon: THREE.Vector2[]): boolean {
    if (polygon.length < 3) return false;
    
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        
        const intersect = ((yi > point.y) != (yj > point.y))
            && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    
    return inside;
}

/**
 * Generates a path that avoids obstacles using a simplified RRT (Rapidly-exploring Random Tree) approach
 */
function generateObstacleAvoidingPath(
    start: LocalCoord, 
    goal: LocalCoord, 
    obstacles: SceneObject[],
    safeAltitude: number
): LocalCoord[] {
    // If there are no obstacles, return direct path
    if (obstacles.length === 0) {
        return [start, goal];
    }
    
    console.log(`Generating obstacle avoiding path from (${start.x.toFixed(2)}, ${start.y.toFixed(2)}) to (${goal.x.toFixed(2)}, ${goal.y.toFixed(2)})`);
    
    // For simplicity and to avoid complex RRT implementation, let's use a basic waypoint-based approach:
    // 1. Check if direct path intersects any obstacles
    let intersectsObstacle = false;
    
    for (const obstacle of obstacles) {
        // Simple collision check - assume obstacles are cylinders extending from ground to infinity
        if (lineIntersectsObstacle(start, goal, obstacle)) {
            intersectsObstacle = true;
            break;
        }
    }
    
    if (!intersectsObstacle) {
        console.log("Direct path is clear of obstacles");
        return [start, goal];
    }
    
    // 2. If direct path intersects obstacle, create intermediate waypoints
    console.log("Generating intermediate waypoints to avoid obstacles");
    
    // Simple "go around" path - higher altitude may be safest
    const pathPoints: LocalCoord[] = [
        start,
        // Optional intermediate point(s) if needed for complex scenarios
        {
            x: (start.x + goal.x) / 2,
            y: (start.y + goal.y) / 2,
            z: safeAltitude + 10 // Go a bit higher for safety
        },
        goal
    ];
    
    return pathPoints;
}

/**
 * Simple collision detection between line segment and an obstacle
 */
function lineIntersectsObstacle(start: LocalCoord, end: LocalCoord, obstacle: SceneObject): boolean {
    // For simplicity, we'll treat obstacles as cylinders centered at their position
    const obstacleCenter = new THREE.Vector2(obstacle.position.x, obstacle.position.y);
    const line = new THREE.Line3(
        new THREE.Vector3(start.x, start.y, 0),
        new THREE.Vector3(end.x, end.y, 0)
    );
    
    // Simplified obstacle radius - using the larger of width/length/2
    const obstacleRadius = Math.max(obstacle.width || 0, obstacle.length || 0) / 2;
    
    // Distance from line to obstacle center
    const closestPoint = new THREE.Vector3();
    line.closestPointToPoint(new THREE.Vector3(obstacleCenter.x, obstacleCenter.y, 0), false, closestPoint);
    
    const distance = new THREE.Vector2(closestPoint.x, closestPoint.y).distanceTo(obstacleCenter);
    
    // Check if the closest point is within the line segment
    const lineLength = new THREE.Vector2(end.x - start.x, end.y - start.y).length();
    const parameterPosition = new THREE.Vector2(closestPoint.x - start.x, closestPoint.y - start.y).length() / lineLength;
    
    return distance < obstacleRadius && parameterPosition >= 0 && parameterPosition <= 1;
}

// --- Placeholder for 3D Path Generation from Face --- 

/**
 * Parameters for 3D path generation.
 */
interface Generate3DPathParams {
    minAltitudeAGL: number;
    maxAltitudeAGL: number;
    altitudeLayers: number;
    structureDistance: number;
    // Add other params like camera angle, overlap etc.
}

/**
 * Generates a 3D path segment (e.g., orbital, facade scan) around a structure associated with a face.
 * Placeholder function - requires significant geometric implementation.
 */
export function generate3DPathFromFace(
    selectedFace: SelectedFaceInfo,
    mission: Mission, 
    hardware: HardwareState | null,
    sceneObjects: SceneObject[], 
    params: Generate3DPathParams
): PathSegment | null {
    // ... setup ...
    const DEFAULT_FLIGHT_SPEED = 1.0; // Ensure this is defined
    const takeoffPoint = mission.takeoffPoint;
    const safeAltitude = (mission.safetyParams?.rtlAltitude ?? params.maxAltitudeAGL) + 5;
    
    // --- Dummy Implementation (Ensure dummyWaypoints is defined here) --- 
    console.warn("generate3DPathFromFace is a placeholder. Returning dummy path.");
    const dummyWaypoints: Waypoint[] = [
        // Example: Need at least takeoff and landing based on structure
        { id: generateUUID(), lat: 0, lng: 0, local: takeoffPoint!, altitude: takeoffPoint!.z, altReference: AltitudeReference.RELATIVE, camera: {} as CameraParams }, 
        { id: generateUUID(), lat: 0, lng: 0, local: { ...(takeoffPoint ?? {x:0,y:0,z:0}), z: safeAltitude }, altitude: safeAltitude, altReference: AltitudeReference.RELATIVE, camera: {} as CameraParams },
        { id: generateUUID(), lat: 0, lng: 0, local: takeoffPoint!, altitude: takeoffPoint!.z, altReference: AltitudeReference.RELATIVE, camera: {} as CameraParams }, 
    ];
    // --- End Dummy Implementation --- 

    const newSegment: PathSegment = {
        id: generateUUID(),
        type: PathType.CUSTOM,
        waypoints: dummyWaypoints, // Use the defined dummyWaypoints
        speed: mission.defaultSpeed ?? DEFAULT_FLIGHT_SPEED, // Use mission and fallback speed
    };
    console.log("Generated Path Segment:", newSegment);
    return newSegment; 
}

/** 
 * Generates precise image center points for optimal photogrammetry coverage.
 * This approach generates a grid centered on the face's projected center,
 * extending outwards based on vertex extents and footprint, then filters points.
 */
// *** Renamed function and updated logic ***
function generateCoverageGridFromCenter(
    faceVertices: THREE.Vector3[],
    projectedVerticesXY: THREE.Vector2[],
    obb: OBBResult, // Still needed for orientation axes
    faceCenterXY: THREE.Vector2, // Use this as the grid origin
    footprint: { footprintWidth: number, footprintHeight: number },
    overlap: number,
    targetAltitude: number,
    faceNormal?: THREE.Vector3,
    projectionAxes?: { xAxis: THREE.Vector3, yAxis: THREE.Vector3 }
): LocalCoord[] {
    console.log("Generating Coverage Grid From Center - OBB (for orientation):", obb);
    console.log("Footprint:", footprint, "Overlap:", overlap);
    console.log(`Using Projected Face Center: (${faceCenterXY.x.toFixed(2)}, ${faceCenterXY.y.toFixed(2)})`);

    // --- Effective Footprint & Spacing ---
    const calculationOverlap = Math.max(0, Math.min(overlap, 95));
    const effectiveFootprintWidth = footprint.footprintWidth * (1 - calculationOverlap / 100);
    const effectiveFootprintHeight = footprint.footprintHeight * (1 - calculationOverlap / 100);
    // CORRECTED spacing logic
    const stepLong = Math.max(0.1, effectiveFootprintHeight); // Spacing along long axis (flight direction)
    const stepShort = Math.max(0.1, effectiveFootprintWidth);  // Spacing along short axis (between rows)
    console.log(`Effective Footprint: ${effectiveFootprintWidth.toFixed(2)} W x ${effectiveFootprintHeight.toFixed(2)} H`);
    console.log(`Grid Spacing: stepLong=${stepLong.toFixed(2)}, stepShort=${stepShort.toFixed(2)}`);

    // --- Coordinate System (from OBB) ---
    const longAxis = new THREE.Vector2(obb.axis1.x, obb.axis1.y).normalize();
    const shortAxis = new THREE.Vector2(obb.axis2.x, obb.axis2.y).normalize();
    console.log(`Using Axes - Long: (${longAxis.x.toFixed(4)}, ${longAxis.y.toFixed(4)}), Short: (${shortAxis.x.toFixed(4)}, ${shortAxis.y.toFixed(4)})`);


    // --- Determine Grid Extents relative to Face Center ---
    let minProjLong = Infinity, maxProjLong = -Infinity;
    let minProjShort = Infinity, maxProjShort = -Infinity;

    projectedVerticesXY.forEach(vertex => {
        const relVec = new THREE.Vector2().subVectors(vertex, faceCenterXY);
        const projLong = relVec.dot(longAxis);
        const projShort = relVec.dot(shortAxis);
        minProjLong = Math.min(minProjLong, projLong);
        maxProjLong = Math.max(maxProjLong, projLong);
        minProjShort = Math.min(minProjShort, projShort);
        maxProjShort = Math.max(maxProjShort, projShort);
    });

    // Add buffer (approx one footprint dimension) to ensure edge coverage
    const bufferLong = footprint.footprintHeight; // Buffer along flight direction
    const bufferShort = footprint.footprintWidth; // Buffer perpendicular to flight direction

    const gridExtentMinLong = minProjLong - bufferLong;
    const gridExtentMaxLong = maxProjLong + bufferLong;
    const gridExtentMinShort = minProjShort - bufferShort;
    const gridExtentMaxShort = maxProjShort + bufferShort;

    console.log(`Grid Extents (Rel to Center): Long [${gridExtentMinLong.toFixed(2)}, ${gridExtentMaxLong.toFixed(2)}], Short [${gridExtentMinShort.toFixed(2)}, ${gridExtentMaxShort.toFixed(2)}]`);

    // --- Generate Grid Points ---
    const gridPoints: THREE.Vector2[] = [];
    // Calculate number of steps needed based on extents and spacing
    const numStepsShort = Math.max(1, Math.ceil((gridExtentMaxShort - gridExtentMinShort) / stepShort));
    const numStepsLong = Math.max(1, Math.ceil((gridExtentMaxLong - gridExtentMinLong) / stepLong));

    // Adjust start points to better center the grid over the calculated extents
    const actualGridWidth = (numStepsShort - 1) * stepShort;
    const actualGridLength = (numStepsLong - 1) * stepLong;
    const startShort = gridExtentMinShort + ((gridExtentMaxShort - gridExtentMinShort) - actualGridWidth) / 2;
    const startLong = gridExtentMinLong + ((gridExtentMaxLong - gridExtentMinLong) - actualGridLength) / 2;


    const rows: THREE.Vector2[][] = [];
    for (let i = 0; i < numStepsShort; i++) {
        const row: THREE.Vector2[] = [];
        const localShort = startShort + i * stepShort;
        for (let j = 0; j < numStepsLong; j++) {
            const localLong = startLong + j * stepLong;

            const worldPoint = faceCenterXY.clone()
                .addScaledVector(longAxis, localLong)
                .addScaledVector(shortAxis, localShort);
            row.push(worldPoint);
        }
         rows.push(row);
    }

     // --- Create zigzag pattern from rows (same as before) ---
    const initialGridPoints: THREE.Vector2[] = [];
    rows.forEach((row, rowIdx) => {
        if (rowIdx % 2 === 0) {
            initialGridPoints.push(...row);
        } else {
            initialGridPoints.push(...row.reverse());
        }
    });
    console.log(`Generated initial grid with ${initialGridPoints.length} points (${rows.length} rows x ${rows[0]?.length || 0} cols)`);

    // --- Filter Points (Using distance method for now) ---
    const filteredPoints: THREE.Vector2[] = [];
    const footprintDiagonal = Math.sqrt(footprint.footprintWidth**2 + footprint.footprintHeight**2);
    // Adjust coverage distance scale based on overlap - aiming for footprint center to be near edge
    const coverageDistanceScale = 0.5 * (1.0 + (overlap / 100) * 0.5); // Reduced scale for tighter filtering
    const coverageDistance = footprintDiagonal * coverageDistanceScale; 
    console.log(`Filtering with coverage distance: ${coverageDistance.toFixed(2)}m`);

    for (const point of initialGridPoints) {
        // Simple check: is the point within coverage distance of the polygon?
        let keepPoint = false;
        if (isPointInPolygon(point, projectedVerticesXY)) {
             keepPoint = true;
        } else {
             for (let i = 0; i < projectedVerticesXY.length; i++) {
                 const edgeStart = projectedVerticesXY[i];
                 const edgeEnd = projectedVerticesXY[(i + 1) % projectedVerticesXY.length];
                 const distToEdge = distanceToLineSegment(point, edgeStart, edgeEnd);
                 if (distToEdge < coverageDistance) {
                     keepPoint = true;
                     break;
                 }
             }
        }
        if(keepPoint){
            filteredPoints.push(point);
        }
    }
    console.log(`Filtered to ${filteredPoints.length} image centers (from ${initialGridPoints.length} total)`);

     if (filteredPoints.length === 0) {
         console.warn("No points remained after filtering. Check coverage distance or grid generation. Consider expanding buffer or reducing filtering strictness.");
         // Fallback: return just the center point? Or initial grid?
         // Returning empty for now, needs review.
         return [];
     }

    // --- Reorganize filtered points into final path ---
     const localFilteredPoints = filteredPoints.map(point => {
        const relVec = new THREE.Vector2().subVectors(point, faceCenterXY); // Relative to face center
        const localLong = relVec.dot(longAxis);
        const localShort = relVec.dot(shortAxis);
        return { worldPoint: point, localLong, localShort };
    });

    // Group by short coordinate (rows)
    const rowGroups = new Map<number, typeof localFilteredPoints>();
    localFilteredPoints.forEach(point => {
        // Use a tolerance for grouping rows based on short coordinate
        const roundingFactor = Math.max(0.1, stepShort * 0.5); // Use half the short step or 0.1m
        const roundedShort = Math.round(point.localShort / roundingFactor) * roundingFactor; 
        if (!rowGroups.has(roundedShort)) {
            rowGroups.set(roundedShort, []);
        }
        rowGroups.get(roundedShort)!.push(point);
    });

    const sortedShortValues = Array.from(rowGroups.keys()).sort((a, b) => a - b);
    const finalPath: THREE.Vector2[] = [];
    sortedShortValues.forEach((shortVal, rowIdx) => {
        const row = rowGroups.get(shortVal) || [];
        if(row.length === 0) return; // Skip empty rows
        
        if (rowIdx % 2 === 0) {
            row.sort((a, b) => a.localLong - b.localLong); // Sort along long axis
        } else {
            row.sort((a, b) => b.localLong - a.localLong); // Reverse sort
        }
        finalPath.push(...row.map(p => p.worldPoint));
    });

    console.log(`Reorganized into ${sortedShortValues.length} rows for efficient path`);

    // --- Generate 3D coordinates (remains the same) ---
     const coveragePoints: LocalCoord[] = finalPath.map(point => ({
         x: point.x,
         y: point.y,
         z: targetAltitude // Use the calculated target altitude
     }));

    console.log(`Generated ${coveragePoints.length} image-center waypoints`);
    return coveragePoints;
}

// Comment out or remove the old generateImageCenterCoverage function if no longer needed
/*
function generateImageCenterCoverage(...) { ... old code ... }
*/

/**
 * Calculates the shortest distance from a point to a line segment.
 */
function distanceToLineSegment(
    point: THREE.Vector2, 
    lineStart: THREE.Vector2, 
    lineEnd: THREE.Vector2
): number {
    const lineVector = new THREE.Vector2().subVectors(lineEnd, lineStart);
    const pointVector = new THREE.Vector2().subVectors(point, lineStart);
    
    const lineLength = lineVector.length();
    if (lineLength < 0.0001) {
        // Line segment is actually a point
        return pointVector.length();
    }
    
    // Normalize line vector
    const lineDirection = lineVector.clone().divideScalar(lineLength);
    
    // Project pointVector onto lineDirection
    const projection = pointVector.dot(lineDirection);
    
    if (projection <= 0) {
        // Closest to the start point
        return pointVector.length();
    } else if (projection >= lineLength) {
        // Closest to the end point
        return new THREE.Vector2().subVectors(point, lineEnd).length();
    } else {
        // Closest to a point along the line
        const projectionPoint = lineStart.clone().addScaledVector(lineDirection, projection);
        return new THREE.Vector2().subVectors(point, projectionPoint).length();
    }
}

/**
 * Calculates mission statistics including number of photos, estimated time, and battery usage.
 */
export interface MissionStatistics {
    imageCount: number;
    flightDistanceMeters: number;
    estimatedTimeMinutes: number;
    estimatedBatteryPercentage: number;
}

/**
 * Calculate mission statistics for a path segment.
 * @param waypoints The waypoints in the mission segment
 * @param speed The flight speed in m/s
 * @returns Object containing image count, distance, time and battery estimates
 */
export function calculateMissionStatistics(
    waypoints: Waypoint[],
    speed: number,
    droneType?: string
): MissionStatistics {
    // Count photos (any waypoint with a TAKE_PHOTO action)
    const imageCount = waypoints.reduce((count, wp) => {
        if (wp.actions?.some(a => a.type === ActionType.TAKE_PHOTO)) {
            count++;
        }
        return count;
    }, 0);
    
    // Calculate total distance
    let totalDistance = 0;
    for (let i = 1; i < waypoints.length; i++) {
        const prev = waypoints[i-1].local;
        const curr = waypoints[i].local;
        
        if (prev && curr) {
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            const dz = curr.z - prev.z;
            totalDistance += Math.sqrt(dx*dx + dy*dy + dz*dz);
        }
    }
    
    // Estimate time (distance/speed + image capture time)
    const photoDelaySeconds = 1.0; // Assume 1 second per photo capture
    const transitTimeMinutes = totalDistance / speed / 60;
    const photoTimeMinutes = imageCount * photoDelaySeconds / 60;
    const totalTimeMinutes = transitTimeMinutes + photoTimeMinutes;
    
    // Estimate battery usage
    // This is a simplified model - in reality, battery usage depends on many factors
    // Including drone type, wind conditions, payload, temperature, etc.
    
    // Base values (can be customized per drone model)
    let batteryDrainPerMinute = 2.5; // % per minute for a typical drone
    let batteryDrainPerPhoto = 0.1; // % per photo
    
    // Adjust based on drone type if provided
    if (droneType) {
        switch (droneType.toLowerCase()) {
            case 'freefly-alta-x':
                batteryDrainPerMinute = 3.2;
                batteryDrainPerPhoto = 0.15;
                break;
            case 'dji-phantom':
                batteryDrainPerMinute = 2.8;
                batteryDrainPerPhoto = 0.1;
                break;
            case 'skydio-x10':
                batteryDrainPerMinute = 2.6;
                batteryDrainPerPhoto = 0.08;
                break;
            // Add more drone types as needed
        }
    }
    
    // Calculate total battery usage
    const flightBatteryUsage = totalTimeMinutes * batteryDrainPerMinute;
    const photoBatteryUsage = imageCount * batteryDrainPerPhoto;
    const totalBatteryPercentage = flightBatteryUsage + photoBatteryUsage;
    
    // Add 15% buffer for safety
    const batteryWithBuffer = totalBatteryPercentage * 1.15;
    
    return {
        imageCount,
        flightDistanceMeters: totalDistance,
        estimatedTimeMinutes: totalTimeMinutes,
        estimatedBatteryPercentage: Math.min(100, Math.round(batteryWithBuffer))
    };
}

/**
 * Projects face vertices onto an appropriate plane for path planning.
 * MODIFIED: Always projects onto World XY plane for consistent coordinates.
 */
interface FaceProjectionResult {
    projectedPoints: THREE.Vector2[];
    projectionAxes?: {
        xAxis: THREE.Vector3;
        yAxis: THREE.Vector3;
    };
}

// --- Revised projectFaceForPath (Always project to World XY) ---
function projectFaceForPath(
    faceVertices: THREE.Vector3[],
    faceCenter: THREE.Vector3,
    faceNormalInfo?: { x: number, y: number, z: number },
    objectRotation?: { x: number, y: number, z: number }
): FaceProjectionResult {
    console.log("Projecting face vertices directly onto World XY plane for consistent orientation.");
    const projectedPoints = faceVertices.map(v => new THREE.Vector2(v.x, v.y));

    // Define projection axes as world X and Y for reference
    const worldXAxis = new THREE.Vector3(1, 0, 0);
    const worldYAxis = new THREE.Vector3(0, 1, 0);

    return {
        projectedPoints,
        projectionAxes: { // Provide world axes for context if needed downstream
            xAxis: worldXAxis,
            yAxis: worldYAxis
        }
    };
}

// --- Original complex projection logic commented out ---
/*
function projectFaceForPath(
    faceVertices: THREE.Vector3[],
    faceCenter: THREE.Vector3,
    faceNormalInfo?: { x: number, y: number, z: number },
    objectRotation?: { x: number, y: number, z: number } // New parameter for object rotation
): FaceProjectionResult {
    // If we have object rotation, use it to define projection axes
    if (objectRotation) {
        console.log("Using object rotation for face projection:", objectRotation);
        
        // Create rotation matrix from Euler angles
        const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
            new THREE.Euler(
                THREE.MathUtils.degToRad(objectRotation.x),
                THREE.MathUtils.degToRad(objectRotation.y),
                THREE.MathUtils.degToRad(objectRotation.z)
            )
        );
        
        // Extract principal axes from rotation matrix
        const xAxis = new THREE.Vector3(1, 0, 0).applyMatrix4(rotationMatrix).normalize();
        const yAxis = new THREE.Vector3(0, 1, 0).applyMatrix4(rotationMatrix).normalize();
        const zAxis = new THREE.Vector3(0, 0, 1).applyMatrix4(rotationMatrix).normalize();
        
        // If we have a face normal, determine which axes to use based on which cube face we're seeing
        if (faceNormalInfo) {
            const normal = new THREE.Vector3(faceNormalInfo.x, faceNormalInfo.y, faceNormalInfo.z).normalize();
            
            // Determine which axis is most aligned with the face normal
            const dotX = Math.abs(normal.dot(xAxis));
            const dotY = Math.abs(normal.dot(yAxis));
            const dotZ = Math.abs(normal.dot(zAxis));
            
            let projAxis1: THREE.Vector3;
            let projAxis2: THREE.Vector3;
            
            // Based on which axis is most aligned with normal, choose the other two for projection
            if (dotX > dotY && dotX > dotZ) {
                // X-aligned face, use Y and Z for projection
                console.log("X-aligned face detected (left/right)");
                projAxis1 = yAxis; // Object's Y axis
                projAxis2 = zAxis; // Object's Z axis
            } else if (dotY > dotX && dotY > dotZ) {
                // Y-aligned face, use X and Z for projection
                console.log("Y-aligned face detected (top/bottom)");
                projAxis1 = xAxis; // Object's X axis
                projAxis2 = zAxis; // Object's Z axis
            } else {
                // Z-aligned face, use X and Y for projection
                console.log("Z-aligned face detected (front/back)");
                projAxis1 = xAxis; // Object's X axis
                projAxis2 = yAxis; // Object's Y axis
            }

            // Project vertices onto the plane defined by these UN-SWAPPED axes
            const projectedPoints = faceVertices.map(vertex => {
                const relativeVec = new THREE.Vector3().subVectors(vertex, faceCenter);
                const x = relativeVec.dot(projAxis1);
                const y = relativeVec.dot(projAxis2);
                return new THREE.Vector2(x, y);
            });

            console.log("Projected using object rotation and face alignment (NO internal axis swap)");

            return {
                projectedPoints,
                projectionAxes: { // Return the un-swapped axes used for projection
                    xAxis: projAxis1,
                    yAxis: projAxis2
                }
            };
        }
    }
    
    // Default to simple XY projection
    if (!faceNormalInfo) {
        console.log("No face normal available, using simple XY projection");
        return {
            projectedPoints: faceVertices.map(v => new THREE.Vector2(v.x, v.y))
        };
    }
    
    // Create normal vector
    const faceNormal = new THREE.Vector3(faceNormalInfo.x, faceNormalInfo.y, faceNormalInfo.z);
    
    // Only use normal-based projection if normal is valid
    if (faceNormal.length() < 0.1) {
        console.warn("Face normal is invalid, falling back to XY projection");
        return {
            projectedPoints: faceVertices.map(v => new THREE.Vector2(v.x, v.y))
        };
    }
    
    console.log("Using face normal for proper projection:", faceNormal);
    
    // Project vertices onto the plane defined by face normal and center
    const projectedPoints3D = projectFaceVerticesToPlane(faceVertices, faceCenter, faceNormal);
    
    // Create a consistent 2D coordinate system on this plane
    const normalizedNormal = faceNormal.clone().normalize();
    const axis1 = new THREE.Vector3(1, 0, 0);
    if (Math.abs(normalizedNormal.dot(axis1)) > 0.9) {
        axis1.set(0, 1, 0);
    }
    axis1.cross(normalizedNormal).normalize();
    const axis2 = normalizedNormal.clone().cross(axis1).normalize();
    
    const projectedPoints = projectedPoints3D.map(pt => {
        const relativeVec = new THREE.Vector3().subVectors(pt, faceCenter);
        const x = relativeVec.dot(axis1);
        const y = relativeVec.dot(axis2);
        return new THREE.Vector2(x, y);
    });
    
    return {
        projectedPoints,
        projectionAxes: {
            xAxis: axis1,
            yAxis: axis2
        }
    };
}
*/

/**
 * Optimizes large path segments by reducing waypoint density when appropriate
 * Uses the Douglas-Peucker algorithm for path simplification
 * 
 * @param segment The path segment to optimize
 * @param epsilon The maximum allowed distance between original and simplified path
 * @returns A new path segment with optimized waypoint density
 */
export const optimizeLargePathSegment = (
  segment: PathSegment, 
  epsilon: number = 0.5 // Default tolerance in meters
): PathSegment => {
  if (!segment.waypoints || segment.waypoints.length <= 2) {
    return segment; // No optimization needed for 0-2 points
  }

  const optimizedWaypoints = douglasPeuckerAlgorithm(
    segment.waypoints.map(wp => wp.local),
    epsilon
  );

  // Create new waypoints from the optimized local coordinates
  const newWaypoints = optimizedWaypoints.map((localCoord, index) => {
    // Try to find original waypoint with similar coordinates to preserve its properties
    const originalWaypoint = findClosestWaypointByCoordinates(segment.waypoints, localCoord);
    
    if (originalWaypoint) {
      return {
        ...originalWaypoint,
        local: localCoord
      };
    }
    
    // Create a new waypoint if no match found
    return {
      id: generateUUID(),
      local: localCoord,
      altReference: AltitudeReference.RELATIVE,
      speed: segment.speed || 5,
      camera: segment.waypoints[0].camera // Use camera settings from first waypoint
    };
  });

  return {
    ...segment,
    waypoints: newWaypoints
  };
};

/**
 * Finds the waypoint closest to the given coordinates
 */
const findClosestWaypointByCoordinates = (
  waypoints: Waypoint[],
  localCoord: LocalCoord
): Waypoint | null => {
  if (!waypoints.length) return null;
  
  let closestWaypoint = waypoints[0];
  let minDistance = calculateDistance3D(localCoord, waypoints[0].local);
  
  for (let i = 1; i < waypoints.length; i++) {
    const distance = calculateDistance3D(localCoord, waypoints[i].local);
    if (distance < minDistance) {
      minDistance = distance;
      closestWaypoint = waypoints[i];
    }
  }
  
  // Only return if the distance is reasonably close
  return minDistance < 1.0 ? closestWaypoint : null;
};

/**
 * Calculates 3D distance between two local coordinates
 */
export const calculateDistance3D = (p1: LocalCoord, p2: LocalCoord): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Path simplification using the Douglas-Peucker algorithm
 * Efficiently reduces waypoint density while preserving path shape
 */
const douglasPeuckerAlgorithm = (
  points: LocalCoord[],
  epsilon: number
): LocalCoord[] => {
  if (points.length <= 2) {
    return points;
  }
  
  // Find the point with the maximum distance from line between start and end
  let maxDistance = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }
  
  // If max distance is greater than epsilon, recursively simplify
  if (maxDistance > epsilon) {
    // Recursive call
    const firstSegment = douglasPeuckerAlgorithm(points.slice(0, index + 1), epsilon);
    const secondSegment = douglasPeuckerAlgorithm(points.slice(index), epsilon);
    
    // Concatenate the two simplified segments (avoiding duplicating the common point)
    return [...firstSegment.slice(0, -1), ...secondSegment];
  } else {
    // If all points are closer than epsilon, remove all points except start and end
    return [start, end];
  }
};

/**
 * Calculates the perpendicular distance from a point to a line
 */
const perpendicularDistance = (
  point: LocalCoord,
  lineStart: LocalCoord,
  lineEnd: LocalCoord
): number => {
  // If lineStart and lineEnd are the same point, return distance to that point
  if (lineStart.x === lineEnd.x && lineStart.y === lineEnd.y && lineStart.z === lineEnd.z) {
    return calculateDistance3D(point, lineStart);
  }
  
  // Calculate the area of the triangle and divide by the base length
  const area = Math.abs(
    0.5 * (
      (lineStart.x * (lineEnd.y - point.y)) +
      (lineEnd.x * (point.y - lineStart.y)) +
      (point.x * (lineStart.y - lineEnd.y))
    )
  );
  
  // Base length
  const base = calculateDistance3D(lineStart, lineEnd);
  
  // Calculate the perpendicular distance
  return (2 * area) / base;
};

/**
 * Chunks a large path into smaller segments for better performance
 * @param segment Original large path segment
 * @param chunkSize Maximum number of waypoints per chunk
 * @returns Array of smaller path segments
 */
export const chunkLargePathSegment = (
  segment: PathSegment,
  chunkSize: number = 100
): PathSegment[] => {
  if (!segment.waypoints || segment.waypoints.length <= chunkSize) {
    return [segment];
  }
  
  const chunks: PathSegment[] = [];
  const totalWaypoints = segment.waypoints.length;
  
  for (let i = 0; i < totalWaypoints; i += chunkSize) {
    const waypointChunk = segment.waypoints.slice(i, Math.min(i + chunkSize, totalWaypoints));
    
    chunks.push({
      ...segment,
      id: i === 0 ? segment.id : `${segment.id}-chunk-${i/chunkSize}`,
      waypoints: waypointChunk,
      // Add a reference to the original segment for tracking
      metadata: {
        ...(segment.metadata || {}),
        originalSegmentId: segment.id,
        chunkIndex: i/chunkSize,
        totalChunks: Math.ceil(totalWaypoints / chunkSize)
      }
    });
  }
  
  return chunks;
};

/**
 * Creates a visualization-optimized version of path segments
 * For large paths, this creates a preview with fewer points for display
 * while preserving the full data for actual operations
 */
export const createPathPreview = (
  segments: PathSegment[],
  maxPointsPerSegment: number = 50
): PathSegment[] => {
  return segments.map(segment => {
    if (!segment.waypoints || segment.waypoints.length <= maxPointsPerSegment) {
      return segment;
    }
    
    // For very large segments, create a simplified preview
    const skipFactor = Math.ceil(segment.waypoints.length / maxPointsPerSegment);
    const previewWaypoints = segment.waypoints.filter((_, index) => index % skipFactor === 0);
    
    // Always include the last waypoint
    if (segment.waypoints.length > 0 && 
        previewWaypoints[previewWaypoints.length - 1] !== segment.waypoints[segment.waypoints.length - 1]) {
      previewWaypoints.push(segment.waypoints[segment.waypoints.length - 1]);
    }
    
    return {
      ...segment,
      // Use a special type property to indicate this is a preview
      metadata: {
        ...(segment.metadata || {}),
        isPreview: true,
        originalLength: segment.waypoints.length
      },
      waypoints: previewWaypoints
    };
  });
};

/**
 * Batches updates to a path segment with many waypoints
 * Useful for performance optimization when making many changes
 */
export const batchWaypointUpdates = (
  segment: PathSegment,
  updateFn: (waypoint: Waypoint) => Waypoint,
  shouldUpdate: (waypoint: Waypoint) => boolean = () => true
): PathSegment => {
  if (!segment.waypoints) return segment;
  
  // Process updates in batches for better performance
  const BATCH_SIZE = 100;
  const totalWaypoints = segment.waypoints.length;
  const updatedWaypoints: Waypoint[] = [];
  
  for (let i = 0; i < totalWaypoints; i += BATCH_SIZE) {
    const batch = segment.waypoints.slice(i, Math.min(i + BATCH_SIZE, totalWaypoints));
    
    const processedBatch = batch.map(waypoint => 
      shouldUpdate(waypoint) ? updateFn(waypoint) : waypoint
    );
    
    updatedWaypoints.push(...processedBatch);
  }
  
  return {
    ...segment,
    waypoints: updatedWaypoints
  };
};

/**
 * Calculates the total distance of a path in meters
 */
export const calculatePathDistance = (segment: PathSegment): number => {
  if (!segment.waypoints || segment.waypoints.length < 2) {
    return 0;
  }
  
  let totalDistance = 0;
  for (let i = 1; i < segment.waypoints.length; i++) {
    const prevWaypoint = segment.waypoints[i-1];
    const currentWaypoint = segment.waypoints[i];
    
    if (!prevWaypoint?.local || !currentWaypoint?.local) {
      continue;
    }
    
    totalDistance += calculateDistance3D(prevWaypoint.local, currentWaypoint.local);
  }
  
  return totalDistance;
};

// ... rest of pathUtils.ts ...