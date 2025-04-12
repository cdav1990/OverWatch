import React, { useEffect, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useThreeJSState } from '../../context/ThreeJSStateContext';

interface ThreeJSOptimizerProps {
  children: React.ReactNode;
}

// Enhanced hardware detection
const detectHardwareCapabilities = () => {
  const userAgent = window.navigator.userAgent;
  const hardwareConcurrency = window.navigator.hardwareConcurrency || 4;
  const devicePixelRatio = window.devicePixelRatio || 1;
  
  // Detect Apple Silicon (M-series) or other high-end processors
  const isAppleSilicon = /Mac/.test(userAgent) && 
    (/Apple M1/.test(userAgent) || 
     /Apple M2/.test(userAgent) || 
     /Apple M3/.test(userAgent) ||
     /AppleWebKit/.test(userAgent) && hardwareConcurrency >= 8);
  
  const isHighEndDevice = isAppleSilicon || 
    hardwareConcurrency >= 8 || 
    (hardwareConcurrency >= 6 && devicePixelRatio >= 2);
  
  const isMidRangeDevice = !isHighEndDevice && 
    (hardwareConcurrency >= 4 || devicePixelRatio >= 1.5);
  
  const isLowEndDevice = !isHighEndDevice && !isMidRangeDevice;
  
  // Check if we're on Metal/WebGPU capable browser
  const hasModernGraphicsAPI = 
    'gpu' in navigator || // WebGPU
    /Safari/.test(userAgent) && /Mac OS/.test(userAgent); // Safari on Mac (Metal)
  
  return {
    isAppleSilicon,
    isHighEndDevice,
    isMidRangeDevice, 
    isLowEndDevice,
    hardwareConcurrency,
    devicePixelRatio,
    hasModernGraphicsAPI
  };
};

// Enhanced performance monitor with better stability
const perfMonitor = {
  frameCount: 0,
  lastTime: 0,
  fpsHistory: [] as number[],
  fpsHistoryMax: 30, // Keep 30 samples
  stableQualityChangeThreshold: 5, // Require 5 seconds below threshold before changing quality
  lowFpsCount: 0,
  highFpsCount: 0,
  
  reset() {
    this.frameCount = 0;
    this.lastTime = 0;
    this.fpsHistory = [];
    this.lowFpsCount = 0;
    this.highFpsCount = 0;
  },
  
  // Returns: 0 = maintain quality, -1 = reduce quality, 1 = increase quality
  checkPerformance(time: number): -1 | 0 | 1 {
    this.frameCount++;
    
    // Calculate FPS once per second
    if (time >= this.lastTime + 1000) {
      const fps = Math.round((this.frameCount * 1000) / (time - this.lastTime));
      
      // Add to history
      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > this.fpsHistoryMax) {
        this.fpsHistory.shift(); // Remove oldest sample
      }
      
      // Reset counters
      this.frameCount = 0;
      this.lastTime = time;
      
      // Only consider quality changes if we have enough samples
      if (this.fpsHistory.length >= 5) {
        // Calculate average FPS from recent history
        const avgFps = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
        
        // Check for sustained low performance
        if (avgFps < 25) {
          this.lowFpsCount++;
          this.highFpsCount = 0;
          
          // Reduce quality only after sustained low performance
          if (this.lowFpsCount >= this.stableQualityChangeThreshold) {
            this.lowFpsCount = 0; // Reset counter
            return -1; // Reduce quality
          }
        } 
        // Check for sustained high performance
        else if (avgFps > 55) {
          this.highFpsCount++;
          this.lowFpsCount = 0;
          
          // Increase quality only after sustained high performance
          if (this.highFpsCount >= this.stableQualityChangeThreshold * 2) { // Require longer for quality increases
            this.highFpsCount = 0; // Reset counter
            return 1; // Increase quality
          }
        } 
        // Stable performance - reset counters
        else {
          this.lowFpsCount = Math.max(0, this.lowFpsCount - 1);
          this.highFpsCount = Math.max(0, this.highFpsCount - 1);
        }
      }
    }
    
    return 0; // Maintain quality by default
  },
  
  // Get current performance metrics
  getMetrics() {
    return {
      averageFps: this.fpsHistory.length > 0 
        ? this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length 
        : 60,
      lowFpsCount: this.lowFpsCount,
      highFpsCount: this.highFpsCount,
      samples: this.fpsHistory.length
    };
  }
};

// Define constants for type safety
type ToneMappingType = THREE.NoToneMapping | THREE.ACESFilmicToneMapping;

const TONE_MAPPING = {
  NONE: THREE.NoToneMapping as ToneMappingType,
  ACES_FILMIC: THREE.ACESFilmicToneMapping as ToneMappingType
};

// Quality presets optimized for different hardware capabilities
const getQualityPresets = (hardwareCapabilities: ReturnType<typeof detectHardwareCapabilities>) => {
  // Base quality presets
  const presets = {
    ultra: {
      label: 'Ultra',
      pixelRatio: Math.min(2.0, hardwareCapabilities.devicePixelRatio),
      shadowMapType: THREE.PCFSoftShadowMap,
      shadowMapSize: 2048,
      materialQuality: 'high',
      anisotropy: 16,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.0,
      envMapIntensity: 1.0,
      waterQuality: {
        resolution: 150,  // Subdivisions of water plane
        fresnel: true,    // Enable fresnel effect
        distortion: true, // Enable distortion
        reflections: true // Enable reflections
      },
      framesToSkip: 0
    },
    high: {
      label: 'High',
      pixelRatio: Math.min(1.5, hardwareCapabilities.devicePixelRatio),
      shadowMapType: THREE.PCFSoftShadowMap,
      shadowMapSize: 1024,
      materialQuality: 'standard',
      anisotropy: 8,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 0.8,
      envMapIntensity: 0.8,
      waterQuality: {
        resolution: 100,
        fresnel: true,
        distortion: true,
        reflections: true
      },
      framesToSkip: 0
    },
    medium: {
      label: 'Medium',
      pixelRatio: Math.min(1.2, hardwareCapabilities.devicePixelRatio),
      shadowMapType: THREE.PCFShadowMap,
      shadowMapSize: 512,
      materialQuality: 'standard',
      anisotropy: 4,
      toneMapping: TONE_MAPPING.NONE,
      toneMappingExposure: 0.7,
      envMapIntensity: 0.6,
      waterQuality: {
        resolution: 64,
        fresnel: true,
        distortion: true,
        reflections: true
      },
      framesToSkip: 1
    },
    low: {
      label: 'Low',
      pixelRatio: Math.min(1.0, hardwareCapabilities.devicePixelRatio),
      shadowMapType: THREE.BasicShadowMap,
      shadowMapSize: 256,
      materialQuality: 'basic',
      anisotropy: 1,
      toneMapping: THREE.NoToneMapping,
      toneMappingExposure: 0.6,
      envMapIntensity: 0.4,
      waterQuality: {
        resolution: 40,
        fresnel: false,
        distortion: false,
        reflections: false
      },
      framesToSkip: 2
    }
  };
  
  // Fix Apple Silicon adjustment
  if (hardwareCapabilities.isAppleSilicon) {
    // Apple Silicon can handle much more
    presets.high.pixelRatio = Math.min(2.0, hardwareCapabilities.devicePixelRatio);
    presets.medium.pixelRatio = Math.min(1.5, hardwareCapabilities.devicePixelRatio);
    presets.low.pixelRatio = Math.min(1.2, hardwareCapabilities.devicePixelRatio);
    
    // Better water quality for Apple Silicon
    presets.medium.waterQuality.resolution = 80;
    presets.low.waterQuality.resolution = 60;
    presets.low.waterQuality.distortion = true;
    
    // Metal/M-series excels at tone mapping
    presets.medium.toneMapping = TONE_MAPPING.ACES_FILMIC;
  }
  
  return presets;
};

export const ThreeJSOptimizer: React.FC<ThreeJSOptimizerProps> = ({ children }) => {
  const { gl, scene, camera, raycaster } = useThree();
  const { lastUpdateTimestamp, forceRerender } = useThreeJSState();
  const isFirstRender = useRef(true);
  const textureCache = useRef<Map<string, THREE.Texture>>(new Map());
  const framesToSkip = useRef(0);
  const currentFrame = useRef(0);
  const initializationComplete = useRef(false);
  
  // Add throttling for cleanup operations and logs
  const lastCleanupTime = useRef(0);
  const lastLogTime = useRef(0);
  
  // State for quality level - use React state to allow for re-renders on quality change
  const [qualityState, setQualityState] = useState<{
    hardwareCapabilities: ReturnType<typeof detectHardwareCapabilities> | null;
    qualityPresets: ReturnType<typeof getQualityPresets> | null;
    currentQuality: 'ultra' | 'high' | 'medium' | 'low';
    isTransitioning: boolean;
    lastQualityChange: number;
    manualOverride: boolean;
    originalPixelRatio: number | null;
  }>({
    hardwareCapabilities: null,
    qualityPresets: null,
    currentQuality: 'medium', // Start with medium quality by default
    isTransitioning: false,
    lastQualityChange: 0,
    manualOverride: false,
    originalPixelRatio: null
  });
  
  // Add zoom operation state
  const isZooming = useRef(false);
  const zoomTimeout = useRef<any>(null);
  
  // Use a ref to track the water object for optimization
  const waterObjectRef = useRef<THREE.Object3D | null>(null);
  
  // Track performance metrics
  const frameCount = useRef(0);
  const lastTime = useRef(Date.now());
  const framesPerSecond = useRef(60);
  const resourcesTrackerRef = useRef<Set<THREE.Object3D>>(new Set());
  
  // Setup water optimization state
  const [waterQualityReduced, setWaterQualityReduced] = useState(false);
  
  // Initialize hardware detection and quality presets
  useEffect(() => {
    // Detect hardware capabilities
    const hardwareCapabilities = detectHardwareCapabilities();
    const qualityPresets = getQualityPresets(hardwareCapabilities);
    
    // Store original pixel ratio
    const originalPixelRatio = gl.getPixelRatio();
    
    // Determine initial quality level based on hardware
    let initialQuality: 'ultra' | 'high' | 'medium' | 'low';
    if (hardwareCapabilities.isAppleSilicon) {
      initialQuality = 'ultra';
    } else if (hardwareCapabilities.isHighEndDevice) {
      initialQuality = 'medium'; // Changed from 'high' to 'medium' as default
    } else if (hardwareCapabilities.isMidRangeDevice) {
      initialQuality = 'medium';
    } else {
      initialQuality = 'low';
    }
    
    // Log hardware detection results once
    console.log("[ThreeJSOptimizer] Hardware detection:", {
      isAppleSilicon: hardwareCapabilities.isAppleSilicon,
      cores: hardwareCapabilities.hardwareConcurrency,
      pixelRatio: hardwareCapabilities.devicePixelRatio,
      initialQuality
    });
    
    // Update state with detection results
    setQualityState({
      hardwareCapabilities,
      qualityPresets,
      currentQuality: initialQuality,
      isTransitioning: false,
      lastQualityChange: Date.now(),
      manualOverride: false,
      originalPixelRatio
    });
    
    // Reset performance monitor
    perfMonitor.reset();
    
    // Initialize timestamps
    lastCleanupTime.current = Date.now();
    lastLogTime.current = Date.now();
    
  }, [gl]);
  
  // Apply quality settings when quality state changes
  useEffect(() => {
    if (!qualityState.qualityPresets || !qualityState.hardwareCapabilities) {
      return; // Skip if not initialized
    }
    
    const startTime = performance.now();
    console.log(`[ThreeJSOptimizer] Applying ${qualityState.currentQuality} quality settings...`);
    
    // Get current quality preset
    const preset = qualityState.qualityPresets[qualityState.currentQuality];
    
    // Apply renderer settings
    gl.setPixelRatio(preset.pixelRatio);
    gl.toneMapping = preset.toneMapping;
    gl.toneMappingExposure = preset.toneMappingExposure;
    
    // Configure shadows
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = preset.shadowMapType;
    
    // Set up frame skipping for low-end devices
    framesToSkip.current = preset.framesToSkip;
    
    // Optimize the scene graph with the current quality settings
    optimizeSceneGraph(scene, qualityState.currentQuality, preset);
    
    // Dispatch quality change event for other components to react
    window.dispatchEvent(new CustomEvent('quality-changed', { 
      detail: { 
        quality: qualityState.currentQuality,
        preset
      }
    }));
    
    // Mark initialization as complete after first quality application
    if (!initializationComplete.current) {
      initializationComplete.current = true;
      
      // Force a single rerender to apply all optimizations
      setTimeout(() => {
        isFirstRender.current = false;
        forceRerender();
      }, 100);
    }
    
    // Output optimization time
    const endTime = performance.now();
    console.log(`[ThreeJSOptimizer] Applied ${qualityState.currentQuality} settings in ${(endTime - startTime).toFixed(1)}ms`);
    
    // Set state as no longer transitioning
    if (qualityState.isTransitioning) {
      setQualityState(prev => ({
        ...prev,
        isTransitioning: false,
        lastQualityChange: Date.now()
      }));
    }
    
    // Cleanup function
    return () => {
      // Only run on unmount, not on every quality change
      if (qualityState.originalPixelRatio !== null) {
        const now = Date.now();
        // Throttle logs to prevent spam
        if (now - lastLogTime.current > 10000) {
          console.log("[ThreeJSOptimizer] Cleaning up resources");
          lastLogTime.current = now;
        }
        
        gl.setPixelRatio(qualityState.originalPixelRatio);
        
        // Clean up texture cache
        textureCache.current.forEach(texture => {
          if (texture && typeof texture.dispose === 'function') {
            texture.dispose();
          }
        });
        textureCache.current.clear();
        
        // Force garbage collection on renderer and scene materials/geometries
        gl.info.reset();
      }
    };
  }, [gl, scene, forceRerender, qualityState.currentQuality, qualityState.qualityPresets, qualityState.hardwareCapabilities]);
  
  // Safely dispose resources to avoid errors
  const safeDisposeResources = (scene: THREE.Scene) => {
    const disposeQueue: THREE.Object3D[] = [];
    
    // First pass: collect objects to dispose
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && !object.userData.preserveOnCleanup) {
        disposeQueue.push(object);
      }
    });
    
    // Second pass: dispose objects
    disposeQueue.forEach(object => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry && !object.userData.preserveGeometry) {
          object.geometry.dispose();
        }
        
        if (object.material) {
          const materials = Array.isArray(object.material) 
            ? object.material 
            : [object.material];
          
          materials.forEach(material => {
            // Safely dispose material properties
            if (!material) return;
            
            Object.keys(material).forEach(prop => {
              if (!material[prop]) return;
              if (material[prop] !== null && 
                  typeof material[prop] === 'object' && 
                  typeof material[prop].dispose === 'function') {
                try {
                  material[prop].dispose();
                } catch (e) {
                  // Silently fail if dispose throws an error
                }
              }
            });
            
            try {
              material.dispose();
            } catch (e) {
              // Silently fail if dispose throws an error
            }
          });
        }
      }
    });
  };
  
  // Optimize scene graph for specific quality level
  const optimizeSceneGraph = (scene: THREE.Scene, qualityLevel: string, preset: any) => {
    // Track statistics for logging
    const stats = {
      meshes: 0,
      materials: 0,
      lights: 0,
      textures: 0,
      geometries: 0,
      optimizedObjects: 0
    };
    
    scene.traverse((object) => {
      // Skip the camera - never disable the camera
      if (object === camera) return;
      
      if (object instanceof THREE.Mesh) {
        stats.meshes++;
        
        // Enable frustum culling for all meshes
        object.frustumCulled = true;
        
        // Disable matrix auto updates for static objects
        if (!object.userData.isAnimated && !object.userData.isDynamic) {
          object.matrixAutoUpdate = false;
          object.updateMatrix();
        }
        
        // Optimize materials
        if (object.material) {
          const materials = Array.isArray(object.material) 
            ? object.material 
            : [object.material];
          
          materials.forEach(material => {
            stats.materials++;
            
            // Skip materials that are already optimized for this quality level
            if (material.userData && 
                material.userData.optimizedFor === qualityLevel) return;
            
            // Skip special materials that shouldn't be modified
            if (material.type && (
                material.type.includes('Shader') || 
                material.type.includes('Depth') || 
                material.type.includes('Distance')
            )) return;
            
            if (material instanceof THREE.MeshStandardMaterial) {
              // Apply quality-specific material optimizations
              if (qualityLevel === 'low') {
                try {
                  // For low quality, convert to simpler material
                  const phongMaterial = new THREE.MeshPhongMaterial();
                  phongMaterial.color.copy(material.color);
                  if (material.emissive) phongMaterial.emissive.copy(material.emissive);
                  phongMaterial.specular = new THREE.Color(0.5, 0.5, 0.5);
                  phongMaterial.shininess = 30;
                  
                  // Copy maps
                  if (material.map) phongMaterial.map = material.map;
                  if (material.normalMap) phongMaterial.normalMap = material.normalMap;
                  
                  // Replace material
                  if (Array.isArray(object.material)) {
                    const index = object.material.indexOf(material);
                    if (index !== -1) object.material[index] = phongMaterial;
                  } else {
                    object.material = phongMaterial;
                  }
                  
                  // Mark as optimized
                  phongMaterial.userData = phongMaterial.userData || {};
                  phongMaterial.userData.optimizedFor = qualityLevel;
                  
                  // Dispose the original material
                  material.dispose();
                  stats.optimizedObjects++;
                } catch (e) {
                  // Fallback if material conversion fails
                  material.roughness = Math.max(0.2, material.roughness || 0.5);
                  material.metalness = Math.min(0.8, material.metalness || 0.5);
                  material.flatShading = true;
                  material.userData = material.userData || {};
                  material.userData.optimizedFor = qualityLevel;
                }
              } else {
                // For medium/high, adjust material properties
                if (qualityLevel === 'medium') {
                  material.roughness = Math.max(0.2, material.roughness || 0.5);
                  material.metalness = Math.min(0.7, material.metalness || 0.5);
                  material.envMapIntensity = preset.envMapIntensity;
                  material.flatShading = qualityState.hardwareCapabilities?.isMidRangeDevice || false;
                } else { // high/ultra
                  material.envMapIntensity = preset.envMapIntensity;
                  material.flatShading = false; // Always use smooth shading for high/ultra
                }
                
                // Mark as optimized for this quality level
                material.userData = material.userData || {};
                material.userData.optimizedFor = qualityLevel;
                stats.optimizedObjects++;
              }
            }
            
            // Optimize textures
            for (const propName of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap']) {
              if (material[propName]) {
                stats.textures++;
                const texture = material[propName];
                const textureCacheKey = texture.uuid;
                
                // Cache texture to prevent duplicate uploads
                if (!textureCache.current.has(textureCacheKey)) {
                  textureCache.current.set(textureCacheKey, texture);
                }
                
                // Apply quality-specific texture settings
                
                // 1. Filtering & anisotropy
                if (qualityLevel === 'low') {
                  texture.minFilter = THREE.LinearFilter;
                  texture.magFilter = THREE.LinearFilter;
                  texture.anisotropy = 1;
                } else if (qualityLevel === 'medium') {
                  texture.minFilter = THREE.LinearMipmapLinearFilter;
                  texture.magFilter = THREE.LinearFilter;
                  texture.anisotropy = 4;
                } else if (qualityLevel === 'high') {
                  texture.minFilter = THREE.LinearMipmapLinearFilter;
                  texture.magFilter = THREE.LinearFilter;
                  texture.anisotropy = 8;
                } else {
                  texture.minFilter = THREE.LinearMipmapLinearFilter;
                  texture.magFilter = THREE.LinearFilter;
                  texture.anisotropy = preset.anisotropy;
                }
                
                // 2. Mipmaps
                texture.generateMipmaps = qualityLevel !== 'low';
                
                // 3. Texture optimization for performance
                if (texture.image && texture.image.width > 2048 && qualityLevel !== 'ultra') {
                  // Log warning for large textures
                  console.warn(`[ThreeJSOptimizer] Large texture detected: ${texture.image.width}x${texture.image.height}`);
                }
                
                // 4. Reset needsUpdate flag to prevent continuous updates
                if (texture.needsUpdate) {
                  texture.needsUpdate = false;
                }
              }
            }
          });
        }
        
        // Optimize geometries
        if (object.geometry) {
          stats.geometries++;
          
          if (!object.geometry.userData?.optimizedFor || object.geometry.userData.optimizedFor !== qualityLevel) {
            // Merge geometries when possible (for static objects)
            if (!object.userData.isAnimated && !object.userData.isDynamic) {
              object.geometry.computeBoundingBox();
              object.geometry.computeBoundingSphere();
            }
            
            // Mark as optimized
            object.geometry.userData = object.geometry.userData || {};
            object.geometry.userData.optimizedFor = qualityLevel;
            stats.optimizedObjects++;
          }
        }
      } else if (object instanceof THREE.Light) {
        stats.lights++;
        
        // Optimize lights based on quality
        if (object instanceof THREE.PointLight || object instanceof THREE.SpotLight) {
          // Configure shadow maps
          object.shadow.mapSize.width = preset.shadowMapSize;
          object.shadow.mapSize.height = preset.shadowMapSize;
          object.shadow.bias = 0.0001;
          
          // Adjust shadow camera params
          if (object.shadow.camera instanceof THREE.PerspectiveCamera) {
            object.shadow.camera.near = 0.5;
            object.shadow.camera.far = 100;
          }
          
          // Configure shadow settings based on quality
          if (qualityLevel === 'ultra' || qualityLevel === 'high') {
            object.shadow.autoUpdate = true;
            object.shadow.needsUpdate = true;
          } else {
            object.shadow.autoUpdate = false;
            // Set a single update
            object.shadow.needsUpdate = true;
          }
        }
        
        // Remove shadows in low quality mode
        if (qualityLevel === 'low') {
          object.castShadow = false;
        }
      }
    });
    
    // Log optimization stats
    console.log(`[ThreeJSOptimizer] Scene optimized: ${stats.optimizedObjects} objects modified (${stats.meshes} meshes, ${stats.materials} materials, ${stats.textures} textures)`);
  };
  
  // Listen for zoom operations
  useEffect(() => {
    const handleZoomOperation = (event: CustomEvent) => {
      isZooming.current = true;
      
      // Clear previous timeout
      if (zoomTimeout.current) {
        clearTimeout(zoomTimeout.current);
      }
      
      // Set timeout to re-enable optimizations after zooming stops
      zoomTimeout.current = setTimeout(() => {
        isZooming.current = false;
      }, 500); // Wait 500ms after zoom ends before re-optimizing
    };
    
    window.addEventListener('zoom-operation', handleZoomOperation as EventListener);
    
    return () => {
      window.removeEventListener('zoom-operation', handleZoomOperation as EventListener);
      if (zoomTimeout.current) {
        clearTimeout(zoomTimeout.current);
      }
    };
  }, []);
  
  // Performance monitoring and adaptive quality with throttling
  useFrame((state, delta) => {
    // Skip if not initialized
    if (!qualityState.qualityPresets || !qualityState.hardwareCapabilities || !initializationComplete.current) {
      return;
    }
    
    // Skip frames based on quality setting to improve performance
    currentFrame.current++;
    if (currentFrame.current % (framesToSkip.current + 1) !== 0) {
      return;
    }
    
    // Skip quality changes if user has manually overridden
    if (qualityState.manualOverride) {
      return;
    }
    
    // Skip performance checking during transitions
    if (qualityState.isTransitioning) {
      return;
    }
    
    // Skip performance optimizations during zooming operations
    if (isZooming.current) {
      return;
    }
    
    // Skip quality changes if we changed recently (require stability period)
    const stabilityPeriodMs = 10000; // 10 seconds between quality changes
    if (Date.now() - qualityState.lastQualityChange < stabilityPeriodMs) {
      return;
    }
    
    // Check for performance issues - get: -1 (reduce), 0 (maintain), 1 (increase)
    const performanceResult = perfMonitor.checkPerformance(state.clock.elapsedTime * 1000);
    
    // Fix the type comparison issue with an explicit check
    const shouldChangeQuality = performanceResult === -1 || performanceResult === 1;
    
    // Periodic cleanup (even with no quality change)
    const now = Date.now();
    const cleanupThrottleTime = 60000; // Only clean up every 60 seconds max
    if (now - lastCleanupTime.current > cleanupThrottleTime) {
      gl.info.reset(); // Force garbage collection
      lastCleanupTime.current = now;
    }
    
    // Only log performance state periodically
    const logThrottleTime = 5000; // Only log every 5 seconds max
    if (now - lastLogTime.current > logThrottleTime) {
      const metrics = perfMonitor.getMetrics();
      console.log(`[ThreeJSOptimizer] Performance: ${metrics.averageFps.toFixed(1)} FPS, Quality: ${qualityState.currentQuality}`);
      lastLogTime.current = now;
    }
    
    // Handle quality change request
    if (shouldChangeQuality) {
      // Determine quality level transition
      let newQuality = qualityState.currentQuality;
      
      if (performanceResult < 0) {
        // Reduce quality
        if (qualityState.currentQuality === 'ultra') newQuality = 'high';
        else if (qualityState.currentQuality === 'high') newQuality = 'medium';
        else if (qualityState.currentQuality === 'medium') newQuality = 'low';
        
        if (newQuality !== qualityState.currentQuality) {
          console.log(`[ThreeJSOptimizer] Reducing quality from ${qualityState.currentQuality} to ${newQuality}`);
        }
      } else {
        // Increase quality (performanceResult must be > 0 here)
        if (qualityState.currentQuality === 'low') newQuality = 'medium';
        else if (qualityState.currentQuality === 'medium') newQuality = 'high';
        else if (qualityState.currentQuality === 'high' && qualityState.hardwareCapabilities.isHighEndDevice) newQuality = 'ultra';
        
        if (newQuality !== qualityState.currentQuality) {
          console.log(`[ThreeJSOptimizer] Increasing quality from ${qualityState.currentQuality} to ${newQuality}`);
        }
      }
    
      // Only update if quality actually changed
      if (newQuality !== qualityState.currentQuality) {
        // Reset the performance monitor for the new quality level
        perfMonitor.reset();
        
        // Set new quality level and mark as transitioning
        setQualityState(prev => ({
          ...prev,
          currentQuality: newQuality,
          isTransitioning: true,
          lastQualityChange: Date.now()
        }));
      }
    }
  }, 0); // Priority 0 ensures this runs before other animations
  
  // Add a global API for manual quality adjustment
  useEffect(() => {
    const setQuality = (quality: 'ultra' | 'high' | 'medium' | 'low', isManualOverride: boolean = true) => {
      console.log(`[ThreeJSOptimizer] Manually setting quality to ${quality}`);
      
      // Reset performance monitor when quality changes
      perfMonitor.reset();
      
      setQualityState(prev => ({
        ...prev,
        currentQuality: quality,
        isTransitioning: true,
        lastQualityChange: Date.now(),
        manualOverride: isManualOverride
      }));
    };
    
    // Expose API to window for debugging
    (window as any).setThreeJSQuality = setQuality;
    
    // Handle quality change request events
    const handleQualityChangeRequest = (event: CustomEvent) => {
      const quality = event.detail.quality;
      const override = event.detail.override !== undefined ? event.detail.override : true;
      
      // Validate quality value
      if (['ultra', 'high', 'medium', 'low'].includes(quality)) {
        setQuality(quality, override);
      }
    };
    
    // Add event listener for quality change requests
    window.addEventListener('request-quality-change', handleQualityChangeRequest as EventListener);
    
    return () => {
      delete (window as any).setThreeJSQuality;
      window.removeEventListener('request-quality-change', handleQualityChangeRequest as EventListener);
    };
  }, []);
  
  // If in development mode, display quality watermark in corner
  useEffect(() => {
    // Check if in development mode
    if (process.env.NODE_ENV === 'development') {
      // Quality indicator has been removed as requested
      
      return () => {
        // Cleanup function (empty since we removed the indicator)
      };
    }
  }, [qualityState.currentQuality]);
  
  // Memory tracking - runs once on component mount
  useEffect(() => {
    // Renderer optimization
    gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    gl.setClearColor(0x000000, 0);
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.autoClear = true;
    
    // Adaptive quality based on device
    const isLowEndDevice = 
      window.navigator.hardwareConcurrency <= 4 || 
      /Mobile|Android/.test(navigator.userAgent);
    
    // Low quality settings for water for low-end devices
    if (isLowEndDevice) {
      setWaterQualityReduced(true);
    }
    
    // Find and optimize water in the scene
    const findAndOptimizeWater = () => {
      scene.traverse((object) => {
        // Track all objects for proper cleanup
        resourcesTrackerRef.current.add(object);
        
        // Detect the water object specifically
        if (
          object.name && 
          (object.name.toLowerCase().includes('water') || 
           (object.userData && object.userData.type === 'water'))
        ) {
          console.log('Found water object:', object.name);
          waterObjectRef.current = object;
          
          // Apply water-specific optimizations
          if (object instanceof THREE.Mesh && object.material) {
            const material = object.material as THREE.MeshStandardMaterial;
            
            // Reduce water quality settings
            if (waterQualityReduced) {
              // Simplify water material
              material.roughness = 0.8;
              material.metalness = 0.2;
              
              // Disable expensive effects
              if ('envMapIntensity' in material) {
                material.envMapIntensity = 0.5;
              }
            }
          }
        }
      });
    };
    
    // Initial optimization
    findAndOptimizeWater();
    
    // Set up event listeners for optimization
    const lowPerfMode = () => {
      console.log('Entering low performance mode due to low FPS...');
      setWaterQualityReduced(true);
      
      // Apply optimizations to water
      if (waterObjectRef.current) {
        const waterObj = waterObjectRef.current;
        if (waterObj instanceof THREE.Mesh && waterObj.material) {
          const material = waterObj.material as THREE.MeshStandardMaterial;
          material.roughness = 0.9;
          material.metalness = 0.1;
          
          // Reduce update frequency
          waterObj.userData.updateFrequency = 3; // Only update every 3 frames
        }
      }
    };
    
    // Listen for the browser's visibility change to pause rendering when tab is not visible
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('Tab hidden, pausing heavy animations');
        // Store current animation state to resume later
      } else {
        console.log('Tab visible, resuming animations');
        // Resume animations
      }
    });
    
    // Custom event handling for optimization requests
    window.addEventListener('optimize-threejs', () => {
      lowPerfMode();
    });
    
    // Cleanup function
    return () => {
      // Clean up all tracked objects to prevent memory leaks
      resourcesTrackerRef.current.forEach(obj => {
        // Properly dispose of geometries
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry) {
            obj.geometry.dispose();
          }
          
          // Properly dispose of materials
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach(mat => {
                disposeMaterial(mat);
              });
            } else {
              disposeMaterial(obj.material);
            }
          }
        }
      });
      
      // Clear the set
      resourcesTrackerRef.current.clear();
      
      // Remove event listeners
      document.removeEventListener('visibilitychange', () => {});
      window.removeEventListener('optimize-threejs', () => {});
      
      console.log('ThreeJSOptimizer cleanup complete');
    };
  }, [gl, scene]);
  
  // Helper function to dispose of material resources
  const disposeMaterial = (material: THREE.Material) => {
    // Dispose of any textures
    Object.keys(material).forEach(prop => {
      if (!material[prop]) return;
      // Type-safe check for textures
      const value = material[prop as keyof THREE.Material];
      if (value instanceof THREE.Texture) {
        value.dispose();
      }
    });
    
    // Dispose of the material itself
    material.dispose();
  };
  
  // Performance monitoring and adaptive quality
  useFrame((_, delta) => {
    // Count frames for FPS calculation
    frameCount.current += 1;
    
    // Calculate FPS every second
    const now = Date.now();
    if (now - lastTime.current >= 1000) {
      framesPerSecond.current = frameCount.current;
      frameCount.current = 0;
      lastTime.current = now;
      
      // Performance-based optimization
      if (framesPerSecond.current < 30 && !waterQualityReduced) {
        console.log(`Low FPS detected (${framesPerSecond.current}), reducing water quality`);
        setWaterQualityReduced(true);
        
        // Dispatch optimization event
        window.dispatchEvent(new CustomEvent('optimize-threejs'));
      }
    }
    
    // Water optimization - limit updates if quality is reduced
    if (waterObjectRef.current && waterQualityReduced) {
      const waterObj = waterObjectRef.current;
      
      // Only update water every N frames to save performance
      if (frameCount.current % (waterObj.userData.updateFrequency || 1) === 0) {
        // Limited water animation update
        if (waterObj.userData.animate) {
          waterObj.userData.animate(delta);
        }
      }
    }
  });
  
  return <>{children}</>;
};

export default ThreeJSOptimizer; 