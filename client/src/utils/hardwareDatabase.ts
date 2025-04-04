import { Camera, Lens, DroneModel, SensorType } from '../types/hardware'; // Assuming types are defined here

// --- Sensor Sizes (Reference) ---
// While not explicitly exported like in the JS, this mapping is useful
const sensorTypeMap: Record<string, { name: SensorType, cropFactor: number }> = {
    "Medium Format": { name: "Medium Format", cropFactor: 0.79 }, // Example, adjust per camera
    "Full Frame": { name: "Full Frame", cropFactor: 1.0 },
    "APS-C": { name: "APS-C", cropFactor: 1.5 }, // Common average
    "Micro Four Thirds": { name: "APS-C", cropFactor: 2.0 }, // Mapping to closest category if specific type not needed
    "1-inch": { name: "1-inch", cropFactor: 2.7 },
    "1/2-inch": { name: "1/2-inch", cropFactor: 5.6 } // Example
};

// --- Cameras (Based on reference/Context/utils/cameraDatabase.js) ---
export const cameras: Camera[] = [
    // Phase One aerial cameras
    {
        id: "phase-one-ixm-100",
        brand: "Phase One",
        model: "iXM-100",
        sensorType: "Medium Format",
        sensorWidth: 53.4,
        sensorHeight: 40.0,
        imageWidth: 11664, // Corrected based on JS source
        imageHeight: 8750, // Corrected based on JS source
        megapixels: 100,
        compatibleLensMounts: ['PhaseOne-RSM'],
    },
    {
        id: "phase-one-ixm-rs150",
        brand: "Phase One",
        model: "iXM-RS150",
        sensorType: "Medium Format",
        sensorWidth: 53.4,
        sensorHeight: 40.0,
        imageWidth: 14204,
        imageHeight: 10652,
        megapixels: 150,
        compatibleLensMounts: ['PhaseOne-RSM'],
    },
    {
        id: "phase-one-ixm-50",
        brand: "Phase One",
        model: "iXM-50",
        sensorType: "Medium Format",
        sensorWidth: 44.0,
        sensorHeight: 33.0,
        imageWidth: 8280,
        imageHeight: 6208,
        megapixels: 50,
        compatibleLensMounts: ['PhaseOne-RSM'],
    },
    // Sony Alpha cameras
    {
        id: "sony-a7r-iv",
        brand: "Sony",
        model: "Alpha A7R IV",
        sensorType: "Full Frame",
        sensorWidth: 35.7,
        sensorHeight: 23.8,
        imageWidth: 9504,
        imageHeight: 6336,
        megapixels: 61,
        compatibleLensMounts: ['Sony-E'],
    },
    {
        id: "sony-a7-iv",
        brand: "Sony",
        model: "Alpha A7 IV",
        sensorType: "Full Frame",
        sensorWidth: 36.0,
        sensorHeight: 24.0,
        imageWidth: 7008,
        imageHeight: 4672,
        megapixels: 33,
        compatibleLensMounts: ['Sony-E'],
    },
    {
        id: "sony-a1",
        brand: "Sony",
        model: "Alpha A1",
        sensorType: "Full Frame",
        sensorWidth: 36.0,
        sensorHeight: 24.0,
        imageWidth: 8640,
        imageHeight: 5760,
        megapixels: 50.1,
        compatibleLensMounts: ['Sony-E'],
    },
    {
        id: "sony-a6600",
        brand: "Sony",
        model: "Alpha A6600",
        sensorType: "APS-C",
        sensorWidth: 23.5,
        sensorHeight: 15.6,
        imageWidth: 6000,
        imageHeight: 4000,
        megapixels: 24.2,
        compatibleLensMounts: ['Sony-E'],
    },
    {
        id: "sony-a6400",
        brand: "Sony",
        model: "Alpha A6400",
        sensorType: "APS-C",
        sensorWidth: 23.5,
        sensorHeight: 15.6,
        imageWidth: 6000,
        imageHeight: 4000,
        megapixels: 24.2,
        compatibleLensMounts: ['Sony-E'],
    },
    // Fujifilm cameras
    {
        id: "fujifilm-gfx-100s",
        brand: "Fujifilm",
        model: "GFX 100S",
        sensorType: "Medium Format",
        sensorWidth: 43.8,
        sensorHeight: 32.9,
        imageWidth: 11648,
        imageHeight: 8736,
        megapixels: 102,
        compatibleLensMounts: ['Fujifilm-G'],
    },
    // DJI Cameras
    {
        id: "dji-mavic-3-pro",
        brand: "DJI",
        model: "Mavic 3 Pro Camera",
        sensorType: "1-inch",
        sensorWidth: 17.3,
        sensorHeight: 13.0,
        imageWidth: 5280,
        imageHeight: 3956,
        megapixels: 20,
        compatibleLensMounts: [],
    },
    {
        id: "dji-phantom-4-pro",
        brand: "DJI",
        model: "Phantom 4 Pro Camera",
        sensorType: "1-inch",
        sensorWidth: 13.2,
        sensorHeight: 8.8,
        imageWidth: 5472,
        imageHeight: 3648,
        megapixels: 20,
        compatibleLensMounts: [],
    },
    {
        id: "dji-mavic-2-pro",
        brand: "DJI",
        model: "Mavic 2 Pro",
        sensorType: "1-inch",
        sensorWidth: 13.2,
        sensorHeight: 8.8,
        imageWidth: 5472,
        imageHeight: 3648,
        megapixels: 20,
        compatibleLensMounts: [],
    },
    {
        id: "dji-mavic-air-2",
        brand: "DJI",
        model: "Mavic Air 2",
        sensorType: "1/2-inch",
        sensorWidth: 6.4,
        sensorHeight: 4.8,
        imageWidth: 8000,
        imageHeight: 6000,
        megapixels: 48,
        compatibleLensMounts: [],
    }
];

// --- Lenses (Based on reference/Context/utils/cameraDatabase.js reading cameraLensData.json) ---
// We need the actual content of cameraLensData.json for a full list.
// Creating placeholder lenses based on usage in HardwareSelection.vue and common mounts.
export const lenses: Lens[] = [
    // Phase One RSM Mount
    {
        id: 'phaseone-rsm-80mm',
        brand: 'Phase One',
        model: 'RSM 80mm f/5.6',
        focalLength: 80,
        maxAperture: 5.6,
        minAperture: 32,
        lensMount: 'PhaseOne-RSM',
    },
    {
        id: 'phaseone-rsm-35mm',
        brand: 'Phase One',
        model: 'RSM 35mm f/5.6',
        focalLength: 35,
        maxAperture: 5.6,
        minAperture: 32,
        lensMount: 'PhaseOne-RSM',
    },
    // Sony E-Mount
    {
        id: 'sony-e-50mm-f1.8',
        brand: 'Sony',
        model: 'FE 50mm f/1.8',
        focalLength: 50,
        maxAperture: 1.8,
        minAperture: 22,
        lensMount: 'Sony-E',
    },
    {
        id: 'sony-e-24-70mm-f2.8-gm',
        brand: 'Sony',
        model: 'FE 24-70mm f/2.8 GM',
        focalLength: [24, 70],
        maxAperture: 2.8,
        minAperture: 22,
        lensMount: 'Sony-E',
    },
    {
        id: 'sony-e-16-35mm-f4',
        brand: 'Sony',
        model: 'FE 16-35mm f/4 G',
        focalLength: [16, 35],
        maxAperture: 4.0,
        minAperture: 22,
        lensMount: 'Sony-E',
    },
    // Fujifilm G Mount
    {
        id: 'fujifilm-g-gf-110mm-f2',
        brand: 'Fujifilm',
        model: 'GF 110mm f/2 R LM WR',
        focalLength: 110,
        maxAperture: 2.0,
        minAperture: 22,
        lensMount: 'Fujifilm-G',
    },
];

// --- Drones (Based on reference/Context/utils/cameraDatabase.js) ---
export const droneModels: DroneModel[] = [
    {
        id: "freefly-astro",
        name: "Freefly Astro",
        brand: "Freefly",
        maxPayload: 1.5,
        compatiblePayloads: ['Sony-a7R-Series', 'MicaSense-RedEdge'],
        imageUrl: '/images/drones/astro-top-view.png'
    },
    {
        id: "freefly-alta-x",
        name: "Freefly Alta X",
        brand: "Freefly",
        maxPayload: 15.9,
        compatiblePayloads: ['PhaseOne-iXM', 'Gimbal-Payloads'],
        imageUrl: '/images/drones/alta-top-view.png'
    },
    // Add DJI Drones (if selectable as separate drones, not just cameras)
    {
        id: "dji-mavic-3-pro-drone",
        name: "DJI Mavic 3 Pro",
        brand: "DJI",
    },
    {
        id: "dji-phantom-4-pro-drone",
        name: "DJI Phantom 4 Pro",
        brand: "DJI",
    },
];

// --- Helper Functions ---

/**
 * Finds a camera by its ID.
 * @param id The ID of the camera to find.
 * @returns The camera object or undefined if not found.
 */
export const getCameraById = (id: string | null | undefined): Camera | undefined => {
    if (!id) return undefined;
    return cameras.find(camera => camera.id === id);
};

/**
 * Finds a lens by its ID.
 * @param id The ID of the lens to find.
 * @returns The lens object or undefined if not found.
 */
export const getLensById = (id: string | null | undefined): Lens | undefined => {
    if (!id) return undefined;
    return lenses.find(lens => lens.id === id);
};

/**
 * Finds a drone model by its ID.
 * @param id The ID of the drone model to find.
 * @returns The drone model object or undefined if not found.
 */
export const getDroneModelById = (id: string | null | undefined): DroneModel | undefined => {
    if (!id) return undefined;
    return droneModels.find(drone => drone.id === id);
};

/**
 * Gets lenses compatible with a given camera based on mount type
 * @param cameraId The ID of the camera
 * @returns An array of compatible lenses
 */
export const getCompatibleLenses = (cameraId: string | null | undefined): Lens[] => {
    const camera = getCameraById(cameraId);
    if (!camera || !camera.compatibleLensMounts || camera.compatibleLensMounts.length === 0) {
        return [];
    }
    
    return lenses.filter(lens => 
        camera.compatibleLensMounts.includes(lens.lensMount)
    );
};

/**
 * Returns an array of common f-stop values within a lens's range
 * @param lens The lens object
 * @returns An array of common f-stop numbers within the lens range
 */
export const getLensFStops = (lens: Lens | undefined): number[] => {
    if (!lens) return [2.8, 4, 5.6, 8, 11, 16, 22]; // Default stops

    const commonStops = [
        1.0, 1.1, 1.2, 1.4, 1.8, 2.0, 2.2, 2.5, 2.8, 3.2, 3.5, 4.0, 
        4.5, 5.0, 5.6, 6.3, 7.1, 8.0, 9.0, 10, 11, 13, 14, 16, 18, 20, 22, 32
    ];
    
    return commonStops.filter(stop => stop >= lens.maxAperture && stop <= lens.minAperture);
}; 