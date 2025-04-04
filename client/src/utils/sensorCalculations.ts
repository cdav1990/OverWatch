import { Camera, Lens, SensorType } from '../types/hardware';

// --- Constants ---
const FEET_TO_METERS = 0.3048;
const METERS_TO_FEET = 3.28084;
const FULL_FRAME_DIAGONAL_MM = 43.2666; // Based on 36x24mm
const DEFAULT_COC_FULL_FRAME_MM = 0.030;

// --- Helper Functions ---

/**
 * Converts meters to feet.
 * @param meters Length in meters.
 * @returns Length in feet.
 */
export const metersToFeet = (meters: number): number => meters * METERS_TO_FEET;

/**
 * Converts feet to meters.
 * @param feet Length in feet.
 * @returns Length in meters.
 */
export const feetToMeters = (feet: number): number => feet * FEET_TO_METERS;

/**
 * Calculates the effective focal length for a lens (handles zoom).
 * For zoom lenses, it typically uses the midpoint, but can be adjusted.
 * @param lens The lens object.
 * @param zoomPosition Optional (0-1) for zoom lenses. Defaults to 0.5 (midpoint).
 * @returns The effective focal length in mm.
 */
export const getEffectiveFocalLength = (lens: Lens | undefined, zoomPosition: number = 0.5): number => {
    if (!lens) return 50; // Default fallback
    if (typeof lens.focalLength === 'number') {
        return lens.focalLength; // Prime lens
    } else if (Array.isArray(lens.focalLength) && lens.focalLength.length === 2) {
        // Interpolate for zoom lens
        const [min, max] = lens.focalLength;
        return min + (max - min) * zoomPosition;
    } 
    return 50; // Fallback if format is unexpected
};

/**
 * Calculates the Circle of Confusion (CoC) based on sensor type or dimensions.
 * Uses common standards or a fallback calculation.
 * @param sensorType The specific sensor type.
 * @param sensorWidth The width of the sensor in mm.
 * @returns Circle of Confusion in mm.
 */
export const calculateCircleOfConfusion = (sensorType: SensorType | string | undefined, sensorWidth: number | undefined): number => {
    if (!sensorType || !sensorWidth) return DEFAULT_COC_FULL_FRAME_MM; // Default if insufficient info
    
    // Prioritize specific types with common CoC values
    switch (sensorType) {
        case 'Full Frame': return DEFAULT_COC_FULL_FRAME_MM; 
        case 'APS-C': return 0.020; 
        case '1-inch': return 0.011; 
        case '1/2-inch': return 0.006;
        // Medium Format varies, use calculation as default
        // Default case will handle 'Medium Format' and any other types
        default: 
            // General rule: Diagonal / 1500, or Width / 1000 (simplified)
            // Or fallback to scaling from full-frame based on width ratio
            const scaleFactor = sensorWidth / 36; // Rough ratio to full-frame width
            return Math.min(DEFAULT_COC_FULL_FRAME_MM, DEFAULT_COC_FULL_FRAME_MM * scaleFactor); // Simple scaling, capped at FF CoC
    }
};

// --- Core Calculation Functions ---

/**
 * Calculates the Field of View (FOV) for a given sensor dimension and focal length.
 * @param focalLength Focal length in mm.
 * @param sensorDimension Sensor width or height in mm.
 * @returns Field of View in degrees.
 */
export const calculateFieldOfView = (focalLength: number, sensorDimension: number): number => {
    if (focalLength <= 0 || sensorDimension <= 0) return 0;
    const fovRadians = 2 * Math.atan(sensorDimension / (2 * focalLength));
    return fovRadians * (180 / Math.PI);
};

// Add alias for backwards compatibility with existing imports
export const calculateFOV = calculateFieldOfView;

/**
 * Calculates the Ground Sampling Distance (GSD).
 * @param altitude Distance to subject (ground) in meters.
 * @param camera The camera object.
 * @param lens The lens object.
 * @returns GSD in cm/pixel.
 */
export const calculateGSD = (altitude: number, camera: Camera | undefined, lens: Lens | undefined): number => {
    if (!camera || !lens || altitude <= 0) return 0;
    
    const focalLength = getEffectiveFocalLength(lens);
    if (focalLength <= 0 || !camera.sensorWidth || !camera.imageWidth) return 0;

    // GSD formula: (Sensor Width [mm] * Altitude [m] * 100 [cm/m]) / (Focal Length [mm] * Image Width [pixels])
    const gsd = (camera.sensorWidth * altitude * 100) / (focalLength * camera.imageWidth);
    return gsd;
};

/**
 * Calculates the footprint (ground coverage) of the camera sensor at a given altitude.
 * @param altitude Distance to subject (ground) in meters.
 * @param camera The camera object.
 * @param lens The lens object.
 * @returns Object with width and height of the footprint in meters.
 */
export const calculateFootprint = (altitude: number, camera: Camera | undefined, lens: Lens | undefined): { width: number; height: number } => {
    if (!camera || !lens || altitude <= 0) return { width: 0, height: 0 };
    
    const gsdCm = calculateGSD(altitude, camera, lens);
    if (gsdCm <= 0 || !camera.imageWidth || !camera.imageHeight) return { width: 0, height: 0 };

    const gsdM = gsdCm / 100; // Convert GSD from cm/pixel to m/pixel
    const footprintWidth = gsdM * camera.imageWidth;
    const footprintHeight = gsdM * camera.imageHeight;

    return { width: footprintWidth, height: footprintHeight };
};

/**
 * Calculates the hyperfocal distance.
 * @param focalLength Focal length in mm.
 * @param aperture Aperture f-number.
 * @param circleOfConfusion Circle of confusion in mm.
 * @returns Hyperfocal distance in meters.
 */
export const calculateHyperfocalDistance = (focalLength: number, aperture: number, circleOfConfusion: number): number => {
    if (aperture <= 0 || circleOfConfusion <= 0) return Infinity;
    // Formula: (Focal Length [mm]^2) / (Aperture * CoC [mm]) / 1000 [mm/m]
    return (focalLength * focalLength) / (aperture * circleOfConfusion) / 1000;
};

/**
 * Calculates the near limit of the Depth of Field (DOF).
 * @param focusDistance Focus distance in meters.
 * @param hyperfocalDistance Hyperfocal distance in meters.
 * @param focalLength Focal length in mm.
 * @returns Near focus limit in meters.
 */
export const calculateNearLimit = (focusDistance: number, hyperfocalDistance: number, focalLength: number): number => {
    const focalLengthM = focalLength / 1000;
    // Avoid division by zero or near-zero if focus is very close to hyperfocal
    const denominator = hyperfocalDistance + focusDistance - 2 * focalLengthM;
    if (Math.abs(denominator) < 1e-6) {
        // Simplified approx: focus distance is near hyperfocal, near limit is roughly half hyperfocal
        // Or handle as error / specific case. For simplicity, returning near half hyperfocal
        return hyperfocalDistance / 2; 
    }
    return (focusDistance * (hyperfocalDistance - focalLengthM)) / denominator;
};

/**
 * Calculates the far limit of the Depth of Field (DOF).
 * @param focusDistance Focus distance in meters.
 * @param hyperfocalDistance Hyperfocal distance in meters.
 * @param focalLength Focal length in mm.
 * @returns Far focus limit in meters (can be Infinity).
 */
export const calculateFarLimit = (focusDistance: number, hyperfocalDistance: number, focalLength: number): number => {
    const focalLengthM = focalLength / 1000;
    if (focusDistance >= hyperfocalDistance) {
        return Infinity;
    }
    // Avoid division by zero if focus equals hyperfocal (already handled above, but for safety)
    const denominator = hyperfocalDistance - focusDistance;
    if (Math.abs(denominator) < 1e-6) {
        return Infinity; 
    }
    return (focusDistance * (hyperfocalDistance - focalLengthM)) / denominator;
};

/**
 * Calculates all relevant Depth of Field (DOF) parameters.
 * @param focusDistance Focus distance in meters.
 * @param camera The camera object.
 * @param lens The lens object.
 * @param aperture The selected aperture f-number.
 * @returns An object containing hyperfocal distance, near/far limits, total DOF, and CoC used.
 */
export const getDOFCalculations = (focusDistance: number, camera: Camera | undefined, lens: Lens | undefined, aperture: number): {
    hyperfocal: number;
    nearLimit: number;
    farLimit: number;
    totalDOF: number;
    inFocusRangeText: string;
    circleOfConfusion: number;
} => {
    if (!camera || !lens || aperture <= 0 || focusDistance <= 0) {
        // Return default/zeroed values if inputs are invalid
        return {
            hyperfocal: Infinity,
            nearLimit: 0,
            farLimit: 0,
            totalDOF: 0,
            inFocusRangeText: "N/A",
            circleOfConfusion: DEFAULT_COC_FULL_FRAME_MM
        };
    }

    const focalLength = getEffectiveFocalLength(lens);
    const coc = calculateCircleOfConfusion(camera.sensorType, camera.sensorWidth);
    const hyperfocal = calculateHyperfocalDistance(focalLength, aperture, coc);
    const nearLimit = calculateNearLimit(focusDistance, hyperfocal, focalLength);
    const farLimit = calculateFarLimit(focusDistance, hyperfocal, focalLength);
    const totalDOF = (farLimit === Infinity) ? Infinity : farLimit - nearLimit;

    let inFocusRangeText = "N/A";
    if (nearLimit > 0 && farLimit > 0) {
        const nearFeet = metersToFeet(nearLimit).toFixed(1);
        const farFeet = (farLimit === Infinity) ? "Infinity" : metersToFeet(farLimit).toFixed(1);
        inFocusRangeText = `~${nearFeet} ft to ${farFeet}${farLimit === Infinity ? '' : ' ft'}`;
    }

    return {
        hyperfocal,
        nearLimit,
        farLimit,
        totalDOF,
        inFocusRangeText,
        circleOfConfusion: coc
    };
};

/**
 * Calculates the distance required to achieve a target GSD.
 * @param targetGSDmm Target GSD in mm/pixel.
 * @param camera The camera object.
 * @param lens The lens object.
 * @returns Required distance (altitude) in meters.
 */
export const calculateDistanceForGSD = (targetGSDmm: number, camera: Camera | undefined, lens: Lens | undefined): number => {
    if (!camera || !lens || targetGSDmm <= 0) return 0;

    const focalLength = getEffectiveFocalLength(lens);
    if (focalLength <= 0 || !camera.sensorWidth || !camera.imageWidth) return 0;
    
    const targetGSDcm = targetGSDmm / 10; // Convert target GSD from mm to cm

    // Rearranged GSD formula: Altitude [m] = (Target GSD [cm/pix] * Focal Length [mm] * Image Width [pix]) / (Sensor Width [mm] * 100 [cm/m])
    const altitude = (targetGSDcm * focalLength * camera.imageWidth) / (camera.sensorWidth * 100);
    return altitude;
};

/**
 * Represents the physical specifications of the camera sensor and lens.
 * All units should be consistent (e.g., millimeters for sensor/focal length).
 */
export interface CameraSpecs {
  focalLength: number; // Effective focal length in mm
  sensorWidth: number; // Sensor width in mm
  sensorHeight: number; // Sensor height in mm
}

/**
 * Represents the calculated spacing and ground coverage.
 * Units will match the unit of flightAltitude (e.g., meters).
 */
export interface OverlapSpacingResult {
  horizontalSpacing: number; // Distance between image centers along the flight path (m)
  verticalSpacing: number;   // Distance between adjacent flight lines (m)
  coverageWidth: number;     // Width of the ground footprint of a single image (m)
  coverageHeight: number;    // Height of the ground footprint of a single image (m)
  horizontalFOV: number;     // Horizontal Field of View (degrees)
  verticalFOV: number;       // Vertical Field of View (degrees)
}

/**
 * Calculates the required spacing between image captures based on desired overlap
 * and the ground footprint of the camera at a given altitude.
 *
 * Assumes:
 * - Altitude is Above Ground Level (AGL) and the ground is relatively flat.
 * - The camera is pointing straight down (nadir).
 * - Sensor width aligns with the horizontal overlap direction (along flight path).
 * - Sensor height aligns with the vertical overlap direction (between flight lines).
 * - No lens distortion is considered.
 *
 * @param cameraSpecs - Camera and lens specifications { focalLength, sensorWidth, sensorHeight } in mm.
 * @param overlapH - Desired horizontal (along-track) overlap percentage (e.g., 0.75 for 75%).
 * @param overlapV - Desired vertical (side-lap) overlap percentage (e.g., 0.60 for 60%).
 * @param flightAltitude - Flight altitude AGL in meters.
 * @returns An object containing calculated spacing and coverage dimensions in meters, and FOV in degrees.
 */
export const calculateOverlapSpacing = (
  cameraSpecs: CameraSpecs,
  overlapH: number,
  overlapV: number,
  flightAltitude: number
): OverlapSpacingResult => {
  const { focalLength, sensorWidth, sensorHeight } = cameraSpecs;

  // Validate inputs
  if (focalLength <= 0 || sensorWidth <= 0 || sensorHeight <= 0) {
    throw new Error("Camera specifications (focalLength, sensorWidth, sensorHeight) must be positive.");
  }
  if (overlapH < 0 || overlapH >= 1) {
    throw new Error("Horizontal overlap must be between 0 (inclusive) and 1 (exclusive).");
  }
  if (overlapV < 0 || overlapV >= 1) {
     throw new Error("Vertical overlap must be between 0 (inclusive) and 1 (exclusive).");
  }
   if (flightAltitude <= 0) {
    // Allow 0 altitude? Maybe for object scanning? For now, require positive AGL.
    throw new Error("Flight altitude must be positive.");
  }

  // 1. Calculate Field of View (FOV) in radians
  const hFovRad = 2 * Math.atan(sensorWidth / (2 * focalLength));
  const vFovRad = 2 * Math.atan(sensorHeight / (2 * focalLength));

  // Convert FOV to degrees for informational output
  const hFovDeg = hFovRad * (180 / Math.PI);
  const vFovDeg = vFovRad * (180 / Math.PI);

  // 2. Calculate Ground Coverage Footprint (Width and Height) at the given altitude
  // Formula: Coverage = 2 * Altitude * tan(FOV_radians / 2)
  const coverageWidth = 2 * flightAltitude * Math.tan(hFovRad / 2);
  const coverageHeight = 2 * flightAltitude * Math.tan(vFovRad / 2);

  // 3. Calculate Spacing based on Overlap
  // Spacing = Footprint * (1 - OverlapRatio)
  // Horizontal spacing is along the flight track (related to sensor width footprint)
  const horizontalSpacing = coverageWidth * (1 - overlapH);
  // Vertical spacing is the distance between flight lines (related to sensor height footprint)
  const verticalSpacing = coverageHeight * (1 - overlapV);

  return {
    horizontalSpacing,
    verticalSpacing,
    coverageWidth,
    coverageHeight,
    horizontalFOV: hFovDeg,
    verticalFOV: vFovDeg,
  };
};

/**
 * Calculates sensor dimensions and related properties based on camera and lens
 * @param camera The camera object
 * @param lens The lens object
 * @returns Object with sensor width, height, aspect ratio, and other properties
 */
export const calculateSensorDimensions = (camera: any, lens: any) => {
    if (!camera) {
        return {
            width: 0,
            height: 0,
            diagonal: 0,
            aspectRatio: 0,
            megapixels: 0,
            effectiveFocalLength: 0
        };
    }
    
    // Default to a standard aspect ratio if not specified
    const aspectRatio = camera.aspectRatio || 3/2; // 3:2 is common for DSLRs
    
    // Calculate dimensions based on what's available
    const width = camera.sensorWidth || 0;
    const height = width ? width / aspectRatio : 0;
    const diagonal = Math.sqrt(width * width + height * height);
    
    // Calculate megapixels if image dimensions are available
    const megapixels = camera.imageWidth && camera.imageHeight 
        ? (camera.imageWidth * camera.imageHeight) / 1000000 
        : 0;
        
    // Get effective focal length if lens is available
    const effectiveFocalLength = lens ? getEffectiveFocalLength(lens) : 0;
    
    return {
        width,
        height,
        diagonal,
        aspectRatio,
        megapixels,
        effectiveFocalLength
    };
}; 