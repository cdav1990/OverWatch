import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Plane, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Camera, Lens } from '../types/hardware';
import {
    calculateFieldOfView,
    getEffectiveFocalLength,
    getDOFCalculations,
    metersToFeet
} from '../utils/sensorCalculations';

// Define the CameraFrustum component props interface
export interface CameraFrustumProps {
    cameraDetails: Camera | null;
    lensDetails: Lens | null;
    focusDistanceM: number;
    aperture: number | null;
    gimbalPitch?: number; // Add gimbal pitch control
    visualization?: {
        showNearFocusPlane?: boolean;
        showFarFocusPlane?: boolean;
        showFocusPlaneInfo?: boolean;
        showDOFInfo?: boolean;
        showFootprintInfo?: boolean;
        showFocusPlaneLabels?: boolean;
    };
}

const CameraFrustum: React.FC<CameraFrustumProps> = ({
    cameraDetails,
    lensDetails,
    focusDistanceM,
    aperture,
    gimbalPitch = 0, // Default to 0 if not provided
    visualization = {
        showNearFocusPlane: true,
        showFarFocusPlane: false,
        showFocusPlaneInfo: true,
        showDOFInfo: true,
        showFootprintInfo: true,
        showFocusPlaneLabels: true
    }
}) => {
    const frustumRef = useRef<THREE.Group>(null);
  
    // Apply the gimbal pitch to the frustum orientation
    useFrame(() => {
        if (frustumRef.current) {
            // Reset rotation first
            frustumRef.current.rotation.set(0, 0, 0);
            
            // Apply gimbal pitch (convert to radians)
            const gimbalRad = THREE.MathUtils.degToRad(gimbalPitch);
            frustumRef.current.rotateX(gimbalRad);
        }
    });

    // If any required prop is null/undefined, return nothing
    if (!cameraDetails || !lensDetails || focusDistanceM === undefined || aperture === null) {
        return null;
    }

    // ... rest of your existing CameraFrustum component

    return (
        <group ref={frustumRef} position={[0, -0.41, 0]}>
            {/* Your existing frustum visualization code */}
            <mesh>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color="red" wireframe />
            </mesh>
        </group>
    );
};

export default CameraFrustum; 