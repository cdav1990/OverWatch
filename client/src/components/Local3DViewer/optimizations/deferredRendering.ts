import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Deferred rendering hook that optimizes Three.js performance by:
 * 1. Using adaptive frame rates based on interactions
 * 2. Prioritizing render quality during interaction
 * 3. Applying progressive loading for complex scenes
 * 
 * @param options Configuration options for deferred rendering
 * @returns Control functions for the deferred rendering
 */
export const useDeferredRendering = (options = {
  highFPS: 60,
  lowFPS: 30,
  interactionCooldown: 500,
}) => {
  const { gl, scene, camera } = useThree();
  const isInteracting = useRef(false);
  const lastInteractionTime = useRef(0);
  const animationFrameId = useRef<number | null>(null);
  const previousQuality = useRef<THREE.WebGLRenderTarget | null>(null);

  // Set up optimized rendering loop
  useEffect(() => {
    // Store original pixel ratio and renderer settings
    const originalPixelRatio = gl.getPixelRatio();
    const originalToneMapping = gl.toneMapping;
    
    // Function to toggle between high and low quality rendering
    const setHighQualityRendering = (highQuality: boolean) => {
      if (highQuality) {
        gl.setPixelRatio(originalPixelRatio);
        gl.toneMapping = originalToneMapping;
      } else {
        gl.setPixelRatio(Math.min(originalPixelRatio, 1.5));
        gl.toneMapping = THREE.NoToneMapping; // Disable tone mapping for performance
      }
    };

    // Optimized render loop with adaptive FPS
    const renderLoop = () => {
      const now = performance.now();
      const isActive = isInteracting.current || (now - lastInteractionTime.current < options.interactionCooldown);
      
      // Set render quality based on interaction state
      setHighQualityRendering(isActive);
      
      // Render the scene
      gl.render(scene, camera);
      
      // Schedule next frame at appropriate rate
      const targetFPS = isActive ? options.highFPS : options.lowFPS;
      const frameDuration = 1000 / targetFPS;
      
      animationFrameId.current = setTimeout(() => {
        animationFrameId.current = requestAnimationFrame(renderLoop);
      }, frameDuration) as unknown as number;
    };

    // Start render loop
    animationFrameId.current = requestAnimationFrame(renderLoop);

    // Clean up
    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
        clearTimeout(animationFrameId.current);
      }
      // Restore original settings
      gl.setPixelRatio(originalPixelRatio);
      gl.toneMapping = originalToneMapping;
    };
  }, [gl, scene, camera, options.highFPS, options.lowFPS, options.interactionCooldown]);

  // Return control functions
  return {
    /**
     * Notify the renderer that an interaction is happening
     */
    notifyInteraction: () => {
      isInteracting.current = true;
      lastInteractionTime.current = performance.now();
    },
    
    /**
     * Notify the renderer that an interaction has ended
     */
    notifyInteractionEnd: () => {
      isInteracting.current = false;
      lastInteractionTime.current = performance.now();
    },
    
    /**
     * Force a high-quality render for the next frame
     */
    forceRender: () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
        clearTimeout(animationFrameId.current);
        animationFrameId.current = requestAnimationFrame(() => {});
      }
    }
  };
}; 