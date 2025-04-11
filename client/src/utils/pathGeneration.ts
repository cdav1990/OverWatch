import { LocalCoord, Waypoint, LatLng, AltitudeReference, CameraParams } from "../types/mission";
import { v4 as uuidv4 } from 'uuid';
import { localToLatLng } from './coordinateUtils'; // Adjust path if necessary
import { 
    calculateOverlapSpacing, 
    CameraSpecs, 
    OverlapSpacingResult 
} from './sensorCalculations'; 

interface RasterPatternParams {
    startCoord: LocalCoord; // Absolute starting coordinate (local ENU meters)
    localOrigin: LatLng; // Geographic origin (lat/lng) of the local coordinate system
    length: number; // Length of each pass (meters)
    spacing: number; // Distance between passes (meters)
    passes: number; // Number of passes
    altitude: number; // Relative altitude for the pattern start (meters AGL, added to startCoord.z)
    orientation: 'horizontal' | 'vertical'; // Pattern type
    snake: boolean; // Zigzag pattern?
    defaultCamera: CameraParams; // Default camera parameters for waypoints
    altReference?: AltitudeReference; // Optional altitude reference (defaults to RELATIVE)
    cameraYawOffset?: number; // Optional camera yaw offset relative to path direction
}

/**
 * Generates waypoints for a raster pattern.
 * 
 * Horizontal (E/W): Passes along X-axis (East/West), steps along Z-axis (Altitude).
 * Vertical (N/S): Passes along Z-axis (Altitude), steps along X-axis (East/West).
 * 
 * @param params - RasterPatternParams object
 * @returns Array of Waypoint objects
 */
export const generateRasterPattern = (params: RasterPatternParams): Waypoint[] => {
    const { 
        startCoord, 
        localOrigin,
        length, 
        spacing, 
        passes, 
        altitude, // This is relative altitude AGL for the pattern itself
        orientation, 
        snake, 
        defaultCamera,
        altReference = AltitudeReference.RELATIVE, // Default to RELATIVE if not provided
        cameraYawOffset = 0 // Default to 0 if not provided
    } = params;

    const waypoints: Waypoint[] = [];
    
    // Extract camera pitch from default camera params
    const cameraPitch = defaultCamera.pitch ?? -90; // Default to -90 (nadir) if not specified

    // Helper to create a full Waypoint object with camera orientation
    const createWaypoint = (local: LocalCoord, pathHeading: number): Waypoint => {
        const { latitude, longitude } = localToLatLng(local, localOrigin);
        
        // Apply camera yaw offset to path heading to get final camera heading
        const cameraHeading = (pathHeading + cameraYawOffset + 360) % 360;
        
        return {
            id: uuidv4(),
            lat: latitude,
            lng: longitude,
            altitude: local.z, // Use the Z from LocalCoord as the primary altitude
            altReference: altReference,
            local: { ...local }, // Store the local coords too
            camera: { 
                ...defaultCamera,
                heading: cameraHeading, // Apply the calculated heading with yaw offset
                pitch: cameraPitch // Use the camera pitch from defaultCamera or default
            },
            actions: [] // Placeholder for future actions
        };
    };

    // Initial position for the pattern, applying the relative pattern altitude
    let currentX = startCoord.x;
    let currentY = startCoord.y;
    let currentZ = startCoord.z + altitude; // Absolute Z altitude for the first point

    // Set initial path heading based on orientation
    let pathHeading = orientation === 'horizontal' ? 90 : 0; // 90 = East, 0 = North
    
    // Add the very first point of the pattern with correct camera orientation
    waypoints.push(createWaypoint({ x: currentX, y: currentY, z: currentZ }, pathHeading));

    let directionMultiplier = 1;

    for (let i = 0; i < passes; i++) {
        if (orientation === 'horizontal') {
            // Horizontal Pass (along X), Step Altitude (Z)
            
            // Determine path heading based on direction
            pathHeading = directionMultiplier > 0 ? 90 : 270; // 90 = East, 270 = West
            
            // 1. Move along X
            currentX += length * directionMultiplier;
            waypoints.push(createWaypoint({ x: currentX, y: currentY, z: currentZ }, pathHeading));

            // Check if it's the last pass
            if (i < passes - 1) {
                // 2. Step Altitude (Z)
                currentZ += spacing;
                // For transition points, maintain the same heading
                waypoints.push(createWaypoint({ x: currentX, y: currentY, z: currentZ }, pathHeading));

                // 3. Handle snake pattern or return
                if (snake) {
                    directionMultiplier *= -1; // Reverse direction for next pass
                    // Update path heading for the next pass
                    pathHeading = directionMultiplier > 0 ? 90 : 270;
                } else {
                    // Return to start X for this altitude level
                    // Need to update heading for the return movement
                    pathHeading = directionMultiplier > 0 ? 270 : 90;
                    currentX -= length * directionMultiplier;
                    waypoints.push(createWaypoint({ x: currentX, y: currentY, z: currentZ }, pathHeading));
                    // Reset heading for the next pass
                    pathHeading = directionMultiplier > 0 ? 90 : 270;
                }
            }
        } else { // vertical orientation
            // Vertical Pass (along Y), Step Horizontally (X)
            
            // Determine path heading based on direction
            pathHeading = directionMultiplier > 0 ? 0 : 180; // 0 = North, 180 = South
            
            // 1. Move along Y
            currentY += length * directionMultiplier;
            waypoints.push(createWaypoint({ x: currentX, y: currentY, z: currentZ }, pathHeading));

            // Check if it's the last pass
            if (i < passes - 1) {
                // 2. Step Horizontally (X)
                currentX += spacing;
                // For transition points, maintain the same heading
                waypoints.push(createWaypoint({ x: currentX, y: currentY, z: currentZ }, pathHeading));

                // 3. Handle snake pattern (required for vertical example)
                if (snake) {
                    directionMultiplier *= -1; // Reverse direction for next pass
                    // Update path heading for the next pass
                    pathHeading = directionMultiplier > 0 ? 0 : 180;
                } else {
                    // Return to start Y for this X position
                    // Need to update heading for the return movement
                    pathHeading = directionMultiplier > 0 ? 180 : 0;
                    currentY -= length * directionMultiplier;
                    waypoints.push(createWaypoint({ x: currentX, y: currentY, z: currentZ }, pathHeading));
                    // Reset heading for the next pass
                    pathHeading = directionMultiplier > 0 ? 0 : 180;
                }
            }
        }
    }

    return waypoints;
};

// TODO: Add functions for other path types (e.g., waypoints, orbits)
// TODO: Consider integrating takeoff/landing points and speeds 

// --- Overlap Grid Generation ---

/**
 * Parameters for generating waypoints covering a region with overlap.
 */
interface OverlapWaypointParams {
    startPos: LocalCoord;          // Center coordinate of the first image (e.g., bottom-left) (local ENU meters)
    regionWidth: number;           // Width of the target region to cover (meters)
    regionHeight: number;          // Height of the target region to cover (meters)
    cameraSpecs: CameraSpecs;      // Camera sensor/lens specs { focalLength, sensorWidth, sensorHeight } in mm
    overlapH: number;              // Desired horizontal overlap (along-track, 0-1)
    overlapV: number;              // Desired vertical overlap (side-lap, 0-1)
    snakePattern?: boolean;        // Generate in a snake/zigzag pattern? (default: true)
    // flightAltitude: number;     // Altitude is derived from startPos.z
}

/**
 * Generates a grid of waypoint coordinates (image centers) to cover a 
 * rectangular region with specified overlap percentages.
 * 
 * Assumes the region starts at startPos and extends positively along X (width) 
 * and Y (height) axes in the local coordinate system.
 * Assumes constant flight altitude based on startPos.z.
 *
 * @param params - Parameters including start position, region size, camera specs, and overlap.
 * @returns An array of LocalCoord objects representing the center of each required image.
 */
export const generateOverlapWaypoints = (params: OverlapWaypointParams): LocalCoord[] => {
    const {
        startPos,
        regionWidth,
        regionHeight,
        cameraSpecs,
        overlapH,
        overlapV,
        snakePattern = true, // Default to snake pattern
    } = params;

    const flightAltitude = startPos.z; // Use the Z coordinate of the start position as the altitude

    if (regionWidth <= 0 || regionHeight <= 0) {
        console.warn("Region width and height must be positive.");
        return [];
    }
    if (flightAltitude <= 0) {
        console.warn("Flight altitude (from startPos.z) must be positive for overlap calculation.");
        return [];
    }

    // 1. Calculate required spacing and coverage using the function from Step 1
    let spacingResult: OverlapSpacingResult;
    try {
       spacingResult = calculateOverlapSpacing(
            cameraSpecs,
            overlapH,
            overlapV,
            flightAltitude
        );
    } catch (error) {
        console.error("Error calculating overlap spacing:", error);
        return [];
    }

    const { horizontalSpacing, verticalSpacing, coverageWidth, coverageHeight } = spacingResult;

    if (horizontalSpacing <= 0 || verticalSpacing <= 0) {
         console.error("Calculated spacing is zero or negative. Check camera parameters, overlap, and altitude.");
         return [];
    }

    // 2. Determine number of rows and columns
    // First image covers 'coverageWidth/Height'. Remaining distance = regionDim - coverageDim.
    // Number of additional steps needed = ceil(remaining / spacing)
    // Total images = 1 + additional steps
    const numCols = regionWidth > coverageWidth ? Math.ceil((regionWidth - coverageWidth) / horizontalSpacing) + 1 : 1;
    const numRows = regionHeight > coverageHeight ? Math.ceil((regionHeight - coverageHeight) / verticalSpacing) + 1 : 1;

    console.log(`Calculated Grid: ${numCols} cols x ${numRows} rows`);
    console.log(`  H Spacing: ${horizontalSpacing.toFixed(2)}m, V Spacing: ${verticalSpacing.toFixed(2)}m`);


    const waypoints: LocalCoord[] = [];

    // 3. Generate waypoints in a grid pattern
    for (let r = 0; r < numRows; r++) {
        const yPos = startPos.y + r * verticalSpacing;

        // Determine column direction based on row and snake pattern
        const isReverseRow = snakePattern && (r % 2 !== 0);
        const startCol = isReverseRow ? numCols - 1 : 0;
        const endCol = isReverseRow ? -1 : numCols;
        const stepCol = isReverseRow ? -1 : 1;

        for (let c = startCol; c !== endCol; c += stepCol) {
            const xPos = startPos.x + c * horizontalSpacing;
            const zPos = startPos.z; // Constant altitude for this pattern

            waypoints.push({ x: xPos, y: yPos, z: zPos });
        }
    }

    return waypoints;
}; 