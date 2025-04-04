/**
 * Comprehensive camera and lens database for accurate DOF calculations
 */

// Import camera and lens data from the source database
import cameraLensData from '../data/cameraLensData.json';

// Sensor sizes with physical dimensions
export const sensorSizes = [
  {
    id: "large-format",
    name: "Large Format",
    description: "4×5, 5×7, 8×10 inches",
    diagonal: 150, // approximate diagonal in mm
    cropFactor: 0.28
  },
  {
    id: "medium-format",
    name: "Medium Format",
    description: "Typically around 44×33mm or larger",
    diagonal: 55, // approximate diagonal in mm
    cropFactor: 0.79
  },
  {
    id: "full-frame",
    name: "Full Frame",
    description: "36×24 mm (35mm film equivalent)",
    diagonal: 43.3, // diagonal in mm
    cropFactor: 1.0
  },
  {
    id: "aps-c",
    name: "APS-C",
    description: "~24×16 mm (1.5-1.6x crop)",
    diagonal: 28.8, // approximate diagonal in mm
    cropFactor: 1.5
  },
  {
    id: "micro-four-thirds",
    name: "Micro Four Thirds",
    description: "17.3×13 mm (2x crop)",
    diagonal: 21.6, // diagonal in mm
    cropFactor: 2.0
  },
  {
    id: "one-inch",
    name: "1-inch",
    description: "13.2×8.8 mm (2.7x crop)",
    diagonal: 15.9, // diagonal in mm
    cropFactor: 2.7
  }
];

// Camera models with detailed specifications
export const cameras = [
  // Phase One aerial cameras
  {
    id: "phase-one-ixm-100",
    brand: "Phase One",
    model: "iXM-100",
    sensorType: "Medium Format",
    sensorWidth: 53.4,
    sensorHeight: 40.0,
    cropFactor: 0.79,
    imageWidth: 11664,
    imageHeight: 8750,
    megapixels: 100
  },
  {
    id: "phase-one-ixm-rs150",
    brand: "Phase One",
    model: "iXM-RS150",
    sensorType: "Medium Format",
    sensorWidth: 53.4,
    sensorHeight: 40.0,
    cropFactor: 0.79,
    imageWidth: 14204,
    imageHeight: 10652,
    megapixels: 150
  },
  {
    id: "phase-one-ixm-50",
    brand: "Phase One",
    model: "iXM-50",
    sensorType: "Medium Format",
    sensorWidth: 44.0,
    sensorHeight: 33.0,
    cropFactor: 0.96,
    imageWidth: 8280,
    imageHeight: 6208,
    megapixels: 50
  },
  
  // Sony Alpha cameras
  {
    id: "sony-a7r-iv",
    brand: "Sony",
    model: "Alpha A7R IV",
    sensorType: "Full Frame",
    sensorWidth: 35.7,
    sensorHeight: 23.8,
    cropFactor: 1.0,
    imageWidth: 9504,
    imageHeight: 6336,
    megapixels: 61
  },
  {
    id: "sony-a7-iv",
    brand: "Sony",
    model: "Alpha A7 IV",
    sensorType: "Full Frame",
    sensorWidth: 36.0,
    sensorHeight: 24.0,
    cropFactor: 1.0,
    imageWidth: 7008,
    imageHeight: 4672,
    megapixels: 33
  },
  {
    id: "sony-a1",
    brand: "Sony",
    model: "Alpha A1",
    sensorType: "Full Frame",
    sensorWidth: 36.0,
    sensorHeight: 24.0,
    cropFactor: 1.0,
    imageWidth: 8640,
    imageHeight: 5760,
    megapixels: 50.1
  },
  {
    id: "sony-a6600",
    brand: "Sony",
    model: "Alpha A6600",
    sensorType: "APS-C",
    sensorWidth: 23.5,
    sensorHeight: 15.6,
    cropFactor: 1.5,
    imageWidth: 6000,
    imageHeight: 4000,
    megapixels: 24.2
  },
  {
    id: "sony-a6400",
    brand: "Sony",
    model: "Alpha A6400",
    sensorType: "APS-C",
    sensorWidth: 23.5,
    sensorHeight: 15.6,
    cropFactor: 1.5,
    imageWidth: 6000,
    imageHeight: 4000,
    megapixels: 24.2
  },
  
  // Fujifilm cameras
  {
    id: "fujifilm-gfx-100s",
    brand: "Fujifilm",
    model: "GFX 100S",
    sensorType: "Medium Format",
    sensorWidth: 43.8,
    sensorHeight: 32.9,
    cropFactor: 0.8,
    imageWidth: 11648,
    imageHeight: 8736,
    megapixels: 102
  },
  
  // DJI Cameras
  {
    id: "dji-mavic-3-pro",
    brand: "DJI",
    model: "Mavic 3 Pro Camera",
    sensorType: "1-inch",
    sensorWidth: 13.2,
    sensorHeight: 8.8,
    cropFactor: 2.0,
    imageWidth: 5280,
    imageHeight: 3956,
    megapixels: 20.9
  },
  {
    id: "dji-phantom-4-pro",
    brand: "DJI",
    model: "Phantom 4 Pro Camera",
    sensorType: "1-inch",
    sensorWidth: 13.2,
    sensorHeight: 8.8,
    cropFactor: 2.7,
    imageWidth: 5472,
    imageHeight: 3648,
    megapixels: 20
  },
  {
    id: "dji-mavic-2-pro",
    brand: "DJI",
    model: "Mavic 2 Pro",
    sensorType: "1-inch",
    sensorWidth: 13.2,
    sensorHeight: 8.8,
    cropFactor: 2.7,
    imageWidth: 5472,
    imageHeight: 3648,
    megapixels: 20
  },
  {
    id: "dji-mavic-air-2",
    brand: "DJI",
    model: "Mavic Air 2",
    sensorType: "1/2-inch",
    sensorWidth: 6.3,
    sensorHeight: 4.7,
    cropFactor: 5.6,
    imageWidth: 8000,
    imageHeight: 6000,
    megapixels: 48
  }
];

// Use the lens data from cameraLensData.json
export const lenses = cameraLensData.lenses.map(lens => ({
  id: `${lens.brand.toLowerCase()}-${lens.model.toLowerCase().replace(/[\/\s]+/g, '-')}`,
  brand: lens.brand,
  model: lens.model,
  focalLength: lens.focalLength,
  maxAperture: lens.maxAperture,
  minAperture: lens.minAperture,
  compatibleWith: lens.compatibleWith
}));

// Drone models with camera and lens information
export const droneModels = [
  {
    id: "freefly-astro",
    name: "FreeFly Astro",
    brand: "FreeFly",
    payloadCapacity: 3000, // grams
    flightTime: 38, // minutes
    maxAltitude: 6000, // meters
    maxSpeed: 80, // km/h
    compatibleCameras: ["phase-one-ixm-100", "phase-one-ixm-50", "sony-a7r-iv", "sony-a7-iv", "sony-ilx"]
  },
  {
    id: "freefly-alta-x",
    name: "FreeFly Alta X",
    brand: "FreeFly",
    payloadCapacity: 16000, // grams
    flightTime: 20, // minutes with 5kg payload
    maxAltitude: 6000, // meters
    maxSpeed: 70, // km/h
    compatibleCameras: ["phase-one-ixm-100", "phase-one-ixm-rs150", "sony-a7r-iv", "sony-a1", "sony-ilx"]
  }
];

/**
 * Get camera details by ID
 * @param {string} id - Camera ID
 * @returns {Object|null} Camera details or null if not found
 */
export const getCameraById = (id) => {
  return cameras.find(camera => camera.id === id) || null;
};

/**
 * Get lens details by ID
 * @param {string} id - Lens ID
 * @returns {Object|null} Lens details or null if not found
 */
export const getLensById = (id) => {
  return lenses.find(lens => lens.id === id) || null;
};

/**
 * Get compatible lenses for a camera
 * @param {string} cameraId - Camera ID
 * @returns {Array} Array of compatible lenses
 */
export const getCompatibleLenses = (cameraId) => {
  const camera = getCameraById(cameraId);
  if (!camera) return [];
  
  return lenses.filter(lens => {
    // Check if lens is compatible with camera
    const isCompatible = lens.compatibleWith.includes(camera.sensorType) && 
           (lens.brand === camera.brand || 
            (camera.brand === 'Sony' && lens.model.includes('FE')) ||
            (camera.brand === 'Phase One' && lens.model.includes('RS')));
    
    // Only include fixed focal length lenses (not zoom lenses)
    // Check for zoom indicators in the model name
    const modelLowerCase = lens.model.toLowerCase();
    const isFixedFocalLength = 
      !modelLowerCase.includes('zoom') && 
      !(/\d+-\d+mm/i.test(lens.model)) &&  // Matches patterns like "24-70mm"
      !(/f\/[\d\.]+\-[\d\.]+/i.test(lens.model)) && // Matches aperture ranges like "f/2.8-4"
      !Array.isArray(lens.focalLength);
    
    return isCompatible && isFixedFocalLength;
  });
};

/**
 * Get f-stop sequence for a lens
 * @param {string} lensId - Lens ID
 * @returns {Array} Array of available f-stops
 */
export const getLensFStops = (lensId) => {
  const lens = getLensById(lensId);
  if (!lens) return [];
  
  // Use apertures from the imported data
  const standardFStops = cameraLensData.apertures;
  
  // Filter f-stops within lens range
  return standardFStops.filter(fStop => 
    fStop >= lens.maxAperture && fStop <= lens.minAperture
  );
};

/**
 * Get human-readable name for a camera
 * @param {string} cameraId - Camera ID
 * @returns {string} Full camera name
 */
export const getCameraName = (cameraId) => {
  const camera = getCameraById(cameraId);
  return camera ? `${camera.brand} ${camera.model}` : '';
};

/**
 * Get human-readable name for a lens
 * @param {string} lensId - Lens ID
 * @returns {string} Full lens name
 */
export const getLensName = (lensId) => {
  const lens = getLensById(lensId);
  return lens ? `${lens.brand} ${lens.model}` : '';
}; 