import React, { useMemo } from 'react';
import * as THREE from 'three';
import { SelectedFaceInfo } from '../../../context/MissionContext';
import { feetToMeters } from '../../../utils/sensorCalculations';
import { MeshBVH, computeBoundsTree } from 'three-mesh-bvh';

interface HighlightFaceIndicatorProps {
  faceInfo: SelectedFaceInfo;
}

const HighlightFaceIndicator: React.FC<HighlightFaceIndicatorProps> = ({ faceInfo }) => {
  // Validate the face data - exit early if invalid
  if (!faceInfo || !faceInfo.normal || faceInfo.vertices.length === 0 ||
      isNaN(faceInfo.normal.x) || isNaN(faceInfo.normal.y) || isNaN(faceInfo.normal.z)) {
    console.warn('Invalid face data for HighlightFaceIndicator:', faceInfo);
    return null;
  }

  // --- Reconstruct THREE objects --- 
  const normalVec = useMemo(() => new THREE.Vector3(faceInfo.normal.x, faceInfo.normal.y, faceInfo.normal.z), [faceInfo.normal]);
  const verticesVec = useMemo(() => 
      faceInfo.vertices.map(v => new THREE.Vector3(v.x, v.y, v.z))
  , [faceInfo.vertices]);
  // --- End reconstruction --- 

  // Create a shape from the vertices
  const shape = useMemo(() => {
    const shape = new THREE.Shape();
    if (faceInfo.vertices.length > 0) {
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        normalVec,
        verticesVec[0]
      );
      const basis1 = new THREE.Vector3(1, 0, 0);
      if (Math.abs(basis1.dot(normalVec)) > 0.999) {
        basis1.set(0, 1, 0);
      }
      basis1.cross(normalVec).normalize();
      const basis2 = new THREE.Vector3().crossVectors(normalVec, basis1).normalize();
      const points2D: [number, number][] = verticesVec.map(v => {
        return [v.dot(basis1), v.dot(basis2)];
      });
      shape.moveTo(points2D[0][0], points2D[0][1]);
      for (let i = 1; i < points2D.length; i++) {
        shape.lineTo(points2D[i][0], points2D[i][1]);
      }
      shape.lineTo(points2D[0][0], points2D[0][1]);
    }
    return shape;
  }, [faceInfo]);

  // Calculate the offset position (5 feet from the face)
  const offsetDistance = feetToMeters(5); // Convert 5 feet to meters
  const centerPoint = useMemo(() => {
    const center = new THREE.Vector3();
    verticesVec.forEach(v => center.add(v));
    center.divideScalar(verticesVec.length);
    // Move 5 feet in the direction of the normal
    center.addScaledVector(normalVec, offsetDistance);
    return center;
  }, [verticesVec, normalVec, offsetDistance]);

  // Calculate rotation to match the face orientation (using the same logic)
  const rotation = useMemo(() => {
    const quaternion = new THREE.Quaternion();
    // Use the same basis for calculating rotation as the SelectedFaceIndicator
    // For simplicity, we rotate from Z-up (0,0,1) to the face normal
    const defaultUp = new THREE.Vector3(0, 0, 1); // Default orientation for the shape geometry
    quaternion.setFromUnitVectors(defaultUp, normalVec);

    // Convert to Euler angles
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    return [euler.x, euler.y, euler.z];
  }, [normalVec]);

  // Use a simple red material
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ff0000', // Red color
    transparent: true,
    opacity: 0.6, // Slightly transparent
    side: THREE.DoubleSide,
    depthWrite: false // Avoid interfering with depth buffer
  }), []);

  // Position the highlight with a small offset in normal direction
  const offset = 0.01; // Small offset to prevent z-fighting
  const offsetPosition = centerPoint.clone().addScaledVector(faceInfo.normal, offset);

  return (
    <group position={offsetPosition.toArray()} rotation={rotation as any}>
      <mesh geometry={new THREE.ShapeGeometry(shape)} material={material} />
    </group>
  );
};

export default HighlightFaceIndicator; 