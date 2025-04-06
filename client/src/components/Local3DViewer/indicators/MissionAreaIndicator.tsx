import React, { useMemo } from 'react';
import * as THREE from 'three';
import { MissionArea } from '../../../context/MissionContext';

interface MissionAreaIndicatorProps {
  missionArea: MissionArea;
}

// Add tolerance constants at the top of the file
const NORMAL_LENGTH_TOLERANCE = 0.0005; // Minimum valid normal length
const PARALLEL_TOLERANCE = 0.95; // Threshold for considering vectors parallel
const VERTEX_VALIDITY_TOLERANCE = 1e-6; // Threshold for checking if vertex coordinates are valid numbers

const MissionAreaIndicator: React.FC<MissionAreaIndicatorProps> = ({ missionArea }) => {
  // Validate the mission area data - exit early if invalid
  if (!missionArea || !missionArea.normal || missionArea.vertices.length === 0 ||
      isNaN(missionArea.normal.x) || isNaN(missionArea.normal.y) || isNaN(missionArea.normal.z)) {
    console.warn('Invalid data for MissionAreaIndicator:', missionArea);
    return null;
  }

  // Create shapes for both the original face and the offset face
  const shapes = useMemo(() => {
    try {
      // Function to convert 3D vertices to a 2D shape
      const createShapeFrom3DVertices = (vertices: THREE.Vector3[]) => {
        const shape = new THREE.Shape();
        if (vertices.length > 0) {
          // Create a plane from normal and first vertex
          const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
            missionArea.normal,
            vertices[0]
          );
          
          // Find better basis vectors for the projection
          // Start with a vector that's unlikely to be parallel to the normal
          const basis1 = new THREE.Vector3(1, 0, 0);
          
          // If normal is nearly parallel to basis1, use a different basis
          if (Math.abs(basis1.dot(missionArea.normal)) > PARALLEL_TOLERANCE) {
            basis1.set(0, 1, 0);
            // If still too parallel, try Z axis
            if (Math.abs(basis1.dot(missionArea.normal)) > PARALLEL_TOLERANCE) {
              basis1.set(0, 0, 1);
            }
          }
          
          // Create orthogonal basis vectors
          basis1.cross(missionArea.normal).normalize();
          const basis2 = new THREE.Vector3().crossVectors(missionArea.normal, basis1).normalize();
          
          // Project vertices to 2D plane and find convex hull
          let points2D: [number, number][] = vertices.map(v => {
            return [v.dot(basis1), v.dot(basis2)];
          });
          
          // Sort points by angle for better shape creation (basic convex hull)
          const center2D: [number, number] = [
            points2D.reduce((sum, p) => sum + p[0], 0) / points2D.length,
            points2D.reduce((sum, p) => sum + p[1], 0) / points2D.length
          ];
          
          // Sort vertices by angle around center for proper winding
          points2D.sort((a, b) => {
            const angleA = Math.atan2(a[1] - center2D[1], a[0] - center2D[0]);
            const angleB = Math.atan2(b[1] - center2D[1], b[0] - center2D[0]);
            return angleA - angleB;
          });
          
          // Create the shape from sorted points
          shape.moveTo(points2D[0][0], points2D[0][1]);
          for (let i = 1; i < points2D.length; i++) {
            shape.lineTo(points2D[i][0], points2D[i][1]);
          }
          shape.lineTo(points2D[0][0], points2D[0][1]);
        }
        return shape;
      };

      return {
        originalShape: createShapeFrom3DVertices(missionArea.vertices),
        offsetShape: createShapeFrom3DVertices(missionArea.offsetVertices)
      };
    } catch (error) {
      console.error("Error creating shapes for mission area:", error);
      // Return empty shapes as fallback
      return {
        originalShape: new THREE.Shape(),
        offsetShape: new THREE.Shape()
      };
    }
  }, [missionArea]);

  // Calculate center points for both shapes
  const centerPoints = useMemo(() => {
    const calculateCenter = (vertices: THREE.Vector3[]) => {
      // More robust center calculation
      if (!vertices || vertices.length === 0) {
        console.warn('No vertices provided to calculate center');
        return new THREE.Vector3(0, 0, 0);
      }
      
      // Use bounding box to calculate center instead of average
      // This is more robust for non-uniform vertex distributions
      const bbox = new THREE.Box3();
      bbox.setFromPoints(vertices);
      const center = new THREE.Vector3();
      bbox.getCenter(center);
      return center;
    };

    return {
      originalCenter: calculateCenter(missionArea.vertices),
      offsetCenter: calculateCenter(missionArea.offsetVertices)
    };
  }, [missionArea]);

  // Calculate rotation to match the face orientation
  const rotation = useMemo(() => {
    // Ensure normal is valid and normalized
    if (!missionArea.normal || 
        isNaN(missionArea.normal.x) || 
        isNaN(missionArea.normal.y) || 
        isNaN(missionArea.normal.z) ||
        missionArea.normal.lengthSq() < NORMAL_LENGTH_TOLERANCE) {
      console.warn('Invalid normal for rotation calculation:', missionArea.normal);
      return [0, 0, 0];
    }
    
    // Ensure normal is normalized
    const normalizedNormal = missionArea.normal.clone().normalize();
    
    // Create a more stable rotation calculation using lookAt
    // This avoids issues with quaternion calculations on certain normal vectors
    const rotationMatrix = new THREE.Matrix4();
    const upVector = new THREE.Vector3(0, 1, 0);
    
    // Handle case where normal is parallel to up vector with more tolerance
    if (Math.abs(normalizedNormal.dot(upVector)) > PARALLEL_TOLERANCE) {
      upVector.set(1, 0, 0); // Use different up vector
    }
    
    // Create target point along normal direction
    const target = new THREE.Vector3().addVectors(
      new THREE.Vector3(), 
      normalizedNormal
    );
    
    // Use lookAt to create rotation matrix
    rotationMatrix.lookAt(
      new THREE.Vector3(), // origin
      target,
      upVector
    );
    
    // Convert to euler angles
    const euler = new THREE.Euler().setFromRotationMatrix(rotationMatrix);
    return [euler.x, euler.y, euler.z];
  }, [missionArea.normal]);

  // Generate grid lines
  const gridLines = useMemo(() => {
    try {
      if (!missionArea || !missionArea.vertices || !missionArea.offsetVertices) {
        console.warn('Missing vertices for grid lines in mission area', missionArea?.id);
        return [];
      }
      
      if (missionArea.vertices.length !== missionArea.offsetVertices.length) {
        console.warn('Vertex count mismatch for mission area', {
          id: missionArea.id,
          verticesCount: missionArea.vertices.length,
          offsetVerticesCount: missionArea.offsetVertices.length
        });
        return [];
      }
      
      const lines = [];
      
      // Connect vertices between original and offset
      for (let i = 0; i < missionArea.vertices.length; i++) {
        const v = missionArea.vertices[i];
        const o = missionArea.offsetVertices[i];
        
        // Validate vertex data
        if (!v || !o || 
            isNaN(v.x) || isNaN(v.y) || isNaN(v.z) ||
            isNaN(o.x) || isNaN(o.y) || isNaN(o.z)) {
          console.warn('Invalid vertex data', { v, o });
          continue;
        }
        
        lines.push([v, o]);
      }
      
      // Only generate grid lines if we have at least 4 vertices in a quad arrangement
      if (missionArea.vertices.length >= 4) {
        const v0 = missionArea.vertices[0];
        const v1 = missionArea.vertices[1];
        const v2 = missionArea.vertices[2];
        const v3 = missionArea.vertices[3];
        
        const o0 = missionArea.offsetVertices[0];
        const o1 = missionArea.offsetVertices[1];
        const o2 = missionArea.offsetVertices[2];
        const o3 = missionArea.offsetVertices[3];
        
        // Check for valid vertex data before generating grid
        if (!v0 || !v1 || !v2 || !v3 || !o0 || !o1 || !o2 || !o3 ||
            isNaN(v0.x) || isNaN(v1.x) || isNaN(v2.x) || isNaN(v3.x) ||
            isNaN(o0.x) || isNaN(o1.x) || isNaN(o2.x) || isNaN(o3.x)) {
          console.warn('Invalid quad vertices');
          return lines; // Return just the perimeter lines
        }
        
        // Add gridlines for better visualization
        const gridDensity = 4;
        for (let i = 1; i < gridDensity; i++) {
          const t = i / gridDensity;
          
          try {
            // Horizontal lines on original face
            const hOrig1 = new THREE.Vector3().lerpVectors(v0, v3, t);
            const hOrig2 = new THREE.Vector3().lerpVectors(v1, v2, t);
            if (isValidVector(hOrig1) && isValidVector(hOrig2)) {
              lines.push([hOrig1, hOrig2]);
            }
            
            // Horizontal lines on offset face
            const hOffset1 = new THREE.Vector3().lerpVectors(o0, o3, t);
            const hOffset2 = new THREE.Vector3().lerpVectors(o1, o2, t);
            if (isValidVector(hOffset1) && isValidVector(hOffset2)) {
              lines.push([hOffset1, hOffset2]);
            }
            
            // Vertical lines on original face
            const vOrig1 = new THREE.Vector3().lerpVectors(v0, v1, t);
            const vOrig2 = new THREE.Vector3().lerpVectors(v3, v2, t);
            if (isValidVector(vOrig1) && isValidVector(vOrig2)) {
              lines.push([vOrig1, vOrig2]);
            }
            
            // Vertical lines on offset face
            const vOffset1 = new THREE.Vector3().lerpVectors(o0, o1, t);
            const vOffset2 = new THREE.Vector3().lerpVectors(o3, o2, t);
            if (isValidVector(vOffset1) && isValidVector(vOffset2)) {
              lines.push([vOffset1, vOffset2]);
            }
          } catch (error) {
            console.warn('Error creating grid line', error);
          }
        }
      }
      
      return lines;
    } catch (error) {
      console.error('Error generating grid lines:', error);
      return [];
    }
  }, [missionArea]);

  // Helper function to validate Vector3 values with tolerance
  const isValidVector = (v: THREE.Vector3): boolean => {
    if (!v) return false;
    
    // Check if values are valid numbers and not too close to zero
    // Using epsilon comparison for floating point values
    return !isNaN(v.x) && !isNaN(v.y) && !isNaN(v.z) && 
           Math.abs(v.x) > VERTEX_VALIDITY_TOLERANCE || 
           Math.abs(v.y) > VERTEX_VALIDITY_TOLERANCE || 
           Math.abs(v.z) > VERTEX_VALIDITY_TOLERANCE;
  };

  // Material for the offset face - increase the z-fighting bias to ensure visibility
  const offsetMaterial = useMemo(() => 
    new THREE.MeshBasicMaterial({
      color: missionArea.color || '#ff0000',
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -4
    }), 
  [missionArea.color]);

  // Original face wireframe material
  const edgeMaterial = useMemo(() => 
    new THREE.LineBasicMaterial({
      color: '#ffffff',
      opacity: 0.7,
      transparent: true,
      linewidth: 2
    }), 
  []);

  return (
    <group>
      {/* Offset face */}
      <group position={centerPoints.offsetCenter.toArray()} rotation={rotation as any}>
        <mesh geometry={new THREE.ShapeGeometry(shapes.offsetShape)} material={offsetMaterial} />
      </group>
      
      {/* Original face wireframe with improved visibility */}
      <group position={centerPoints.originalCenter.toArray()} rotation={rotation as any}>
        <lineSegments>
          <edgesGeometry args={[new THREE.ShapeGeometry(shapes.originalShape)]} />
          <primitive object={edgeMaterial} />
        </lineSegments>
      </group>
      
      {/* Grid lines connecting original and offset */}
      {gridLines.map((points, idx) => {
        // Add safety check for missing points
        if (!points || !points[0] || !points[1]) return null;
        
        // Create geometry directly
        const geometry = useMemo(() => {
          const geo = new THREE.BufferGeometry();
          const vertices = new Float32Array([
            points[0].x, points[0].y, points[0].z,
            points[1].x, points[1].y, points[1].z
          ]);
          geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
          return geo;
        }, [points]);
        
        // Use a simple THREE.LineBasicMaterial directly
        const material = useMemo(() => 
          new THREE.LineBasicMaterial({ 
            color: '#ffffff', 
            opacity: 0.5, 
            transparent: true,
            depthTest: false // Ensure grid lines are always visible
          })
        , []);
        
        return (
          <primitive 
            key={`grid-line-${idx}`}
            object={new THREE.Line(geometry, material)} 
          />
        );
      })}
    </group>
  );
};

export default MissionAreaIndicator;