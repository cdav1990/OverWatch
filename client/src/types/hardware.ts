export type SensorType = 'Medium Format' | 'Full Frame' | 'APS-C' | 'Micro Four Thirds' | '1-inch' | '1/2-inch';

export interface Camera {
    id: string;
    brand: string;
    model: string;
    megapixels: number;
    sensorType: SensorType;
    sensorWidth: number; // in mm
    sensorHeight: number; // in mm
    imageWidth: number; // in pixels
    imageHeight: number; // in pixels
    compatibleLensMounts: string[]; // e.g., ['Sony-E', 'Canon-RF']
}

export interface Lens {
    id: string;
    brand: string;
    model: string;
    focalLength: number | [number, number]; // Single value for prime, range [min, max] for zoom (in mm)
    maxAperture: number; // Widest aperture (smallest f-number)
    minAperture: number; // Narrowest aperture (largest f-number)
    lensMount: string; // e.g., 'Sony-E', 'PhaseOne-RSM'
}

export interface DroneModel {
    id: string;
    name: string;
    brand: string;
    maxPayload?: number; // Optional, in kg
    compatiblePayloads?: string[]; // Optional, IDs or descriptive names
    imageUrl?: string; // Optional, path to image
} 