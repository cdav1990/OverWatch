import React, { useMemo } from 'react';
import * as THREE from 'three';
import { SelectedFaceInfo } from '../../../context/MissionContext';
import { feetToMeters } from '../../../utils/sensorCalculations';

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

  // Convert vertices to shape (using the same logic as SelectedFaceIndicator)
  const shape = useMemo(() => {
    const shape = new THREE.Shape();
    if (faceInfo.vertices.length > 0) {
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        faceInfo.normal,
        faceInfo.vertices[0]
      );
      const basis1 = new THREE.Vector3(1, 0, 0);
      if (Math.abs(basis1.dot(faceInfo.normal)) > 0.999) {
        basis1.set(0, 1, 0);
      }
      basis1.cross(faceInfo.normal).normalize();
      const basis2 = new THREE.Vector3().crossVectors(faceInfo.normal, basis1).normalize();
      const points2D: [number, number][] = faceInfo.vertices.map(v => {
        const projected = v.clone();
        return [projected.dot(basis1), projected.dot(basis2)];
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
    faceInfo.vertices.forEach(v => center.add(v));
    center.divideScalar(faceInfo.vertices.length);
    // Move 5 feet in the direction of the normal
    center.addScaledVector(faceInfo.normal, offsetDistance);
    return center;
  }, [faceInfo, offsetDistance]);

  // Calculate rotation to match the face orientation (using the same logic)
  const rotation = useMemo(() => {
    const quaternion = new THREE.Quaternion();
    // Use the same basis for calculating rotation as the SelectedFaceIndicator
    // For simplicity, we rotate from Z-up (0,0,1) to the face normal
    const defaultUp = new THREE.Vector3(0, 0, 1); // Default orientation for the shape geometry
    quaternion.setFromUnitVectors(defaultUp, faceInfo.normal);

    // Convert to Euler angles
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    return [euler.x, euler.y, euler.z];
  }, [faceInfo.normal]);

  // Use a simple red material
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ff0000', // Red color
    transparent: true,
    opacity: 0.6, // Slightly transparent
    side: THREE.DoubleSide,
    depthWrite: false // Avoid interfering with depth buffer
  }), []);

  return (
    <group position={centerPoint.toArray()} rotation={rotation as any}>
      <mesh geometry={new THREE.ShapeGeometry(shape)} material={material} />
    </group>
  );
};

export default HighlightFaceIndicator; 