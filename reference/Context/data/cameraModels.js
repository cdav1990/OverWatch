/**
 * Common drone camera models with their specifications
 * Used for GSD calculations and photogrammetry planning
 */

export const droneModels = [
  {
    id: 'mavic2pro',
    name: 'DJI Mavic 2 Pro',
    camera: {
      name: 'Hasselblad L1D-20c',
      focalLength: 10.26, // mm
      sensorWidth: 13.2, // mm
      sensorHeight: 8.8, // mm
      imageWidth: 5472, // pixels
      imageHeight: 3648, // pixels
      pixelSize: 2.4, // microns
      aspectRatio: 3/2
    },
    maxFlightTime: 31, // minutes
    maxSpeed: 20, // m/s
    maxAltitude: 500, // meters
    maxTransmissionDistance: 8000, // meters
    categories: ['consumer', 'photography']
  },
  {
    id: 'mavic2zoom',
    name: 'DJI Mavic 2 Zoom',
    camera: {
      name: '1/2.3" CMOS Sensor',
      focalLength: 4.5, // mm (min focal length)
      sensorWidth: 6.17, // mm
      sensorHeight: 4.55, // mm
      imageWidth: 4000, // pixels
      imageHeight: 3000, // pixels
      pixelSize: 1.55, // microns
      aspectRatio: 4/3,
      opticalZoom: 2 // 2x optical zoom
    },
    maxFlightTime: 31, // minutes
    maxSpeed: 20, // m/s
    maxAltitude: 500, // meters
    maxTransmissionDistance: 8000, // meters
    categories: ['consumer', 'photography']
  },
  {
    id: 'phantom4pro',
    name: 'DJI Phantom 4 Pro',
    camera: {
      name: '1" CMOS Sensor',
      focalLength: 8.8, // mm
      sensorWidth: 13.2, // mm
      sensorHeight: 8.8, // mm
      imageWidth: 5472, // pixels
      imageHeight: 3648, // pixels
      pixelSize: 2.4, // microns
      aspectRatio: 3/2
    },
    maxFlightTime: 30, // minutes
    maxSpeed: 20, // m/s
    maxAltitude: 500, // meters
    maxTransmissionDistance: 7000, // meters
    categories: ['professional', 'photography', 'mapping']
  },
  {
    id: 'phantom4rtk',
    name: 'DJI Phantom 4 RTK',
    camera: {
      name: '1" CMOS Sensor with RTK',
      focalLength: 8.8, // mm
      sensorWidth: 13.2, // mm
      sensorHeight: 8.8, // mm
      imageWidth: 5472, // pixels
      imageHeight: 3648, // pixels
      pixelSize: 2.4, // microns
      aspectRatio: 3/2
    },
    maxFlightTime: 30, // minutes
    maxSpeed: 20, // m/s
    maxAltitude: 500, // meters
    maxTransmissionDistance: 7000, // meters
    rtkSupport: true,
    categories: ['professional', 'mapping', 'surveying']
  },
  {
    id: 'mavicair2',
    name: 'DJI Mavic Air 2',
    camera: {
      name: '1/2" CMOS Sensor',
      focalLength: 4.3, // mm
      sensorWidth: 6.4, // mm
      sensorHeight: 4.8, // mm
      imageWidth: 8000, // pixels
      imageHeight: 6000, // pixels
      pixelSize: 0.8, // microns
      aspectRatio: 4/3
    },
    maxFlightTime: 34, // minutes
    maxSpeed: 19, // m/s
    maxAltitude: 500, // meters
    maxTransmissionDistance: 10000, // meters
    categories: ['consumer', 'photography']
  },
  {
    id: 'mavicair2s',
    name: 'DJI Air 2S',
    camera: {
      name: '1" CMOS Sensor',
      focalLength: 8.8, // mm
      sensorWidth: 13.2, // mm
      sensorHeight: 8.8, // mm
      imageWidth: 5472, // pixels (8K mode: 7680)
      imageHeight: 3648, // pixels (8K mode: 5120)
      pixelSize: 2.4, // microns
      aspectRatio: 3/2
    },
    maxFlightTime: 31, // minutes
    maxSpeed: 19, // m/s
    maxAltitude: 500, // meters
    maxTransmissionDistance: 12000, // meters
    categories: ['consumer', 'photography']
  },
  {
    id: 'mavicmini2',
    name: 'DJI Mini 2',
    camera: {
      name: '1/2.3" CMOS Sensor',
      focalLength: 4.5, // mm
      sensorWidth: 6.17, // mm
      sensorHeight: 4.55, // mm
      imageWidth: 4000, // pixels
      imageHeight: 3000, // pixels
      pixelSize: 1.55, // microns
      aspectRatio: 4/3
    },
    maxFlightTime: 31, // minutes
    maxSpeed: 16, // m/s
    maxAltitude: 500, // meters
    maxTransmissionDistance: 10000, // meters
    categories: ['consumer', 'portable']
  },
  {
    id: 'mavic3',
    name: 'DJI Mavic 3',
    camera: {
      name: 'Hasselblad L2D-20c', 
      focalLength: 24, // mm (35mm equivalent)
      sensorWidth: 17.3, // mm (4/3" sensor)
      sensorHeight: 13, // mm
      imageWidth: 5280, // pixels
      imageHeight: 3956, // pixels
      pixelSize: 3.3, // microns
      aspectRatio: 4/3
    },
    maxFlightTime: 46, // minutes
    maxSpeed: 21, // m/s
    maxAltitude: 6000, // meters
    maxTransmissionDistance: 15000, // meters
    categories: ['professional', 'photography', 'cinema']
  }
];

/**
 * Helper function to get a drone model by ID
 * @param {string} id - Drone model ID
 * @returns {Object|null} - Drone model object or null if not found
 */
export const getDroneModel = (id) => {
  return droneModels.find(model => model.id === id) || null;
};

/**
 * Helper function to filter drone models by category
 * @param {string} category - Category to filter by
 * @returns {Array} - Array of drone models in the specified category
 */
export const getDroneModelsByCategory = (category) => {
  return droneModels.filter(model => model.categories.includes(category));
}; 