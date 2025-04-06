import React from 'react';
import { Line } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { PathSegment, PathType } from '../../../types/mission';

interface PathLineProps {
  segment: PathSegment;
  selected: boolean;
  onClick: () => void;
}

const PathLine: React.FC<PathLineProps> = ({ 
  segment, 
  selected, 
  onClick 
}) => {
  const { waypoints, type } = segment;

  if (waypoints.length < 2 || !waypoints[0].local) {
    return null; // Need at least 2 waypoints with local coords
  }

  // Map waypoints to 3D positions (convert from ENU to Three.js coordinate system)
  const points = waypoints
    .filter(wp => wp.local)
    .map(wp => wp.local!)
    .map(local => new THREE.Vector3(local.x, local.z, -local.y));
    // Convert LocalCoord (assumed ENU: East, North, Up) to Three.js coordinates (x=East, y=Up, z=South)

  // For curved paths, generate a smooth curve with more points
  let curvePoints = points;

  if (type === PathType.BEZIER && points.length >= 2) {
    const curve = new THREE.CatmullRomCurve3(points, false);
    curvePoints = curve.getPoints(Math.max(points.length * 10, 50));
  }

  const lineColor = selected ? '#ffeb3b' : '#ffffff'; // Yellow when selected, white otherwise
  const lineOpacity = selected ? 1.0 : 0.75;

  return (
    <Line
      points={curvePoints}
      color={lineColor}
      lineWidth={selected ? 2.5 : 1.5} // Thicker when selected
      dashed={false}
      onClick={(e: ThreeEvent<MouseEvent>) => { 
        e.stopPropagation(); 
        onClick(); 
      }}
      transparent={true}
      opacity={lineOpacity}
    />
  );
};

export default PathLine; 