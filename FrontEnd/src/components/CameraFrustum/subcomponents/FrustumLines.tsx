import React from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { Camera, Lens } from '../../../types/hardware';
import { calculateFieldOfView, getEffectiveFocalLength } from '../../../utils/sensorCalculations';

interface FrustumLinesProps {
  cameraDetails: Camera;
  lensDetails: Lens;
  focusDistanceM: number;
}

const FrustumLines: React.FC<FrustumLinesProps> = ({
  cameraDetails,
  lensDetails,
  focusDistanceM
}) => {
  // Calculate the frustum dimensions based on camera and lens properties
  const effectiveFocalLength = getEffectiveFocalLength(lensDetails);
  
  // Calculate horizontal and vertical field of view
  const horizontalFOV = calculateFieldOfView(effectiveFocalLength, cameraDetails.sensorWidth);
  const verticalFOV = calculateFieldOfView(effectiveFocalLength, cameraDetails.sensorHeight);
  
  // Calculate frustum dimensions at the focus distance
  const halfWidthAtFocus = Math.tan(THREE.MathUtils.degToRad(horizontalFOV / 2)) * focusDistanceM;
  const halfHeightAtFocus = Math.tan(THREE.MathUtils.degToRad(verticalFOV / 2)) * focusDistanceM;
  
  // Create points for the frustum lines
  const points = [
    // From origin to the corners of the focus plane
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(halfWidthAtFocus, halfHeightAtFocus, -focusDistanceM),
    
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(halfWidthAtFocus, -halfHeightAtFocus, -focusDistanceM),
    
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-halfWidthAtFocus, halfHeightAtFocus, -focusDistanceM),
    
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-halfWidthAtFocus, -halfHeightAtFocus, -focusDistanceM),
    
    // Connect the corners of the focus plane
    new THREE.Vector3(halfWidthAtFocus, halfHeightAtFocus, -focusDistanceM),
    new THREE.Vector3(halfWidthAtFocus, -halfHeightAtFocus, -focusDistanceM),
    
    new THREE.Vector3(halfWidthAtFocus, -halfHeightAtFocus, -focusDistanceM),
    new THREE.Vector3(-halfWidthAtFocus, -halfHeightAtFocus, -focusDistanceM),
    
    new THREE.Vector3(-halfWidthAtFocus, -halfHeightAtFocus, -focusDistanceM),
    new THREE.Vector3(-halfWidthAtFocus, halfHeightAtFocus, -focusDistanceM),
    
    new THREE.Vector3(-halfWidthAtFocus, halfHeightAtFocus, -focusDistanceM),
    new THREE.Vector3(halfWidthAtFocus, halfHeightAtFocus, -focusDistanceM),
  ];

  return (
    <Line
      points={points}
      color="white"
      lineWidth={1}
    />
  );
};

export default FrustumLines; 