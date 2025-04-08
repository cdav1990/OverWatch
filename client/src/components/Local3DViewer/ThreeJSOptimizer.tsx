import React, { useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useThreeJSState } from '../../context/ThreeJSStateContext';

interface ThreeJSOptimizerProps {
  children: React.ReactNode;
}

export const ThreeJSOptimizer: React.FC<ThreeJSOptimizerProps> = ({ children }) => {
  const { gl, scene, camera } = useThree();
  const { lastUpdateTimestamp } = useThreeJSState();
  
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
  }, [gl, scene]);
  
  // Check for updates from UI components
  useFrame(() => {
    // Can react to lastUpdateTimestamp.current here if needed
    // This keeps the optimizer in sync with UI changes
  });
  
  return <>{children}</>;
};

export default ThreeJSOptimizer; 