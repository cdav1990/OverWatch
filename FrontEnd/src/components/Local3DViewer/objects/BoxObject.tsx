import React, { useRef } from 'react';
import { Box, Edges } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneObject, SelectedFaceInfo } from '../../../context/MissionContext';

interface BoxObjectProps {
  sceneObject: SceneObject;
  onDoubleClick: (event: ThreeEvent<MouseEvent>) => void;
  onFaceClick?: (faceInfo: SelectedFaceInfo | null) => void;
  onPointerOver?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (event: ThreeEvent<PointerEvent>) => void;
}

const BoxObject: React.FC<BoxObjectProps> = ({
  sceneObject,
  onDoubleClick,
  onFaceClick,
  onPointerOver,
  onPointerOut
}) => {
  // Reference to the mesh for face selection
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Map position to Three.js coordinates
  const basePosition = sceneObject.position;
  const position = basePosition ? 
    [basePosition.x, basePosition.z, -basePosition.y] as [number, number, number] : 
    [0, 0, 0] as [number, number, number];
  
  // Handle face selection on click
  const handleFaceClick = (event: ThreeEvent<MouseEvent>) => {
    // Exit early if no callback
    if (!onFaceClick) return;
    
    // Check if meshRef.current is null early
    if (!meshRef.current) return;
    
    event.stopPropagation();
    
    try {
      // Get the face index from the intersection
      const faceIndex = event.faceIndex;
      if (faceIndex === undefined || faceIndex === null) return;
      
      const geometry = meshRef.current.geometry;
      const position = geometry.attributes.position;
      
      // Get the face vertices (assuming triangular faces)
      const a = new THREE.Vector3().fromBufferAttribute(position, faceIndex * 3);
      const b = new THREE.Vector3().fromBufferAttribute(position, faceIndex * 3 + 1);
      const c = new THREE.Vector3().fromBufferAttribute(position, faceIndex * 3 + 2);
      
      // Apply mesh transformations to the vertices
      const matrix = meshRef.current.matrixWorld;
      a.applyMatrix4(matrix);
      b.applyMatrix4(matrix);
      c.applyMatrix4(matrix);
      
      // Calculate face normal and ensure it's valid
      const normal = new THREE.Vector3().crossVectors(
        new THREE.Vector3().subVectors(b, a),
        new THREE.Vector3().subVectors(c, a)
      ).normalize();
      
      // Validate normal vector
      if (isNaN(normal.x) || isNaN(normal.y) || isNaN(normal.z) || 
          (normal.x === 0 && normal.y === 0 && normal.z === 0)) {
        console.warn('Invalid normal vector calculated');
        return;
      }
      
      // For box geometry, we need to identify all vertices of the face
      // We'll group nearby face indices to find the quadrilateral face
      // Store mesh reference to avoid null check warnings
      const mesh = meshRef.current;
      const box = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      
      // For simplicity, we'll use the dimensions of the box directly
      // In a real implementation, you'd need to handle different face orientations properly
      let area = 0;
      let faceVertices: THREE.Vector3[] = [];
      
      // Determine which face we're looking at based on the normal direction
      if (Math.abs(normal.x) > 0.9) { // Left/Right face
        area = size.y * size.z;
        const sign = Math.sign(normal.x);
        const x = sign > 0 ? box.max.x : box.min.x;
        faceVertices = [
          new THREE.Vector3(x, box.min.y, box.min.z),
          new THREE.Vector3(x, box.max.y, box.min.z),
          new THREE.Vector3(x, box.max.y, box.max.z),
          new THREE.Vector3(x, box.min.y, box.max.z)
        ];
      } else if (Math.abs(normal.y) > 0.9) { // Top/Bottom face
        area = size.x * size.z;
        const sign = Math.sign(normal.y);
        const y = sign > 0 ? box.max.y : box.min.y;
        faceVertices = [
          new THREE.Vector3(box.min.x, y, box.min.z),
          new THREE.Vector3(box.max.x, y, box.min.z),
          new THREE.Vector3(box.max.x, y, box.max.z),
          new THREE.Vector3(box.min.x, y, box.max.z)
        ];
      } else if (Math.abs(normal.z) > 0.9) { // Front/Back face
        area = size.x * size.y;
        const sign = Math.sign(normal.z);
        const z = sign > 0 ? box.max.z : box.min.z;
        faceVertices = [
          new THREE.Vector3(box.min.x, box.min.y, z),
          new THREE.Vector3(box.max.x, box.min.y, z),
          new THREE.Vector3(box.max.x, box.max.y, z),
          new THREE.Vector3(box.min.x, box.max.y, z)
        ];
      } else {
        // If we can't determine the face orientation, use the triangle
        console.warn('Could not determine face orientation, using triangle face');
        faceVertices = [a, b, c];
        
        // Calculate triangle area using Heron's formula
        const ab = a.distanceTo(b);
        const bc = b.distanceTo(c);
        const ca = c.distanceTo(a);
        const s = (ab + bc + ca) / 2;
        area = Math.sqrt(s * (s - ab) * (s - bc) * (s - ca));
      }
      
      // Validate vertices and area
      if (faceVertices.length === 0 || area <= 0) {
        console.warn('Invalid face vertices or area');
        return;
      }
      
      // Generate UUID for this face
      // In actual implementation, you would likely use a proper UUID generator
      const faceId = 'face-' + Math.random().toString(36).substring(2, 15);
      
      // Call the callback with the selected face info
      onFaceClick({
        objectId: sceneObject.id,
        faceId,
        faceIndex,
        normal,
        vertices: faceVertices,
        area
      });
    } catch (error) {
      console.error('Error in face selection:', error);
    }
  };
  
  return (
    <Box
      ref={meshRef}
      args={[
        sceneObject.width || 10,
        sceneObject.height || 10,
        sceneObject.length || 10
      ]}
      position={position}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick(e);
      }}
      onClick={handleFaceClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <meshStandardMaterial
        color={sceneObject.color || '#ff0000'}
        opacity={0.8}
        transparent
      />
      <Edges color="#ffffff" />
    </Box>
  );
}

export default BoxObject; 