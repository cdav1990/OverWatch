import { useMemo } from 'react';
import * as THREE from 'three';
import { BufferGeometry, BufferAttribute } from 'three';

/**
 * Interface for objects to be batched together
 */
export interface BatchableObject {
  id: string;
  geometry: THREE.BufferGeometry;
  matrix: THREE.Matrix4;
  material?: THREE.Material;
}

/**
 * Merges multiple BufferGeometries into a single BufferGeometry
 * This reduces draw calls and improves performance significantly when rendering
 * many static objects
 * 
 * @param geometries Array of geometries to merge
 * @param matrices Transformation matrices for each geometry
 * @returns A new BufferGeometry containing all geometries merged
 */
export const batchGeometries = (
  geometries: THREE.BufferGeometry[],
  matrices: THREE.Matrix4[]
): THREE.BufferGeometry => {
  // Verify input
  if (geometries.length !== matrices.length) {
    console.error('Geometry and matrix array lengths must match');
    return new BufferGeometry();
  }
  
  if (geometries.length === 0) {
    return new BufferGeometry();
  }
  
  // Collect all vertex attributes from all geometries
  let totalVertices = 0;
  let totalIndices = 0;
  
  // Count total vertices and indices
  geometries.forEach(geo => {
    const positionAttr = geo.getAttribute('position');
    if (positionAttr) {
      totalVertices += positionAttr.count;
    }
    
    const index = geo.getIndex();
    if (index) {
      totalIndices += index.count;
    }
  });
  
  // Create new combined buffer attributes
  const positionArray = new Float32Array(totalVertices * 3);
  const normalArray = new Float32Array(totalVertices * 3);
  const uvArray = new Float32Array(totalVertices * 2);
  const indexArray = totalIndices > 0 ? new Uint32Array(totalIndices) : null;
  
  // Merge geometries with proper transformations
  let vertexOffset = 0;
  let indexOffset = 0;
  
  geometries.forEach((geo, geoIndex) => {
    const matrix = matrices[geoIndex];
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    const normalAttr = geo.getAttribute('normal') as THREE.BufferAttribute;
    const uvAttr = geo.getAttribute('uv') as THREE.BufferAttribute;
    const index = geo.getIndex();
    
    if (!posAttr) return;
    
    // Temporary vectors for transformations
    const tempPos = new THREE.Vector3();
    const tempNormal = new THREE.Vector3();
    
    // Process vertices
    for (let i = 0; i < posAttr.count; i++) {
      // Process position
      tempPos.fromBufferAttribute(posAttr, i);
      tempPos.applyMatrix4(matrix);
      positionArray[(vertexOffset + i) * 3] = tempPos.x;
      positionArray[(vertexOffset + i) * 3 + 1] = tempPos.y;
      positionArray[(vertexOffset + i) * 3 + 2] = tempPos.z;
      
      // Process normal if available
      if (normalAttr) {
        tempNormal.fromBufferAttribute(normalAttr, i);
        // Use the normal matrix (inverse transpose of matrix) for correct normal transformation
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
        tempNormal.applyMatrix3(normalMatrix).normalize();
        normalArray[(vertexOffset + i) * 3] = tempNormal.x;
        normalArray[(vertexOffset + i) * 3 + 1] = tempNormal.y;
        normalArray[(vertexOffset + i) * 3 + 2] = tempNormal.z;
      }
      
      // Process UV if available
      if (uvAttr) {
        uvArray[(vertexOffset + i) * 2] = uvAttr.getX(i);
        uvArray[(vertexOffset + i) * 2 + 1] = uvAttr.getY(i);
      }
    }
    
    // Process indices if available
    if (index && indexArray) {
      for (let i = 0; i < index.count; i++) {
        indexArray[indexOffset + i] = index.getX(i) + vertexOffset;
      }
      indexOffset += index.count;
    }
    
    vertexOffset += posAttr.count;
  });
  
  // Create new merged geometry
  const mergedGeometry = new BufferGeometry();
  mergedGeometry.setAttribute('position', new BufferAttribute(positionArray, 3));
  mergedGeometry.setAttribute('normal', new BufferAttribute(normalArray, 3));
  
  // Only add UVs if any geometry had UVs
  if (geometries.some(geo => geo.getAttribute('uv'))) {
    mergedGeometry.setAttribute('uv', new BufferAttribute(uvArray, 2));
  }
  
  // Add indices if we created them
  if (indexArray) {
    mergedGeometry.setIndex(new BufferAttribute(indexArray, 1));
  }
  
  // Compute bounds
  mergedGeometry.computeBoundingSphere();
  mergedGeometry.computeBoundingBox();
  
  return mergedGeometry;
};

/**
 * Hook to batch geometries for better performance
 * 
 * @param objects Array of objects to batch together
 * @returns A merged geometry and the corresponding material groups
 */
export function useBatchedGeometry(objects: BatchableObject[]) {
  return useMemo(() => {
    // Sort objects by material for material groups
    const materialMap = new Map<THREE.Material, BatchableObject[]>();
    
    // Group objects by material
    objects.forEach(obj => {
      const material = obj.material || new THREE.MeshBasicMaterial();
      const group = materialMap.get(material) || [];
      group.push(obj);
      materialMap.set(material, group);
    });
    
    // Arrays to store geometry and matrix data for batching
    const allGeometries: THREE.BufferGeometry[] = [];
    const allMatrices: THREE.Matrix4[] = [];
    
    // Track material groups
    const materialGroups: { start: number; count: number; materialIndex: number }[] = [];
    const materials: THREE.Material[] = [];
    
    let startIndex = 0;
    
    // Process each material group
    materialMap.forEach((objsWithMaterial, material) => {
      const matIndex = materials.length;
      materials.push(material);
      
      // Count vertices for this material
      let vertexCount = 0;
      objsWithMaterial.forEach(obj => {
        const posAttr = obj.geometry.getAttribute('position');
        if (posAttr) vertexCount += posAttr.count;
      });
      
      // Create material group
      materialGroups.push({
        start: startIndex,
        count: vertexCount,
        materialIndex: matIndex
      });
      
      startIndex += vertexCount;
      
      // Add geometries and matrices to the arrays
      objsWithMaterial.forEach(obj => {
        allGeometries.push(obj.geometry);
        allMatrices.push(obj.matrix);
      });
    });
    
    // Batch geometries
    const batchedGeometry = batchGeometries(allGeometries, allMatrices);
    
    // Add material groups to the geometry
    materialGroups.forEach(group => {
      batchedGeometry.addGroup(group.start, group.count, group.materialIndex);
    });
    
    return {
      geometry: batchedGeometry,
      materials
    };
  }, [objects]);
}; 