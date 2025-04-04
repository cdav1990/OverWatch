/**
 * GeoUtils - Geographic coordinate utilities
 * Provides functions for converting between geodetic (WGS84) and local ENU coordinates
 */

// Earth constants (WGS84)
const WGS84 = {
  a: 6378137.0,         // Semi-major axis
  f: 1/298.257223563,   // Flattening
  e2: 0.00669437999014  // First eccentricity squared
};

/**
 * Convert geodetic coordinates (WGS84) to ECEF (Earth-Centered, Earth-Fixed)
 * @param {number} lat - Latitude in degrees
 * @param {number} lon - Longitude in degrees
 * @param {number} alt - Altitude in meters
 * @returns {Object} Object with x, y, z properties in meters
 */
function geodeticToECEF(lat, lon, alt) {
  const latRad = lat * Math.PI / 180;
  const lonRad = lon * Math.PI / 180;
  
  const N = WGS84.a / Math.sqrt(1 - WGS84.e2 * Math.pow(Math.sin(latRad), 2));
  
  const x = (N + alt) * Math.cos(latRad) * Math.cos(lonRad);
  const y = (N + alt) * Math.cos(latRad) * Math.sin(lonRad);
  const z = (N * (1 - WGS84.e2) + alt) * Math.sin(latRad);
  
  return { x, y, z };
}

/**
 * Convert ECEF coordinates to geodetic (WGS84)
 * @param {number} x - ECEF X coordinate in meters
 * @param {number} y - ECEF Y coordinate in meters
 * @param {number} z - ECEF Z coordinate in meters
 * @returns {Object} Object with lat, lon, height properties (degrees, degrees, meters)
 */
function ecefToGeodetic(x, y, z) {
  const e2 = WGS84.e2;
  const a = WGS84.a;
  const b = a * (1 - WGS84.f);
  const b2 = b * b;
  
  const p = Math.sqrt(x * x + y * y);
  const theta = Math.atan2(z * a, p * b);
  
  const lon = Math.atan2(y, x);
  const lat = Math.atan2(
    z + e2 * b * Math.pow(Math.sin(theta), 3),
    p - e2 * a * Math.pow(Math.cos(theta), 3)
  );
  
  const N = a / Math.sqrt(1 - e2 * Math.pow(Math.sin(lat), 2));
  const height = p / Math.cos(lat) - N;
  
  return {
    lat: lat * 180 / Math.PI,
    lon: lon * 180 / Math.PI,
    height: height
  };
}

/**
 * Convert ECEF coordinates to local ENU coordinates
 * @param {number} x - ECEF X coordinate in meters
 * @param {number} y - ECEF Y coordinate in meters
 * @param {number} z - ECEF Z coordinate in meters
 * @param {number} refLat - Reference latitude in degrees
 * @param {number} refLon - Reference longitude in degrees
 * @param {number} refAlt - Reference altitude in meters
 * @returns {Object} Object with east, north, up properties in meters
 */
function ecefToENU(x, y, z, refLat, refLon, refAlt) {
  const refLatRad = refLat * Math.PI / 180;
  const refLonRad = refLon * Math.PI / 180;
  
  // Convert reference point to ECEF
  const refECEF = geodeticToECEF(refLat, refLon, refAlt);
  
  // Compute difference vector
  const dx = x - refECEF.x;
  const dy = y - refECEF.y;
  const dz = z - refECEF.z;
  
  // Convert to ENU
  const east = -Math.sin(refLonRad) * dx + Math.cos(refLonRad) * dy;
  const north = -Math.sin(refLatRad) * Math.cos(refLonRad) * dx
               - Math.sin(refLatRad) * Math.sin(refLonRad) * dy
               + Math.cos(refLatRad) * dz;
  const up = Math.cos(refLatRad) * Math.cos(refLonRad) * dx
           + Math.cos(refLatRad) * Math.sin(refLonRad) * dy
           + Math.sin(refLatRad) * dz;
  
  return { east, north, up };
}

/**
 * Convert local ENU coordinates to ECEF coordinates
 * @param {number} east - East coordinate in meters
 * @param {number} north - North coordinate in meters
 * @param {number} up - Up coordinate in meters
 * @param {number} refLat - Reference latitude in degrees
 * @param {number} refLon - Reference longitude in degrees
 * @param {number} refAlt - Reference altitude in meters
 * @returns {Object} Object with x, y, z properties in meters
 */
function enuToECEF(east, north, up, refLat, refLon, refAlt) {
  const refLatRad = refLat * Math.PI / 180;
  const refLonRad = refLon * Math.PI / 180;
  
  // Convert reference point to ECEF
  const refECEF = geodeticToECEF(refLat, refLon, refAlt);
  
  // Convert ENU to ECEF
  const x = refECEF.x - Math.sin(refLonRad) * east
                      - Math.sin(refLatRad) * Math.cos(refLonRad) * north
                      + Math.cos(refLatRad) * Math.cos(refLonRad) * up;
                      
  const y = refECEF.y + Math.cos(refLonRad) * east
                      - Math.sin(refLatRad) * Math.sin(refLonRad) * north
                      + Math.cos(refLatRad) * Math.sin(refLonRad) * up;
                      
  const z = refECEF.z + Math.cos(refLatRad) * north
                      + Math.sin(refLatRad) * up;
  
  return { x, y, z };
}

/**
 * Convert geodetic coordinates to local ENU coordinates
 * @param {number} lat - Latitude in degrees
 * @param {number} lon - Longitude in degrees
 * @param {number} alt - Altitude in meters
 * @param {number} refLat - Reference latitude in degrees
 * @param {number} refLon - Reference longitude in degrees
 * @param {number} refAlt - Reference altitude in meters
 * @returns {Object} Object with east, north, up properties in meters
 */
export function geodeticToLocal(lat, lon, alt, refLat, refLon, refAlt) {
  const ecef = geodeticToECEF(lat, lon, alt);
  return ecefToENU(ecef.x, ecef.y, ecef.z, refLat, refLon, refAlt);
}

/**
 * Convert local ENU coordinates to geodetic coordinates
 * @param {number} east - East coordinate in meters
 * @param {number} north - North coordinate in meters
 * @param {number} up - Up coordinate in meters
 * @param {number} refLat - Reference latitude in degrees
 * @param {number} refLon - Reference longitude in degrees
 * @param {number} refAlt - Reference altitude in meters
 * @returns {Object} Object with lat, lon, height properties (degrees, degrees, meters)
 */
export function localToGeodetic(east, north, up, refLat, refLon, refAlt) {
  const ecef = enuToECEF(east, north, up, refLat, refLon, refAlt);
  return ecefToGeodetic(ecef.x, ecef.y, ecef.z);
}

/**
 * Format coordinates as decimal degrees, degrees minutes seconds, or degrees decimal minutes
 * @param {number} latitude - Latitude in decimal degrees
 * @param {number} longitude - Longitude in decimal degrees
 * @param {string} format - Format: 'dd' (decimal degrees), 'dms' (degrees minutes seconds), 'ddm' (degrees decimal minutes)
 * @returns {Object} Object with formatted lat and lon strings
 */
export function formatCoordinates(latitude, longitude, format = 'dd') {
  if (format === 'dd') {
    return {
      lat: `${latitude.toFixed(6)}°`,
      lon: `${longitude.toFixed(6)}°`
    };
  } else if (format === 'dms') {
    return {
      lat: formatDMS(latitude, 'lat'),
      lon: formatDMS(longitude, 'lon')
    };
  } else if (format === 'ddm') {
    return {
      lat: formatDDM(latitude, 'lat'),
      lon: formatDDM(longitude, 'lon')
    };
  }
  
  return {
    lat: `${latitude.toFixed(6)}°`,
    lon: `${longitude.toFixed(6)}°`
  };
}

/**
 * Format decimal degrees to degrees minutes seconds
 * @param {number} value - Decimal degrees
 * @param {string} type - 'lat' or 'lon'
 * @returns {string} Formatted string
 */
function formatDMS(value, type) {
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutes = Math.floor((abs - degrees) * 60);
  const seconds = ((abs - degrees) * 60 - minutes) * 60;
  
  const direction = type === 'lat'
    ? (value >= 0 ? 'N' : 'S')
    : (value >= 0 ? 'E' : 'W');
    
  return `${degrees}° ${minutes}' ${seconds.toFixed(2)}" ${direction}`;
}

/**
 * Format decimal degrees to degrees decimal minutes
 * @param {number} value - Decimal degrees
 * @param {string} type - 'lat' or 'lon'
 * @returns {string} Formatted string
 */
function formatDDM(value, type) {
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutes = (abs - degrees) * 60;
  
  const direction = type === 'lat'
    ? (value >= 0 ? 'N' : 'S')
    : (value >= 0 ? 'E' : 'W');
    
  return `${degrees}° ${minutes.toFixed(4)}' ${direction}`;
} 