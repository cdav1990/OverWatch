import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface SceneOptimizerProps {
  children: React.ReactNode;
}

const SceneOptimizer: React.FC<SceneOptimizerProps> = ({ children }) => {
  const { gl, scene, camera } = useThree();
  
  // Apply optimizations using Three.js API
  useEffect(() => {
    // Store original settings
    const originalPixelRatio = gl.getPixelRatio();
    const originalToneMapping = gl.toneMapping;
    
    // Apply optimized settings
    gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Apply scene optimizations
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // Enable frustum culling
        object.frustumCulled = true;
        
        // Optimize materials
        if (object.material) {
          const materials = Array.isArray(object.material) 
            ? object.material 
            : [object.material];
          
          materials.forEach(material => {
            if (material instanceof THREE.MeshStandardMaterial) {
              // Optimize textures
              if (material.map) {
                material.map.anisotropy = 4;
                material.map.minFilter = THREE.LinearMipmapLinearFilter;
              }
            }
          });
        }
      }
    });
    
    // Cleanup function
    return () => {
      gl.setPixelRatio(originalPixelRatio);
      gl.toneMapping = originalToneMapping;
    };
  }, [gl, scene, camera]);
  
  return <>{children}</>;
};

export { SceneOptimizer };
