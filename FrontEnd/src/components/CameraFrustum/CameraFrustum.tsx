import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Camera, Lens } from '../../types/hardware';
import { FrustumLines, FocusPlane, FrustumInfo } from './subcomponents';

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

    const { 
        showNearFocusPlane,
        showFarFocusPlane,
        showFocusPlaneInfo,
        showDOFInfo,
        showFootprintInfo,
        showFocusPlaneLabels
    } = visualization;

    return (
        <group ref={frustumRef} position={[0, -0.41, 0]}>
            {/* Frustum lines visualization */}
            <FrustumLines 
                cameraDetails={cameraDetails}
                lensDetails={lensDetails}
                focusDistanceM={focusDistanceM}
            />
            
            {/* Focus planes visualization */}
            <FocusPlane 
                cameraDetails={cameraDetails}
                lensDetails={lensDetails}
                focusDistanceM={focusDistanceM}
                aperture={aperture}
                showNearFocusPlane={showNearFocusPlane}
                showFarFocusPlane={showFarFocusPlane}
            />
            
            {/* Information display */}
            <FrustumInfo 
                cameraDetails={cameraDetails}
                lensDetails={lensDetails}
                focusDistanceM={focusDistanceM}
                aperture={aperture}
                showFocusPlaneInfo={showFocusPlaneInfo}
                showDOFInfo={showDOFInfo}
                showFootprintInfo={showFootprintInfo}
                showFocusPlaneLabels={showFocusPlaneLabels}
            />
        </group>
    );
};

export default CameraFrustum; 