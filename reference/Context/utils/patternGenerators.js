/**
 * Utility functions for generating different flight path patterns
 */

/**
 * Validates a waypoint object to ensure it has all required properties
 * @param {Object} waypoint - The waypoint to validate
 * @param {string} [source] - Name of the generator function (for logging)
 * @returns {Object} The validated and normalized waypoint
 */
const validateWaypoint = (waypoint, source = 'unknown') => {
  if (!waypoint) {
    console.error(`[${source}] Invalid waypoint: waypoint is null or undefined`);
    return { x: 0, y: 0, z: 0 };
  }
  
  // Ensure x, y, z are numbers
  const result = {
    x: typeof waypoint.x === 'number' ? waypoint.x : 0,
    y: typeof waypoint.y === 'number' ? waypoint.y : 0,
    z: typeof waypoint.z === 'number' ? waypoint.z : 0
  };
  
  // Copy additional properties if they exist
  if (waypoint.type) result.type = waypoint.type;
  if (waypoint.label) result.label = waypoint.label;
  if (waypoint.camera) result.camera = waypoint.camera;
  
  return result;
};

/**
 * Generates waypoints for an orbit flight path around a target point
 * @param {Object} center - The center point to orbit around {x, y, z}
 * @param {number} radius - The radius of the orbit in meters
 * @param {number} altitude - The altitude of the orbit in meters
 * @param {number} segments - The number of segments in the orbit
 * @param {Object} options - Additional options for the orbit
 * @returns {Array} An array of waypoints defining the orbit path
 */
const generateOrbitPath = (center, radius, altitude, segments = 16, options = {}) => {
  try {
    if (!center || typeof radius !== 'number' || typeof altitude !== 'number') {
      console.error('Invalid parameters for orbit pattern:', { center, radius, altitude });
      return [];
    }
    
    const { startAngle = 0, endAngle = Math.PI * 2 } = options;
    const angleIncrement = (endAngle - startAngle) / segments;
    
    const waypoints = [];
    
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + angleIncrement * i;
      const x = center.x + radius * Math.cos(angle);
      const z = center.z + radius * Math.sin(angle);
      
      waypoints.push(validateWaypoint({
        x, 
        y: altitude, 
        z,
        type: 'orbit',
        label: `Orbit Point ${i + 1}`
      }, 'generateOrbitPath'));
    }
    
    console.log(`Generated ${waypoints.length} waypoints for orbit pattern`);
    return waypoints;
  } catch (error) {
    console.error('Error generating orbit path:', error);
    return [];
  }
};

/**
 * Generates waypoints for a spiral flight path
 * @param {Object} center - The center point of the spiral {x, y, z}
 * @param {number} startRadius - The starting radius of the spiral in meters
 * @param {number} endRadius - The ending radius of the spiral in meters
 * @param {number} altitude - The altitude of the spiral in meters
 * @param {number} revolutions - The number of revolutions in the spiral
 * @param {number} pointsPerRevolution - The number of points per revolution
 * @returns {Array} An array of waypoints defining the spiral path
 */
const generateSpiralPath = (center, startRadius, endRadius, altitude, revolutions = 2, pointsPerRevolution = 8) => {
  try {
    if (!center || typeof startRadius !== 'number' || typeof endRadius !== 'number' || typeof altitude !== 'number') {
      console.error('Invalid parameters for spiral pattern:', { center, startRadius, endRadius, altitude });
      return [];
    }
    
    const totalPoints = pointsPerRevolution * revolutions;
    const radiusStep = (endRadius - startRadius) / totalPoints;
    const angleIncrement = (Math.PI * 2) / pointsPerRevolution;
    
    const waypoints = [];
    
    for (let i = 0; i <= totalPoints; i++) {
      const angle = angleIncrement * i;
      const currentRadius = startRadius + radiusStep * i;
      const x = center.x + currentRadius * Math.cos(angle);
      const z = center.z + currentRadius * Math.sin(angle);
      
      waypoints.push(validateWaypoint({
        x,
        y: altitude,
        z,
        type: 'spiral',
        label: `Spiral Point ${i + 1}`
      }, 'generateSpiralPath'));
    }
    
    console.log(`Generated ${waypoints.length} waypoints for spiral pattern`);
    return waypoints;
  } catch (error) {
    console.error('Error generating spiral path:', error);
    return [];
  }
};

/**
 * Generates waypoints for scanning a building facade
 * @param {Array} corners - Array of corner points defining the building perimeter
 * @param {number} buildingHeight - The height of the building in meters
 * @param {number} scanDistance - Distance from the building to scan from
 * @param {number} verticalOverlap - Percentage of vertical overlap between scan lines
 * @param {number} scanAltitude - The base altitude for the scan
 * @returns {Array} An array of waypoints defining the facade scan path
 */
const generateFacadeScanPath = (corners, buildingHeight, scanDistance = 5, verticalOverlap = 20, scanAltitude = 10) => {
  try {
    // Validate inputs
    if (!Array.isArray(corners) || corners.length < 3 || typeof buildingHeight !== 'number') {
      console.error('Invalid parameters for facade scan:', { corners, buildingHeight });
      return [];
    }
    
    // Create a deep copy of corners to avoid mutation
    const buildingCorners = corners.map(corner => ({ ...corner }));
    
    // Ensure corners form a closed loop by adding the first corner to the end if needed
    if (buildingCorners[0].x !== buildingCorners[buildingCorners.length - 1].x || 
        buildingCorners[0].z !== buildingCorners[buildingCorners.length - 1].z) {
      buildingCorners.push({ ...buildingCorners[0] });
    }
    
    const waypoints = [];
    
    // Calculate the vertical step size based on overlap percentage
    const fov = 70; // Assuming a 70 degree field of view for the camera
    const verticalFovDistance = 2 * scanDistance * Math.tan((fov * Math.PI) / 360);
    const verticalStep = verticalFovDistance * (1 - verticalOverlap / 100);
    
    // Maximum height to scan (building height + buffer)
    const maxScanHeight = buildingHeight + scanAltitude;
    
    // Scan each side of the building
    for (let i = 0; i < buildingCorners.length - 1; i++) {
      const sideStart = buildingCorners[i];
      const sideEnd = buildingCorners[i + 1];
      
      // Calculate direction vector of the wall
      const dx = sideEnd.x - sideStart.x;
      const dz = sideEnd.z - sideStart.z;
      const wallLength = Math.sqrt(dx * dx + dz * dz);
      
      // Skip if wall is too short
      if (wallLength < 1) continue;
      
      // Normalize direction vector
      const nx = dx / wallLength;
      const nz = dz / wallLength;
      
      // Calculate perpendicular vector (outward from building)
      const px = -nz;
      const pz = nx;
      
      // Generate scan points for this wall
      let currentHeight = scanAltitude;
      let scanPass = 0;
      
      while (currentHeight <= maxScanHeight) {
        // Add waypoint at the start of the wall at current height, positioned OUTSIDE the building
        const startX = sideStart.x + px * scanDistance;
        const startZ = sideStart.z + pz * scanDistance;
        
        waypoints.push(validateWaypoint({
          x: startX,
          y: currentHeight,
          z: startZ,
          type: 'facade',
          label: `Facade Pass ${scanPass + 1} Start`,
          camera: {
            // Point camera inward toward the wall
            direction: {
              x: -px,
              y: 0,
              z: -pz
            }
          }
        }, 'generateFacadeScanPath'));
        
        // Add waypoint at the end of the wall at current height, positioned OUTSIDE the building
        const endX = sideEnd.x + px * scanDistance;
        const endZ = sideEnd.z + pz * scanDistance;
        
        waypoints.push(validateWaypoint({
          x: endX,
          y: currentHeight,
          z: endZ,
          type: 'facade',
          label: `Facade Pass ${scanPass + 1} End`,
          camera: {
            // Point camera inward toward the wall
            direction: {
              x: -px,
              y: 0,
              z: -pz
            }
          }
        }, 'generateFacadeScanPath'));
        
        // Increment height for next pass
        currentHeight += verticalStep;
        scanPass++;
      }
    }
    
    console.log(`Generated ${waypoints.length} waypoints for facade scan pattern`);
    return waypoints;
  } catch (error) {
    console.error('Error generating facade scan path:', error);
    return [];
  }
};

// Export the functions
export {
  generateOrbitPath,
  generateSpiralPath,
  generateFacadeScanPath
}; 