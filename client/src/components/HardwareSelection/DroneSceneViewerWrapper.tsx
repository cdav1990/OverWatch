import React, { Suspense, useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
    OrbitControls, 
    PerspectiveCamera, 
    Grid, 
    Sky, 
    Text, 
    Line, 
    Plane,
    Box as DreiBox,
    Sphere 
} from '@react-three/drei';
import { Box, Typography } from '@mui/material';
import { useMission } from '../../context/MissionContext';
import * as THREE from 'three';
import { Camera, Lens } from '../../types/hardware';
import { calculateFieldOfView, getEffectiveFocalLength, metersToFeet, feetToMeters, getDOFCalculations } from '../../utils/sensorCalculations';
import { getLensFStops, getCameraById, getLensById } from '../../utils/hardwareDatabase';
import { LocalCoord } from '../../types/mission';

// Default hardware IDs - moved to top level for better visibility
const DEFAULT_CAMERA_ID = 'phase-one-ixm-100';
const DEFAULT_LENS_ID = 'phaseone-rsm-80mm';
const DEFAULT_FOCUS_DISTANCE_FT = 20; // in feet

interface CameraFrustum3DProps {
    cameraDetails: Camera | null;
    lensDetails: Lens | null;
    focusDistanceM: number;
    aperture?: number; // Used for DOF calculations
}

// Actual Frustum Component
const CameraFrustum3D: React.FC<CameraFrustum3DProps> = ({ 
    cameraDetails, 
    lensDetails, 
    focusDistanceM,
    aperture 
}) => {
    const frustumRef = useRef<THREE.Group>(null);
    
    // If any required prop is null/undefined, return nothing
    if (!cameraDetails || !lensDetails || focusDistanceM === undefined || aperture === undefined) {
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
            if (!cameraDetails || !lensDetails || !aperture) {
                return defaultValues;
            }

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
        if (!cameraDetails || !lensDetails) {
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
            const farFocusWidth = 2 * Math.tan(hFOVRad / 2) * farFocusDistanceM;
            const farFocusHeight = 2 * Math.tan(vFOVRad / 2) * farFocusDistanceM;

            return { nearFocusWidth, nearFocusHeight, farFocusWidth, farFocusHeight };
        } catch (error) {
            console.error('Error calculating DOF plane dimensions:', error);
            return { nearFocusWidth: 0, nearFocusHeight: 0, farFocusWidth: 0, farFocusHeight: 0 };
        }
    }, [cameraDetails, lensDetails, nearFocusDistanceM, farFocusDistanceM]);

    // Label Text
    const labelText = `FOV: ${horizontalFOV.toFixed(0)}°×${verticalFOV.toFixed(0)}°\nCoverage: ${coverageWidthFt.toFixed(1)}ft×${coverageHeightFt.toFixed(1)}ft`;
    
    // DOF text
    const dofInfoText = `DOF: ${metersToFeet(dofTotalM).toFixed(1)}ft (${metersToFeet(nearFocusDistanceM).toFixed(1)}ft - ${
        farFocusDistanceM === Infinity ? '∞' : metersToFeet(farFocusDistanceM).toFixed(1) + 'ft'
    })`;

    // Animation values
    const pulseFactor = useRef(0);
    useFrame((_, delta) => {
        pulseFactor.current = (pulseFactor.current + delta * 0.8) % (Math.PI * 2);
    });

    // Pulse effect for DOF planes
    const pulseMaterial = {
        opacity: 0.25 + Math.sin(pulseFactor.current) * 0.15,
    };

    return (
        <group ref={frustumRef} position={[0, 0.5, 0]} rotation={[0, 0, 0]}>
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

            {/* DOF Volume (Shaded area between near and far focus) - disabled for now */}
            {false && nearFocusDistanceM > 0 && farFocusDistanceM > 0 && farFocusDistanceM !== Infinity && (
                <group>
                    {/* Create a custom geometry for the DOF volume */}
                    <mesh>
                        <bufferGeometry>
                            <bufferAttribute 
                                attach="attributes-position" 
                                array={new Float32Array([
                                    // Near focus plane
                                    -nearFocusWidth / 2, -nearFocusHeight / 2, -nearFocusDistanceM,
                                    nearFocusWidth / 2, -nearFocusHeight / 2, -nearFocusDistanceM,
                                    nearFocusWidth / 2, nearFocusHeight / 2, -nearFocusDistanceM,
                                    -nearFocusWidth / 2, nearFocusHeight / 2, -nearFocusDistanceM,
                                    // Far focus plane
                                    -farFocusWidth / 2, -farFocusHeight / 2, -farFocusDistanceM,
                                    farFocusWidth / 2, -farFocusHeight / 2, -farFocusDistanceM,
                                    farFocusWidth / 2, farFocusHeight / 2, -farFocusDistanceM,
                                    -farFocusWidth / 2, farFocusHeight / 2, -farFocusDistanceM,
                                ])} 
                                count={8}
                                itemSize={3}
                                args={[new Float32Array(24), 3]}
                            />
                            <bufferAttribute 
                                attach="index"
                                array={new Uint16Array([
                                    0, 1, 2, 0, 2, 3, // Near focus
                                    4, 5, 6, 4, 6, 7, // Far focus
                                    0, 4, 5, 0, 5, 1, // Bottom
                                    1, 5, 6, 1, 6, 2, // Right
                                    2, 6, 7, 2, 7, 3, // Top
                                    3, 7, 4, 3, 4, 0, // Left
                                ])}
                                count={36}
                                itemSize={1}
                                args={[new Uint16Array(36), 1]}
                            />
                        </bufferGeometry>
                        <meshStandardMaterial 
                            color="#00ff00" 
                            opacity={0.15} 
                            transparent 
                            side={THREE.DoubleSide} 
                            depthWrite={false}
                        />
                    </mesh>
                </group>
            )}

            {/* Frustum Wireframe using <Line> */}
            <Line 
                points={[ /* Define points for lines based on geometry vertices */
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
            {nearFocusDistanceM > 0 && (
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
                    <Line
                        points={[
                            [-nearFocusWidth / 2, -nearFocusHeight / 2, -nearFocusDistanceM], [nearFocusWidth / 2, -nearFocusHeight / 2, -nearFocusDistanceM],
                            [nearFocusWidth / 2, -nearFocusHeight / 2, -nearFocusDistanceM], [nearFocusWidth / 2, nearFocusHeight / 2, -nearFocusDistanceM],
                            [nearFocusWidth / 2, nearFocusHeight / 2, -nearFocusDistanceM], [-nearFocusWidth / 2, nearFocusHeight / 2, -nearFocusDistanceM],
                            [-nearFocusWidth / 2, nearFocusHeight / 2, -nearFocusDistanceM], [-nearFocusWidth / 2, -nearFocusHeight / 2, -nearFocusDistanceM],
                        ]}
                        color="#00ff00"
                        lineWidth={2}
                        dashed={false}
                    />
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
                </>
            )}

            {/* Far Focus Plane - disabled for now */}
            {false && farFocusDistanceM > 0 && farFocusDistanceM !== Infinity && farFocusDistanceM <= focusDistanceM * 3 && (
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
                    <Line
                        points={[
                            [-farFocusWidth / 2, -farFocusHeight / 2, -farFocusDistanceM], [farFocusWidth / 2, -farFocusHeight / 2, -farFocusDistanceM],
                            [farFocusWidth / 2, -farFocusHeight / 2, -farFocusDistanceM], [farFocusWidth / 2, farFocusHeight / 2, -farFocusDistanceM],
                            [farFocusWidth / 2, farFocusHeight / 2, -farFocusDistanceM], [-farFocusWidth / 2, farFocusHeight / 2, -farFocusDistanceM],
                            [-farFocusWidth / 2, farFocusHeight / 2, -farFocusDistanceM], [-farFocusWidth / 2, -farFocusHeight / 2, -farFocusDistanceM],
                        ]}
                        color="#00ff00"
                        lineWidth={2}
                        dashed={false}
                    />
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

            {/* Dashed lines connecting origin to the corners of the focus plane - disabled */}
            {false && (
                <Line
                    points={[
                        [0, 0.5, 0], [-farWidth / 2, -farHeight / 2, -focusDistanceM],
                        [0, 0.5, 0], [farWidth / 2, -farHeight / 2, -focusDistanceM],
                        [0, 0.5, 0], [farWidth / 2, farHeight / 2, -focusDistanceM],
                        [0, 0.5, 0], [-farWidth / 2, farHeight / 2, -focusDistanceM],
                    ]}
                    color="#4fc3f7"
                    lineWidth={1}
                    dashed={true}
                    dashSize={0.2}
                    dashScale={1}
                    dashOffset={0}
                />
            )}

            {/* Label Text for Focus Distance */}
            <Text
                position={[0, farHeight / 2 + 0.5, -focusDistanceM]}
                fontSize={0.3}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.01}
                outlineColor="#000000"
            >
                {`Focus Distance: ${metersToFeet(focusDistanceM).toFixed(1)}ft`}
            </Text>

            {/* DOF Information Label */}
            <Text
                position={[0, farHeight / 2 + 0.9, -focusDistanceM]}
                fontSize={0.25}
                color={inFocusRange ? "#00ff00" : "#ff9800"}
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.01}
                outlineColor="#000000"
            >
                {dofInfoText}
            </Text>

            {/* Image Footprint Info */}
            <Text
                position={[0, -farHeight / 2 - 0.4, -focusDistanceM]}
                fontSize={0.25}
                color="#4fc3f7"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.01}
                outlineColor="#000000"
            >
                {labelText}
            </Text>

            {/* Camera Origin Indicator - disabled */}
            {false && (
                <Sphere args={[0.1]} position={[0, 0.5, 0]}>
                    <meshStandardMaterial color="#ffffff" />
                </Sphere>
            )}
        </group>
    );
}

// Import components for the scene
interface DroneModelProps {
    position: LocalCoord;
    heading?: number;
    pitch?: number;
    roll?: number;
}

// DroneModel component - same as in Local3DViewer.tsx
const DroneModel: React.FC<DroneModelProps> = ({ 
    position, 
    heading = 0, 
    pitch = 0, 
    roll = 0
}) => {
    const groupRef = useRef<THREE.Group>(null);
    
    // For propeller animation
    const [propellerRotation, setPropellerRotation] = useState<number[]>([0, 0, 0, 0]);
    
    // Animate propellers
    useFrame(() => {
        // Update propeller rotations at different speeds for visual interest
        setPropellerRotation(prev => [
            (prev[0] + 0.4) % (Math.PI * 2), 
            (prev[1] - 0.5) % (Math.PI * 2),
            (prev[2] + 0.4) % (Math.PI * 2),
            (prev[3] - 0.5) % (Math.PI * 2)
        ]);
    });

    useEffect(() => {
        if (groupRef.current) {
            // Apply rotations in ZYX order (Roll, Pitch, Yaw/Heading)
            // Three.js Y is Up. ENU Heading needs conversion.
            // Convert ENU heading (0=N, 90=E) to Three.js rotation around Y-axis (0=along +Z, positive rotation is counter-clockwise)
            const yaw = THREE.MathUtils.degToRad(-(heading - 90)); // Adjust for Three.js Y-up, 0=East
            groupRef.current.rotation.set(
                THREE.MathUtils.degToRad(pitch), // Rotation around X (Pitch)
                yaw,                             // Rotation around Y (Heading/Yaw)
                THREE.MathUtils.degToRad(roll),  // Rotation around Z (Roll)
                'YXZ'                            // Specify Euler order common for aircraft/drones (Yaw, Pitch, Roll)
            );
        }
    }, [heading, pitch, roll]);
    
    return (
        <group
            ref={groupRef}
            position={[position.x, position.z, -position.y]} // Use the mapped position
            scale={[1/7, 1/7, 1/7]} // Scale down the drone by 7x
        >
            {/* Main drone body - more detailed */}
            <DreiBox args={[2.4, 0.5, 2.4]} position={[0, 0, 0]}> 
                <meshStandardMaterial color="#212121" metalness={0.8} roughness={0.3} />
            </DreiBox>
            
            {/* Body details - top section */}
            <DreiBox args={[1.8, 0.3, 1.8]} position={[0, 0.4, 0]}>
                <meshStandardMaterial color="#333333" metalness={0.6} roughness={0.4} />
            </DreiBox>
            
            {/* Drone arms */}
            <group>
                {/* Front-right arm */}
                <DreiBox args={[0.2, 0.2, 1.2]} position={[0.9, 0, 0.9]} rotation={[0, Math.PI/4, 0]}>
                    <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.6} />
                </DreiBox>
                
                {/* Front-left arm */}
                <DreiBox args={[0.2, 0.2, 1.2]} position={[-0.9, 0, 0.9]} rotation={[0, -Math.PI/4, 0]}>
                    <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.6} />
                </DreiBox>
                
                {/* Back-right arm */}
                <DreiBox args={[0.2, 0.2, 1.2]} position={[0.9, 0, -0.9]} rotation={[0, -Math.PI/4, 0]}>
                    <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.6} />
                </DreiBox>
                
                {/* Back-left arm */}
                <DreiBox args={[0.2, 0.2, 1.2]} position={[-0.9, 0, -0.9]} rotation={[0, Math.PI/4, 0]}>
                    <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.6} />
                </DreiBox>
            </group>
            
            {/* Motor housings and propellers */}
            <group>
                {/* Front-right motor and propeller */}
                <group position={[1.4, 0.1, 1.4]}>
                    <Sphere args={[0.3, 16, 16]}>
                        <meshStandardMaterial color="#222222" metalness={0.7} roughness={0.3} />
                    </Sphere>
                    <group rotation={[0, propellerRotation[0], 0]}>
                        <DreiBox args={[1.4, 0.05, 0.15]} position={[0, 0.15, 0]}>
                            <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
                        </DreiBox>
                        <DreiBox args={[0.15, 0.05, 1.4]} position={[0, 0.15, 0]}>
                            <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
                        </DreiBox>
                    </group>
                </group>
                
                {/* Front-left motor and propeller */}
                <group position={[-1.4, 0.1, 1.4]}>
                    <Sphere args={[0.3, 16, 16]}>
                        <meshStandardMaterial color="#222222" metalness={0.7} roughness={0.3} />
                    </Sphere>
                    <group rotation={[0, propellerRotation[1], 0]}>
                        <DreiBox args={[1.4, 0.05, 0.15]} position={[0, 0.15, 0]}>
                            <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
                        </DreiBox>
                        <DreiBox args={[0.15, 0.05, 1.4]} position={[0, 0.15, 0]}>
                            <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
                        </DreiBox>
                    </group>
                </group>
                
                {/* Back-right motor and propeller */}
                <group position={[1.4, 0.1, -1.4]}>
                    <Sphere args={[0.3, 16, 16]}>
                        <meshStandardMaterial color="#222222" metalness={0.7} roughness={0.3} />
                    </Sphere>
                    <group rotation={[0, propellerRotation[2], 0]}>
                        <DreiBox args={[1.4, 0.05, 0.15]} position={[0, 0.15, 0]}>
                            <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
                        </DreiBox>
                        <DreiBox args={[0.15, 0.05, 1.4]} position={[0, 0.15, 0]}>
                            <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
                        </DreiBox>
                    </group>
                </group>
                
                {/* Back-left motor and propeller */}
                <group position={[-1.4, 0.1, -1.4]}>
                    <Sphere args={[0.3, 16, 16]}>
                        <meshStandardMaterial color="#222222" metalness={0.7} roughness={0.3} />
                    </Sphere>
                    <group rotation={[0, propellerRotation[3], 0]}>
                        <DreiBox args={[1.4, 0.05, 0.15]} position={[0, 0.15, 0]}>
                            <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
                        </DreiBox>
                        <DreiBox args={[0.15, 0.05, 1.4]} position={[0, 0.15, 0]}>
                            <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
                        </DreiBox>
                    </group>
                </group>
            </group>
            
            {/* Landing gear legs */}
            <group>
                <DreiBox args={[0.15, 0.8, 0.15]} position={[0.9, -0.65, 0.9]}>
                    <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.6} />
                </DreiBox>
                <DreiBox args={[0.15, 0.8, 0.15]} position={[-0.9, -0.65, 0.9]}>
                    <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.6} />
                </DreiBox>
                <DreiBox args={[0.15, 0.8, 0.15]} position={[0.9, -0.65, -0.9]}>
                    <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.6} />
                </DreiBox>
                <DreiBox args={[0.15, 0.8, 0.15]} position={[-0.9, -0.65, -0.9]}>
                    <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.6} />
                </DreiBox>
            </group>
            
            {/* Camera gimbal */}
            <group position={[0, -0.25, 0.8]}>
                <DreiBox args={[0.8, 0.3, 0.4]}>
                    <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
                </DreiBox>
                <DreiBox args={[0.6, 0.2, 0.3]} position={[0, -0.25, 0]}>
                    <meshStandardMaterial color="#222222" metalness={0.8} roughness={0.2} />
                </DreiBox>
                {/* Camera lens */}
                <Sphere args={[0.2, 16, 16]} position={[0, -0.25, 0.25]}>
                    <meshStandardMaterial color="#111111" metalness={0.9} roughness={0.1} />
                </Sphere>
            </group>
            
            {/* Navigation lights */}
            <pointLight position={[1.4, 0, 1.4]} color="#ff0000" intensity={0.6} distance={4} />
            <pointLight position={[-1.4, 0, -1.4]} color="#00ff00" intensity={0.6} distance={4} />
            
            {/* Small indicator LEDs */}
            <Sphere args={[0.08, 8, 8]} position={[1.2, 0.3, 1.2]}>
                <meshBasicMaterial color="#ff0000" />
            </Sphere>
            <Sphere args={[0.08, 8, 8]} position={[-1.2, 0.3, -1.2]}>
                <meshBasicMaterial color="#00ff00" />
            </Sphere>
            <Sphere args={[0.08, 8, 8]} position={[0, 0.5, -1.0]}>
                <meshBasicMaterial color="#ffffff" />
            </Sphere>
        </group>
    );
};

// Add a camera controller component to set initial position
const CameraInitializer: React.FC = () => {
    const { camera } = useThree();
    
    useEffect(() => {
        // Set initial camera position for better view of drone and frustum
        camera.position.set(10, 10, 10);
        camera.updateProjectionMatrix();
    }, [camera]);
    
    return null;
};

const DroneSceneViewerWrapper: React.FC = () => {
    const { state: missionState, dispatch } = useMission();
    const { hardware } = missionState;
    const cameraDetails = hardware?.cameraDetails;
    const lensDetails = hardware?.lensDetails;
    const focusDistanceM = hardware?.focusDistance;
    const aperture = hardware?.fStop;

    // Track if initial default setting has been done
    const hasSetDefaults = useRef(false);

    // Create these memo values regardless of condition to maintain consistent hook calls
    const frustumProps = useMemo(() => ({
        cameraDetails: cameraDetails || null,
        lensDetails: lensDetails || null,
        focusDistanceM: focusDistanceM || 0,
        aperture: aperture || 0 // Add aperture to the props
    }), [cameraDetails, lensDetails, focusDistanceM, aperture]);

    // Position the drone at the focus distance - keep this outside the conditional render
    const dronePosition: LocalCoord = useMemo(() => ({
        x: 0,
        y: 0,
        z: 0.5 // Slightly elevated from ground
    }), []);

    // Set default hardware values when component mounts
    useEffect(() => {
        if (!dispatch || hasSetDefaults.current) return;

        // Only set defaults if hardware selection doesn't exist
        if (!hardware || !hardware.camera || !hardware.lens) {
            // Get camera and lens objects
            const defaultCamera = getCameraById(DEFAULT_CAMERA_ID);
            const defaultLens = getLensById(DEFAULT_LENS_ID);
            
            if (defaultCamera && defaultLens) {
                // 1. Set default camera
                dispatch({
                    type: 'UPDATE_HARDWARE_FIELD',
                    payload: { field: 'camera', value: DEFAULT_CAMERA_ID }
                });
                dispatch({
                    type: 'UPDATE_HARDWARE_FIELD',
                    payload: { field: 'cameraDetails', value: defaultCamera }
                });
                
                // 2. Set default lens
                dispatch({
                    type: 'UPDATE_HARDWARE_FIELD',
                    payload: { field: 'lens', value: DEFAULT_LENS_ID }
                });
                dispatch({
                    type: 'UPDATE_HARDWARE_FIELD',
                    payload: { field: 'lensDetails', value: defaultLens }
                });
                
                // 3. Set default focus distance (convert from feet to meters)
                const defaultFocusDistance = feetToMeters(DEFAULT_FOCUS_DISTANCE_FT);
                dispatch({
                    type: 'UPDATE_HARDWARE_FIELD',
                    payload: { field: 'focusDistance', value: defaultFocusDistance }
                });

                // 4. Set lowest f-stop (if available)
                const fStops = getLensFStops(defaultLens);
                if (fStops && fStops.length > 0) {
                    const lowestFStop = Math.min(...fStops);
                    dispatch({
                        type: 'UPDATE_HARDWARE_FIELD',
                        payload: { field: 'fStop', value: lowestFStop }
                    });
                }
            }
            
            // Mark that we've set the defaults
            hasSetDefaults.current = true;
        } else {
            // If hardware already exists, still mark as initialized
            hasSetDefaults.current = true;
        }
    }, [hardware, dispatch]);

    // Set default focus distance and lowest f-stop when lens changes
    useEffect(() => {
        if (lensDetails && dispatch) {
            try {
                // Default focus distance to 20ft (convert to meters)
                const defaultFocusDistance = feetToMeters(DEFAULT_FOCUS_DISTANCE_FT);
                
                // Get available f-stops and select the lowest (widest aperture)
                const fStops = getLensFStops(lensDetails);
                
                // Safety check - make sure we have valid f-stops
                let lowestFStop = lensDetails.maxAperture;
                if (fStops && fStops.length > 0) {
                    const validFStops = fStops.filter(f => !isNaN(f) && f > 0);
                    if (validFStops.length > 0) {
                        lowestFStop = Math.min(...validFStops);
                    }
                }
                
                // Only update if values are valid
                if (defaultFocusDistance > 0) {
                    dispatch({
                        type: 'UPDATE_HARDWARE_FIELD',
                        payload: { field: 'focusDistance', value: defaultFocusDistance }
                    });
                }
                
                if (lowestFStop > 0) {
                    dispatch({
                        type: 'UPDATE_HARDWARE_FIELD',
                        payload: { field: 'fStop', value: lowestFStop }
                    });
                }
            } catch (error) {
                console.error('Error setting default lens values:', error);
            }
        }
    }, [lensDetails, dispatch]);

    // Handle incomplete data
    if (!cameraDetails || !lensDetails || focusDistanceM === undefined || aperture === undefined) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', bgcolor: '#121212' }}>
                <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Select Camera, Lens, Aperture, and Focus Distance.
                </Typography>
            </Box>
        );
    }

    return (
        <Canvas style={{ background: '#121212' }}>
            {/* Camera Setup */}
            <PerspectiveCamera 
                makeDefault 
                position={[10, 10, 10]} 
                fov={50}
            />
            <CameraInitializer />
            <OrbitControls 
                enablePan={true} 
                enableZoom={true} 
                enableRotate={true} 
                target={[0, 0.5, 0]}
                maxDistance={500}
                minDistance={5}
                // Set initial zoom level
                minZoom={0.5}
                maxZoom={10}
            />

            {/* Lighting */}
            <ambientLight intensity={0.25} />
            <directionalLight 
                position={[10, 30, 10]} 
                intensity={0.7} 
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
                shadow-camera-far={50}
                shadow-camera-left={-20}
                shadow-camera-right={20}
                shadow-camera-top={20}
                shadow-camera-bottom={-20}
            />
            <Sky 
                sunPosition={[100, 10, 100]}
                rayleigh={3} 
                turbidity={10} 
                mieCoefficient={0.005} 
                mieDirectionalG={0.7}
            />

            {/* Environment */}
            <Grid 
                infiniteGrid 
                position={[0, -0.01, 0]}
                args={[200, 20]}
                cellColor={new THREE.Color(0x1e1e1e)}
                sectionSize={200 / 4}
                sectionThickness={1}
                sectionColor={new THREE.Color(0x333333)}
                fadeDistance={400}
                fadeStrength={1}
            />
            
            {/* Scene Content - Use Suspense for potential async loading */}
            <Suspense fallback={null}>
                {/* Use the DroneModel component instead of a simple cube */}
                <DroneModel position={dronePosition} heading={0} pitch={0} roll={0} />

                {/* Pass memoized props to the frustum component */}
                <CameraFrustum3D {...frustumProps} />
            </Suspense>

        </Canvas>
    );
}

export default DroneSceneViewerWrapper; 