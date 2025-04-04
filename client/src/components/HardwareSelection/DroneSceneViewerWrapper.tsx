import React, { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
    OrbitControls, 
    PerspectiveCamera, 
    Grid, 
    Sky, 
    Text, 
    Line, 
    Plane 
} from '@react-three/drei';
import { Box, Typography } from '@mui/material';
import { useMission } from '../../context/MissionContext';
import * as THREE from 'three';
import { Camera, Lens } from '../../types/hardware';
import { calculateFieldOfView, getEffectiveFocalLength, metersToFeet } from '../../utils/sensorCalculations';

interface CameraFrustum3DProps {
    cameraDetails: Camera;
    lensDetails: Lens;
    focusDistanceM: number;
    aperture?: number; // Optional, for potential future use
}

// Actual Frustum Component
const CameraFrustum3D: React.FC<CameraFrustum3DProps> = ({ 
    cameraDetails, 
    lensDetails, 
    focusDistanceM 
}) => {
    const frustumRef = useRef<THREE.Group>(null);

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
        farPlaneDist
    } = useMemo(() => {
        const focalLength = getEffectiveFocalLength(lensDetails);
        const { sensorWidth, sensorHeight } = cameraDetails;

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
            farPlaneDist
        };
    }, [cameraDetails, lensDetails, focusDistanceM]);

    // Label Text
    const labelText = `FOV: ${horizontalFOV.toFixed(0)}°×${verticalFOV.toFixed(0)}°\nCoverage: ${coverageWidthFt.toFixed(1)}ft×${coverageHeightFt.toFixed(1)}ft`;

    return (
        <group ref={frustumRef} position={[0, 0.5, 0]} rotation={[0, 0, 0]}> {/* Adjust initial position/rotation if needed */}
            {/* Frustum Volume */}
            <mesh geometry={geometry}>
                <meshStandardMaterial 
                    color="#2060ff" 
                    opacity={0.15} 
                    transparent 
                    side={THREE.DoubleSide} 
                    depthWrite={false} // Allow seeing through
                />
            </mesh>

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
                color="#40a0ff"
                lineWidth={1.5}
                dashed={false}
            />

            {/* Focus Plane (Far Plane) */}
            <Plane args={[farWidth, farHeight]} position={[0, 0, -focusDistanceM]}> 
                <meshStandardMaterial 
                    color="#00ff00" 
                    opacity={0.1} 
                    transparent 
                    side={THREE.DoubleSide} 
                    depthWrite={false}
                />
            </Plane>

            {/* Label Text */}
            <Text
                position={[0, farHeight / 2 + 0.3, -focusDistanceM]} // Position above far plane center
                fontSize={0.3}
                color="white"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.01}
                outlineColor="black"
            >
                {labelText}
            </Text>
        </group>
    );
}

const DroneSceneViewerWrapper: React.FC = () => {
    const { state: missionState } = useMission();
    const { hardware } = missionState;
    const cameraDetails = hardware?.cameraDetails;
    const lensDetails = hardware?.lensDetails;
    const focusDistanceM = hardware?.focusDistance;
    const aperture = hardware?.fStop;

    // Handle incomplete data
    if (!cameraDetails || !lensDetails || focusDistanceM === undefined || aperture === undefined) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography color="text.secondary">Select Camera, Lens, Aperture, and Focus Distance.</Typography>
            </Box>
        );
    }

    // Memoize frustum props to prevent unnecessary re-renders of the 3D scene
    const frustumProps = useMemo(() => ({
        cameraDetails,
        lensDetails,
        focusDistanceM
    }), [cameraDetails, lensDetails, focusDistanceM]);

    return (
        <Canvas style={{ background: '#272727' }}>
            {/* Camera Setup */}
            <PerspectiveCamera makeDefault position={[0, 2, 8]} fov={50} />
            <OrbitControls 
                enablePan={true} 
                enableZoom={true} 
                enableRotate={true} 
                target={[0, 0.5, 0]} // Point towards the center of the scene
            />

            {/* Lighting */}
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 10, 7]} intensity={1.0} castShadow />
            <Sky sunPosition={[100, 10, 100]} />

            {/* Environment */}
            <Grid 
                infiniteGrid 
                position={[0, -0.01, 0]} // Slightly below origin
                args={[10, 10]} // Size, Divisions
                cellColor={new THREE.Color(0x6f6f6f)} // Grid line color
                sectionColor={new THREE.Color(0x9d4b4b)} // Center line color
                fadeDistance={25} // Fade grid lines in the distance
            />
            
            {/* Scene Content - Use Suspense for potential async loading */}
            <Suspense fallback={null}>
                {/* Reference Cube (1x1x1 meter at origin) */}
                <mesh position={[0, 0.5, 0]}> 
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial color="orange" />
                </mesh>

                {/* Pass memoized props to the frustum component */}
                <CameraFrustum3D {...frustumProps} />
            </Suspense>

        </Canvas>
    );
};

export default DroneSceneViewerWrapper; 