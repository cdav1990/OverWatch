import React, { useState, useEffect, useMemo } from 'react';
import { useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
// Import BufferGeometryUtils separately
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useMission } from '../../context/MissionContext';
import { SelectedFaceInfo } from '../../context/MissionContext';
import { generateUUID } from '../../utils/coordinateUtils';
// Import BVH accelerator for more precise face selection
import { MeshBVH, MeshBVHHelper, acceleratedRaycast } from 'three-mesh-bvh';

// Add the accelerated raycast method to THREE.Mesh
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// Add tolerance constants at the top of the file
const NORMAL_LENGTH_TOLERANCE = 0.0005; // Min valid normal length
const CARDINAL_DIRECTION_TOLERANCE = 0.75; // Less strict threshold for axis alignment (was 0.85)
const COPLANAR_POINT_TOLERANCE = 0.02; // Slightly more generous tolerance (was 0.01)
const FACE_NORMAL_AVERAGE_RADIUS = 0.1; // Radius to average nearby face normals
const SIDE_TOLERANCE = 0.005; // Tolerance for side detection

// Add FaceHighlighter component for ray tracing and face highlighting
const FaceHighlighter: React.FC = () => {
  const { state, dispatch } = useMission();
  const { camera, raycaster, mouse, scene } = useThree();
  const [hoveredFace, setHoveredFace] = useState<SelectedFaceInfo | null>(null);
  const { isFaceSelectionModeActive } = state;
  
  // BVH enabled meshes cache
  const bvhMeshes = useMemo(() => new Map<string, THREE.Mesh>(), []);

  // Skip if face selection mode isn't active
  if (!isFaceSelectionModeActive) return null;

  // Handle pointer move for live face highlighting
  useFrame(() => {
    if (!isFaceSelectionModeActive) {
      setHoveredFace(null);
      return;
    }

    // Set up the raycaster
    raycaster.setFromCamera(mouse, camera);

    // Get all mesh objects in the scene that should be raycasted
    const meshes: THREE.Mesh[] = [];
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && 
          object.userData.isSceneObject && 
          object.visible) {
        
        // Add BVH acceleration structure if not already present
        if (!bvhMeshes.has(object.uuid)) {
          try {
            // Clone the geometry to ensure we don't modify the original
            const preparedGeometry = object.geometry.clone();
            
            // If the geometry isn't indexed, index it for BVH
            if (!preparedGeometry.index) {
              preparedGeometry.computeBoundsTree = function() {
                console.log("Preparing non-indexed geometry for BVH");
                mergeVertices(this);
                new MeshBVH(this);
                return this;
              };
            } else {
              // Add bounds tree to indexed geometry
              preparedGeometry.computeBoundsTree = function() {
                console.log("Setting up BVH for indexed geometry");
                new MeshBVH(this);
                return this;
              };
            }
            
            // Create a copy of the mesh with prepared geometry
            const preparedMesh = new THREE.Mesh(
              preparedGeometry.computeBoundsTree(),
              object.material
            );
            
            // Copy transform and other properties
            preparedMesh.position.copy(object.position);
            preparedMesh.rotation.copy(object.rotation);
            preparedMesh.scale.copy(object.scale);
            preparedMesh.updateMatrixWorld();
            preparedMesh.userData = {...object.userData};
            
            // Store in cache
            bvhMeshes.set(object.uuid, preparedMesh);
          } catch (err) {
            console.warn("Failed to create BVH for mesh", object.uuid, err);
            bvhMeshes.set(object.uuid, object); // Fall back to original mesh
          }
        }
        
        meshes.push(bvhMeshes.get(object.uuid) || object);
      }
    });

    // Perform the raycast
    const intersects = raycaster.intersectObjects(meshes, false);

    // If we have an intersection, create face info
    if (intersects.length > 0) {
      const intersection = intersects[0];
      const mesh = intersection.object as THREE.Mesh;
      
      // Only process if we have a valid face index
      if (intersection.faceIndex !== undefined) {
        try {
          const faceIndex = intersection.faceIndex;
          const geometry = mesh.geometry;
          const position = geometry.attributes.position;
          
          // Get the face vertices (assuming triangular faces)
          const a = new THREE.Vector3().fromBufferAttribute(position, faceIndex * 3);
          const b = new THREE.Vector3().fromBufferAttribute(position, faceIndex * 3 + 1);
          const c = new THREE.Vector3().fromBufferAttribute(position, faceIndex * 3 + 2);
          
          // Apply mesh transformations to the vertices
          const matrix = mesh.matrixWorld;
          a.applyMatrix4(matrix);
          b.applyMatrix4(matrix);
          c.applyMatrix4(matrix);
          
          // Calculate face normal and ensure it's valid
          let normal = new THREE.Vector3().crossVectors(
            new THREE.Vector3().subVectors(b, a),
            new THREE.Vector3().subVectors(c, a)
          );
          
          // Use a more robust normal calculation by averaging nearby face normals
          // This helps smooth out normal artifacts on triangulated surfaces
          const point = intersection.point;
          const normalHelper = new THREE.Vector3();
          const nearbyFaces = [];
          
          // Find nearby faces to get more consistent normal
          for (let i = 0; i < geometry.attributes.position.count; i += 3) {
            const v1 = new THREE.Vector3().fromBufferAttribute(position, i);
            const v2 = new THREE.Vector3().fromBufferAttribute(position, i + 1);
            const v3 = new THREE.Vector3().fromBufferAttribute(position, i + 2);
            
            // Apply world transform
            v1.applyMatrix4(matrix);
            v2.applyMatrix4(matrix);
            v3.applyMatrix4(matrix);
            
            // Get center of triangle
            const center = new THREE.Vector3().add(v1).add(v2).add(v3).divideScalar(3);
            
            // If this face is close to our intersection point
            if (center.distanceTo(point) < FACE_NORMAL_AVERAGE_RADIUS) {
              const faceNormal = new THREE.Vector3().crossVectors(
                new THREE.Vector3().subVectors(v2, v1),
                new THREE.Vector3().subVectors(v3, v1)
              ).normalize();
              
              // Ensure this normal contributes meaningfully
              if (!isNaN(faceNormal.x) && !isNaN(faceNormal.y) && !isNaN(faceNormal.z) &&
                  faceNormal.length() > NORMAL_LENGTH_TOLERANCE) {
                nearbyFaces.push({
                  normal: faceNormal,
                  // Weight by inverse distance
                  weight: 1 / (1 + center.distanceTo(point))
                });
              }
            }
          }
          
          // If we found nearby faces, average their normals
          if (nearbyFaces.length > 0) {
            normalHelper.set(0, 0, 0);
            let totalWeight = 0;
            
            nearbyFaces.forEach(face => {
              normalHelper.addScaledVector(face.normal, face.weight);
              totalWeight += face.weight;
            });
            
            if (totalWeight > 0) {
              normalHelper.divideScalar(totalWeight);
              // Only use averaged normal if it's valid
              if (normalHelper.length() > NORMAL_LENGTH_TOLERANCE) {
                normal = normalHelper.normalize();
              }
            }
          }
          
          // Validate normal vector
          if (isNaN(normal.x) || isNaN(normal.y) || isNaN(normal.z) || 
              normal.length() < NORMAL_LENGTH_TOLERANCE) {
            console.warn("Invalid normal calculated for face:", { 
              normal: normal.toArray(), 
              faceIndex: faceIndex 
            });
            setHoveredFace(null);
            return;
          }
          
          // Normalize the normal
          normal.normalize();
          
          // Find the full face (not just the triangle)
          const box = new THREE.Box3().setFromObject(mesh);
          const size = new THREE.Vector3();
          box.getSize(size);
          
          let area = 0;
          let faceVertices: THREE.Vector3[] = [];
          
          // Determine which face we're looking at based on the normal direction
          if (Math.abs(normal.x) > CARDINAL_DIRECTION_TOLERANCE) { // Left/Right face
            area = size.y * size.z;
            const sign = Math.sign(normal.x);
            const x = sign > 0 ? box.max.x : box.min.x;
            faceVertices = [
              new THREE.Vector3(x, box.min.y, box.min.z),
              new THREE.Vector3(x, box.max.y, box.min.z),
              new THREE.Vector3(x, box.max.y, box.max.z),
              new THREE.Vector3(x, box.min.y, box.max.z)
            ];
          } else if (Math.abs(normal.y) > CARDINAL_DIRECTION_TOLERANCE) { // Top/Bottom face
            area = size.x * size.z;
            const sign = Math.sign(normal.y);
            const y = sign > 0 ? box.max.y : box.min.y;
            faceVertices = [
              new THREE.Vector3(box.min.x, y, box.min.z),
              new THREE.Vector3(box.max.x, y, box.min.z),
              new THREE.Vector3(box.max.x, y, box.max.z),
              new THREE.Vector3(box.min.x, y, box.max.z)
            ];
          } else if (Math.abs(normal.z) > CARDINAL_DIRECTION_TOLERANCE) { // Front/Back face
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
            // For non-cardinal faces, try to find the coplanar vertices
            console.log("Non-cardinal face detected, using triangle face", normal.toArray());
            
            // Fall back to the original triangle - more reliable for non-cardinal faces
            faceVertices = [a, b, c];
            
            // Calculate triangle area using Heron's formula
            const ab = a.distanceTo(b);
            const bc = b.distanceTo(c);
            const ca = c.distanceTo(a);
            const s = (ab + bc + ca) / 2;
            area = Math.sqrt(s * (s - ab) * (s - bc) * (s - ca));
            
            // Find the objectId from userData
            const objectId = mesh.userData.objectId || '';
            
            // Generate a temporary faceInfo for hovering
            const faceInfo: SelectedFaceInfo = {
              objectId,
              faceId: generateUUID(),
              faceIndex: faceIndex as number,
              normal,
              vertices: faceVertices,
              area
            };
            
            setHoveredFace(faceInfo);
            return; // Exit after setting hovered face for non-cardinal faces
          }
          
          // Find the objectId from userData
          const objectId = mesh.userData.objectId || '';
          
          // Generate a temporary faceInfo for hovering
          const faceInfo: SelectedFaceInfo = {
            objectId,
            faceId: generateUUID(),
            faceIndex: faceIndex as number,
            normal,
            vertices: faceVertices,
            area
          };
          
          setHoveredFace(faceInfo);
        } catch (error) {
          console.error("Error processing face highlight:", error);
          setHoveredFace(null);
        }
      } else {
        setHoveredFace(null);
      }
    } else {
      setHoveredFace(null);
    }
  });

  // Helper function to calculate polygon area
  const calculatePolygonArea = (vertices: THREE.Vector3[], normal: THREE.Vector3): number => {
    if (vertices.length < 3) return 0;
    
    // We need to project the 3D vertices onto a 2D plane defined by the normal
    const basis1 = new THREE.Vector3(1, 0, 0);
    if (Math.abs(basis1.dot(normal)) > 0.999) {
      basis1.set(0, 1, 0);
    }
    basis1.cross(normal).normalize();
    
    const basis2 = new THREE.Vector3().crossVectors(normal, basis1).normalize();
    
    // Project each vertex onto the plane
    const points2D: Array<[number, number]> = vertices.map(v => {
      return [v.dot(basis1), v.dot(basis2)];
    });
    
    // Calculate area using the shoelace formula
    let area = 0;
    for (let i = 0; i < points2D.length; i++) {
      const j = (i + 1) % points2D.length;
      area += points2D[i][0] * points2D[j][1];
      area -= points2D[j][0] * points2D[i][1];
    }
    
    return Math.abs(area) / 2;
  };

  // Handle click to select a face
  useEffect(() => {
    const handlePointerClick = () => {
      if (hoveredFace && isFaceSelectionModeActive) {
        dispatch({ type: 'SET_SELECTED_FACE', payload: hoveredFace });
      }
    };

    window.addEventListener('click', handlePointerClick);
    return () => {
      window.removeEventListener('click', handlePointerClick);
    };
  }, [hoveredFace, isFaceSelectionModeActive, dispatch]);

  return (
    <>
      {/* Render the hover highlight */}
      {hoveredFace && <LiveFaceHighlight faceInfo={hoveredFace} />}
    </>
  );
};

// Live face highlight component - shows what will be selected if clicked
const LiveFaceHighlight: React.FC<{ faceInfo: SelectedFaceInfo }> = ({ faceInfo }) => {
  // Validate the face data
  if (!faceInfo || !faceInfo.normal || faceInfo.vertices.length === 0) {
    return null;
  }

  // Create a shape from the vertices
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

  // Calculate the center point
  const centerPoint = useMemo(() => {
    const center = new THREE.Vector3();
    faceInfo.vertices.forEach(v => center.add(v));
    center.divideScalar(faceInfo.vertices.length);
    return center;
  }, [faceInfo]);

  // Calculate rotation to match the face orientation
  const rotation = useMemo(() => {
    const quaternion = new THREE.Quaternion();
    const upVector = new THREE.Vector3(0, 0, 1);
    quaternion.setFromUnitVectors(upVector, faceInfo.normal);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    return [euler.x, euler.y, euler.z];
  }, [faceInfo.normal]);

  // Use a semi-transparent material
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ffcc00', // Yellow highlight for hover state
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false
  }), []);

  return (
    <group position={centerPoint.toArray()} rotation={rotation as any}>
      <mesh geometry={new THREE.ShapeGeometry(shape)} material={material} />
    </group>
  );
};

export { FaceHighlighter, LiveFaceHighlight };
