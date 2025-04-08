import React from 'react';
import { Sphere, Ring } from '@react-three/drei';
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
  const { local, displayOptions } = waypoint;

  if (!local) {
    return null; // Skip rendering if no local coordinates
  }
  
  // Check if this is a ground path projection
  const isGroundProjection = displayOptions?.isGroundProjection === true;
  
  // Use custom display options if available
  const displayColor = displayOptions?.displayColor || (selected ? '#ff9800' : '#2979ff');
  const displayStyle = displayOptions?.displayStyle || 'solid';
  
  if (isGroundProjection) {
    // Render ground projections differently (flat circle or ring)
    return (
      <Ring
        args={[0.25, 0.35, 16]} // Inner radius, outer radius, segments
        position={[local.x, local.z, -local.y]} // Map to threejs coordinates
        rotation={[Math.PI / 2, 0, 0]} // Rotate to lie flat on the ground
        onClick={(e: ThreeEvent<MouseEvent>) => { 
          e.stopPropagation(); 
          onClick(); 
        }}
      >
        <meshStandardMaterial
          color={displayColor}
          roughness={0.8}
          transparent={true}
          opacity={0.7}
          side={2} // THREE.DoubleSide for visibility from all angles
          depthWrite={false} // Prevent z-fighting with ground
        />
      </Ring>
    );
  }
  
  // Default waypoint visualization (sphere)
  return (
    <Sphere
      args={[0.35, 16, 16]} // Radius, widthSegments, heightSegments
      position={[local.x, local.z, -local.y]} // Map to threejs coordinates (z-up to y-up)
      onClick={(e: ThreeEvent<MouseEvent>) => { 
        e.stopPropagation(); 
        onClick(); 
      }}
    >
      <meshStandardMaterial
        color={displayColor}
        roughness={0.6}
        emissive={selected ? '#ff9800' : '#000000'} // Glow slightly when selected
        emissiveIntensity={selected ? 0.5 : 0}
      />
    </Sphere>
  );
};

export default WaypointMarker; 