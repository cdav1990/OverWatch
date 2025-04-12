/**
 * Three.js and 3D Rendering Optimizations
 * ---------------------------------------
 * This module exports a collection of utilities and hooks for optimizing
 * Three.js rendering performance in a React application.
 * 
 * These optimizations include:
 * - Deferred and adaptive rendering
 * - Instanced mesh rendering for repeated objects
 * - Geometry batching to reduce draw calls
 * - Texture management and optimization
 * - Level of detail (LOD) management
 */

// Export all optimization tools from a single entry point
export * from './deferredRendering';
export * from './instancedMeshes';
export * from './geometryBatching';
export * from './textureManager';
// export * from './levelOfDetail'; // Uncomment after ensuring './levelOfDetail' file is available

// Export convenience function to apply all optimizations
import { useDeferredRendering } from './deferredRendering';
import { optimizeTexture, clearTextureCache } from './textureManager';
import * as THREE from 'three';

/**
 * Applies commonly used ThreeJS optimizations when component unmounts
 * Call this in a useEffect cleanup function
 */
export const cleanupThreeJSResources = () => {
  // Clear texture cache
  clearTextureCache();
  
  // Force garbage collection hint (only when debugging)
  if (process.env.NODE_ENV !== 'production') {
    setTimeout(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    }, 100);
  }
};

/**
 * Convenience hook that applies all Three.js optimizations
 * @returns An object with optimization controls
 */
export const useThreeJSOptimizations = () => {
  // Apply deferred rendering
  const deferredRendering = useDeferredRendering({
    highFPS: 60,
    lowFPS: 24,
    interactionCooldown: 500
  });
  
  return {
    // Forward all deferred rendering controls
    ...deferredRendering,
    
    // Additional convenience methods
    cleanup: cleanupThreeJSResources,
    
    /**
     * Call this function when loading the scene to prepare it for optimal rendering
     */
    optimizeScene: (scene: THREE.Scene) => {
      // Apply frustum culling
      scene.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) {
          object.frustumCulled = true;
          
          // Optimize material textures
          if (object.material) {
            const materials = Array.isArray(object.material) 
              ? object.material 
              : [object.material];
            
            materials.forEach((material: THREE.Material) => {
              if (material instanceof THREE.MeshStandardMaterial ||
                  material instanceof THREE.MeshPhysicalMaterial) {
                // Optimize all textures in the material
                if (material.map) {
                  optimizeTexture(material.map);
                }
                if (material.normalMap) {
                  optimizeTexture(material.normalMap);
                }
                if (material.roughnessMap) {
                  optimizeTexture(material.roughnessMap);
                }
                // Add other texture types as needed
              }
            });
          }
        }
      });
    }
  };
}; 