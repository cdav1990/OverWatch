import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Sky, TransformControls, Environment, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useMission } from '../../context/MissionContext';
import { LocalCoord, Waypoint, PathSegment, PathType } from '../../types/mission';
import { useSpring, animated } from '@react-spring/three';
import WaypointMarker from './markers/WaypointMarker';
import PathLine from './markers/PathLine';
import GCPMarker from './markers/GCPMarker';
import SceneObjectRenderer from './objects/SceneObjectRenderer';
import HighlightFaceIndicator from './indicators/HighlightFaceIndicator';
import DroneModel from './drone/DroneModel';
import { CameraFrustumProps } from './drone/CameraFrustum';
import { mapLocalCoordsToThree, threeToLocalCoord, localCoordToThree } from './utils/threeHelpers';
import MissionAreaIndicator from './indicators/MissionAreaIndicator';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import ObjectTransformControls from './controls/ObjectTransformControls';
import { SceneSettings, SceneTheme, SCENE_THEMES, GRID_PRESETS } from '../Local3DViewer/types/SceneSettings';
import { Suspense } from 'react';
import { metersToFeet, feetToMeters } from '../../utils/sensorCalculations';

// Add constants for drag smoothing
const DRAG_SMOOTHING_FACTOR = 0.25; // Lower = smoother/slower, higher = more responsive
const DRAG_SPRING_CONFIG = { mass: 1.5, tension: 80, friction: 40 }; // More mass, less tension, more friction

// Modify the MissionScene component props to include selectedFace state and gimbalPitch
interface MissionSceneProps {
  liveDronePosition?: LocalCoord | null;
  liveDroneRotation?: { heading: number; pitch: number; roll: number; } | null;
  manualDronePosition?: LocalCoord | null;
  onDroneDoubleClick: (event: ThreeEvent<MouseEvent>) => void;
  cameraFollowsDrone: boolean;
  visualizationSettings?: CameraFrustumProps['visualization'];
  gimbalPitch?: number; // Add gimbalPitch prop
  droneRotation?: { heading: number; pitch: number; roll: number; };
}

// Add this interface near the top of the file where other interfaces are defined, before the component
// This interface extends PathSegment to include groundProjections property
interface PathSegmentWithProjections extends PathSegment {
  groundProjections?: Waypoint[];
}

// Scene setup component
const SceneSetup: React.FC = () => {
  const { camera } = useThree();
  
  // Set up the scene with proper orientation (Y-up)
  useEffect(() => {
    // Set initial camera position to look at the scene from a good angle
    // Position the camera higher up on the Y axis to ensure you're looking down
    // This helps with the environment orientation
    camera.position.set(30, 50, 50);
    camera.lookAt(0, 0, 0);
    
    // Log information about the coordinate system
    console.log("[SceneSetup] Three.js environment using Y-up coordinate system");
    console.log("[SceneSetup] Camera initial position:", camera.position);
  }, [camera]);

  return null;
};

// Fix the ground plane component to properly update based on settings changes
const GroundPlane: React.FC<{
  sceneSettings: SceneSettings;
  onBackgroundClick: (event: ThreeEvent<MouseEvent>) => void;
  onPointerMove: (event: THREE.Event) => void;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
}> = ({ sceneSettings, onBackgroundClick, onPointerMove, onPointerDown }) => {
  const groundRef = useRef<THREE.Mesh>(null);
  
  // Skip rendering if ground plane is explicitly hidden
  if (sceneSettings.hideGroundPlane) return null;
  
  // Force material updates when settings change
  useEffect(() => {
    if (groundRef.current && groundRef.current.material) {
      const material = groundRef.current.material as THREE.MeshStandardMaterial;
      const opacity = sceneSettings.groundOpacity ?? 1.0; // Default to 1.0 (opaque)
      material.opacity = opacity;
      material.transparent = opacity < 1.0; // Only transparent if opacity is less than 1
      material.side = sceneSettings.showBelowGround ? THREE.DoubleSide : THREE.FrontSide;
      material.needsUpdate = true;
    }
  }, [sceneSettings.groundOpacity, sceneSettings.showBelowGround]);
  
  // IMPORTANT: The ground plane is rotated with -Math.PI/2 around X axis,
  // which means it's oriented with Y-up in the world coordinate system.
  // This rotation ensures the ground plane is properly oriented to face upward in Y-up convention.
  return (
    <mesh
      ref={groundRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      onClick={onBackgroundClick}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      receiveShadow
    >
      <planeGeometry args={[10000, 10000]} />
      <meshStandardMaterial 
        color="#333333" 
        opacity={sceneSettings.groundOpacity ?? 1.0}
        transparent={(sceneSettings.groundOpacity ?? 1.0) < 1.0}
        side={sceneSettings.showBelowGround ? THREE.DoubleSide : THREE.FrontSide}
        // Improved material properties for better environment reflections
        metalness={0.1} // Slightly increased metalness for better reflections
        roughness={0.8} // Slightly decreased roughness for more visible reflections
        envMapIntensity={0.7} // Increased envMapIntensity for stronger environment map effect
      />
    </mesh>
  );
};

// Improved Water Surface Component with scene settings and better animation
const WaterSurface: React.FC<{
  sceneSettings: SceneSettings;
}> = ({ sceneSettings }) => {
  // Skip if water is disabled
  if (!sceneSettings.waterEnabled) return null;
  
  // Performance monitoring
  const fpsMonitor = useRef({ frames: 0, time: 0, fps: 60 });
  const lastUpdateTime = useRef(0);
  const skipFrameCount = useRef(0);
  const frameSkipRate = useRef(1); // Default to update every frame
  const isAnimating = useRef(true); // Flag to track when component is active
  
  // Create a texture for water with improved performance
  const waterTexture = useMemo(() => {
    try {
      const texture = new THREE.TextureLoader().load('/textures/waternormals.jpg', 
        // Success callback
        undefined,
        // Error callback
        (error) => {
          console.error('[WaterSurface] Error loading water texture:', error);
        }
      );
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set((sceneSettings.waterWaveScale || 1.0) * 10, (sceneSettings.waterWaveScale || 1.0) * 10);
      
      // Optimize texture for performance
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = 4; // Good balance between quality and performance
      
      return texture;
    } catch (error) {
      console.error('[WaterSurface] Error creating water texture:', error);
      return null;
    }
  }, [sceneSettings.waterWaveScale]);
  
  // Use ref for animation
  const waterRef = useRef<THREE.Mesh>(null);
  const time = useRef(0);

  // Calculate adaptive geometry resolution based on performance
  const [geometryResolution, setGeometryResolution] = useState({ width: 100, height: 100 });

  // Proper cleanup function for water resources
  useEffect(() => {
    isAnimating.current = true;
    
    // Clean up function
    return () => {
      isAnimating.current = false;
      
      // Clean up texture
      if (waterTexture) {
        waterTexture.dispose();
      }
      
      // Clean up mesh resources
      if (waterRef.current) {
        // Clean up geometry
        if (waterRef.current.geometry) {
          waterRef.current.geometry.dispose();
        }
        
        // Clean up material
        if (waterRef.current.material) {
          const material = waterRef.current.material;
          if (Array.isArray(material)) {
            material.forEach(m => m.dispose());
          } else {
            material.dispose();
          }
        }
      }
    };
  }, [waterTexture]);
  
  // Use much more conservative geometry resolution for better performance
  useEffect(() => {
    // Start with lower resolution by default
    setGeometryResolution({ width: 50, height: 50 });
    
    // Get GPU capabilities to determine initial quality
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        console.log('[WaterSurface] GPU detected:', renderer);
        
        // Set initial quality based on GPU capabilities - much more conservative
        if (renderer.includes('NVIDIA') || renderer.includes('AMD') || renderer.includes('Radeon')) {
          // Higher-end GPU - still use moderate resolution
          setGeometryResolution({ width: 80, height: 80 });
          frameSkipRate.current = 2; // Skip every other frame even on good GPUs
        } else if (renderer.includes('Intel')) {
          // Integrated GPU - use very low resolution
          setGeometryResolution({ width: 40, height: 40 });
          // Skip more frames on integrated GPUs
          frameSkipRate.current = 3; // Update every 3rd frame
        } else {
          // Unknown or mobile GPU - be very conservative
          setGeometryResolution({ width: 30, height: 30 });
          // Skip many frames on unknown/mobile GPUs
          frameSkipRate.current = 4; // Update every 4th frame
        }
      }
    }
  }, []);
  
  useFrame((_, delta) => {
    // Exit early if not animating (component is being unmounted)
    if (!isAnimating.current) return;
    
    // Exit if water is hidden or not yet created
    if (!waterRef.current || !waterRef.current.visible) return;
    
    // Update FPS tracking
    fpsMonitor.current.frames++;
    const now = Date.now();
    const elapsed = now - fpsMonitor.current.time;
    
    if (elapsed >= 1000) {
      // Calculate FPS
      fpsMonitor.current.fps = fpsMonitor.current.frames * 1000 / elapsed;
      fpsMonitor.current.frames = 0;
      fpsMonitor.current.time = now;
      
      // Dynamically adjust frame skip rate based on performance
      if (fpsMonitor.current.fps < 30) {
        // Increase frame skip rate if performance is poor
        frameSkipRate.current = Math.min(frameSkipRate.current + 1, 5);
        console.log(`[WaterSurface] Low FPS (${fpsMonitor.current.fps.toFixed(1)}), increasing frame skip rate to ${frameSkipRate.current}`);
        
        // Reduce geometry resolution if needed
        if (fpsMonitor.current.fps < 20 && geometryResolution.width > 40) {
          setGeometryResolution(prev => ({
            width: Math.max(prev.width - 20, 40),
            height: Math.max(prev.height - 20, 40)
          }));
          console.log(`[WaterSurface] Reducing geometry resolution to ${geometryResolution.width}x${geometryResolution.height}`);
        }
      } else if (fpsMonitor.current.fps > 50 && frameSkipRate.current > 1) {
        // Decrease frame skip rate if performance is good
        frameSkipRate.current = Math.max(frameSkipRate.current - 1, 1);
        console.log(`[WaterSurface] Good FPS (${fpsMonitor.current.fps.toFixed(1)}), decreasing frame skip rate to ${frameSkipRate.current}`);
      }
    }
    
    // Skip frames based on frameSkipRate to reduce GPU load
    skipFrameCount.current = (skipFrameCount.current + 1) % frameSkipRate.current;
    if (skipFrameCount.current !== 0) return;
    
    // Current time for proper animation timing
    const currentTime = performance.now();
    const timeSinceLastUpdate = currentTime - lastUpdateTime.current;
    const targetFrameTime = 1000 / 60; // Target 60 FPS (16.67ms per frame)
    
    // Update water animation with fixed timestep for consistent speed
    if (waterRef.current && waterRef.current.material && waterTexture) {
      // Update with consistent timestep (not tied directly to frame rate)
      // This ensures waves move at the same speed regardless of FPS
      time.current += delta * (sceneSettings.waterWaveSpeed || 0.5) * 0.5; // Reduced speed multiplier
      
      // Apply time to displacement map
      const material = waterRef.current.material as THREE.MeshStandardMaterial;
      if (material.displacementMap) {
        material.displacementMap.offset.set(0, time.current * 0.1); // Reduced from 0.15 to 0.1 for smoother movement
        
        // Only update material when needed to reduce GPU work
        if (timeSinceLastUpdate > targetFrameTime * frameSkipRate.current) {
          material.needsUpdate = true;
          lastUpdateTime.current = currentTime;
        }
      }
    }
  });
  
  // Determine material properties based on settings
  const materialProps = useMemo(() => {
    // Base properties
    const props = {
      color: sceneSettings.waterColor || '#4fc3f7',
      transparent: true,
      opacity: sceneSettings.waterOpacity || 0.6,
      metalness: 0.5, // Reduced from 0.7 for better performance
      roughness: 0.3, // Increased from 0.25 for better performance
      side: THREE.FrontSide, // Changed to FrontSide for better performance (from DoubleSide)
      displacementMap: waterTexture || undefined,
      displacementScale: waterTexture ? (sceneSettings.waterWaveScale || 1.0) * 0.8 : 0, // Reduced from 1.2 for better performance
      envMapIntensity: 1.0, // Reduced from 1.5 for better performance
      flatShading: false, // Keep smooth shading for better wave appearance
    };
    
    // Configure depth behavior based on grid visibility settings
    if (sceneSettings.gridShowUnderWater && props.opacity < 0.95) {
      return {
        ...props,
        // Grid can be seen through water
        depthWrite: false,  // Don't write to depth buffer (allows transparent viewing)
        depthTest: true,    // Still test against depth buffer
        // Add refractive properties
        refractionRatio: 0.8,
        reflectivity: 0.2,
      };
    } else {
      return {
        ...props,
        // Water is opaque to the grid beneath
        depthWrite: true,   // Write to depth buffer
        depthTest: true,    // Test against depth buffer
      };
    }
  }, [
    sceneSettings.waterColor,
    sceneSettings.waterOpacity,
    sceneSettings.waterWaveScale,
    sceneSettings.gridShowUnderWater,
    waterTexture
  ]);
  
  // Force rerender on settings change
  useEffect(() => {
    if (waterRef.current) {
      waterRef.current.visible = true;
      // Update material properties from settings
      const material = waterRef.current.material as THREE.MeshStandardMaterial;
      if (material) {
        material.color.set(materialProps.color);
        material.opacity = materialProps.opacity;
        material.depthWrite = materialProps.depthWrite;
        material.depthTest = materialProps.depthTest;
        material.needsUpdate = true;
      }
    }
  }, [materialProps]);
  
  // Use proper frustum culling for better performance
  useEffect(() => {
    if (waterRef.current) {
      waterRef.current.frustumCulled = true;
      
      // Mark for lower update priority
      waterRef.current.userData.isWater = true;
      waterRef.current.userData.updatePriority = 'low';
    }
  }, []);
  
  return (
    <mesh 
      ref={waterRef}
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, 0, 0]} // Position at exactly y=0 (sea level)
      receiveShadow={false} // Disable shadows on water for performance
      frustumCulled={true} // Enable frustum culling for performance
    >
      <planeGeometry 
        args={[10000, 10000, geometryResolution.width, geometryResolution.height]}
        // Simplified geometry update function for better performance
        onUpdate={(geometry) => {
          geometry.computeVertexNormals();
          
          // Disable expensive vertex noise calculations completely
          // This significantly reduces CPU/GPU load
          
          // Always optimize buffers for better performance
          geometry.deleteAttribute('uv2');
          
          // Use static draw usage for all attributes to reduce GPU updates
          const posAttr = geometry.attributes.position as THREE.BufferAttribute;
          const normAttr = geometry.attributes.normal as THREE.BufferAttribute;
          const uvAttr = geometry.attributes.uv as THREE.BufferAttribute;
          
          if (posAttr && posAttr.isBufferAttribute) posAttr.usage = THREE.StaticDrawUsage;
          if (normAttr && normAttr.isBufferAttribute) normAttr.usage = THREE.StaticDrawUsage;
          if (uvAttr && uvAttr.isBufferAttribute) uvAttr.usage = THREE.StaticDrawUsage;
        }}
      />
      <meshStandardMaterial {...materialProps} />
    </mesh>
  );
};

// --- Component for Offset Face Visualization ---
const SelectedFaceVisualizer: React.FC = () => {
    const { state } = useMission();
    const { selectedFace } = state;

    const offsetFaceGeometry = useMemo(() => {
        if (!selectedFace) return null;

        const offsetDistance = 0.1; // Offset distance in meters
        
        // Reconstruct THREE.Vector3 objects from state data
        const normal = new THREE.Vector3(selectedFace.normal.x, selectedFace.normal.y, selectedFace.normal.z);
        const vA = new THREE.Vector3(selectedFace.vertices[0].x, selectedFace.vertices[0].y, selectedFace.vertices[0].z);
        const vB = new THREE.Vector3(selectedFace.vertices[1].x, selectedFace.vertices[1].y, selectedFace.vertices[1].z);
        const vC = new THREE.Vector3(selectedFace.vertices[2].x, selectedFace.vertices[2].y, selectedFace.vertices[2].z);
        
        // Calculate offset vertices
        const vA_off = vA.clone().addScaledVector(normal, offsetDistance);
        const vB_off = vB.clone().addScaledVector(normal, offsetDistance);
        const vC_off = vC.clone().addScaledVector(normal, offsetDistance);
        
        // Create geometry data
        const vertices = new Float32Array([
            vA_off.x, vA_off.y, vA_off.z,
            vB_off.x, vB_off.y, vB_off.z,
            vC_off.x, vC_off.y, vC_off.z,
        ]);
        
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
        geometry.computeVertexNormals(); // Compute normals for lighting
        
        return geometry;

    }, [selectedFace]);

    if (!offsetFaceGeometry) {
        return null;
    }

    return (
        <mesh geometry={offsetFaceGeometry}>
            <meshStandardMaterial 
                color="#ff0000" // Red color
                transparent 
                opacity={0.6} 
                side={THREE.DoubleSide} // Render both sides
            />
        </mesh>
    );
};

// Replace the EnhancedGrid component with this new HierarchicalGrid
const HierarchicalGrid: React.FC<{
  sceneSettings: SceneSettings;
}> = ({ sceneSettings }) => {
  // Get grid size based on scene settings
  const gridSize = useMemo(() => {
    // Convert if needed
    if (sceneSettings.gridUnit === 'meters') {
      return sceneSettings.gridSize; // Already in meters
    } else {
      return feetToMeters(sceneSettings.gridSize); // Convert feet to meters for THREE.js
    }
  }, [sceneSettings.gridSize, sceneSettings.gridUnit]);

  // Calculate offset for grid based on water settings
  const gridOffset = useMemo(() => {
    if (sceneSettings.waterEnabled && !sceneSettings.gridShowUnderWater) {
      return 0.01; // Position just above water level
    } else if (sceneSettings.waterEnabled && sceneSettings.gridShowUnderWater) {
      return -0.05; // Position just below water level
    } else {
      return 0; // Default position
    }
  }, [sceneSettings.waterEnabled, sceneSettings.gridShowUnderWater]);

  // Calculate grid divisions and cell sizes
  const { 
    minorGridSize,
    majorGridSize,
    minorDivisions,
    majorDivisions
  } = useMemo(() => {
    // Main grid parameters
    const minorGridSize = gridSize;
    const minorDivisions = sceneSettings.gridDivisions;
    
    // Calculate major grid parameters based on the interval
    const interval = sceneSettings.gridMajorLineInterval || 5;
    const majorDivisions = Math.ceil(minorDivisions / interval);
    const majorGridSize = minorGridSize;
    
    return {
      minorGridSize,
      majorGridSize,
      minorDivisions,
      majorDivisions
    };
  }, [gridSize, sceneSettings.gridDivisions, sceneSettings.gridMajorLineInterval]);

  // Calculate half grid size for axis lines
  const halfGridSize = gridSize / 2;

  // Check if grid is visible
  const isGridVisible = useMemo(() => {
    return sceneSettings.gridVisible && 
      !(sceneSettings.waterEnabled && !sceneSettings.gridShowUnderWater);
  }, [sceneSettings.gridVisible, sceneSettings.waterEnabled, sceneSettings.gridShowUnderWater]);

  // Custom minor grid material for enhanced visibility
  const minorGridMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: new THREE.Color(sceneSettings.gridMinorColor || '#CCCCCC'),
      transparent: true,
      opacity: sceneSettings.gridEnhancedVisibility ? 0.8 : 0.6,
      depthWrite: false, // Don't write to depth buffer to ensure visibility
      fog: false,
    });
  }, [sceneSettings.gridMinorColor, sceneSettings.gridEnhancedVisibility]);

  // Custom major grid material with increased visibility
  const majorGridMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: new THREE.Color(sceneSettings.gridMajorColor || '#FFFFFF'),
      transparent: true,
      opacity: sceneSettings.gridEnhancedVisibility ? 1.0 : 0.8,
      depthWrite: false,
      linewidth: 2, // Note: this may not work in WebGL, but included for future compatibility
      fog: false,
    });
  }, [sceneSettings.gridMajorColor, sceneSettings.gridEnhancedVisibility]);

  // Custom center line material
  const centerLineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: new THREE.Color(sceneSettings.gridColorCenterLine),
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      linewidth: 3, // Note: this may not work in WebGL, but included for future compatibility
      fog: false,
    });
  }, [sceneSettings.gridColorCenterLine]);

  // Custom grid helper for minor grid lines with fading effect
  const minorGridHelper = useMemo(() => {
    if (!isGridVisible) return null;
    
    // Create standard THREE.js GridHelper
    const helper = new THREE.GridHelper(
      minorGridSize * 5, // Increased size to match ground plane
      minorDivisions,
      new THREE.Color(sceneSettings.gridColorCenterLine), // Center line color
      new THREE.Color(sceneSettings.gridMinorColor) // Minor grid color
    );
    
    // Set material properties
    helper.material = minorGridMaterial;
    
    // Position adjustment if needed
    helper.position.y = gridOffset + 0.1524; // Raise grid by 6 inches (0.1524m)
    
    // Rotation adjustment if needed (grid is on XZ plane by default)
    helper.rotation.x = 0;
    
    return helper;
  }, [
    isGridVisible, 
    minorGridSize, 
    minorDivisions, 
    sceneSettings.gridMinorColor, 
    sceneSettings.gridColorCenterLine,
    minorGridMaterial,
    gridOffset
  ]);

  // Custom grid helper for major grid lines
  const majorGridHelper = useMemo(() => {
    if (!isGridVisible) return null;
    
    // Create a GridHelper for major grid lines
    const helper = new THREE.GridHelper(
      majorGridSize * 5, // Increased size to match ground plane
      majorDivisions,
      new THREE.Color(sceneSettings.gridColorCenterLine), // Center line color
      new THREE.Color(sceneSettings.gridMajorColor) // Major grid color
    );
    
    // Set material properties
    helper.material = majorGridMaterial;
    
    // Position adjustment if needed
    helper.position.y = gridOffset + 0.1524 + 0.01; // Raise grid by 6 inches, plus a tiny bit more for major lines
    
    // Rotation adjustment if needed (grid is on XZ plane by default)
    helper.rotation.x = 0;
    
    return helper;
  }, [
    isGridVisible,
    majorGridSize, 
    majorDivisions, 
    sceneSettings.gridMajorColor, 
    sceneSettings.gridColorCenterLine,
    majorGridMaterial,
    gridOffset
  ]);

  // Frame effect for fading grid with distance
  useFrame(({ camera }) => {
    if (!minorGridHelper || !majorGridHelper) return;

    if (sceneSettings.gridFadeDistance > 0) {
      // Get camera position
      const cameraPosition = camera.position;
      
      // Calculate distance to grid plane (using y-position for vertically-oriented grid)
      const distanceToGrid = Math.abs(cameraPosition.y - gridOffset);
      
      // Calculate opacity based on distance
      const fadeStart = sceneSettings.gridFadeDistance * 0.6;
      const fadeEnd = sceneSettings.gridFadeDistance;
      
      // Minor grid fading
      if (minorGridMaterial) {
        if (distanceToGrid > fadeStart) {
          const normalizedDistance = Math.min(1, (distanceToGrid - fadeStart) / (fadeEnd - fadeStart));
          minorGridMaterial.opacity = sceneSettings.gridEnhancedVisibility 
            ? Math.max(0.1, 0.8 - normalizedDistance * 0.8)
            : Math.max(0.05, 0.6 - normalizedDistance * 0.6);
        } else {
          minorGridMaterial.opacity = sceneSettings.gridEnhancedVisibility ? 0.8 : 0.6;
        }
      }
      
      // Major grid fading - fade more slowly to keep major lines visible longer
      if (majorGridMaterial) {
        if (distanceToGrid > fadeStart) {
          const normalizedDistance = Math.min(1, (distanceToGrid - fadeStart) / (fadeEnd - fadeStart));
          majorGridMaterial.opacity = sceneSettings.gridEnhancedVisibility
            ? Math.max(0.2, 1.0 - normalizedDistance * 0.8)
            : Math.max(0.1, 0.8 - normalizedDistance * 0.7);
        } else {
          majorGridMaterial.opacity = sceneSettings.gridEnhancedVisibility ? 1.0 : 0.8;
        }
      }
    }
  });

  if (!sceneSettings.gridVisible) {
    return null;
  }

  return (
    <>
      {/* Use Three.js primitive for both minor and major grids */}
      {minorGridHelper && <primitive object={minorGridHelper} />}
      {majorGridHelper && <primitive object={majorGridHelper} />}
      
      {/* Add coordinate axes if enabled */}
      {sceneSettings.axesVisible && (
        <>
          {/* X-axis (red) */}
          <Line
            points={[[-halfGridSize, 0, 0], [halfGridSize, 0, 0]]}
            color="red"
            lineWidth={3}
          />
          
          {/* Y-axis (green) */}
          <Line
            points={[[0, 0, -halfGridSize], [0, 0, halfGridSize]]}
            color="green"
            lineWidth={3}
          />
        </>
      )}
    </>
  );
};

// Define the type for presets explicitly if not automatically inferred
// This helps ensure the `preset` prop is correctly typed.
type PresetType = "sunset" | "dawn" | "night" | "warehouse" | "forest" | "apartment" | "studio" | "city" | "park" | "lobby";

// Custom hook to preload the environment map
const usePreloadEnvironmentMap = (preset: PresetType | null) => {
  useEffect(() => {
    if (preset) {
      // Preload the environment map texture
      const loader = new THREE.CubeTextureLoader();
      // The path patterns would typically match what drei's Environment component uses internally
      console.log(`Preloading environment map: ${preset}`);
      
      // This is a simplified preloading approach - the actual implementation would
      // need to match how drei's Environment component loads its textures
    }
  }, [preset]);
};

function arePropsEqual(prevProps: any, nextProps: any) {
  // Deep comparison for position objects
  const positionEqual = (prev: any, next: any) => {
    if (!prev && !next) return true;
    if (!prev || !next) return false;
    return Math.abs(prev.x - next.x) < 0.001 && 
           Math.abs(prev.y - next.y) < 0.001 && 
           Math.abs(prev.z - next.z) < 0.001;
  };

  // Deep comparison for rotation objects
  const rotationEqual = (prev: any, next: any) => {
    if (!prev && !next) return true;
    if (!prev || !next) return false;
    return Math.abs(prev.heading - next.heading) < 0.001 && 
           Math.abs(prev.pitch - next.pitch) < 0.001 && 
           Math.abs(prev.roll - next.roll) < 0.001;
  };

  return positionEqual(prevProps.position, nextProps.position) &&
         rotationEqual(prevProps.rotation, nextProps.rotation) &&
         prevProps.isSelected === nextProps.isSelected;
}

// Define the props interface for the SceneObjectRenderer
interface SceneObjectRendererProps {
  sceneObject: any; // Replace with your actual SceneObject type
  isSelected: boolean;
  selectedFaceIndex?: number;
  onInteraction: (
    objectId: string, 
    objectType: 'sceneObject', 
    isShiftPressed: boolean, 
    event: ThreeEvent<MouseEvent>
  ) => void;
  onPointerOver: (objectId: string) => void;
  onPointerOut: (objectId: string) => void;
}

// Create memoized version of scene object renderer with proper types
const MemoizedSceneObjectRenderer = React.memo((props: SceneObjectRendererProps) => {
  return (
    <SceneObjectRenderer
      sceneObject={props.sceneObject}
      isSelected={props.isSelected}
      selectedFaceIndex={props.selectedFaceIndex}
      onInteraction={props.onInteraction}
      onPointerOver={props.onPointerOver}
      onPointerOut={props.onPointerOut}
    />
  );
}, arePropsEqual);

// Main scene component - Now accepts live props and gimbalPitch
const MissionScene: React.FC<MissionSceneProps> = ({
  liveDronePosition,
  liveDroneRotation,
  manualDronePosition,
  onDroneDoubleClick,
  cameraFollowsDrone,
  visualizationSettings,
  gimbalPitch, // Receive gimbalPitch prop
  droneRotation // Receive actual drone rotation
}) => {
  const { state, dispatch } = useMission();
  const threeState = useThree(); // Access camera, mouse, etc.
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  
  // Preload the environment map for better performance
  usePreloadEnvironmentMap(state.sceneSettings.environmentMap as PresetType | null);
  
  // Destructure state properly
  const { 
    currentMission, drawingMode, isSelectingTakeoffPoint, 
    isDroneVisible, missionAreas, selectedFace,
    selectedPathSegmentIds,
    selectedPathSegment,
    selectedWaypoint,
    hiddenGcpIds,
    isSimulating,
    simulationSpeed,
    sceneObjects,
    isFaceSelectionModeActive,
    transformObjectId,
    sceneSettings,
    hardware,
    isCameraFrustumVisible
  } = state;

  // State for drone simulation (only used when isSimulating is true)
  const [simDronePosition, setSimDronePosition] = useState<LocalCoord>({ x: 0, y: 0, z: 0 });
  const [simDroneRotation, setSimDroneRotation] = useState({ heading: 0, pitch: 0, roll: 0 });
  const [currentTargetWaypointIndex, setCurrentTargetWaypointIndex] = useState<number>(0);
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0); // Progress along current leg (0 to 1)

  // State for object dragging/transforming
  const [interactingObjectInfo, setInteractingObjectInfo] = useState<{ id: string; type: 'sceneObject' | 'gcp'; mode: 'drag' | 'transform' } | null>(null);
  const [draggedObjectPreviewPosition, setDraggedObjectPreviewPosition] = useState<LocalCoord | null>(null);
  // State to store initial properties ONLY when transform starts
  const [initialTransformState, setInitialTransformState] = useState<{
      object: any;
      position: [number, number, number];
      rotation: [number, number, number];
      scale: THREE.Vector3;
  } | null>(null);
  
  const transformControlsRef = useRef<any>(null!);
  const objectToTransformRef = useRef<THREE.Mesh>(null!);

  // Define the ground plane for raycasting (Y=0 in Three.js coordinates)
  const groundPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)).current;

  // State to store the camera offset vector when following
  const [cameraOffset, setCameraOffset] = useState<THREE.Vector3 | null>(null);
  // Ref to track the previous follow state
  const prevCameraFollowsDrone = useRef<boolean>(cameraFollowsDrone);
  
  // Handle face selection
  const handleFaceSelect = (faceInfo: any | null) => {
    dispatch({ type: 'SET_SELECTED_FACE', payload: faceInfo });
  };
  
  // Clear selected face when clicking on empty space
  const handleBackgroundClick = (event: ThreeEvent<MouseEvent>) => {
    // If clicking background while trying to select a face, turn off selection mode
    if (isFaceSelectionModeActive) {
        dispatch({ type: 'TOGGLE_FACE_SELECTION_MODE', payload: false });
    }
    // Always clear the selection visualization if clicking background
    if (selectedFace) {
       dispatch({ type: 'SET_SELECTED_FACE', payload: null });
    }
  };

  // Add spring animation for the dragged object
  const [dragSpring, setDragSpring] = useSpring(() => ({
    position: [0, 0, 0],
    config: DRAG_SPRING_CONFIG,
  }));

  // Add throttling to pointer move to reduce excessive updates
  const handlePointerMove = (event: THREE.Event) => {
    // Perform raycasting only if needed (drawing polygon or dragging)
    if (drawingMode !== 'polygon' && interactingObjectInfo?.mode !== 'drag') return;

    const { camera, raycaster, pointer } = useThree();
    raycaster.setFromCamera(pointer, camera);
    const intersection = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(groundPlane, intersection)) {
      // Convert intersection point (Three.js coords) back to LocalCoord (ENU)
      const groundCoord: LocalCoord = {
        x: intersection.x,
        y: -intersection.z, // Convert Three.js z back to ENU y
        z: 0 // Assume interaction is on the ground (z=0 in ENU)
      };

      if (drawingMode === 'polygon') {
        dispatch({ type: 'UPDATE_POLYGON_PREVIEW_POINT', payload: groundCoord });
      } else if (interactingObjectInfo?.mode === 'drag') {
        // For brevity, just handling basic dragging
        setDraggedObjectPreviewPosition(groundCoord);
        // Update spring animation for drag
        setDragSpring({
          position: [groundCoord.x, groundCoord.z || 0, -groundCoord.y],
          config: DRAG_SPRING_CONFIG
        });
      }
    }
  };

  // Modified pointer down handler
  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    // Stop propagation to prevent OrbitControls interaction
    event.stopPropagation();

    // Check if the click was on our ground plane mesh
    if (event.intersections.length > 0) {
      const intersectionPoint = event.point; // Intersection point in Three.js world coords

      // Convert intersection point (Three.js coords) back to LocalCoord (ENU)
      const clickedCoord: LocalCoord = {
        x: intersectionPoint.x,
        y: -intersectionPoint.z, // Convert Three.js z back to ENU y
        z: intersectionPoint.y   // Use Three.js y as height
      };

      // Handle based on the current interaction mode
      if (isSelectingTakeoffPoint) {
        console.log("[MissionScene] Setting takeoff point at:", clickedCoord);
        dispatch({ type: 'SET_TAKEOFF_POINT', payload: clickedCoord });
      } else if (drawingMode === 'polygon') {
        dispatch({ type: 'ADD_POLYGON_POINT', payload: clickedCoord });
      }
    }
  };

  // Reset simulation state when simulation starts or mission/segment changes
  useEffect(() => {
    if (currentMission && currentMission.pathSegments.length > 0) {
      // Simulation setup logic - simplified for brevity
      const segmentToSimulate = currentMission.pathSegments.find(seg => seg.waypoints.length > 1);

      if (segmentToSimulate && segmentToSimulate.waypoints.length > 1 && segmentToSimulate.waypoints[0].local) {
        setCurrentSegmentId(segmentToSimulate.id);
        setCurrentTargetWaypointIndex(1);
        setProgress(0);
        setSimDronePosition(segmentToSimulate.waypoints[0].local);
        
        // Set initial rotation based on first leg direction
        if (segmentToSimulate.waypoints[1].local) {
          const p1 = segmentToSimulate.waypoints[0].local;
          const p2 = segmentToSimulate.waypoints[1].local;
          const heading = (Math.atan2(p2.x - p1.x, p2.y - p1.y) * (180 / Math.PI) + 360) % 360;
          setSimDroneRotation({ heading, pitch: 0, roll: 0 });
        }
      }
    }
  }, [currentMission, dispatch]);

  // Simulation loop using useFrame - simplified
  useFrame((_, delta) => {
    // Simplified simulation logic
    if (currentSegmentId && currentMission) {
      const segment = currentMission.pathSegments.find(s => s.id === currentSegmentId);
      
      if (segment && segment.waypoints.length >= 2) {
        // Basic simulation code would go here
        // Update drone position along path
      }
    }
    
    // Camera follow logic with null check - don't attempt to follow if no drone position
    if (cameraFollowsDrone && cameraOffset && activeDronePosition && transformControlsRef.current) {
      const targetPos = new THREE.Vector3(
        activeDronePosition.x, 
        activeDronePosition.z, 
        -activeDronePosition.y
      );
      
      // Dispatch an event for CADControls to handle rather than directly manipulating the camera
      // This allows our CADControls component to coordinate the movement
      const followEvent = new CustomEvent('drone-camera-follow', {
        detail: {
          targetPosition: targetPos,
          offset: cameraOffset
        }
      });
      window.dispatchEvent(followEvent);
      
      // Only update the controls target, not the camera position directly
      // This helps prevent the camera from rotating when zooming
      transformControlsRef.current.target.copy(targetPos);
      transformControlsRef.current.update();
    }
  });

  // Use state for polygon points instead of currentMission
  const usePolyPoints = useMemo(() => {
    // Map local coordinates to Three.js coordinates
    const points = mapLocalCoordsToThree(state.polygonPoints);
    if (state.polygonPreviewPoint && points.length > 0) {
      points.push(mapLocalCoordsToThree([state.polygonPreviewPoint])[0]);
    }
    return points;
  }, [state.polygonPoints, state.polygonPreviewPoint, currentMission]);

  // Handle waypoint selection
  const handleWaypointClick = (waypoint: Waypoint) => {
    dispatch({ type: 'SELECT_WAYPOINT', payload: waypoint });
  };

  // Handle path segment selection
  const handleSegmentClick = (segment: PathSegment) => {
    dispatch({ type: 'SELECT_PATH_SEGMENT', payload: segment });
  };

  // Determine the current drone position - explicitly type as possibly null
  const activeDronePosition = useMemo<LocalCoord | null>(() => {
    // First priority: If we're simulating, use the simulation position
    if (isSimulating) return simDronePosition;
    
    // Second priority: Manually positioned drone (from control panel)
    if (manualDronePosition) return manualDronePosition;
    
    // Third priority: Live drone position from telemetry
    if (liveDronePosition) return liveDronePosition;
    
    // Fourth priority: Takeoff point if it exists
    if (currentMission?.takeoffPoint) return currentMission.takeoffPoint;
    
    // No drone position available - return null so drone isn't rendered
    // until user sets a takeoff point
    return null;
  }, [
    isSimulating, 
    simDronePosition, 
    manualDronePosition, 
    liveDronePosition,
    currentMission?.takeoffPoint
  ]);

  // Log drone position information for debugging
  useEffect(() => {
    console.log("[MissionScene] Drone position status:", {
      hasTakeoffPoint: !!currentMission?.takeoffPoint,
      isSimulating,
      hasManualPosition: !!manualDronePosition,
      hasLivePosition: !!liveDronePosition,
      activeDronePosition: activeDronePosition ? 'available' : 'null',
      isDroneVisible
    });
  }, [activeDronePosition, currentMission?.takeoffPoint, isSimulating, manualDronePosition, liveDronePosition, isDroneVisible]);

  const activeDroneRotation = useMemo(() => {
    // If no drone position, don't return a rotation
    if (!activeDronePosition) return null;
    
    // First priority: If we're simulating, use the simulation rotation
    if (isSimulating) return simDroneRotation;
    
    // Second priority: Live drone rotation from telemetry
    if (liveDroneRotation) return liveDroneRotation;
    
    // Third priority: Explicit rotation passed via prop
    if (droneRotation) return droneRotation;
    
    // Default rotation (only if we have a drone position)
    return { heading: 0, pitch: 0, roll: 0 }; 
  }, [isSimulating, simDroneRotation, liveDroneRotation, droneRotation, activeDronePosition]);

  // Effect to calculate/clear offset and reset target when follow state changes
  useEffect(() => {
    const justEnabledFollow = cameraFollowsDrone && !prevCameraFollowsDrone.current;
    const justDisabledFollow = !cameraFollowsDrone && prevCameraFollowsDrone.current;

    if (justEnabledFollow && activeDronePosition) {
      const currentTargetVec = new THREE.Vector3(
        activeDronePosition.x, 
        activeDronePosition.z, 
        -activeDronePosition.y
      );
      const offset = new THREE.Vector3().subVectors(useThree().camera.position, currentTargetVec);
      setCameraOffset(offset);
      
      // Ensure target is set correctly when follow is enabled initially
      if (transformControlsRef.current) {
        transformControlsRef.current.target.copy(currentTargetVec);
      }
    } else if (justDisabledFollow) {
      setCameraOffset(null);
      // Reset target to origin when follow is disabled
      if (transformControlsRef.current) {
        transformControlsRef.current.target.set(0, 0, 0);
      }
    }

    // Update previous state ref for next render
    prevCameraFollowsDrone.current = cameraFollowsDrone;
  }, [cameraFollowsDrone, useThree().camera, transformControlsRef, activeDronePosition]);

  // Add an effect to listen for object selection events from CADControls
  useEffect(() => {
    const handleSelectSceneObject = (event: CustomEvent) => {
      const { object, point } = event.detail;
      
      // Only process objects with valid userData
      if (object && object.userData && object.userData.sceneObjectId) {
        console.log("Scene object selected via double-click:", object.userData.sceneObjectId);
        console.log("Selection point:", point);
        
        // Ensure the point is above ground plane (y > 0)
        if (point.y > 0) {
          // Set the object for editing
          dispatch({ type: 'SET_EDITING_SCENE_OBJECT_ID', payload: object.userData.sceneObjectId });
        } else {
          console.log("Ignoring selection below ground plane");
        }
      }
    };
    
    // Add event listener
    window.addEventListener('select-scene-object', handleSelectSceneObject as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('select-scene-object', handleSelectSceneObject as EventListener);
    };
  }, [dispatch]);

  // Effect to listen for Escape key to cancel dragging/transforming
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && interactingObjectInfo) {
        setInteractingObjectInfo(null);
        setDraggedObjectPreviewPosition(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [interactingObjectInfo]);

  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);

  // Basic pointer over/out handlers
  const handlePointerOver = (objectId: string) => {
    setHoveredObjectId(objectId);
  };

  const handlePointerOut = (objectId: string) => {
    if (hoveredObjectId === objectId) {
      setHoveredObjectId(null);
    }
  };

  // Add debugging output
  useEffect(() => {
    console.log("[MissionScene] State data:", {
      hasMission: !!currentMission,
      missionAreas,
      isArray: Array.isArray(missionAreas),
      areasLength: missionAreas ? missionAreas.length : 'undefined'
    });
  }, [currentMission, missionAreas]);

  // --- Filtered Path Segments for Rendering ---
  const visiblePathSegments = useMemo(() => {
    if (!currentMission) return [];
    return currentMission.pathSegments.filter(seg => selectedPathSegmentIds.includes(seg.id));
  }, [currentMission, selectedPathSegmentIds]);
  // --- End Filtered Segments ---

  // --- Simulation State --- 
  const [simulationWaypoints, setSimulationWaypoints] = useState<LocalCoord[]>([]);
  const [simTargetWpIndex, setSimTargetWpIndex] = useState<number>(0);
  const [simLegProgress, setSimLegProgress] = useState<number>(0);
  const [simCurrentSegmentId, setSimCurrentSegmentId] = useState<string | null>(null);
  // Add states for camera transitions and waypoint holdTime
  const [isHoldingAtWaypoint, setIsHoldingAtWaypoint] = useState<boolean>(false);
  const [holdTimeRemaining, setHoldTimeRemaining] = useState<number>(0);
  const [waypointHoldStartTime, setWaypointHoldStartTime] = useState<number>(0);
  const [cameraTransition, setCameraTransition] = useState<{
    startPitch: number;
    targetPitch: number;
    startRoll: number;
    targetRoll: number;
    progress: number;
  } | null>(null);

  // --- Combined Waypoint List for Simulation ---
  // Generates the sequence: Takeoff Point -> Waypoints of Segment 1 -> Waypoints of Segment 2 -> ...
  const combinedSimulationPath = useMemo(() => {
    if (!currentMission || !currentMission.takeoffPoint) {
      return [];
    }
    
    // Initialize with takeoff point
    const waypoints: { coord: LocalCoord; segmentId: string | null }[] = [
      { coord: currentMission.takeoffPoint, segmentId: null } // Start at takeoff point (null segmentId)
    ];

    // If there are no visible segments but we have segments in the mission, automatically select the first one
    // TypeScript-safe way to access pathSegments
    const missionSegments = currentMission.pathSegments || [];
    const visibleSegmentIds = selectedPathSegmentIds.length > 0 
      ? selectedPathSegmentIds 
      : (missionSegments.length > 0 ? [missionSegments[0].id] : []);
    
    // Add waypoints from selected segments in their original order
    missionSegments.forEach(segment => {
      if (visibleSegmentIds.includes(segment.id) && segment.waypoints.length > 0) {
        console.log(`Adding segment ${segment.id} with ${segment.waypoints.length} waypoints to simulation path`);
        segment.waypoints.forEach(wp => {
          if (wp.local) {
            waypoints.push({ coord: wp.local, segmentId: segment.id });
          }
        });
      }
    });
    
    // If we have only the takeoff point, add a default second point to ensure paths can be created
    if (waypoints.length === 1 && currentMission.takeoffPoint) {
      // Add a point 10 meters in front of takeoff
      const defaultPoint: LocalCoord = {
        x: currentMission.takeoffPoint.x,
        y: currentMission.takeoffPoint.y + 10, // 10 meters forward
        z: currentMission.takeoffPoint.z
      };
      waypoints.push({ coord: defaultPoint, segmentId: null });
      console.log("[MissionScene] Added default waypoint to ensure valid simulation path");
    }
    
    console.log(`Combined simulation path has ${waypoints.length} points (including takeoff)`);
    return waypoints;
  }, [currentMission, selectedPathSegmentIds]);

  // --- Simulation Setup Effect --- 
  // Resets simulation state when simulation starts/stops or path changes
  useEffect(() => {
    console.log("Simulation setup effect triggered. isSimulating:", isSimulating, "path length:", combinedSimulationPath.length);
    
    if (isSimulating && combinedSimulationPath.length > 0) {
      // Simulation is starting or path changed while simulating
      console.log("Setting up simulation...");
      
      // If there are no visible segments but we have segments in the mission, automatically select the first one
      if (selectedPathSegmentIds.length === 0 && currentMission && currentMission.pathSegments && currentMission.pathSegments.length > 0) {
        console.log("No segments selected. Auto-selecting first segment for simulation.");
        dispatch({ 
          type: 'TOGGLE_PATH_SEGMENT_SELECTION', 
          payload: currentMission.pathSegments[0].id 
        });
      }
      
      const startPoint = combinedSimulationPath[0].coord;
      setSimDronePosition(startPoint);
      
      // Only set target to 1 if we have more than one point
      if (combinedSimulationPath.length > 1) {
        setSimTargetWpIndex(1); // Start moving towards the first waypoint after takeoff
        setSimCurrentSegmentId(combinedSimulationPath[1]?.segmentId ?? null); // Segment ID of the first *leg*
      }
      
      setSimLegProgress(0);
      setSimulationWaypoints(combinedSimulationPath.map(p => p.coord)); // Store just the coords
      
      // Set initial rotation based on first leg direction (takeoff to first waypoint)
      if (combinedSimulationPath.length > 1) {
        const p1 = combinedSimulationPath[0].coord;
        const p2 = combinedSimulationPath[1].coord;
        const heading = (Math.atan2(p2.x - p1.x, p2.y - p1.y) * (180 / Math.PI) + 360) % 360;
        setSimDroneRotation({ heading, pitch: 0, roll: 0 });
      } else {
        setSimDroneRotation({ heading: 0, pitch: 0, roll: 0 }); // Default if only takeoff point
      }
      
      // Dispatch initial progress
      dispatch({ 
        type: 'SET_SIMULATION_PROGRESS', 
        payload: { 
          segmentId: combinedSimulationPath.length > 1 ? combinedSimulationPath[1]?.segmentId : null, 
          waypointIndex: 0, // At the start point
          totalWaypoints: combinedSimulationPath.length // Total points including takeoff
        } 
      });
    } else if (!isSimulating) {
      // Simulation stopped, reset progress
      console.log("Simulation stopped or no path.");
      setSimTargetWpIndex(0);
      setSimLegProgress(0);
      
      // Only clear waypoints if we have no path
      if (combinedSimulationPath.length === 0) {
        setSimulationWaypoints([]);
        // Keep simDronePosition where it stopped? Or reset to takeoff? Resetting for now.
        setSimDronePosition(currentMission?.takeoffPoint || { x: 0, y: 0, z: 0 }); 
        setSimDroneRotation({ heading: 0, pitch: 0, roll: 0 });
      }
      
      setSimCurrentSegmentId(null);
      
      // Clear progress in context
      dispatch({ 
        type: 'SET_SIMULATION_PROGRESS', 
        payload: { segmentId: null, waypointIndex: 0, totalWaypoints: 0 } 
      });
    }
  }, [combinedSimulationPath, currentMission, dispatch, isSimulating, selectedPathSegmentIds]); // Add selectedPathSegmentIds dependency
  
  // --- Simulation Loop --- 
  useFrame((state, delta) => {
    try {
      // First, check if we have a valid simulation path
      if (combinedSimulationPath.length < 2 && isSimulating) {
        console.warn("Simulation started but no valid path available");
        return;
      }
      
      if (!isSimulating || simulationWaypoints.length < 2 || simTargetWpIndex >= simulationWaypoints.length) {
        // Not simulating, path too short, or finished
        if (isSimulating && simTargetWpIndex >= simulationWaypoints.length && simulationWaypoints.length > 0) {
          // If finished, stop simulation
          console.log("Simulation path finished.");
          dispatch({ type: 'STOP_SIMULATION' });
        }
        return; 
      }

      // If we're holding at a waypoint, handle the hold time and camera transition
      if (isHoldingAtWaypoint) {
        const currentTime = state.clock.elapsedTime;
        const elapsedHoldTime = currentTime - waypointHoldStartTime;
        const remainingTime = Math.max(0, holdTimeRemaining - elapsedHoldTime);
        
        // Update camera transition if active
        if (cameraTransition) {
          // Calculate transition progress (0 to 1) over the first 2 seconds or half of hold time
          const transitionDuration = Math.min(2, holdTimeRemaining / 2);
          const transitionProgress = Math.min(1, elapsedHoldTime / transitionDuration);
          
          // Update camera transition progress
          setCameraTransition({
            ...cameraTransition,
            progress: transitionProgress
          });
          
          // Apply camera transitions to rotation
          if (simDroneRotation) {
            // Interpolate pitch and roll
            const newPitch = cameraTransition.startPitch + 
              (cameraTransition.targetPitch - cameraTransition.startPitch) * transitionProgress;
            const newRoll = cameraTransition.startRoll + 
              (cameraTransition.targetRoll - cameraTransition.startRoll) * transitionProgress;
            
            setSimDroneRotation(prev => ({
              ...prev,
              pitch: newPitch,
              roll: newRoll
            }));
          }
        }
        
        // If hold time is complete, continue to next waypoint
        if (remainingTime <= 0) {
          console.log("Hold time complete, continuing mission");
          setIsHoldingAtWaypoint(false);
          setCameraTransition(null);
          
          // Move to the next waypoint
          const nextTargetIndex = simTargetWpIndex + 1;
          if (nextTargetIndex < simulationWaypoints.length) {
            setSimTargetWpIndex(nextTargetIndex);
            setSimLegProgress(0); // Reset progress for the new leg
            // Update the current segment ID for the *next* leg
            setSimCurrentSegmentId(combinedSimulationPath[nextTargetIndex]?.segmentId ?? null);
          }
        }
        
        return; // Skip regular movement while holding
      }
      
      // Get current position, target position, and the segment ID for this leg
      const currentPos = simulationWaypoints[simTargetWpIndex - 1];
      const targetPos = simulationWaypoints[simTargetWpIndex];
      const legSegmentId = combinedSimulationPath[simTargetWpIndex]?.segmentId ?? simCurrentSegmentId; // Get segment ID for this leg
      
      if (!currentPos || !targetPos) {
        console.error("Missing position data for simulation", {
          currentWpIndex: simTargetWpIndex - 1,
          targetWpIndex: simTargetWpIndex,
          waypointsLength: simulationWaypoints.length
        });
        return;
      }
      
      // Calculate vector and distance for the current leg
      const dx = targetPos.x - currentPos.x;
      const dy = targetPos.y - currentPos.y;
      const dz = targetPos.z - currentPos.z;
      const legDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (legDistance < 0.01) { // Avoid division by zero if waypoints are identical
        // Move instantly to the next waypoint
        setSimLegProgress(1);
      } else {
        // Get speed for this segment (use default mission speed for now)
        // TODO: Enhance to use segment-specific speed if available
        const speed = currentMission?.defaultSpeed || 5; // m/s
        const effectiveSpeed = speed * simulationSpeed; // Apply timeline speed multiplier
        
        // Calculate distance to move this frame
        const moveDistance = effectiveSpeed * delta; // distance = speed * time
        
        // Calculate progress increment for this frame
        const progressIncrement = moveDistance / legDistance;
        
        // Update leg progress - use a function to avoid state update conflicts
        setSimLegProgress(prev => Math.min(1, prev + progressIncrement));
      }
      
      // Calculate new interpolated position based on progress
      const newX = currentPos.x + dx * simLegProgress;
      const newY = currentPos.y + dy * simLegProgress;
      const newZ = currentPos.z + dz * simLegProgress;
      setSimDronePosition({ x: newX, y: newY, z: newZ });
      
      // Calculate heading (only update if moving)
      if (legDistance > 0.01) {
        const heading = (Math.atan2(dx, dy) * (180 / Math.PI) + 360) % 360; // Use dx, dy for heading in XY plane
        setSimDroneRotation(prev => ({ ...prev, heading }));
      }
      
      // Update progress in context (report based on TARGET index)
      dispatch({ 
        type: 'SET_SIMULATION_PROGRESS', 
        payload: { 
          segmentId: legSegmentId, // Report the segment this leg belongs to
          waypointIndex: simTargetWpIndex, // Report the index we are heading towards
          totalWaypoints: simulationWaypoints.length 
        } 
      });

      // Check if leg is completed
      if (simLegProgress >= 1) {
        // Find the waypoint data for the current target waypoint
        const segmentWaypointIndex = simTargetWpIndex !== undefined && simTargetWpIndex > 0 ? simTargetWpIndex - 1 : 0;
        const currentSegment = currentMission?.pathSegments.find(seg => seg.id === legSegmentId);
        const targetWaypoint = currentSegment?.waypoints.find((_, idx) => {
          // Match waypoint index in the segment to our current target
          // This is a simplification - in a real implementation, you'd need a more robust way 
          // to match simulation waypoints to actual mission waypoints
          return idx === segmentWaypointIndex;
        });
        
        // Check if the waypoint has a hold time
        const holdDuration = targetWaypoint?.holdTime ?? 0; // Default to 0 if undefined
        
        if (holdDuration > 0 && !isHoldingAtWaypoint) {
          console.log(`Pausing at waypoint for ${holdDuration} seconds`);
          
          // Enter hold state
          setIsHoldingAtWaypoint(true);
          setHoldTimeRemaining(holdDuration);
          setWaypointHoldStartTime(state.clock.elapsedTime);
          
          // Initialize camera transition if the waypoint has camera orientation
          if (targetWaypoint?.camera) {
            const { pitch = 0, roll = 0 } = targetWaypoint.camera;
            const currentRotation = simDroneRotation || { heading: 0, pitch: 0, roll: 0 };
            
            setCameraTransition({
              startPitch: currentRotation.pitch,
              targetPitch: pitch,
              startRoll: currentRotation.roll,
              targetRoll: roll,
              progress: 0
            });
            
            console.log(`Starting camera transition to pitch: ${pitch}, roll: ${roll}`);
          }
        } else {
          // No hold time, move to the next waypoint immediately
          const nextTargetIndex = simTargetWpIndex + 1;
          if (nextTargetIndex < simulationWaypoints.length) {
            setSimTargetWpIndex(nextTargetIndex);
            setSimLegProgress(0); // Reset progress for the new leg
            // Update the current segment ID for the *next* leg
            setSimCurrentSegmentId(combinedSimulationPath[nextTargetIndex]?.segmentId ?? null);
          } else {
            // Reached the end of the last waypoint
            setSimTargetWpIndex(nextTargetIndex); // Set index beyond bounds to stop in the next frame
            console.log("Reached end of simulation path.");
            // Optionally dispatch STOP_SIMULATION here or let the next frame handle it
          }
        }
      }
    } catch (error) {
      console.error("Error in simulation loop:", error);
      // Try to recover by stopping simulation
      dispatch({ type: 'STOP_SIMULATION' });
    }
  });
  // --- End Simulation --- 
  
  // Add a handler to exit transform mode
  const handleExitTransformMode = () => {
    dispatch({ type: 'SET_TRANSFORM_OBJECT_ID', payload: null });
  };

  // Turn on water for certain environments to showcase reflections
  useEffect(() => {
    // If certain environment presets that look good with water, enable it
    if (sceneSettings.environmentMap &&
        ['warehouse', 'sunset', 'dawn', 'forest'].includes(sceneSettings.environmentMap) &&
        !sceneSettings.waterEnabled) {
      // Check if we should recommend enabling water for better visuals
      console.log(`[MissionScene] Environment '${sceneSettings.environmentMap}' would look better with water reflections`);
    }
  }, [sceneSettings.environmentMap, sceneSettings.waterEnabled]);

  // Handle takeoff point selection
  useEffect(() => {
    if (state.isSelectingTakeoffPoint) {
      console.log("[MissionScene] Takeoff point selection mode activated");
      
      // The groundPlane click is already handled in the handlePointerDown function
      // which was updated to check for isSelectingTakeoffPoint
    }
  }, [state.isSelectingTakeoffPoint]);

  // Get access to the native three.js scene
  const { scene } = useThree();
  
  // --- Add console log for debugging --- 
  console.log("[MissionScene Render] Settings Check:", {
    skyEnabled: sceneSettings.skyEnabled,
    environmentMap: sceneSettings.environmentMap
  });
  // --- End console log ---
  
  // Water effect with proper nullish coalescing operators
  return (
    <>
      <SceneSetup />

      {/* --- Lighting & Environment --- */}
      {/* Render Environment if a preset is selected */}
      {sceneSettings.environmentMap && (
        <Suspense fallback={null}> 
          <group>
            {/* Add explanatory comments */}
            {/* 
              Use the Environment component to load the HDRI environment map
              The 'ground' property is crucial for fixing the orientation issue.
              It creates a ground projection that aligns the environment with the Y-up world
              so the sky appears above and the ground below.
            */}
            <Environment
              preset={sceneSettings.environmentMap as PresetType}
              background={true} // Change to true to show environment map as background
              resolution={1024} // Higher resolution for better quality
            />
          </group>
        </Suspense>
      )}

      {/* Render Sky/Background Color only if no environment map is selected */}
      {!sceneSettings.environmentMap && (
        sceneSettings.skyEnabled ? (
          // If Sky is enabled, render it
          <Sky
            distance={450000}
            sunPosition={sceneSettings.sunPosition || [100, 10, 100]}
            rayleigh={0.5}
            turbidity={10}
            mieCoefficient={0.005}
            mieDirectionalG={0.8}
          />
        ) : (
          // Sky is disabled: Render solid color
          <color attach="background" args={[sceneSettings.backgroundColor]} />
        )
      )}

      {/* Directional light (always present for shadows) */}
      <directionalLight
        position={[100, 100, 100]}
        intensity={0.8}
        castShadow={sceneSettings.shadowsEnabled}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-bias={-0.001}
      >
        {/* Add optimization to only update shadow map when necessary */}
        <group onUpdate={(self) => {
          const directionalLight = self.parent as THREE.DirectionalLight;
          if (directionalLight && directionalLight.shadow) {
            directionalLight.shadow.autoUpdate = false;
            directionalLight.shadow.needsUpdate = true;
          }
        }} />
      </directionalLight>
      
      {/* Ambient light with slightly higher intensity */}
      <ambientLight intensity={0.5} /> {/* Reduced from 0.8 or whatever the previous value was */}
      
      {/* Add hemisphere light for better sky/ground color interaction */}
      <hemisphereLight 
        args={['#94c5ff', '#805a38', 0.6]} 
        position={[0, 50, 0]} 
      />

      {/* Ground plane and grid */}
      <HierarchicalGrid sceneSettings={sceneSettings} />

      {/* Enhanced ground plane with visibility toggle */}
      <GroundPlane
        sceneSettings={sceneSettings}
        onBackgroundClick={handleBackgroundClick}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
      />
      
      {/* Water effect with scene settings */}
      <WaterSurface sceneSettings={sceneSettings} />

      {/* Render Scene Objects */}
      {sceneObjects.map(obj => (
        <MemoizedSceneObjectRenderer
          key={obj.id}
          sceneObject={obj}
          isSelected={obj.id === selectedFace?.objectId}
          selectedFaceIndex={selectedFace?.objectId === obj.id ? selectedFace.faceIndex : undefined}
          onInteraction={(objectId, objectType, isShiftPressed, event) => {
            console.log(`Interaction with ${objectType} ${objectId}`);
            
            // Handle different types of interactions based on object type
            if (objectType === 'sceneObject') {
              // Just log for now, keep it simple - actual selection handled in the renderer
              console.log("Scene object clicked:", objectId);
            }
          }}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        />
      ))}

      {/* Render Mission Elements */}
      {visiblePathSegments.map(segment => (
        <React.Fragment key={segment.id}>
          {/* Render Path Line */}
          {segment.waypoints.length > 1 && (
            <PathLine
              segment={segment}
              selected={segment.id === selectedPathSegment?.id}
              onClick={() => { handleSegmentClick(segment); }}
            />
          )}
          {/* Render Waypoints */}
          {segment.waypoints.map((wp) => (
            wp.local && (
              <WaypointMarker
                key={wp.id}
                waypoint={wp}
                selected={wp.id === selectedWaypoint?.id}
                onClick={() => { handleWaypointClick(wp); }}
              />
            )
          ))}
          {/* Render Ground Projections (if available) */}
          {((segment as PathSegmentWithProjections).groundProjections || []).map((wp: Waypoint) => (
            wp.local && (
              <WaypointMarker
                key={wp.id}
                waypoint={wp}
                selected={false} // Ground projections are never selected
                onClick={() => { handleSegmentClick(segment); }} // Clicking ground projection selects the segment
              />
            )
          ))}
        </React.Fragment>
      ))}

      {/* Render GCPs */}
      {currentMission?.gcps?.filter(gcp => !hiddenGcpIds.includes(gcp.id)).map((gcp) => (
        <GCPMarker
          key={gcp.id}
          gcp={gcp}
          onInteraction={(objectId, objectType, isShiftPressed, event) => {
            console.log(`GCP interaction: ${objectId}`);
            // Handle GCP interactions
            if (objectType === 'gcp') {
              // We could add GCP-specific handling here if needed
              console.log("GCP selected:", objectId);
            }
          }}
        />
      ))}

      {/* Render Selected Face Indicator */}
      {selectedFace && <HighlightFaceIndicator faceInfo={selectedFace} />}
      
      {/* Render Mission Areas - Convert missionAreas to array if we get undefined */}
      {(Array.isArray(missionAreas) ? missionAreas : []).map((area) => (
        <MissionAreaIndicator key={area.id} missionArea={area} />
      ))}

      {/* Conditionally render Drone Model - ensure rotation exists too */}
      {isDroneVisible && activeDronePosition && activeDroneRotation && (
        <DroneModel 
          position={activeDronePosition} 
          // Pass individual rotation components
          heading={activeDroneRotation.heading}
          pitch={activeDroneRotation.pitch} 
          roll={activeDroneRotation.roll} 
          onDoubleClick={onDroneDoubleClick}
          // Pass hardware details individually - ensure 'hardware' is not passed
          cameraDetails={hardware?.cameraDetails ?? null}
          lensDetails={hardware?.lensDetails ?? null}
          aperture={hardware?.fStop ?? null} 
          visualizationSettings={visualizationSettings} // Pass visualization settings
          gimbalPitch={gimbalPitch} // Pass gimbal pitch
          isCameraFrustumVisible={isCameraFrustumVisible} // Pass frustum visibility
        />
      )}

      {/* Orbit Controls */}
      <OrbitControls
        ref={transformControlsRef}
        enabled={!interactingObjectInfo} 
        target={
          (cameraFollowsDrone && activeDronePosition)
            ? localCoordToThree(activeDronePosition) as THREE.Vector3 
            : transformControlsRef.current?.target || new THREE.Vector3(0, 0, 0)
        }
        maxPolarAngle={Math.PI / 2 - 0.01} 
        minDistance={1}
        maxDistance={8000} 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
      />

      {/* --- Render Selected Face Visualization --- */}
      <SelectedFaceVisualizer />
      {/* --- End Selected Face Visualization --- */}

      {/* Add ObjectTransformControls */}
      {interactingObjectInfo?.mode === 'transform' && interactingObjectInfo.id && (
        <ObjectTransformControls 
            objectId={interactingObjectInfo.id}
            onComplete={handleExitTransformMode}
        />
      )}

      {/* Update point light to only render when drone is visible AND we have a position */}
      {isDroneVisible && activeDronePosition && (
        <pointLight
          position={[activeDronePosition.x, activeDronePosition.z, -activeDronePosition.y]}
          intensity={0.6}
          distance={50}
          decay={2}
          castShadow={false} // Disable shadows on point lights for performance
        />
      )}
    </>
  );
};

export default MissionScene; 