import React from 'react';
import { Box } from '@react-three/drei';
import * as THREE from 'three';
import { LocalCoord } from '../../../types/mission';

interface ShipFallbackModelProps {
  position?: LocalCoord | [number, number, number]; 
  rotation?: LocalCoord | [number, number, number];
  scale?: number | [number, number, number];
}

const ShipFallbackModel: React.FC<ShipFallbackModelProps> = ({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  scale = 1 
}) => {
  // Format position properly
  const formattedPosition: [number, number, number] = Array.isArray(position) 
    ? position as [number, number, number]
    : [position.x, position.z, -position.y]; 

  // Format rotation properly
  const formattedRotation: [number, number, number] = Array.isArray(rotation)
    ? rotation as [number, number, number]
    : [
        THREE.MathUtils.degToRad(rotation.x || 0),
        THREE.MathUtils.degToRad(rotation.z || 0),
        -THREE.MathUtils.degToRad(rotation.y || 0)
      ];
  
  // Handle scale
  const effectiveScale = typeof scale === 'number' ? scale : 1;
  
  return (
    <group position={formattedPosition} rotation={formattedRotation} scale={effectiveScale}>
      {/* Simple aircraft carrier shape */}
      <Box args={[10, 1, 40]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#667788" roughness={0.7} />
      </Box>
      
      {/* Island/tower structure */}
      <Box args={[3, 5, 8]} position={[3, 3, 5]}>
        <meshStandardMaterial color="#556677" roughness={0.6} />
      </Box>
      
      {/* Flight deck markings */}
      <Box args={[8, 0.1, 30]} position={[0, 0.6, 0]}>
        <meshStandardMaterial color="#334455" roughness={0.8} />
      </Box>
    </group>
  );
};

export default ShipFallbackModel;
