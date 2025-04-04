/**
 * Flight Pattern Generators
 * Provides functions to generate various flight path patterns
 */
import * as GeoUtils from './geoUtils';
import { 
  generateOrbitPath, 
  generateSpiralPath, 
  generateFacadeScanPath
} from './patternGenerators';

// Define metersToDegreesAt locally since it's not exported from patternGenerators
function metersToDegreesAt(meters, latitude) {
  const latDegreePerMeter = 1 / 111111;
  const lngDegreePerMeter = 1 / (111111 * Math.cos(latitude * Math.PI / 180));
  
  return {
    lat: meters * latDegreePerMeter,
    lng: meters * lngDegreePerMeter
  };
}

/**
 * Generate waypoints for an orbit pattern around a target point
 * @param {Object} targetPoint - Target x/z to orbit around
 * @param {number} radius - Orbit radius in meters
 * @param {number} altitude - Flight altitude in meters
 * @param {number} segments - Number of waypoints to create for the orbit (higher = smoother)
 * @param {number} startAngle - Starting angle in degrees (0 = east, 90 = north, etc.)
 * @param {number} endAngle - Optional end angle for partial orbits (360 = full orbit)
 * @param {Object} options - Additional options like multiple orbits, vertical shift
 * @returns {Array} Array of waypoint objects
 */
export function generateOrbit(targetPoint, radius, altitude, segments = 16, startAngle = 0, endAngle = 360, options = {}) {
  try {
    console.log('Generating orbit pattern with params:', { 
      targetPoint, radius, altitude, segments, startAngle, endAngle, options 
    });
    
    const { 
      orbits = 1,          // Number of orbits to complete
      verticalShift = 0,   // Meters to ascend/descend per orbit
      cameraMode = 'center', // 'center', 'forward', 'custom'
      cameraAngle = -45,   // Default camera angle (degrees, -90 = straight down)
    } = options;
    
    // Single orbit case - use the improved orbit generator
    if (orbits === 1 && verticalShift === 0) {
      // Use the orbit generator from patternGenerators.js
      const orbitWaypoints = generateOrbitPath(
        targetPoint, // Center point {x, y, z}
        radius,      // Radius in meters
        altitude,    // Altitude in meters
        segments,    // Number of segments
        {
          startAngle: startAngle * Math.PI / 180,
          endAngle: endAngle * Math.PI / 180
        }
      );
      
      // Add camera settings based on mode
      return orbitWaypoints.map(wp => {
        let heading = cameraAngle;
        if (cameraMode === 'center') {
          // Calculate heading to point toward center
          const dx = targetPoint.x - wp.x;
          const dz = targetPoint.z - wp.z;
          heading = Math.atan2(dz, dx) * 180 / Math.PI;
        }
        
        return {
          x: wp.x,
          y: wp.y,
          z: wp.z,
          type: wp.type || 'orbit',
          label: wp.label || 'Orbit Waypoint',
          camera: {
            heading: heading,
            pitch: (cameraMode === 'custom') ? cameraAngle : -45,
            roll: 0
          }
        };
      });
    }
    
    // For multiple orbits or orbits with vertical shift, use existing implementation
    const waypoints = [];
    const angleIncrement = (endAngle - startAngle) / segments;
    
    for (let orbit = 0; orbit < orbits; orbit++) {
      // Calculate altitude for this orbit
      const orbitAltitude = altitude + (orbit * verticalShift);
      
      for (let i = 0; i <= segments; i++) {
        const angle = (startAngle + i * angleIncrement) * Math.PI / 180;
        
        // Calculate position relative to center point
        const x = targetPoint.x + radius * Math.cos(angle);
        const z = targetPoint.z + radius * Math.sin(angle);
        
        // Calculate gimbal angle based on camera mode
        let heading = cameraAngle;
        if (cameraMode === 'center') {
          // Point camera at target
          heading = (Math.atan2(targetPoint.z - z, targetPoint.x - x) * 180 / Math.PI + 360) % 360;
        }
        
        waypoints.push({
          x: x,
          y: orbitAltitude,
          z: z,
          type: 'orbit',
          label: `Orbit Pt ${i + 1}`,
          camera: {
            heading: heading,
            pitch: (cameraMode === 'custom') ? cameraAngle : -45,
            roll: 0
          }
        });
      }
    }
    
    console.log(`Generated ${waypoints.length} orbit waypoints`);
    return waypoints;
  } catch (error) {
    console.error('Error in generateOrbit:', error);
    return [];
  }
}

/**
 * Generate waypoints for a spiral pattern
 * @param {Object} centerPoint - Center x/z for the spiral
 * @param {number} startRadius - Starting radius in meters
 * @param {number} endRadius - Ending radius in meters
 * @param {number} startAltitude - Starting altitude in meters
 * @param {number} endAltitude - Ending altitude in meters
 * @param {number} revolutions - Number of complete turns in the spiral
 * @param {number} segments - Total number of waypoints to generate
 * @returns {Array} Array of waypoint objects
 */
export function generateSpiral(centerPoint, startRadius, endRadius, startAltitude, endAltitude, revolutions = 3, segments = 60) {
  try {
    console.log('Generating spiral pattern with params:', { centerPoint, startRadius, endRadius, startAltitude, endAltitude, revolutions, segments });
    
    // Use the improved spiral generator from patternGenerators.js
    const pointsPerRevolution = Math.ceil(segments / revolutions);
    
    const spiralWaypoints = generateSpiralPath(
      centerPoint,                 // Center point {x, y, z}
      startRadius,                 // Starting radius in meters
      endRadius,                   // Ending radius in meters
      startAltitude,               // Altitude to use (we'll modify for vertical spirals)
      revolutions,                 // Number of revolutions
      pointsPerRevolution          // Points per revolution
    );
    
    // For vertical spirals, we need to adjust the altitude
    if (startAltitude !== endAltitude) {
      const altitudeRange = endAltitude - startAltitude;
      const altitudeStep = altitudeRange / spiralWaypoints.length;
      
      // Apply altitude changes
      for (let i = 0; i < spiralWaypoints.length; i++) {
        spiralWaypoints[i].y = startAltitude + (altitudeStep * i);
      }
    }
    
    // Add camera settings
    return spiralWaypoints.map(wp => ({
      x: wp.x,
      y: wp.y,
      z: wp.z,
      type: wp.type || 'spiral',
      label: wp.label || 'Spiral Waypoint',
      camera: {
        heading: 0,           // Forward-facing by default
        pitch: -45,           // 45 degrees down
        roll: 0
      }
    }));
  } catch (error) {
    console.error('Error in generateSpiral:', error);
    return [];
  }
}

/**
 * Generate waypoints for a facade scan pattern (vertical building scan)
 * @param {Object} buildingCenter - Center point of the building's base
 * @param {number} buildingWidth - Width of the building in meters
 * @param {number} buildingHeight - Height of the building in meters
 * @param {number} scanDistance - Distance from building to scan from in meters
 * @param {number} overlapPercent - Overlap percentage between scan rows/columns
 * @param {number} orientation - Building orientation in degrees (0 = facing east)
 * @returns {Array} Array of waypoint objects
 */
export function generateFacadeScan(buildingCenter, buildingWidth, buildingHeight, scanDistance, overlapPercent = 20, orientation = 0) {
  try {
    console.log('Generating facade scan with params:', { buildingCenter, buildingWidth, buildingHeight, scanDistance, overlapPercent, orientation });
    
    // Create building corners based on center, width, height and orientation
    const buildingCorners = [];
    const halfWidth = buildingWidth / 2;
    const halfLength = buildingWidth / 2; // Assuming square footprint for simplicity
    
    // Calculate non-rotated corners (in x,z coordinate system)
    const corners = [
      { x: -halfWidth, z: -halfLength },
      { x: halfWidth, z: -halfLength },
      { x: halfWidth, z: halfLength },
      { x: -halfWidth, z: halfLength }
    ];
    
    // Apply rotation and convert to x,z coordinates
    const rotationRad = orientation * Math.PI / 180;
    corners.forEach(corner => {
      // Rotate corner
      const rotatedX = corner.x * Math.cos(rotationRad) - corner.z * Math.sin(rotationRad);
      const rotatedZ = corner.x * Math.sin(rotationRad) + corner.z * Math.cos(rotationRad);
      
      // Add to building center
      buildingCorners.push({
        x: buildingCenter.x + rotatedX,
        z: buildingCenter.z + rotatedZ
      });
    });
    
    // Use facade scan generator from patternGenerators.js
    const facadeWaypoints = generateFacadeScanPath(
      buildingCorners,  // Array of corner points defining the building perimeter
      buildingHeight,   // Height of the building in meters
      scanDistance,     // Distance from building to scan from
      overlapPercent,   // Percentage of vertical overlap between scan lines
      5                 // Base altitude for the scan
    );
    
    // Add camera pointing toward building center
    return facadeWaypoints.map(wp => ({
      x: wp.x,
      y: wp.y,
      z: wp.z,
      type: wp.type || 'facade',
      label: wp.label || 'Facade Scan',
      camera: {
        heading: calculateHeadingToward(wp, buildingCenter),
        pitch: 0, // Horizontal for facade scanning
        roll: 0
      }
    }));
  } catch (error) {
    console.error('Error in generateFacadeScan:', error);
    return [];
  }
}

/**
 * Calculate heading that points from current position toward a target
 * @param {Object} position - Current position with x,z coordinates
 * @param {Object} target - Target position with x,z coordinates
 * @returns {number} Heading in degrees (0-360)
 */
function calculateHeadingToward(position, target) {
  const dx = target.x - position.x;
  const dz = target.z - position.z;
  const angleRad = Math.atan2(dz, dx);
  const angleDeg = angleRad * 180 / Math.PI;
  return (angleDeg + 360) % 360;
}

/**
 * Converts flight pattern waypoints to mission store format
 * @param {Array} patternWaypoints - Array of waypoints from pattern generators
 * @param {Object} options - Options for conversion (startPosition, includeTakeoff, etc)
 * @returns {Array} Array of waypoints in mission store format
 */
export function convertToMissionWaypoints(patternWaypoints, options = {}) {
  try {
    if (!patternWaypoints || !Array.isArray(patternWaypoints) || patternWaypoints.length === 0) {
      console.error('No valid waypoints to convert');
      return [];
    }
    
    const {
      startPosition = { x: 0, y: 0, z: 0 },
      includeTakeoff = true,
      includeReturn = true,
      initialAltitude = 30,
      maxTransitSpeed = 8,
      missionSpeed = 5
    } = options;
    
    const missionWaypoints = [];
    
    // Add initial takeoff waypoint if requested
    if (includeTakeoff) {
      missionWaypoints.push({
        x: startPosition.x,
        y: initialAltitude,
        z: startPosition.z,
        type: 'takeoff',
        label: 'Takeoff',
        speed: maxTransitSpeed / 2 // Slower speed for takeoff
      });
    }
    
    // Add all pattern waypoints with correct structure
    for (let i = 0; i < patternWaypoints.length; i++) {
      const wp = patternWaypoints[i];
      if (!wp) continue;
      
      missionWaypoints.push({
        x: wp.x,
        y: wp.y,
        z: wp.z,
        type: wp.type || 'scan',
        label: wp.label || `Waypoint ${i+1}`,
        camera: wp.camera,
        speed: missionSpeed
      });
    }
    
    // Add return to home waypoint if requested
    if (includeReturn && missionWaypoints.length > 0) {
      missionWaypoints.push({
        x: startPosition.x,
        y: initialAltitude,
        z: startPosition.z,
        type: 'rtl',
        label: 'Return to Home',
        speed: maxTransitSpeed
      });
    }
    
    console.log(`Converted ${patternWaypoints.length} pattern waypoints to ${missionWaypoints.length} mission waypoints`);
    return missionWaypoints;
  } catch (error) {
    console.error('Error in convertToMissionWaypoints:', error);
    return [];
  }
} 