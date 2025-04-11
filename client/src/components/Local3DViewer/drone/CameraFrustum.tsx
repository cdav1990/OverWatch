import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Plane, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Camera, Lens } from '../../../types/hardware';
import {
    calculateFieldOfView,
    getEffectiveFocalLength,
    getDOFCalculations,
    metersToFeet
} from '../../../utils/sensorCalculations';

// Define the CameraFrustum component props interface
export interface CameraFrustumProps {
    cameraDetails: Camera | null;
    lensDetails: Lens | null;
    focusDistanceM: number;
    aperture: number | null;
    gimbalPitch?: number;
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
    gimbalPitch,
    visualization = {
        showNearFocusPlane: true,
        showFarFocusPlane: false,
        showFocusPlaneInfo: true,
        showDOFInfo: true,
        showFootprintInfo: true,
        showFocusPlaneLabels: true
    },
}) => {
    const frustumRef = useRef<THREE.Group>(null);

    // Apply the gimbal pitch to the frustum orientation
    useFrame(() => {
        if (frustumRef.current && gimbalPitch !== undefined) {
            // Reset rotation first to avoid compounding
            frustumRef.current.rotation.set(0, 0, 0); 
            
            // Apply gimbal pitch (convert degrees to radians)
            const gimbalRad = THREE.MathUtils.degToRad(gimbalPitch);
            frustumRef.current.rotateX(gimbalRad); // Rotate around the X-axis
        }
    });

    // If any required prop is null/undefined, return nothing
    if (!cameraDetails || !lensDetails || focusDistanceM === undefined || aperture === null) {
        return null;
    }

    const {
        geometry,
        farWidth,
        farHeight,
        horizontalFOV,
        verticalFOV,
        coverageWidthFt,
        coverageHeightFt,
        nearWidth,
        nearHeight,
        nearPlaneDist,
        farPlaneDist,
        // DOF calculations
        nearFocusDistanceM,
        farFocusDistanceM,
        dofTotalM,
        inFocusRange
    } = useMemo(() => {
        // Default values to use in case of errors
        const defaultValues = {
            geometry: new THREE.BufferGeometry(),
            farWidth: 1,
            farHeight: 1,
            horizontalFOV: 0,
            verticalFOV: 0,
            coverageWidthFt: 0,
            coverageHeightFt: 0,
            nearWidth: 0.1,
            nearHeight: 0.1,
            nearPlaneDist: 0.1,
            farPlaneDist: 1,
            nearFocusDistanceM: 0,
            farFocusDistanceM: 0,
            dofTotalM: 0,
            inFocusRange: false
        };

        try {
            const focalLength = getEffectiveFocalLength(lensDetails);
            const { sensorWidth, sensorHeight } = cameraDetails;

            // Safety checks
            if (!sensorWidth || !sensorHeight || !focalLength || !focusDistanceM || focusDistanceM <= 0) {
                return defaultValues;
            }

            // Calculate FOV angles (Radians)
            const hFOVRad = 2 * Math.atan(sensorWidth / (2 * focalLength));
            const vFOVRad = 2 * Math.atan(sensorHeight / (2 * focalLength));

            // Use focus distance as the far plane distance
            const nearPlaneDist = 0.1; // Keep near plane close
            const farPlaneDist = focusDistanceM;

            // Calculate dimensions at near and far planes
            const nearHeight = 2 * Math.tan(vFOVRad / 2) * nearPlaneDist;
            const nearWidth = 2 * Math.tan(hFOVRad / 2) * nearPlaneDist;
            const farHeight = 2 * Math.tan(vFOVRad / 2) * farPlaneDist;
            const farWidth = 2 * Math.tan(hFOVRad / 2) * farPlaneDist;

            // Define vertices for the frustum geometry
            const vertices = new Float32Array([
                // Near plane
                -nearWidth / 2, -nearHeight / 2, -nearPlaneDist,
                nearWidth / 2, -nearHeight / 2, -nearPlaneDist,
                nearWidth / 2,  nearHeight / 2, -nearPlaneDist,
                -nearWidth / 2,  nearHeight / 2, -nearPlaneDist,
                // Far plane
                -farWidth / 2, -farHeight / 2, -farPlaneDist,
                farWidth / 2, -farHeight / 2, -farPlaneDist,
                farWidth / 2,  farHeight / 2, -farPlaneDist,
                -farWidth / 2,  farHeight / 2, -farPlaneDist,
            ]);

            // Define indices (triangles) for the frustum faces
            const indices = [
                0, 1, 2,  0, 2, 3, // Near
                4, 5, 6,  4, 6, 7, // Far (reversed for normal direction)
                0, 4, 5,  0, 5, 1, // Bottom
                1, 5, 6,  1, 6, 2, // Right
                2, 6, 7,  2, 7, 3, // Top
                3, 7, 4,  3, 4, 0  // Left
            ];

            const geom = new THREE.BufferGeometry();
            geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            geom.setIndex(indices);
            geom.computeVertexNormals(); // Compute normals for potential lighting effects

            const horizontalFOV = calculateFieldOfView(focalLength, sensorWidth);
            const verticalFOV = calculateFieldOfView(focalLength, sensorHeight);
            const coverageWidthFt = metersToFeet(farWidth);
            const coverageHeightFt = metersToFeet(farHeight);

            // Calculate DOF values using the utility function
            const dofCalculations = getDOFCalculations(focusDistanceM, cameraDetails, lensDetails, aperture);
            const nearFocusDistanceM = dofCalculations.nearLimit;
            const farFocusDistanceM = dofCalculations.farLimit === Infinity ? focusDistanceM * 3 : dofCalculations.farLimit;
            const dofTotalM = dofCalculations.totalDOF === Infinity ? focusDistanceM * 2 : dofCalculations.totalDOF;

            // Determine if we're in the DOF range
            const inFocusRange = (nearFocusDistanceM <= focusDistanceM && focusDistanceM <= farFocusDistanceM);

            return {
                geometry: geom,
                farWidth,
                farHeight,
                horizontalFOV,
                verticalFOV,
                coverageWidthFt,
                coverageHeightFt,
                nearWidth,
                nearHeight,
                nearPlaneDist,
                farPlaneDist,
                // DOF values
                nearFocusDistanceM,
                farFocusDistanceM,
                dofTotalM,
                inFocusRange
            };
        } catch (error) {
            console.error('Error calculating camera frustum:', error);
            return defaultValues;
        }
    }, [cameraDetails, lensDetails, focusDistanceM, aperture]);

    // Calculate dimensions for DOF planes
    const { nearFocusWidth, nearFocusHeight, farFocusWidth, farFocusHeight } = useMemo(() => {
        if (!cameraDetails || !lensDetails || !nearFocusDistanceM || !farFocusDistanceM) {
            return { nearFocusWidth: 0, nearFocusHeight: 0, farFocusWidth: 0, farFocusHeight: 0 };
        }

        try {
            const focalLength = getEffectiveFocalLength(lensDetails);
            const { sensorWidth, sensorHeight } = cameraDetails;

            // Calculate FOV angles (Radians)
            const hFOVRad = 2 * Math.atan(sensorWidth / (2 * focalLength));
            const vFOVRad = 2 * Math.atan(sensorHeight / (2 * focalLength));

            // Calculate dimensions at near focus plane
            const nearFocusWidth = 2 * Math.tan(hFOVRad / 2) * nearFocusDistanceM;
            const nearFocusHeight = 2 * Math.tan(vFOVRad / 2) * nearFocusDistanceM;

            // Calculate dimensions at far focus plane
            const farFocusWidth = farFocusDistanceM === Infinity ? nearFocusWidth * 10 : 2 * Math.tan(hFOVRad / 2) * farFocusDistanceM;
            const farFocusHeight = farFocusDistanceM === Infinity ? nearFocusHeight * 10 : 2 * Math.tan(vFOVRad / 2) * farFocusDistanceM;

            return { nearFocusWidth, nearFocusHeight, farFocusWidth, farFocusHeight };
        } catch (error) {
            console.error('Error calculating DOF plane dimensions:', error);
            return { nearFocusWidth: 0, nearFocusHeight: 0, farFocusWidth: 0, farFocusHeight: 0 };
        }
    }, [cameraDetails, lensDetails, nearFocusDistanceM, farFocusDistanceM]);

    // Create DOF info text
    const dofInfoText = useMemo(() => {
        return `DOF: ${metersToFeet(dofTotalM).toFixed(1)}ft (${metersToFeet(nearFocusDistanceM).toFixed(1)}ft - ${
            farFocusDistanceM === Infinity ? '∞' : metersToFeet(farFocusDistanceM).toFixed(1) + 'ft'
        })`;
    }, [dofTotalM, nearFocusDistanceM, farFocusDistanceM]);

    // Create footprint info text
    const footprintInfoText = useMemo(() => {
        return `FOV: ${horizontalFOV.toFixed(0)}°×${verticalFOV.toFixed(0)}°  |  Coverage: ${coverageWidthFt.toFixed(1)}ft×${coverageHeightFt.toFixed(1)}ft`;
    }, [horizontalFOV, verticalFOV, coverageWidthFt, coverageHeightFt]);

    // Animation values
    const pulseFactor = useRef(0);
    useFrame((_, delta) => {
        pulseFactor.current = (pulseFactor.current + delta * 0.8) % (Math.PI * 2);
    });

    // Pulse effect for DOF planes
    const pulseMaterial = {
        opacity: 0.25 + Math.sin(pulseFactor.current) * 0.15,
    };

    // Common text settings for all labels - remove the HTML styling properties
    const textSettings = {
        fontSize: 0.2,
        color: 'white',
        outlineWidth: 0.01,
        outlineColor: '#000000',
        anchorX: 'center' as const,
        anchorY: 'middle' as const
    };

    return (
        <group ref={frustumRef} position={[0, 0, 0]} rotation={[0, 0, 0]}>
            {/* Frustum Volume */}
            <mesh geometry={geometry}>
                <meshStandardMaterial
                    color="#4fc3f7"
                    opacity={0.1}
                    transparent
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>

            {/* Frustum Wireframe using <Line> */}
            <Line
                points={[
                    // Near Plane Edges
                    [-nearWidth / 2, -nearHeight / 2, -nearPlaneDist], [nearWidth / 2, -nearHeight / 2, -nearPlaneDist],
                    [nearWidth / 2, -nearHeight / 2, -nearPlaneDist], [nearWidth / 2,  nearHeight / 2, -nearPlaneDist],
                    [nearWidth / 2,  nearHeight / 2, -nearPlaneDist], [-nearWidth / 2,  nearHeight / 2, -nearPlaneDist],
                    [-nearWidth / 2,  nearHeight / 2, -nearPlaneDist], [-nearWidth / 2, -nearHeight / 2, -nearPlaneDist],
                    // Far Plane Edges
                    [-farWidth / 2, -farHeight / 2, -farPlaneDist], [farWidth / 2, -farHeight / 2, -farPlaneDist],
                    [farWidth / 2, -farHeight / 2, -farPlaneDist], [farWidth / 2,  farHeight / 2, -farPlaneDist],
                    [farWidth / 2,  farHeight / 2, -farPlaneDist], [-farWidth / 2,  farHeight / 2, -farPlaneDist],
                    [-farWidth / 2,  farHeight / 2, -farPlaneDist], [-farWidth / 2, -farHeight / 2, -farPlaneDist],
                    // Connecting Lines
                    [-nearWidth / 2, -nearHeight / 2, -nearPlaneDist], [-farWidth / 2, -farHeight / 2, -farPlaneDist],
                    [nearWidth / 2, -nearHeight / 2, -nearPlaneDist], [farWidth / 2, -farHeight / 2, -farPlaneDist],
                    [nearWidth / 2,  nearHeight / 2, -nearPlaneDist], [farWidth / 2,  farHeight / 2, -farPlaneDist],
                    [-nearWidth / 2,  nearHeight / 2, -nearPlaneDist], [-farWidth / 2,  farHeight / 2, -farPlaneDist],
                ]}
                color="#4fc3f7"
                lineWidth={1.5}
                dashed={false}
            />

            {/* Near Focus Plane - with animated highlight */}
            {visualization.showNearFocusPlane && nearFocusDistanceM > 0 && nearFocusWidth > 0 && nearFocusHeight > 0 && (
                <>
                    <Plane
                        args={[nearFocusWidth, nearFocusHeight]}
                        position={[0, 0, -nearFocusDistanceM]}
                    >
                        <meshStandardMaterial
                            color="#00ff00"
                            opacity={pulseMaterial.opacity}
                            transparent
                            side={THREE.DoubleSide}
                            depthWrite={false}
                        />
                    </Plane>
                    
                    {/* Near Focus Plane Label */}
                    {visualization.showFocusPlaneLabels && (
                        <Text
                            position={[-nearFocusWidth / 2 - 0.5, 0, -nearFocusDistanceM]}
                            fontSize={0.2}
                            color="#00ff00"
                            anchorX="right"
                            anchorY="middle"
                            outlineWidth={0.01}
                            outlineColor="#000000"
                            rotation={[0, Math.PI / 2, 0]}
                        >
                            {`Near Focus: ${metersToFeet(nearFocusDistanceM).toFixed(1)}ft`}
                        </Text>
                    )}
                </>
            )}

            {/* Far Focus Plane - only show when explicitly enabled */}
            {visualization.showFarFocusPlane && farFocusDistanceM > 0 && farFocusDistanceM !== Infinity && farFocusDistanceM <= focusDistanceM * 3 && farFocusWidth > 0 && farFocusHeight > 0 && (
                <>
                    <Plane
                        args={[farFocusWidth, farFocusHeight]}
                        position={[0, 0, -farFocusDistanceM]}
                    >
                        <meshStandardMaterial
                            color="#00ff00"
                            opacity={pulseMaterial.opacity}
                            transparent
                            side={THREE.DoubleSide}
                            depthWrite={false}
                        />
                    </Plane>
                    
                    {/* Far Focus Plane Label */}
                    {visualization.showFocusPlaneLabels && (
                        <Text
                            position={[-farFocusWidth / 2 - 0.5, 0, -farFocusDistanceM]}
                            fontSize={0.2}
                            color="#00ff00"
                            anchorX="right"
                            anchorY="middle"
                            outlineWidth={0.01}
                            outlineColor="#000000"
                            rotation={[0, Math.PI / 2, 0]}
                        >
                            {`Far Focus: ${metersToFeet(farFocusDistanceM).toFixed(1)}ft`}
                        </Text>
                    )}
                </>
            )}

            {/* Focus Plane (Far Plane - Image Footprint) */}
            <Plane args={[farWidth, farHeight]} position={[0, 0, -focusDistanceM]}>
                <meshStandardMaterial
                    color={inFocusRange ? "#4fc3f7" : "#ff9800"}
                    opacity={0.2}
                    transparent
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </Plane>

            {/* Focus Plane Information - shown conditionally */}
            {visualization.showFocusPlaneInfo && (
                <Text
                    position={[0, farHeight / 2 + 0.5, -focusDistanceM]}
                    fontSize={0.3}
                    color="white"
                    anchorX="center"
                    anchorY="bottom"
                    outlineWidth={0.01}
                    outlineColor="#000000"
                >
                    {`Focus Distance: ${metersToFeet(focusDistanceM).toFixed(1)}ft`}
                </Text>
            )}

            {/* DOF Information Label - shown conditionally */}
            {visualization.showDOFInfo && (
                <Text
                    position={[0, -farHeight / 2 - 0.5, -focusDistanceM]}
                    fontSize={0.25}
                    color="#00ff00"
                    anchorX="center"
                    anchorY="top"
                    outlineWidth={0.01}
                    outlineColor="#000000"
                >
                    {dofInfoText}
                </Text>
            )}

            {/* Footprint Information - shown conditionally */}
            {visualization.showFootprintInfo && (
                <Text
                    position={[0, farHeight / 2 + 0.5, -focusDistanceM]}
                    fontSize={0.3}
                    color="white"
                    anchorX="center"
                    anchorY="bottom"
                    outlineWidth={0.01}
                    outlineColor="#000000"
                >
                    {footprintInfoText}
                </Text>
            )}
        </group>
    );
};

export default CameraFrustum; 