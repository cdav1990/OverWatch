import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Line, Plane } from '@react-three/drei';
import * as THREE from 'three';
import { Camera, Lens } from '../../types/hardware';
import { 
    calculateFieldOfView, 
    getEffectiveFocalLength, 
    metersToFeet, 
    getDOFCalculations 
} from '../../utils/sensorCalculations';

// Props definition remains the same
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
        console.warn("CameraFrustum3D: Missing required props.", { cameraDetails, lensDetails, focusDistanceM, aperture });
        return null;
    }

    // --- Calculation Logic (Copied from DroneSceneViewerWrapper) ---
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
        const defaultValues = {
            geometry: new THREE.BufferGeometry(), farWidth: 1, farHeight: 1, horizontalFOV: 0, verticalFOV: 0,
            coverageWidthFt: 0, coverageHeightFt: 0, nearWidth: 0.1, nearHeight: 0.1, nearPlaneDist: 0.1,
            farPlaneDist: 1, nearFocusDistanceM: 0, farFocusDistanceM: 0, dofTotalM: 0, inFocusRange: false
        };
        try {
            if (!cameraDetails || !lensDetails || !aperture || !focusDistanceM || focusDistanceM <= 0) { return defaultValues; }
            const focalLength = getEffectiveFocalLength(lensDetails);
            const { sensorWidth, sensorHeight } = cameraDetails;
            if (!sensorWidth || !sensorHeight || !focalLength) { return defaultValues; }
            const hFOVRad = 2 * Math.atan(sensorWidth / (2 * focalLength));
            const vFOVRad = 2 * Math.atan(sensorHeight / (2 * focalLength));
            const nearPlaneDist = 0.1;
            const farPlaneDist = focusDistanceM;
            const nearHeight = 2 * Math.tan(vFOVRad / 2) * nearPlaneDist;
            const nearWidth = 2 * Math.tan(hFOVRad / 2) * nearPlaneDist;
            const farHeight = 2 * Math.tan(vFOVRad / 2) * farPlaneDist;
            const farWidth = 2 * Math.tan(hFOVRad / 2) * farPlaneDist;
            const vertices = new Float32Array([
                -nearWidth / 2, -nearHeight / 2, -nearPlaneDist, nearWidth / 2, -nearHeight / 2, -nearPlaneDist,
                nearWidth / 2,  nearHeight / 2, -nearPlaneDist, -nearWidth / 2,  nearHeight / 2, -nearPlaneDist,
                -farWidth / 2, -farHeight / 2, -farPlaneDist, farWidth / 2, -farHeight / 2, -farPlaneDist,
                farWidth / 2,  farHeight / 2, -farPlaneDist, -farWidth / 2,  farHeight / 2, -farPlaneDist,
            ]);
            const indices = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0];
            const geom = new THREE.BufferGeometry();
            geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            geom.setIndex(indices);
            geom.computeVertexNormals();
            const horizontalFOV = calculateFieldOfView(focalLength, sensorWidth);
            const verticalFOV = calculateFieldOfView(focalLength, sensorHeight);
            const coverageWidthFt = metersToFeet(farWidth);
            const coverageHeightFt = metersToFeet(farHeight);
            const dofCalculations = getDOFCalculations(focusDistanceM, cameraDetails, lensDetails, aperture);
            const nearFocusDistanceM = dofCalculations.nearLimit;
            const farFocusDistanceM = dofCalculations.farLimit === Infinity ? focusDistanceM * 3 : dofCalculations.farLimit; // Cap infinite DOF for visualization
            const dofTotalM = dofCalculations.totalDOF === Infinity ? focusDistanceM * 2 : dofCalculations.totalDOF; // Cap infinite DOF
            const inFocusRange = (focusDistanceM >= nearFocusDistanceM && (dofCalculations.farLimit === Infinity || focusDistanceM <= dofCalculations.farLimit));
            return { geometry: geom, farWidth, farHeight, horizontalFOV, verticalFOV, coverageWidthFt, coverageHeightFt, nearWidth, nearHeight, nearPlaneDist, farPlaneDist, nearFocusDistanceM, farFocusDistanceM, dofTotalM, inFocusRange };
        } catch (error) { console.error('Error calculating camera frustum:', error); return defaultValues; }
    }, [cameraDetails, lensDetails, focusDistanceM, aperture]);

    const { nearFocusWidth, nearFocusHeight, farFocusWidth, farFocusHeight } = useMemo(() => {
         if (!cameraDetails || !lensDetails || !nearFocusDistanceM || !farFocusDistanceM) { return { nearFocusWidth: 0, nearFocusHeight: 0, farFocusWidth: 0, farFocusHeight: 0 }; }
         try {
             const focalLength = getEffectiveFocalLength(lensDetails);
             const { sensorWidth, sensorHeight } = cameraDetails;
             const hFOVRad = 2 * Math.atan(sensorWidth / (2 * focalLength));
             const vFOVRad = 2 * Math.atan(sensorHeight / (2 * focalLength));
             const nearFocusWidth = 2 * Math.tan(hFOVRad / 2) * nearFocusDistanceM;
             const nearFocusHeight = 2 * Math.tan(vFOVRad / 2) * nearFocusDistanceM;
             const farFocusWidth = 2 * Math.tan(hFOVRad / 2) * farFocusDistanceM;
             const farFocusHeight = 2 * Math.tan(vFOVRad / 2) * farFocusDistanceM;
             return { nearFocusWidth, nearFocusHeight, farFocusWidth, farFocusHeight };
         } catch (error) { console.error('Error calculating DOF plane dimensions:', error); return { nearFocusWidth: 0, nearFocusHeight: 0, farFocusWidth: 0, farFocusHeight: 0 }; }
    }, [cameraDetails, lensDetails, nearFocusDistanceM, farFocusDistanceM]);
    // --- End Calculation Logic ---

    // Label Text
    const labelText = `FOV: ${horizontalFOV.toFixed(0)}°×${verticalFOV.toFixed(0)}°\nCoverage: ${coverageWidthFt.toFixed(1)}ft×${coverageHeightFt.toFixed(1)}ft`;
    const dofInfoText = `DOF: ${metersToFeet(dofTotalM).toFixed(1)}ft (${metersToFeet(nearFocusDistanceM).toFixed(1)}ft - ${ farFocusDistanceM >= focusDistanceM * 3 ? '∞' : metersToFeet(farFocusDistanceM).toFixed(1) + 'ft' })`;

    // Animation values
    const pulseFactor = useRef(0);
    useFrame((_, delta) => { pulseFactor.current = (pulseFactor.current + delta * 0.8) % (Math.PI * 2); });
    const pulseMaterial = { opacity: 0.25 + Math.sin(pulseFactor.current) * 0.15 };

    // Frustum visualization JSX (Copied from DroneSceneViewerWrapper)
    return (
        <group ref={frustumRef} > 
            {/* Frustum Volume */}
            <mesh geometry={geometry}>
                <meshStandardMaterial color="#4fc3f7" opacity={0.1} transparent side={THREE.DoubleSide} depthWrite={false}/>
            </mesh>

             {/* Frustum Wireframe using <Line> */}
             <Line 
                points={[ /* Define points for lines based on geometry vertices */
                    [-nearWidth / 2, -nearHeight / 2, -nearPlaneDist], [nearWidth / 2, -nearHeight / 2, -nearPlaneDist], [nearWidth / 2, -nearHeight / 2, -nearPlaneDist], [nearWidth / 2,  nearHeight / 2, -nearPlaneDist], [nearWidth / 2,  nearHeight / 2, -nearPlaneDist], [-nearWidth / 2,  nearHeight / 2, -nearPlaneDist], [-nearWidth / 2,  nearHeight / 2, -nearPlaneDist], [-nearWidth / 2, -nearHeight / 2, -nearPlaneDist],
                    [-farWidth / 2, -farHeight / 2, -farPlaneDist], [farWidth / 2, -farHeight / 2, -farPlaneDist], [farWidth / 2, -farHeight / 2, -farPlaneDist], [farWidth / 2,  farHeight / 2, -farPlaneDist], [farWidth / 2,  farHeight / 2, -farPlaneDist], [-farWidth / 2,  farHeight / 2, -farPlaneDist], [-farWidth / 2,  farHeight / 2, -farPlaneDist], [-farWidth / 2, -farHeight / 2, -farPlaneDist],
                    [-nearWidth / 2, -nearHeight / 2, -nearPlaneDist], [-farWidth / 2, -farHeight / 2, -farPlaneDist], [nearWidth / 2, -nearHeight / 2, -nearPlaneDist], [farWidth / 2, -farHeight / 2, -farPlaneDist], [nearWidth / 2,  nearHeight / 2, -nearPlaneDist], [farWidth / 2,  farHeight / 2, -farPlaneDist], [-nearWidth / 2,  nearHeight / 2, -nearPlaneDist], [-farWidth / 2,  farHeight / 2, -farPlaneDist],
                ]}
                color="#4fc3f7" lineWidth={1.5} dashed={false} />

            {/* Near Focus Plane */}
            {nearFocusDistanceM > 0 && nearFocusWidth > 0 && nearFocusHeight > 0 && (
                <>
                    <Plane args={[nearFocusWidth, nearFocusHeight]} position={[0, 0, -nearFocusDistanceM]} >
                        <meshStandardMaterial color="#00ff00" opacity={pulseMaterial.opacity} transparent side={THREE.DoubleSide} depthWrite={false}/>
                    </Plane>
                    <Line points={[ [-nearFocusWidth / 2, -nearFocusHeight / 2, -nearFocusDistanceM], [nearFocusWidth / 2, -nearFocusHeight / 2, -nearFocusDistanceM], [nearFocusWidth / 2, -nearFocusHeight / 2, -nearFocusDistanceM], [nearFocusWidth / 2, nearFocusHeight / 2, -nearFocusDistanceM], [nearFocusWidth / 2, nearFocusHeight / 2, -nearFocusDistanceM], [-nearFocusWidth / 2, nearFocusHeight / 2, -nearFocusDistanceM], [-nearFocusWidth / 2, nearFocusHeight / 2, -nearFocusDistanceM], [-nearFocusWidth / 2, -nearFocusHeight / 2, -nearFocusDistanceM], ]} color="#00ff00" lineWidth={2} dashed={false} />
                    <Text position={[-nearFocusWidth / 2 - 0.5, 0, -nearFocusDistanceM]} fontSize={0.2} color="#00ff00" anchorX="right" anchorY="middle" outlineWidth={0.01} outlineColor="#000000" rotation={[0, Math.PI / 2, 0]} > {`Near Focus: ${metersToFeet(nearFocusDistanceM).toFixed(1)}ft`} </Text>
                </>
            )}

            {/* Far Focus Plane - Only show if finite and within reasonable range */}
             {farFocusDistanceM > 0 && farFocusDistanceM < focusDistanceM * 3 && farFocusWidth > 0 && farFocusHeight > 0 && (
                 <>
                     <Plane args={[farFocusWidth, farFocusHeight]} position={[0, 0, -farFocusDistanceM]} >
                         <meshStandardMaterial color="#00ff00" opacity={pulseMaterial.opacity} transparent side={THREE.DoubleSide} depthWrite={false} />
                     </Plane>
                     <Line points={[ [-farFocusWidth / 2, -farFocusHeight / 2, -farFocusDistanceM], [farFocusWidth / 2, -farFocusHeight / 2, -farFocusDistanceM], [farFocusWidth / 2, -farFocusHeight / 2, -farFocusDistanceM], [farFocusWidth / 2, farFocusHeight / 2, -farFocusDistanceM], [farFocusWidth / 2, farFocusHeight / 2, -farFocusDistanceM], [-farFocusWidth / 2, farFocusHeight / 2, -farFocusDistanceM], [-farFocusWidth / 2, farFocusHeight / 2, -farFocusDistanceM], [-farFocusWidth / 2, -farFocusHeight / 2, -farFocusDistanceM], ]} color="#00ff00" lineWidth={2} dashed={false} />
                     <Text position={[-farFocusWidth / 2 - 0.5, 0, -farFocusDistanceM]} fontSize={0.2} color="#00ff00" anchorX="right" anchorY="middle" outlineWidth={0.01} outlineColor="#000000" rotation={[0, Math.PI / 2, 0]} > {`Far Focus: ${metersToFeet(farFocusDistanceM).toFixed(1)}ft`} </Text>
                 </>
             )}

            {/* Focus Plane (Far Plane - Image Footprint) */}
            {farWidth > 0 && farHeight > 0 && (
                 <Plane args={[farWidth, farHeight]} position={[0, 0, -focusDistanceM]}>
                     <meshStandardMaterial color={inFocusRange ? "#4fc3f7" : "#ff9800"} opacity={0.2} transparent side={THREE.DoubleSide} depthWrite={false} />
                 </Plane>
            )}

            {/* Text Labels */}
            <Text position={[0, farHeight / 2 + 0.5, -focusDistanceM]} fontSize={0.3} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.01} outlineColor="#000000" > {`Focus Distance: ${metersToFeet(focusDistanceM).toFixed(1)}ft`} </Text>
            <Text position={[0, farHeight / 2 + 0.9, -focusDistanceM]} fontSize={0.25} color={inFocusRange ? "#00ff00" : "#ff9800"} anchorX="center" anchorY="middle" outlineWidth={0.01} outlineColor="#000000" > {dofInfoText} </Text>
            <Text position={[0, -farHeight / 2 - 0.4, -focusDistanceM]} fontSize={0.25} color="#4fc3f7" anchorX="center" anchorY="middle" outlineWidth={0.01} outlineColor="#000000" > {labelText} </Text>
        </group>
    );
}

export default CameraFrustum3D; 