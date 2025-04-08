import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { InstancedMesh, Object3D, Color, Matrix4 } from 'three';

/**
 * Interface for items to be rendered as instances
 */
export interface InstanceItem {
  id: string;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  color?: string;
  visible?: boolean;
}

/**
 * Hook to efficiently render many similar objects using Three.js InstancedMesh
 * This dramatically improves performance when rendering many markers, waypoints, etc.
 * 
 * @param items Array of items to render as instances
 * @param getGeometry Function that returns the geometry to use for all instances
 * @param getMaterial Function that returns the material to use for all instances
 * @param maxInstances Maximum number of instances to support (for buffer sizing)
 * @returns Reference to the instanced mesh and utility functions
 */
export const useInstancedMesh = <T extends InstanceItem>(
  items: T[],
  getGeometry: () => THREE.BufferGeometry,
  getMaterial: () => THREE.Material | THREE.Material[],
  maxInstances: number = 1000
) => {
  // References
  const meshRef = useRef<InstancedMesh | null>(null);
  const tempObject = useMemo(() => new Object3D(), []);
  const tempColor = useMemo(() => new Color(), []);
  const tempMatrix = useMemo(() => new Matrix4(), []);
  
  // Create memoized instance to geometry mapping
  const itemToIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item, index) => {
      map.set(item.id, index);
    });
    return map;
  }, [items]);

  // Update instance transforms when items change
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    
    // Reset visibility for all instances
    for (let i = 0; i < maxInstances; i++) {
      // Hide instances that don't have corresponding items
      if (i >= items.length) {
        tempObject.visible = false;
        tempObject.updateMatrix();
        mesh.setMatrixAt(i, tempObject.matrix);
        continue;
      }
      
      const item = items[i];
      
      // Set position (convert from app coordinate system to Three.js)
      tempObject.position.set(
        item.position.x,
        item.position.z || 0,
        -item.position.y
      );
      
      // Set rotation if provided
      if (item.rotation) {
        tempObject.rotation.set(
          item.rotation.x || 0,
          item.rotation.y || 0,
          item.rotation.z || 0
        );
      } else {
        tempObject.rotation.set(0, 0, 0);
      }
      
      // Set scale if provided
      if (item.scale) {
        tempObject.scale.set(
          item.scale.x || 1,
          item.scale.y || 1,
          item.scale.z || 1
        );
      } else {
        tempObject.scale.set(1, 1, 1);
      }
      
      // Set visibility
      tempObject.visible = item.visible !== false;
      
      // Update matrix for this instance
      tempObject.updateMatrix();
      mesh.setMatrixAt(i, tempObject.matrix);
      
      // Set color if provided and material supports it
      if (item.color && mesh.material instanceof THREE.MeshStandardMaterial) {
        tempColor.set(item.color);
        mesh.setColorAt(i, tempColor);
      }
    }
    
    // Mark matrices and colors for update
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items, tempObject, tempColor, maxInstances]);

  // Create a function to highlight a specific instance
  const highlightInstance = (id: string, highlightColor: string = '#ffff00') => {
    const mesh = meshRef.current;
    if (!mesh || !(mesh.material instanceof THREE.MeshStandardMaterial)) return;
    
    const index = itemToIndexMap.get(id);
    if (index === undefined) return;
    
    tempColor.set(highlightColor);
    mesh.setColorAt(index, tempColor);
    
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  // Return the mesh ref and utility functions
  return {
    meshRef,
    highlightInstance,
    
    // Get Three.js world position of a specific instance
    getInstanceWorldPosition: (id: string) => {
      const mesh = meshRef.current;
      if (!mesh) return null;
      
      const index = itemToIndexMap.get(id);
      if (index === undefined) return null;
      
      mesh.getMatrixAt(index, tempMatrix);
      const position = new THREE.Vector3();
      position.setFromMatrixPosition(tempMatrix);
      
      // Convert to world space
      mesh.localToWorld(position);
      
      return position;
    }
  };
}; 