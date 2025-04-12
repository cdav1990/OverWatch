import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Configuration for a level of detail model
 */
export interface LODConfig {
  distance: number;         // At what distance this LOD level becomes active
  geometry?: THREE.BufferGeometry; // Geometry for this LOD level
  url?: string;             // URL to load model for this LOD level
  complexity?: number;      // Target complexity (vertices/faces) for auto-generated LODs
}

/**
 * Creates a simplified version of a geometry for LOD
 * 
 * @param geometry The original geometry to simplify
 * @param targetComplexity Approximate number of vertices to target
 * @returns A simplified geometry
 */
export const simplifyGeometry = (
  geometry: THREE.BufferGeometry,
  targetComplexity: number
): THREE.BufferGeometry => {
  // Import Three.js simplification modifier if needed
  if (!(window as any).SimplifyModifier) {
    console.error('SimplifyModifier not available. Add it to your project for geometry simplification.');
    return geometry.clone();
  }
  
  const SimplifyModifier = (window as any).SimplifyModifier;
  const modifier = new SimplifyModifier();
  
  // Clone the geometry to avoid modifying the original
  const clonedGeometry = geometry.clone();
  
  // Convert to non-indexed geometry if needed
  if (!clonedGeometry.index) {
    console.warn('Geometry is not indexed, cannot simplify effectively');
    return clonedGeometry;
  }
  
  // Calculate simplification ratio
  const originalCount = clonedGeometry.attributes.position.count;
  const targetRatio = Math.max(0.1, Math.min(1, targetComplexity / originalCount));
  
  // Apply simplification
  try {
    const simplified = modifier.modify(clonedGeometry, Math.floor(clonedGeometry.index.count * targetRatio));
    return simplified;
  } catch (e) {
    console.error('Error simplifying geometry:', e);
    return clonedGeometry;
  }
};

/**
 * Creates a Three.js LOD object with multiple detail levels
 * 
 * @param baseGeometry The highest quality geometry
 * @param levels Array of LOD configurations, sorted from highest to lowest quality
 * @returns A configured THREE.LOD object
 */
export const createLODObject = (
  baseGeometry: THREE.BufferGeometry,
  material: THREE.Material | THREE.Material[],
  levels: LODConfig[]
): THREE.LOD => {
  const lod = new THREE.LOD();
  
  // Add the highest quality level (provided geometry)
  const highQualityMesh = new THREE.Mesh(baseGeometry, material);
  lod.addLevel(highQualityMesh, 0); // Distance 0 means closest level
  
  // Add additional lower quality levels
  const sortedLevels = [...levels].sort((a, b) => a.distance - b.distance);
  
  sortedLevels.forEach(level => {
    let levelGeometry: THREE.BufferGeometry;
    
    if (level.geometry) {
      // Use provided geometry
      levelGeometry = level.geometry;
    } else if (level.complexity) {
      // Generate simplified geometry based on complexity target
      levelGeometry = simplifyGeometry(baseGeometry, level.complexity);
    } else {
      // Fallback to clone
      levelGeometry = baseGeometry.clone();
    }
    
    const levelMesh = new THREE.Mesh(levelGeometry, material);
    lod.addLevel(levelMesh, level.distance);
  });
  
  return lod;
};

/**
 * Hook to create and manage LOD objects in a React component
 * 
 * @param baseGeometry High quality geometry to use as a base
 * @param material Material to apply to all LOD levels
 * @param levels LOD configurations
 * @param autoUpdate Whether to automatically update LODs based on camera position
 * @returns Reference to the LOD object
 */
export const useLOD = (
  baseGeometry: THREE.BufferGeometry,
  material: THREE.Material | THREE.Material[],
  levels: LODConfig[],
  autoUpdate: boolean = true
) => {
  const lodRef = useRef<THREE.LOD | null>(null);
  
  useEffect(() => {
    // Create LOD object
    const lod = createLODObject(baseGeometry, material, levels);
    lodRef.current = lod;
    
    // Clean up on unmount
    return () => {
      if (lodRef.current) {
        // Dispose of all geometries to prevent memory leaks
        lodRef.current.traverse(child => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
          }
        });
      }
    };
  }, [baseGeometry, material, levels]);
  
  return lodRef;
}; 