import React from 'react';
import { Sphere } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { Waypoint } from '../../../types/mission';

interface WaypointMarkerProps {
  waypoint: Waypoint;
  selected: boolean;
  onClick: () => void;
}

const WaypointMarker: React.FC<WaypointMarkerProps> = ({
  waypoint,
  selected,
  onClick
}) => {
  const { local } = waypoint;

  if (!local) {
    return null; // Skip rendering if no local coordinates
  }

  return (
    <Sphere
      args={[0.35, 16, 16]} // Reduced radius from previous potential size (e.g., 0.5)
      position={[local.x, local.z, -local.y]} // Map to threejs coordinates (z-up to y-up)
      onClick={(e: ThreeEvent<MouseEvent>) => { 
        e.stopPropagation(); 
        onClick(); 
      }}
    >
      <meshStandardMaterial
        color={selected ? '#ff9800' : '#2979ff'}
        roughness={0.6}
        emissive={selected ? '#ff9800' : '#000000'} // Glow slightly when selected
        emissiveIntensity={selected ? 0.5 : 0}
      />
    </Sphere>
  );
};

export default WaypointMarker; 