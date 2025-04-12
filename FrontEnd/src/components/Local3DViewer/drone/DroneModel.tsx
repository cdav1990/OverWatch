import React, { useState, useRef, useMemo, Suspense, Component, ErrorInfo, ReactNode, useEffect } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { useGLTF, Box, Sphere, Cylinder, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useMission } from '../../../context/MissionContext';
import { useAppContext } from '../../../context/AppContext';
import { LocalCoord } from '../../../types/mission';
import { Camera, Lens } from '../../../types/hardware';
import { getCameraById, getLensById, getLensFStops } from '../../../utils/hardwareDatabase';
import { feetToMeters } from '../../../utils/sensorCalculations';
import CameraFrustum, { CameraFrustumProps } from './CameraFrustum';

// Path to the eagle model - now confirmed to exist in public directory
const EAGLE_MODEL_URL = '/models/scene.gltf';

// Preload the model for better performance
try {
  if (typeof window !== 'undefined') {
    useGLTF.preload(EAGLE_MODEL_URL);
  }
} catch (error) {
  console.warn("Failed to preload eagle model:", error);
}

// Fallback eagle model using basic Three.js primitives
const EagleFallbackModel = ({ rotation }: { rotation: THREE.Euler }) => {
  return (
    <group rotation={rotation}>
      {/* Eagle body */}
      <Sphere args={[2.0, 16, 16]} position={[0, 0.2, 0]}>
        <meshStandardMaterial color="#3d2817" roughness={0.8} />
      </Sphere>
      
      {/* Eagle head */}
      <Sphere args={[1.0, 16, 16]} position={[0, 1.5, 1.8]}>
        <meshStandardMaterial color="#232323" roughness={0.6} />
      </Sphere>
      
      {/* White head */}
      <Sphere args={[0.9, 16, 16]} position={[0, 1.7, 2.0]}>
        <meshStandardMaterial color="#f0f0f0" roughness={0.6} />
      </Sphere>
      
      {/* Beak */}
      <Cylinder args={[0.2, 0.05, 0.8, 8]} position={[0, 1.4, 2.8]} rotation={[Math.PI/3, 0, 0]}>
        <meshStandardMaterial color="#e6b800" roughness={0.4} />
      </Cylinder>
    </group>
  );
};

// High-quality GLTF model with improved texture handling
const EagleGLTFModel = ({ rotation }: { rotation: THREE.Euler }) => {
  // For better loading state feedback
  const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading');
  
  // Use a ref to track if the component is mounted to avoid state updates after unmounting
  const isMounted = useRef(true);
  
  // Use error state to track loading errors
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Always call useGLTF regardless of whether it succeeds - prevents hook count issues
  let gltfResult: ReturnType<typeof useGLTF> | undefined;
  try {
    gltfResult = useGLTF(EAGLE_MODEL_URL);
  } catch (error) {
    // Just capture the error but still ensure the hook is called
    setLoadError(error instanceof Error ? error.message : 'Unknown error loading eagle model');
  }
    
  // Process the scene in useEffect to avoid inconsistent hook calls
  const [processedScene, setProcessedScene] = useState<THREE.Group | null>(null);
  
  useEffect(() => {
    if (!gltfResult || loadError) {
      setLoadingStatus('error');
      return;
    }
    
    try {
      // Check for scene property and handle both single and array results
      const scene = 'scene' in gltfResult ? gltfResult.scene : null;
      
      if (!scene) {
        console.error("Invalid GLTF result: missing scene property");
        setLoadingStatus('error');
        return;
      }
      
      // Clone the scene to avoid mutation issues
      const clonedScene = scene.clone();
      
      // Apply better material settings if needed
      clonedScene.traverse((node: THREE.Object3D) => {
        if (node instanceof THREE.Mesh && node.material) {
          // Enhance material properties for better visual appearance
          if (node.material instanceof THREE.MeshStandardMaterial) {
            // Adjust material properties for better appearance
            node.material.roughness = 0.8;
            node.material.metalness = 0.2;
            node.castShadow = true;
            node.receiveShadow = true;
          }
        }
      });
      
      setProcessedScene(clonedScene);
      setLoadingStatus('success');
    } catch (error) {
      console.error("Failed to process eagle scene:", error);
      setLoadingStatus('error');
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [gltfResult, loadError]);
  
  // Render based on loading state
  if (loadingStatus === 'error' || loadError || !processedScene) {
    return <EagleFallbackModel rotation={rotation} />;
  }
  
  return (
    <primitive 
      object={processedScene} 
      rotation={rotation}
      position={[0, -2, 0]} // Adjusted for better alignment with camera frustum
      scale={[0.15, 0.15, 0.15]} // Adjusted scale for the scene.gltf model
    />
  );
};

// Custom ErrorBoundary for Three.js components with better error feedback
class ThreeErrorBoundary extends Component<{children: ReactNode; fallback: ReactNode}, {hasError: boolean; errorInfo: string}> {
  constructor(props: {children: ReactNode; fallback: ReactNode}) {
    super(props);
    this.state = { 
      hasError: false,
      errorInfo: ''
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { 
      hasError: true,
      errorInfo: error.message || 'Unknown error in Three.js component'
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error in Three.js component:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      console.warn('ThreeErrorBoundary caught an error:', this.state.errorInfo);
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Add this AmericanFlag component to replace the current box-based flag
interface AmericanFlagProps {
  position: [number, number, number];
  rotation: [number, number, number];
  mirror?: boolean;
}

const AmericanFlag: React.FC<AmericanFlagProps> = ({ position, rotation, mirror = false }) => {
  const textureMap = useTexture('/models/usa_flag.png');
  const flagRef = useRef<THREE.Mesh>(null);
  const time = useRef(0);
  const waveHeight = mirror ? 0.3 : 0.3;
  const waveFrequency = mirror ? 1.5 : 1.5;
  
  // More vertices = better wave simulation
  const segments = 32;
  
  // Create the flag plane with sufficient segments for fluid animation
  const geometry = useMemo(() => new THREE.PlaneGeometry(3.2, 2, segments, segments/2), []);
  
  // Custom shader-based wind effect with animation
  const flagMaterial = useMemo(() => 
    new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        map: { value: textureMap },
        waveHeight: { value: waveHeight },
        waveFrequency: { value: waveFrequency },
        mirror: { value: mirror ? -1 : 1 }
      },
      vertexShader: `
        uniform float time;
        uniform float waveHeight;
        uniform float waveFrequency;
        uniform float mirror;
        varying vec2 vUv;
  
        void main() {
          vUv = uv;
          
          // Original position
          vec3 pos = position;
          
          // Create a wave effect based on position and time
          // More complex simulation with multiple sine waves of different frequencies
          float waveX = position.x * waveFrequency;
          float waveY = position.y * waveFrequency * 0.5;
          float waveZ = position.z * waveFrequency;
          
          // Use multiple frequencies for more natural waving
          float wave1 = sin(waveX * 1.0 + time * 1.5) * 0.5;
          float wave2 = sin(waveX * 2.0 + time * 0.5 + waveY) * 0.25;
          float wave3 = sin(waveX * 3.0 + time * 2.0 + waveY * 0.5) * 0.125; 
          
          // Add subtle vertical movement
          float verticalWave = sin(waveX * 0.5 + time * 0.2) * 0.1;
          
          // Combine waves and adjust amplitude based on x position (more movement at far edge)
          float amplitude = smoothstep(0.0, 1.0, position.x + 1.6) * waveHeight;
          float displacement = (wave1 + wave2 + wave3) * amplitude * mirror;
          
          // Apply the displacement
          pos.z += displacement;
          pos.y += verticalWave * amplitude * 0.2;
          
          // Optional: Add a subtle "flapping" effect near the loose end
          if (position.x > 0.8) {
            pos.x += sin(time * 2.5 + position.y) * 0.02 * (position.x - 0.8) * amplitude;
          }
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float mirror;
        varying vec2 vUv;
  
        void main() {
          // Flip texture horizontally if mirrored
          vec2 uv = vUv;
          if (mirror < 0.0) {
            uv.x = 1.0 - uv.x;
          }
          
          vec4 texColor = texture2D(map, uv);
          
          // Add a subtle shadow effect based on displacement
          gl_FragColor = texColor;
        }
      `,
      side: THREE.DoubleSide
    }),
  [textureMap, waveHeight, waveFrequency, mirror]);
  
  // Update time uniform for animation
  useFrame((_, delta) => {
    time.current += delta;
    if (flagMaterial.uniforms) {
      flagMaterial.uniforms.time.value = time.current;
    }
  });
  
  return (
    <group position={position} rotation={rotation}>
      {/* Flag pole */}
      <Cylinder args={[0.08, 0.08, 5, 8]} position={[0, -2.5, 0]} rotation={[0, 0, 0]}>
        <meshStandardMaterial color="#5c5c5c" metalness={0.5} roughness={0.5} />
      </Cylinder>
      
      {/* Finial (pole topper) */}
      <Sphere args={[0.12, 16, 16]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#e6b800" metalness={0.7} roughness={0.3} />
      </Sphere>
      
      {/* Flag cloth */}
      <mesh 
        ref={flagRef} 
        position={[1.6, -0.5, 0]} 
        material={flagMaterial} 
        geometry={geometry}
        rotation={[0, 0, 0]}
        castShadow
        receiveShadow
      />
      
      {/* Optional: Add a subtle border at the pole side of the flag */}
      <Cylinder 
        args={[0.04, 0.04, 2, 8]} 
        position={[0, -0.5, 0]} 
        rotation={[0, 0, 0]}
      >
        <meshStandardMaterial color="#ddd" />
      </Cylinder>
    </group>
  );
};

interface DroneModelProps {
  position: LocalCoord;
  heading: number;
  pitch: number;
  roll: number;
  onDoubleClick?: (event: ThreeEvent<MouseEvent>) => void;
  cameraDetails: Camera | null;
  lensDetails: Lens | null;
  aperture: number | null;
  isCameraFrustumVisible: boolean;
  gimbalPitch?: number;
  visualizationSettings?: CameraFrustumProps['visualization'];
}

const DroneModel: React.FC<DroneModelProps> = ({
  position,
  heading,
  pitch,
  roll,
  onDoubleClick,
  cameraDetails,
  lensDetails,
  aperture,
  isCameraFrustumVisible,
  gimbalPitch = 0,
  visualizationSettings = {
    showNearFocusPlane: true,
    showFarFocusPlane: false,
    showFocusPlaneInfo: false,
    showDOFInfo: false
  }
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { state } = useMission();
  const { appMode } = useAppContext(); // Get the current app mode
  const { hardware } = state;
  const isDevMode = appMode === 'dev';
  
  // Default hardware settings if not set in context
  const DEFAULT_CAMERA_ID = 'phase-one-ixm-100';
  const DEFAULT_LENS_ID = 'phaseone-rsm-80mm';
  const DEFAULT_FOCUS_DISTANCE_FT = 20; // in feet

  // Get focus distance in meters - default to 20ft if not set
  const focusDistanceM = useMemo(() => {
    return hardware?.focusDistance || feetToMeters(DEFAULT_FOCUS_DISTANCE_FT);
  }, [hardware?.focusDistance]);

  // Map simulation position to Three.js coordinates
  const threePosition = new THREE.Vector3(position.x, position.z, -position.y);

  // Create Euler rotation from heading, pitch, roll (converted to radians)
  // Order: YXZ (Yaw, Pitch, Roll) - common for aircraft/drones
  const droneEulerRotation = useMemo(() => {
    return new THREE.Euler(
      pitch * (Math.PI / 180),  // X-axis rotation (Pitch)
      heading * (Math.PI / 180), // Y-axis rotation (Heading/Yaw)
      roll * (Math.PI / 180),    // Z-axis rotation (Roll)
      'YXZ' // Specify the order of rotations
    );
  }, [heading, pitch, roll]);

  // For propeller animation
  const propellerRotationRef = useRef<number[]>([0, 0, 0, 0]);
  const wingFlapRef = useRef<number>(0);
  const flagWaveRef = useRef<number>(0);
  
  // Use useFrame for animations instead of state updates
  useFrame((state, delta) => {
    // Only animate if the group exists
    if (!groupRef.current) return;
    
    // Throttle animations based on framerate
    const speedFactor = delta * 5; // Adjust based on how fast you want animations
    
    // Update propeller rotation
    propellerRotationRef.current = propellerRotationRef.current.map(rot => rot + 3 * speedFactor);
    
    // Animate wing flap with sine wave
    wingFlapRef.current = (wingFlapRef.current + 0.05 * speedFactor) % (Math.PI * 2);
    
    // Animate flag wave with sine wave
    flagWaveRef.current = (flagWaveRef.current + 0.03 * speedFactor) % (Math.PI * 2);
    
    // Directly update meshes via ref if needed for optimized animations
    // This avoids React re-renders entirely by modifying the Three.js objects directly
    const propellers = groupRef.current.children.filter(child => 
      child.name === 'propeller-group'
    );
    
    propellers.forEach((propeller, i) => {
      if (propeller && propeller.rotation) {
        propeller.rotation.y = propellerRotationRef.current[i % 4];
      }
    });
  });

  // Create and configure layers for the frustum visualization ONLY
  const frustumLayers = useMemo(() => {
    const layers = new THREE.Layers();
    layers.set(1); // Set the frustum visualization to be on layer 1
    return layers;
  }, []);

  // Render the eagle model in dev mode
  if (isDevMode) {
    // Create rotation euler for the eagle visual model itself (internal flapping, etc.)
    // This is SEPARATE from the main drone group's rotation
    const eagleVisualRotation = new THREE.Euler(
      wingFlapRef.current * 0.05, // X rotation (internal animation)
      Math.PI,         // Base Y rotation (180 degrees to face forward in its own coordinate system)
      0                // Z rotation (internal animation)
    );
    
    return (
      <group
        ref={groupRef}
        position={threePosition}
        rotation={droneEulerRotation} // Apply the calculated YXZ rotation to the main group
        onDoubleClick={onDoubleClick}
        scale={[0.4, 0.4, 0.4]} // Increased scale for better visibility
      >
        {/* Lighting setup ... */}
        <ambientLight intensity={0.7} color="#ffffff" />
        <spotLight 
          position={[5, 10, 5]} 
          angle={0.6} 
          penumbra={0.5} 
          intensity={1.0} 
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <spotLight 
          position={[-5, 8, -5]} 
          angle={0.6} 
          penumbra={0.5} 
          intensity={0.6} 
          castShadow
        />
        
        {/* Use ErrorBoundary for the GLTF model */}
        <ThreeErrorBoundary fallback={<EagleFallbackModel rotation={eagleVisualRotation} />}>
          <Suspense fallback={
            <group>
              {/* Simple loading indicator */}
              <EagleFallbackModel rotation={eagleVisualRotation} />
              <Sphere args={[0.2, 8, 8]} position={[0, 3, 0]}>
                <meshBasicMaterial color="#4fc3f7" opacity={0.7} transparent />
              </Sphere>
            </group>
          }>
            {/* Pass the internal visual rotation, not the main drone rotation */}
            <EagleGLTFModel rotation={eagleVisualRotation} />
          </Suspense>
        </ThreeErrorBoundary>
        
        {/* Point light ... */}
        <pointLight position={[0, 2, 0]} intensity={0.4} distance={10} color="#ffcc99" />
        
        {/* Camera Frustum - positioned relative to the drone */}
        {/* The CameraFrustum component itself handles the gimbalPitch rotation internally */}
        {isCameraFrustumVisible && cameraDetails && lensDetails && aperture !== null && ( 
          <group position={[0, 0, 3.11]} layers={frustumLayers}> {/* Position relative to drone center */}
            {/* No extra rotation needed here, CameraFrustum handles gimbalPitch */}
            <CameraFrustum 
              cameraDetails={cameraDetails}
              lensDetails={lensDetails}
              focusDistanceM={focusDistanceM}
              aperture={aperture}
              visualization={visualizationSettings}
              gimbalPitch={gimbalPitch} // Pass down gimbalPitch
            />
          </group>
        )}
        
        {/* Replace the old flag implementation with the new improved flags */}
        <AmericanFlag position={[5, 5, 0]} rotation={[0, 0, 0]} />
        <AmericanFlag position={[-5, 5, 0]} rotation={[0, 0, 0]} mirror />
        
      </group>
    );
  }

  // Regular drone model for non-dev mode
  return (
    <group
      ref={groupRef}
      position={threePosition}
      onDoubleClick={onDoubleClick}
      scale={[0.33, 0.33, 0.33]} // Scale down the drone to 1/3 of the original size
      rotation={[0, heading * (Math.PI / 180), 0]} // Apply heading to the entire group
    >
      {/* Main drone body - more detailed */}
      <Box args={[2.4, 0.5, 2.4]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#212121" metalness={0.8} roughness={0.3} />
      </Box>

      {/* Body details - top section */}
      <Box args={[1.8, 0.3, 1.8]} position={[0, 0.4, 0]}>
        <meshStandardMaterial color="#333333" metalness={0.6} roughness={0.4} />
      </Box>

      {/* Drone arms */}
      <group>
        {/* Front-right arm */}
        <Box args={[0.2, 0.2, 1.2]} position={[0.9, 0, 0.9]} rotation={[0, Math.PI/4, 0]}>
          <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.6} />
        </Box>

        {/* Front-left arm */}
        <Box args={[0.2, 0.2, 1.2]} position={[-0.9, 0, 0.9]} rotation={[0, -Math.PI/4, 0]}>
          <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.6} />
        </Box>

        {/* Back-right arm */}
        <Box args={[0.2, 0.2, 1.2]} position={[0.9, 0, -0.9]} rotation={[0, -Math.PI/4, 0]}>
          <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.6} />
        </Box>

        {/* Back-left arm */}
        <Box args={[0.2, 0.2, 1.2]} position={[-0.9, 0, -0.9]} rotation={[0, Math.PI/4, 0]}>
          <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.6} />
        </Box>
      </group>

      {/* Motor housings and propellers */}
      <group>
        {/* Front-right motor and propeller */}
        <group position={[1.4, 0.1, 1.4]}>
          <Sphere args={[0.3, 16, 16]}>
            <meshStandardMaterial color="#222222" metalness={0.7} roughness={0.3} />
          </Sphere>
          {/* Propeller group - animation enabled */}
          <group name="propeller-group" rotation={[0, propellerRotationRef.current[0], 0]}>
            <Box args={[1.4, 0.05, 0.15]} position={[0, 0.15, 0]}>
              <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
            </Box>
            <Box args={[0.15, 0.05, 1.4]} position={[0, 0.15, 0]}>
              <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
            </Box>
          </group>
        </group>

        {/* Front-left motor and propeller */}
         <group position={[-1.4, 0.1, 1.4]}>
          <Sphere args={[0.3, 16, 16]}>
            <meshStandardMaterial color="#222222" metalness={0.7} roughness={0.3} />
          </Sphere>
          {/* Propeller group - animation enabled */}
          <group name="propeller-group" rotation={[0, propellerRotationRef.current[1], 0]}>
            <Box args={[1.4, 0.05, 0.15]} position={[0, 0.15, 0]}>
              <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
            </Box>
            <Box args={[0.15, 0.05, 1.4]} position={[0, 0.15, 0]}>
              <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
            </Box>
          </group>
        </group>

        {/* Back-right motor and propeller */}
         <group position={[1.4, 0.1, -1.4]}>
          <Sphere args={[0.3, 16, 16]}>
            <meshStandardMaterial color="#222222" metalness={0.7} roughness={0.3} />
          </Sphere>
          {/* Propeller group - animation enabled */}
          <group name="propeller-group" rotation={[0, propellerRotationRef.current[2], 0]}>
            <Box args={[1.4, 0.05, 0.15]} position={[0, 0.15, 0]}>
              <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
            </Box>
            <Box args={[0.15, 0.05, 1.4]} position={[0, 0.15, 0]}>
              <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
            </Box>
          </group>
        </group>

        {/* Back-left motor and propeller */}
         <group position={[-1.4, 0.1, -1.4]}>
          <Sphere args={[0.3, 16, 16]}>
            <meshStandardMaterial color="#222222" metalness={0.7} roughness={0.3} />
          </Sphere>
          {/* Propeller group - animation enabled */}
          <group name="propeller-group" rotation={[0, propellerRotationRef.current[3], 0]}>
            <Box args={[1.4, 0.05, 0.15]} position={[0, 0.15, 0]}>
              <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
            </Box>
            <Box args={[0.15, 0.05, 1.4]} position={[0, 0.15, 0]}>
              <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.5} transparent opacity={0.8} />
            </Box>
          </group>
        </group>
      </group>

      {/* Landing gear legs */}
      <group>
        <Box args={[0.15, 0.8, 0.15]} position={[0.9, -0.65, 0.9]}>
          <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.6} />
        </Box>
        <Box args={[0.15, 0.8, 0.15]} position={[-0.9, -0.65, 0.9]}>
          <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.6} />
        </Box>
        <Box args={[0.15, 0.8, 0.15]} position={[0.9, -0.65, -0.9]}>
          <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.6} />
        </Box>
        <Box args={[0.15, 0.8, 0.15]} position={[-0.9, -0.65, -0.9]}>
          <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.6} />
        </Box>
      </group>

      {/* Camera gimbal */}
      <group position={[0, -0.25, 0.8]}>
        <group rotation={[gimbalPitch * (Math.PI / 180), 0, 0]}> 
          <group rotation={[pitch * (Math.PI / 180), 0, roll * (Math.PI / 180)]}>
            <Box args={[0.8, 0.3, 0.4]}>
              <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
            </Box>
            <Box args={[0.6, 0.2, 0.3]} position={[0, -0.25, 0]}>
              <meshStandardMaterial color="#222222" metalness={0.8} roughness={0.2} />
            </Box>
            {/* Camera lens */}
            <Sphere args={[0.2, 16, 16]} position={[0, -0.25, 0.25]}>
              <meshStandardMaterial color="#111111" metalness={0.9} roughness={0.1} />
            </Sphere>
            
            {/* Camera Frustum - apply visualization settings */}
            {isCameraFrustumVisible && cameraDetails && lensDetails && aperture !== null && ( 
              <group position={[0, -0.25, 1.01]} layers={frustumLayers}> 
                <CameraFrustum 
                  cameraDetails={cameraDetails}
                  lensDetails={lensDetails}
                  focusDistanceM={focusDistanceM}
                  aperture={aperture}
                  visualization={visualizationSettings}
                />
              </group>
            )}
          </group>
        </group>
      </group>

      {/* Navigation lights */}
      <pointLight position={[1.4, 0, 1.4]} color="#ff0000" intensity={0.6} distance={4} />
      <pointLight position={[-1.4, 0, -1.4]} color="#00ff00" intensity={0.6} distance={4} />

      {/* Small indicator LEDs */}
      <Sphere args={[0.08, 8, 8]} position={[1.2, 0.3, 1.2]}>
        <meshBasicMaterial color="#ff0000" />
      </Sphere>
      <Sphere args={[0.08, 8, 8]} position={[-1.2, 0.3, -1.2]}>
        <meshBasicMaterial color="#00ff00" />
      </Sphere>
      <Sphere args={[0.08, 8, 8]} position={[0, 0.5, -1.0]}>
        <meshBasicMaterial color="#ffffff" />
      </Sphere>
    </group>
  );
};

export default DroneModel; 