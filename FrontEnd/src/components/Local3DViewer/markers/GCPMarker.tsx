import React from 'react';
import { Sphere } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { GCP } from '../../../types/mission';
import { useMission } from '../../../context/MissionContext';

interface GCPMarkerProps {
  gcp: GCP;
  onInteraction: (
    objectId: string, 
    objectType: 'gcp', 
    isShiftPressed: boolean, 
    event: ThreeEvent<MouseEvent>
  ) => void;
}

const GCPMarker: React.FC<GCPMarkerProps> = ({ 
  gcp, 
  onInteraction 
}) => {
  const { state } = useMission();
  const { local, color = '#ff0000' } = gcp;
  const { hiddenGcpIds } = state;

  // Check if this GCP is hidden
  if (hiddenGcpIds.includes(gcp.id)) {
    return null; // Don't render if hidden
  }

  // GCPs are typically on the ground, so Z (three.js Y) is often 0 or based on terrain
  // Ensure position is always a tuple [number, number, number]
  const position = local 
    ? [local.x, local.z, -local.y] as [number, number, number] 
    : [0, 0, 0] as [number, number, number];

  const handleDoubleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const isShiftPressed = event.nativeEvent.shiftKey;
    onInteraction(gcp.id, 'gcp', isShiftPressed, event);
  };

  return (
    <Sphere
      args={[0.33, 16, 16]} 
      position={position}
      onDoubleClick={handleDoubleClick}
    >
      <meshStandardMaterial
        color={color}
        roughness={0.2}
        metalness={0.8}
        emissive={color}
        emissiveIntensity={0.5}
      />
    </Sphere>
  );
};

export default GCPMarker; 