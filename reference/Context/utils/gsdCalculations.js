/**
 * Ground Sampling Distance (GSD) and photogrammetry utility functions
 * These utilities help calculate optimal flight parameters for photogrammetry
 */

/**
 * Calculate Ground Sampling Distance (GSD) based on camera parameters and altitude
 * @param {Object} cameraParams - Camera parameters object
 * @param {number} cameraParams.focalLength - Focal length in mm
 * @param {number} cameraParams.sensorWidth - Sensor width in mm
 * @param {number} cameraParams.sensorHeight - Sensor height in mm
 * @param {number} cameraParams.imageWidth - Image width in pixels
 * @param {number} cameraParams.imageHeight - Image height in pixels
 * @param {number} altitude - Flight altitude in meters
 * @returns {number} - GSD in cm/pixel
 */
export const calculateGSD = (cameraParams, altitude) => {
  const { focalLength, sensorWidth, imageWidth } = cameraParams;
  
  // GSD formula: (sensor width * altitude * 100) / (focal length * image width)
  // Result is in cm/pixel
  const gsd = (sensorWidth * altitude * 100) / (focalLength * imageWidth);
  
  return gsd;
};

/**
 * Calculate the field of view angle based on focal length and sensor dimension
 * @param {number} focalLength - Focal length in mm
 * @param {number} sensorDimension - Sensor dimension (width or height) in mm
 * @returns {number} - Field of view angle in degrees
 */
export const calculateFieldOfView = (focalLength, sensorDimension) => {
  // Field of view formula: 2 * arctan(sensorDimension / (2 * focalLength))
  const fovRadians = 2 * Math.atan(sensorDimension / (2 * focalLength));
  const fovDegrees = fovRadians * (180 / Math.PI);
  
  return fovDegrees;
};

/**
 * Calculate the footprint of an image on the ground
 * @param {Object} cameraParams - Camera parameters object
 * @param {number} altitude - Flight altitude in meters
 * @returns {Object} - Width and height of ground footprint in meters
 */
export const calculateFootprint = (cameraParams, altitude) => {
  const { focalLength, sensorWidth, sensorHeight, imageWidth, imageHeight } = cameraParams;
  
  // Calculate GSD in cm/pixel
  const gsd = calculateGSD(cameraParams, altitude);
  
  // Convert GSD to meters/pixel
  const gsdMeters = gsd / 100;
  
  // Calculate footprint dimensions
  const footprintWidth = gsdMeters * imageWidth;
  const footprintHeight = gsdMeters * imageHeight;
  
  return {
    width: footprintWidth,
    height: footprintHeight
  };
};

/**
 * Calculate image spacing based on footprint and overlap
 * @param {number} footprintDimension - Footprint dimension (width or height) in meters
 * @param {number} overlap - Overlap percentage (0-100)
 * @returns {number} - Distance between images in meters
 */
export const calculateImageSpacing = (footprintDimension, overlap) => {
  // Convert percentage to decimal
  const overlapDecimal = overlap / 100;
  
  // Calculate spacing
  const spacing = footprintDimension * (1 - overlapDecimal);
  
  return spacing;
};

/**
 * Calculate the distance between waypoints based on overlap requirements
 * @param {Object} footprint - Image footprint dimensions in meters
 * @param {number} forwardOverlap - Forward overlap percentage (0-100)
 * @param {number} sideOverlap - Side overlap percentage (0-100)
 * @returns {Object} - Distance between waypoints in meters
 */
export const calculateWaypointSpacing = (footprint, forwardOverlap, sideOverlap) => {
  // Convert percentages to decimals
  const forwardOverlapDecimal = forwardOverlap / 100;
  const sideOverlapDecimal = sideOverlap / 100;
  
  // Calculate spacing
  const forwardSpacing = footprint.width * (1 - forwardOverlapDecimal);
  const sideSpacing = footprint.height * (1 - sideOverlapDecimal);
  
  return {
    forward: forwardSpacing,
    side: sideSpacing
  };
};

/**
 * Calculate optimal flight parameters for photogrammetry
 * @param {Object} cameraParams - Camera parameters object
 * @param {number} altitude - Flight altitude in meters
 * @param {number} forwardOverlap - Forward overlap percentage (0-100)
 * @param {number} sideOverlap - Side overlap percentage (0-100)
 * @returns {Object} - Comprehensive set of calculated parameters
 */
export const calculatePhotogrammetryParameters = (cameraParams, altitude, forwardOverlap, sideOverlap) => {
  // Calculate GSD
  const gsd = calculateGSD(cameraParams, altitude);
  
  // Calculate footprint
  const footprint = calculateFootprint(cameraParams, altitude);
  
  // Calculate waypoint spacing
  const spacing = calculateWaypointSpacing(footprint, forwardOverlap, sideOverlap);
  
  // Calculate area coverage per image
  const areaCoverage = footprint.width * footprint.height;
  
  // Calculate effective area coverage considering overlap
  const effectiveAreaCoverage = spacing.forward * spacing.side;
  
  // Estimate images needed for 1 hectare (10,000 m²)
  const imagesPerHectare = 10000 / effectiveAreaCoverage;
  
  return {
    gsd,
    footprint,
    spacing,
    areaCoverage,
    effectiveAreaCoverage,
    imagesPerHectare
  };
};

/**
 * Calculates the optimal altitude for a desired GSD
 * @param {Object} cameraParams - Camera parameters
 * @param {number} targetGSD - Target GSD in cm/pixel
 * @returns {number} - Altitude in meters
 */
export const calculateAltitudeForGSD = (cameraParams, targetGSD) => {
  const { focalLength, sensorWidth, imageWidth } = cameraParams;
  
  // Rearranged GSD formula: altitude = (targetGSD * focalLength * imageWidth) / (sensorWidth * 100)
  const altitude = (targetGSD * focalLength * imageWidth) / (sensorWidth * 100);
  
  return altitude;
};

/**
 * Get the camera angle needed for a facade scan based on height and distance
 * @param {number} buildingHeight - Height of the building in meters
 * @param {number} scanDistance - Distance from the building in meters
 * @param {number} altitude - Flight altitude in meters
 * @returns {number} - Camera tilt angle in degrees
 */
export const calculateFacadeCameraAngle = (buildingHeight, scanDistance, altitude) => {
  // Calculate the angle based on the height differential and distance
  const heightDiff = buildingHeight / 2; // Aim at the middle of the facade
  const angleRadians = Math.atan2(heightDiff, scanDistance);
  const angleDegrees = angleRadians * (180 / Math.PI);
  
  return -angleDegrees; // Negative because camera looks down
};

/**
 * Calculate vertical spacing for facade scans based on GSD requirements
 * @param {Object} cameraParams - Camera parameters
 * @param {number} scanDistance - Distance from the facade in meters
 * @param {number} verticalOverlap - Vertical overlap percentage (0-100)
 * @returns {number} - Vertical spacing between scan passes in meters
 */
export const calculateFacadeVerticalSpacing = (cameraParams, scanDistance, verticalOverlap) => {
  // Calculate the effective altitude (distance from camera to subject)
  const effectiveAltitude = scanDistance;
  
  // Calculate footprint at this distance
  const footprint = calculateFootprint(cameraParams, effectiveAltitude);
  
  // Calculate spacing based on vertical overlap
  const verticalSpacing = footprint.height * (1 - verticalOverlap / 100);
  
  return verticalSpacing;
};

/**
 * Calculate a complete set of parameters for facade photogrammetry
 * @param {Object} cameraParams - Camera parameters
 * @param {Object} buildingParams - Building dimensions and scan settings
 * @returns {Object} - Comprehensive set of facade scan parameters
 */
export const calculateFacadeParameters = (cameraParams, buildingParams) => {
  const { width, height, scanDistance, verticalOverlap } = buildingParams;
  
  // Calculate GSD at the facade
  const gsd = calculateGSD(cameraParams, scanDistance);
  
  // Calculate footprint on the facade
  const footprint = calculateFootprint(cameraParams, scanDistance);
  
  // Calculate vertical spacing
  const verticalSpacing = calculateFacadeVerticalSpacing(
    cameraParams, 
    scanDistance, 
    verticalOverlap
  );
  
  // Calculate camera angle
  const cameraAngle = calculateFacadeCameraAngle(height, scanDistance, height / 2);
  
  // Calculate number of vertical passes needed
  const numVerticalPasses = Math.ceil(height / verticalSpacing);
  
  return {
    gsd,
    footprint,
    verticalSpacing,
    cameraAngle,
    numVerticalPasses
  };
}; 