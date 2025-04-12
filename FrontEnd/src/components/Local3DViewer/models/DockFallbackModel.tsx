import React from 'react';
import { Box } from '@react-three/drei';
import * as THREE from 'three';
import { LocalCoord } from '../../../types/mission';

interface DockFallbackModelProps {
  position?: LocalCoord | [number, number, number]; 
  rotation?: LocalCoord | [number, number, number];
  scale?: number | [number, number, number];
}

const DockFallbackModel: React.FC<DockFallbackModelProps> = ({ 
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
  const finalScale: [number, number, number] = Array.isArray(scale) 
    ? scale as [number, number, number] 
    : [scale, scale, scale];
  
  return (
    <group position={formattedPosition} rotation={formattedRotation} scale={finalScale}>
      {/* Main dock platform */}
      <Box args={[30, 2, 60]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#7D8B98" roughness={0.8} />
      </Box>
      
      {/* Warehouse structure */}
      <Box args={[20, 10, 40]} position={[0, 6, -5]}>
        <meshStandardMaterial color="#5D6D7E" roughness={0.7} />
      </Box>
      
      {/* Dock edge */}
      <Box args={[30, 4, 2]} position={[0, 1, 30]}>
        <meshStandardMaterial color="#34495E" roughness={0.6} />
      </Box>
      
      {/* Crane base */}
      <Box args={[4, 20, 4]} position={[10, 10, 20]}>
        <meshStandardMaterial color="#566573" roughness={0.6} />
      </Box>
      
      {/* Crane arm */}
      <Box args={[20, 2, 2]} position={[0, 20, 20]}>
        <meshStandardMaterial color="#566573" roughness={0.6} />
      </Box>
    </group>
  );
};

export default DockFallbackModel; 