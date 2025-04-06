import React, { useState, useRef, useMemo } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Box, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { useMission } from '../../../context/MissionContext';
import { LocalCoord } from '../../../types/mission';
import { getCameraById, getLensById, getLensFStops } from '../../../utils/hardwareDatabase';
import { feetToMeters } from '../../../utils/sensorCalculations';
import CameraFrustum, { CameraFrustumProps } from './CameraFrustum';

interface DroneModelProps {
  position: LocalCoord;
  heading: number;
  pitch: number;
  roll: number;
  onDoubleClick?: (event: ThreeEvent<MouseEvent>) => void;
  visualizationSettings?: CameraFrustumProps['visualization'];
}

const DroneModel: React.FC<DroneModelProps> = ({
  position,
  heading,
  pitch,
  roll,
  onDoubleClick,
  visualizationSettings = {
    showNearFocusPlane: true,
    showFarFocusPlane: false,
    showFocusPlaneInfo: false,
    showDOFInfo: false
  }
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { state } = useMission();
  const { isCameraFrustumVisible, hardware } = state;
  
  // Default hardware settings if not set in context
  const DEFAULT_CAMERA_ID = 'phase-one-ixm-100';
  const DEFAULT_LENS_ID = 'phaseone-rsm-80mm';
  const DEFAULT_FOCUS_DISTANCE_FT = 20; // in feet

  // Get camera and lens details from context or defaults
  const cameraDetails = useMemo(() => {
    return hardware?.cameraDetails || getCameraById(DEFAULT_CAMERA_ID);
  }, [hardware?.cameraDetails]);

  const lensDetails = useMemo(() => {
    return hardware?.lensDetails || getLensById(DEFAULT_LENS_ID);
  }, [hardware?.lensDetails]);

  // Get f-stop (aperture) - default to lowest available if not set
  const aperture = useMemo(() => {
    if (hardware?.fStop) return hardware.fStop;
    if (!lensDetails) return null;

    const fStops = getLensFStops(lensDetails);
    return fStops.length > 0 ? Math.min(...fStops) : lensDetails.maxAperture;
  }, [hardware?.fStop, lensDetails]);

  // Get focus distance in meters - default to 20ft if not set
  const focusDistanceM = useMemo(() => {
    return hardware?.focusDistance || feetToMeters(DEFAULT_FOCUS_DISTANCE_FT);
  }, [hardware?.focusDistance]);

  // Map simulation position to Three.js coordinates
  const threePosition = new THREE.Vector3(position.x, position.z, -position.y);

  // For propeller animation
  const [propellerRotation, setPropellerRotation] = useState<number[]>([0, 0, 0, 0]);

  // Animate propellers
  useFrame(() => {
    setPropellerRotation(prev => [
      (prev[0] + 0.4) % (Math.PI * 2), 
      (prev[1] - 0.5) % (Math.PI * 2),
      (prev[2] + 0.4) % (Math.PI * 2),
      (prev[3] - 0.5) % (Math.PI * 2)
    ]);
  });

  return (
    <group
      ref={groupRef}
      position={threePosition}
      onDoubleClick={onDoubleClick}
      scale={[0.33, 0.33, 0.33]} // Scale down the drone to 1/3 of the original size
    >
      {/* Main drone body - more detailed */}
      <Box args={[2.4, 0.5, 2.4]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#212121" metalness={0.8} roughness={0.3} />
      </Box>

      {/* Body details - top section */}
      <Box args={[1.8, 0.3, 1.8]} position={[0, 0.4, 0]}>
        <meshStandardMaterial color="#333333" metalness={0.6} roughness={0.4} />
      </Box>

      {/* Drone arms */}
      <group>
        {/* Front-right arm */}
        <Box args={[0.2, 0.2, 1.2]} position={[0.9, 0, 0.9]} rotation={[0, Math.PI/4, 0]}>
          <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.6} />
        </Box>

        {/* Front-left arm */}
        <Box args={[0.2, 0.2, 1.2]} position={[-0.9, 0, 0.9]} rotation={[0, -Math.PI/4, 0]}>
          <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.6} />
        </Box>

        {/* Back-right arm */}
        <Box args={[0.2, 0.2, 1.2]} position={[0.9, 0, -0.9]} rotation={[0, -Math.PI/4, 0]}>
          <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.6} />
        </Box>

        {/* Back-left arm */}
        <Box args={[0.2, 0.2, 1.2]} position={[-0.9, 0, -0.9]} rotation={[0, Math.PI/4, 0]}>
          <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.6} />
        </Box>
      </group>

      {/* Motor housings and propellers */}
      <group>
        {/* Front-right motor and propeller */}
        <group position={[1.4, 0.1, 1.4]}>
          <Sphere args={[0.3, 16, 16]}>
            <meshStandardMaterial color="#222222" metalness={0.7} roughness={0.3} />
          </Sphere>
          {/* Propeller group - animation enabled */}
          <group rotation={[0, propellerRotation[0], 0]}>
            <Box args={[1.4, 0.05, 0.15]} position={[0, 0.15, 0]}>
              <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
            </Box>
            <Box args={[0.15, 0.05, 1.4]} position={[0, 0.15, 0]}>
              <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
            </Box>
          </group>
        </group>

        {/* Front-left motor and propeller */}
         <group position={[-1.4, 0.1, 1.4]}>
          <Sphere args={[0.3, 16, 16]}>
            <meshStandardMaterial color="#222222" metalness={0.7} roughness={0.3} />
          </Sphere>
          {/* Propeller group - animation enabled */}
          <group rotation={[0, propellerRotation[1], 0]}>
            <Box args={[1.4, 0.05, 0.15]} position={[0, 0.15, 0]}>
              <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
            </Box>
            <Box args={[0.15, 0.05, 1.4]} position={[0, 0.15, 0]}>
              <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
            </Box>
          </group>
        </group>

        {/* Back-right motor and propeller */}
         <group position={[1.4, 0.1, -1.4]}>
          <Sphere args={[0.3, 16, 16]}>
            <meshStandardMaterial color="#222222" metalness={0.7} roughness={0.3} />
          </Sphere>
          {/* Propeller group - animation enabled */}
          <group rotation={[0, propellerRotation[2], 0]}>
            <Box args={[1.4, 0.05, 0.15]} position={[0, 0.15, 0]}>
              <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
            </Box>
            <Box args={[0.15, 0.05, 1.4]} position={[0, 0.15, 0]}>
              <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
            </Box>
          </group>
        </group>

        {/* Back-left motor and propeller */}
         <group position={[-1.4, 0.1, -1.4]}>
          <Sphere args={[0.3, 16, 16]}>
            <meshStandardMaterial color="#222222" metalness={0.7} roughness={0.3} />
          </Sphere>
          {/* Propeller group - animation enabled */}
          <group rotation={[0, propellerRotation[3], 0]}>
            <Box args={[1.4, 0.05, 0.15]} position={[0, 0.15, 0]}>
              <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
            </Box>
            <Box args={[0.15, 0.05, 1.4]} position={[0, 0.15, 0]}>
              <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
            </Box>
          </group>
        </group>
      </group>

      {/* Landing gear legs */}
      <group>
        <Box args={[0.15, 0.8, 0.15]} position={[0.9, -0.65, 0.9]}>
          <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.6} />
        </Box>
        <Box args={[0.15, 0.8, 0.15]} position={[-0.9, -0.65, 0.9]}>
          <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.6} />
        </Box>
        <Box args={[0.15, 0.8, 0.15]} position={[0.9, -0.65, -0.9]}>
          <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.6} />
        </Box>
        <Box args={[0.15, 0.8, 0.15]} position={[-0.9, -0.65, -0.9]}>
          <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.6} />
        </Box>
      </group>

      {/* Camera gimbal */}
      <group position={[0, -0.25, 0.8]}>
        <Box args={[0.8, 0.3, 0.4]}>
          <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
        </Box>
        <Box args={[0.6, 0.2, 0.3]} position={[0, -0.25, 0]}>
          <meshStandardMaterial color="#222222" metalness={0.8} roughness={0.2} />
        </Box>
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

      {/* Camera Frustum - pass visualization settings */}
      {isCameraFrustumVisible && cameraDetails && lensDetails && aperture !== null && ( 
        <CameraFrustum 
          cameraDetails={cameraDetails}
          lensDetails={lensDetails}
          focusDistanceM={focusDistanceM}
          aperture={aperture}
          visualization={visualizationSettings}
        />
      )}
    </group>
  );
};

export default DroneModel; 