import React from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { Camera, Lens } from '../../../types/hardware';
import { 
  calculateFieldOfView, 
  getEffectiveFocalLength,
  getDOFCalculations,
  calculateFootprint,
  metersToFeet
} from '../../../utils/sensorCalculations';

interface FrustumInfoProps {
  cameraDetails: Camera;
  lensDetails: Lens;
  focusDistanceM: number;
  aperture: number;
  showFocusPlaneInfo?: boolean;
  showDOFInfo?: boolean;
  showFootprintInfo?: boolean;
  showFocusPlaneLabels?: boolean;
}

const FrustumInfo: React.FC<FrustumInfoProps> = ({
  cameraDetails,
  lensDetails,
  focusDistanceM,
  aperture,
  showFocusPlaneInfo = true,
  showDOFInfo = true,
  showFootprintInfo = true,
  showFocusPlaneLabels = true
}) => {
  // Calculate various parameters
  const effectiveFocalLength = getEffectiveFocalLength(lensDetails);
  const horizontalFOV = calculateFieldOfView(effectiveFocalLength, cameraDetails.sensorWidth);
  const verticalFOV = calculateFieldOfView(effectiveFocalLength, cameraDetails.sensorHeight);
  
  // DOF calculations
  const dofCalculations = getDOFCalculations(focusDistanceM, cameraDetails, lensDetails, aperture);
  
  // Footprint calculations
  const footprint = calculateFootprint(focusDistanceM, cameraDetails, lensDetails);
  
  // Helper for formatting distances
  const formatDistance = (meters: number): string => {
    if (meters === Infinity) return '∞';
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
    if (meters >= 100) return `${meters.toFixed(0)}m`;
    return `${meters.toFixed(2)}m`;
  };
  
  return (
    <>
      {/* Focus plane info */}
      {showFocusPlaneInfo && (
        <Text
          position={[0, 0.2, -focusDistanceM]}
          color="white"
          fontSize={0.05}
          anchorX="center"
          anchorY="top"
        >
          {`Focus: ${formatDistance(focusDistanceM)} (${metersToFeet(focusDistanceM).toFixed(1)}ft)`}
        </Text>
      )}
      
      {/* DOF info */}
      {showDOFInfo && (
        <group>
          {/* Near limit */}
          {dofCalculations.nearLimit > 0 && (
            <Text
              position={[0, 0.2, -dofCalculations.nearLimit]}
              color="#4444ff"
              fontSize={0.04}
              anchorX="center"
              anchorY="top"
            >
              {`Near: ${formatDistance(dofCalculations.nearLimit)}`}
            </Text>
          )}
          
          {/* Far limit */}
          {dofCalculations.farLimit < Infinity && (
            <Text
              position={[0, 0.2, -dofCalculations.farLimit]}
              color="#ff4444"
              fontSize={0.04}
              anchorX="center"
              anchorY="top"
            >
              {`Far: ${formatDistance(dofCalculations.farLimit)}`}
            </Text>
          )}
          
          {/* DOF summary - position it above the focus plane */}
          <Text
            position={[0, 0.3, -focusDistanceM]}
            color="#bbbbbb"
            fontSize={0.035}
            anchorX="center"
            anchorY="top"
          >
            {`DOF: ${formatDistance(dofCalculations.totalDOF)} | Hyperfocal: ${formatDistance(dofCalculations.hyperfocal)}`}
          </Text>
        </group>
      )}
      
      {/* Footprint info */}
      {showFootprintInfo && (
        <Text
          position={[0, -0.2, -focusDistanceM]}
          color="#bbbbbb"
          fontSize={0.035}
          anchorX="center"
          anchorY="bottom"
        >
          {`FOV: ${horizontalFOV.toFixed(1)}° × ${verticalFOV.toFixed(1)}°`}
          {`\nFootprint: ${footprint.width.toFixed(1)}m × ${footprint.height.toFixed(1)}m`}
        </Text>
      )}
      
      {/* Focus plane corner labels */}
      {showFocusPlaneLabels && (
        <>
          {/* Calculate dimensions at focus distance */}
          {(() => {
            const halfWidth = Math.tan(THREE.MathUtils.degToRad(horizontalFOV / 2)) * focusDistanceM;
            const halfHeight = Math.tan(THREE.MathUtils.degToRad(verticalFOV / 2)) * focusDistanceM;
            
            return (
              <>
                {/* Corner measurements */}
                <Text
                  position={[halfWidth, halfHeight, -focusDistanceM]}
                  color="white"
                  fontSize={0.03}
                  anchorX="left"
                  anchorY="bottom"
                >
                  {`${halfWidth.toFixed(1)}m`}
                </Text>
                <Text
                  position={[-halfWidth, halfHeight, -focusDistanceM]}
                  color="white"
                  fontSize={0.03}
                  anchorX="right"
                  anchorY="bottom"
                >
                  {`${halfWidth.toFixed(1)}m`}
                </Text>
                <Text
                  position={[0, halfHeight, -focusDistanceM]}
                  color="white"
                  fontSize={0.03}
                  anchorX="center"
                  anchorY="bottom"
                >
                  {`${halfHeight.toFixed(1)}m`}
                </Text>
                <Text
                  position={[0, -halfHeight, -focusDistanceM]}
                  color="white"
                  fontSize={0.03}
                  anchorX="center"
                  anchorY="top"
                >
                  {`${halfHeight.toFixed(1)}m`}
                </Text>
              </>
            );
          })()}
        </>
      )}
    </>
  );
};

export default FrustumInfo; 