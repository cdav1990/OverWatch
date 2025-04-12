import React from 'react';
import { Plane } from '@react-three/drei';
import * as THREE from 'three';
import { Camera, Lens } from '../../../types/hardware';
import { 
  calculateFieldOfView, 
  getEffectiveFocalLength,
  getDOFCalculations
} from '../../../utils/sensorCalculations';

interface FocusPlaneProps {
  cameraDetails: Camera;
  lensDetails: Lens;
  focusDistanceM: number;
  aperture: number;
  showNearFocusPlane?: boolean;
  showFarFocusPlane?: boolean;
}

const FocusPlane: React.FC<FocusPlaneProps> = ({
  cameraDetails,
  lensDetails,
  focusDistanceM,
  aperture,
  showNearFocusPlane = true,
  showFarFocusPlane = false
}) => {
  // Calculate the frustum dimensions based on camera and lens properties
  const effectiveFocalLength = getEffectiveFocalLength(lensDetails);
  
  // Calculate horizontal and vertical field of view
  const horizontalFOV = calculateFieldOfView(effectiveFocalLength, cameraDetails.sensorWidth);
  const verticalFOV = calculateFieldOfView(effectiveFocalLength, cameraDetails.sensorHeight);
  
  // Calculate depth of field parameters
  const dofCalculations = getDOFCalculations(focusDistanceM, cameraDetails, lensDetails, aperture);
  
  // Calculate dimensions at different planes
  const calcDimensionsAtDistance = (distance: number) => {
    const halfWidth = Math.tan(THREE.MathUtils.degToRad(horizontalFOV / 2)) * distance;
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(verticalFOV / 2)) * distance;
    return { width: halfWidth * 2, height: halfHeight * 2 };
  };
  
  // Focus plane dimensions
  const focusPlaneDimensions = calcDimensionsAtDistance(focusDistanceM);
  
  // Near focus plane dimensions (if applicable)
  const nearPlaneDimensions = dofCalculations.nearLimit > 0 
    ? calcDimensionsAtDistance(dofCalculations.nearLimit)
    : { width: 0, height: 0 };
    
  // Far focus plane dimensions (if applicable and not infinity)
  const farPlaneDimensions = dofCalculations.farLimit < Infinity 
    ? calcDimensionsAtDistance(dofCalculations.farLimit)
    : { width: 0, height: 0 };
  
  return (
    <>
      {/* Main focus plane */}
      <Plane
        args={[focusPlaneDimensions.width, focusPlaneDimensions.height]}
        position={[0, 0, -focusDistanceM]}
        rotation={[0, 0, 0]}
      >
        <meshBasicMaterial color="#44ff44" transparent opacity={0.2} side={THREE.DoubleSide} />
      </Plane>
      
      {/* Near focus plane (if enabled) */}
      {showNearFocusPlane && dofCalculations.nearLimit > 0 && (
        <Plane
          args={[nearPlaneDimensions.width, nearPlaneDimensions.height]}
          position={[0, 0, -dofCalculations.nearLimit]}
          rotation={[0, 0, 0]}
        >
          <meshBasicMaterial color="#4444ff" transparent opacity={0.15} side={THREE.DoubleSide} />
        </Plane>
      )}
      
      {/* Far focus plane (if enabled and not infinity) */}
      {showFarFocusPlane && dofCalculations.farLimit < Infinity && (
        <Plane
          args={[farPlaneDimensions.width, farPlaneDimensions.height]}
          position={[0, 0, -dofCalculations.farLimit]}
          rotation={[0, 0, 0]}
        >
          <meshBasicMaterial color="#ff4444" transparent opacity={0.15} side={THREE.DoubleSide} />
        </Plane>
      )}
    </>
  );
};

export default FocusPlane; 