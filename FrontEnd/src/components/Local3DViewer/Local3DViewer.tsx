import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Paper, CircularProgress, Box as MuiBox, IconButton, Typography, Fade, LinearProgress } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import SettingsIcon from '@mui/icons-material/Settings';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense } from 'react';
import { useMission } from '../../context/MissionContext';
import { useThreeJSState } from '../../context/ThreeJSStateContext';
import { LocalCoord } from '../../types/mission';
import DronePositionControlPanel from '../DronePositionControlPanel/DronePositionControlPanel';
import HardwareVisualizationSettings from '../HardwareVisualizationSettings/HardwareVisualizationSettings';
import SceneSettingsPanel from '../SceneControls/SceneSettingsPanel';
import SceneObjectEditModal from './modals/SceneObjectEditModal';
import { MissionScene } from './';
import ThreeJSOptimizer from './ThreeJSOptimizer';
import PathGenerationIndicator from '../LoadingIndicator/PathGenerationIndicator';
import CameraViewportWindow from '../CameraViewportWindow';
import * as THREE from 'three';
import { OrbitControls, useDetectGPU, Text } from '@react-three/drei';
import { moveSceneObject } from '../../utils/sceneHelpers';
import { ThreeEvent } from '@react-three/fiber';
import { localCoordToThree } from './utils/threeHelpers'; // Import helper
import Draggable from 'react-draggable'; // Add this import
import FpsDisplay from './FpsDisplay';
import gsap from 'gsap';

// Import a CSS module for the transform controls overlay
import './transformControlsOverlay.css';

// Define props for Local3DViewer
interface Local3DViewerProps {
  height?: string | number;
  liveDronePosition?: LocalCoord | null;
  liveDroneRotation?: { heading: number; pitch: number; roll: number; } | null;
  loadingMessage?: string; // Optional custom loading message
}

// Add an enhanced ErrorBoundary component with retry functionality
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, errorMessage: string}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { 
      hasError: false,
      errorMessage: ''
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { 
      hasError: true, 
      errorMessage: error.message || 'An error occurred in the 3D viewer'
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error in 3D viewer:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  }

  render() {
    if (this.state.hasError) {
      return (
        <MuiBox 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            width: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            zIndex: 1000,
            padding: 3
          }}
        >
          <Typography variant="h6" color="error" gutterBottom>
            3D Viewer Error
          </Typography>
          <Typography variant="body2" align="center" sx={{ maxWidth: '80%', mb: 3 }}>
            {this.state.errorMessage}
          </Typography>
          <IconButton 
            color="primary" 
            onClick={this.handleRetry}
            sx={{ 
              backgroundColor: 'rgba(79, 195, 247, 0.15)',
              '&:hover': {
                backgroundColor: 'rgba(79, 195, 247, 0.3)',
              }
            }}
          >
            <RefreshIcon />
          </IconButton>
          <Typography variant="caption" sx={{ mt: 1 }}>
            Click to retry
          </Typography>
        </MuiBox>
      );
    }
    return this.props.children;
  }
}

// LOD Manager - New Component
const LODManager = () => {
  const { camera, scene } = useThree();
  const gpuTier = useDetectGPU();
  const [lastUpdatePosition, setLastUpdatePosition] = useState(new THREE.Vector3());
  const UPDATE_DISTANCE_THRESHOLD = 10; // Minimum distance moved before updating LODs
  const lodObjectsRef = useRef<Map<string, THREE.LOD>>(new Map());
  
  // Track camera performance
  const frameTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastPerformanceCheckRef = useRef(Date.now());
  const lastLODUpdateRef = useRef(Date.now());
  const performanceMultiplierRef = useRef(1.0);
  
  // Register LOD objects with the manager
  useEffect(() => {
    const handleRegisterLOD = (id: string, lodObject: THREE.LOD) => {
      lodObjectsRef.current.set(id, lodObject);
    };
    
    const handleUnregisterLOD = (id: string) => {
      lodObjectsRef.current.delete(id);
    };
    
    // Add event listeners for registering/unregistering LOD objects
    window.addEventListener('register-lod', handleRegisterLOD as any);
    window.addEventListener('unregister-lod', handleUnregisterLOD as any);
    
    return () => {
      window.removeEventListener('register-lod', handleRegisterLOD as any);
      window.removeEventListener('unregister-lod', handleUnregisterLOD as any);
    };
  }, []);
  
  // Auto-adjust LOD levels based on performance
  useEffect(() => {
    // Set initial performanceMultiplier based on GPU tier
    if (gpuTier) {
      // Adjust LOD thresholds based on GPU capabilities (higher tier = can handle more detail)
      if (gpuTier.tier === 3) {
        performanceMultiplierRef.current = 1.5; // High-end GPU - increase detail
      } else if (gpuTier.tier === 1) {
        performanceMultiplierRef.current = 0.6; // Low-end GPU - reduce detail for performance
      } else if (gpuTier.tier === 0) {
        performanceMultiplierRef.current = 0.4; // Very low-end - significantly reduce detail
      }
      console.log(`GPU detected: ${gpuTier.gpu || 'Unknown'}, Tier: ${gpuTier.tier}, LOD Multiplier: ${performanceMultiplierRef.current}`);
    }
  }, [gpuTier]);
  
  // Update LOD based on camera position and performance
  useFrame((_, delta) => {
    // Track frame time for performance measurement
    frameTimeRef.current += delta;
    frameCountRef.current++;
    
    // Check if camera has moved enough to warrant an LOD update
    if (camera.position.distanceTo(lastUpdatePosition) > UPDATE_DISTANCE_THRESHOLD) {
      setLastUpdatePosition(camera.position.clone());
      
      // Only update LODs every 500ms maximum to avoid thrashing
      const now = Date.now();
      if (now - lastLODUpdateRef.current > 500) {
        lastLODUpdateRef.current = now;
        
        // Find LOD objects in the scene and update their visibility
        scene.traverse((object) => {
          if (object instanceof THREE.LOD) {
            // Apply performance multiplier to distance thresholds
            object.levels.forEach((level, index) => {
              if (level.object) {
                // Original distance is preserved in userData
                const originalDistance = object.userData.originalDistances?.[index] || level.distance;
                // Apply performance-based adjustment
                const adjustedDistance = originalDistance * performanceMultiplierRef.current;
                level.distance = adjustedDistance;
              }
            });
            
            // Force update of LOD level
            object.update(camera);
          }
        });
      }
    }
    
    // Periodically check performance and adjust LOD multiplier
    const now = Date.now();
    if (now - lastPerformanceCheckRef.current > 2000 && frameCountRef.current > 10) {
      const avgFrameTime = frameTimeRef.current / frameCountRef.current;
      const fps = 1 / avgFrameTime;
      
      // Adjust LOD multiplier based on performance
      if (fps < 30 && performanceMultiplierRef.current > 0.3) {
        // Reduce detail if performance is poor
        performanceMultiplierRef.current = Math.max(0.3, performanceMultiplierRef.current - 0.1);
        console.log(`Performance adjustment: ${fps.toFixed(1)} FPS, reducing LOD detail (${performanceMultiplierRef.current.toFixed(2)})`);
      } else if (fps > 55 && performanceMultiplierRef.current < 2.0) {
        // Increase detail if performance is good
        performanceMultiplierRef.current = Math.min(2.0, performanceMultiplierRef.current + 0.05);
      }
      
      // Reset counters
      frameTimeRef.current = 0;
      frameCountRef.current = 0;
      lastPerformanceCheckRef.current = now;
    }
  });
  
  return null;
};

// Create a Fusion360-style CAD camera control component with full control
const CADControls = () => {
  const { camera, gl, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const isDragging = useRef(false);
  const prevMousePos = useRef(new THREE.Vector2(0, 0));
  const orbitTarget = useRef(new THREE.Vector3(0, 0, 0));
  const lastCameraUpdate = useRef(0);
  const animationFrameId = useRef<number | null>(null);
  const activeButton = useRef(-1);
  
  // Add state and refs for center point setting
  const [setCenterModeActive, setSetCenterModeActive] = useState(false);
  const [orbitCenterVisible, setOrbitCenterVisible] = useState(true);
  const cursorPositionRef = useRef(new THREE.Vector2(0, 0));
  const centerPreviewRef = useRef<THREE.Group>(null);
  const permanentCenterRef = useRef<THREE.Group>(null);
  
  // Add throttling vars
  const THROTTLE_MS = 16; // ~60fps max
  const pendingMove = useRef(false);
  const lastDeltaX = useRef(0);
  const lastDeltaY = useRef(0);
  
  // Handle updating permanent center marker position
  const updateOrbitCenterMarker = useCallback(() => {
    if (permanentCenterRef.current) {
      permanentCenterRef.current.position.copy(orbitTarget.current);
      
      // Scale the marker based on distance from camera
      const distance = camera.position.distanceTo(orbitTarget.current);
      const scale = Math.max(0.1, distance * 0.005);
      permanentCenterRef.current.scale.set(scale, scale, scale);
    }
  }, [camera]);
  
  // Update the orbit center marker when camera moves
  useFrame(() => {
    updateOrbitCenterMarker();
  });
  
  // CenterPointPreview component for visual feedback
  const CenterPointPreview = () => {
    // Only render when in set center mode
    if (!setCenterModeActive) return null;
    
    return (
      <group ref={centerPreviewRef}>
        <mesh>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="#ffcc00" transparent opacity={0.7} />
        </mesh>
        <group>
          <mesh position={[2, 0, 0]}>
            <boxGeometry args={[2, 0.15, 0.15]} />
            <meshBasicMaterial color="#ff2000" />
          </mesh>
          <mesh position={[0, 2, 0]}>
            <boxGeometry args={[0.15, 2, 0.15]} />
            <meshBasicMaterial color="#00ff00" />
          </mesh>
          <mesh position={[0, 0, 2]}>
            <boxGeometry args={[0.15, 0.15, 2]} />
            <meshBasicMaterial color="#0050ff" />
          </mesh>
        </group>
        <mesh>
          <ringGeometry args={[3, 3.3, 32]} />
          <meshBasicMaterial color="#ffcc00" side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[Math.PI/2, 0, 0]}>
          <ringGeometry args={[3, 3.3, 32]} />
          <meshBasicMaterial color="#ffcc00" side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI/2]}>
          <ringGeometry args={[3, 3.3, 32]} />
          <meshBasicMaterial color="#ffcc00" side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  };
  
  // Permanent orbit center marker
  const PermanentOrbitCenterMarker = () => {
    if (!orbitCenterVisible) return null;
    
    return (
      <group ref={permanentCenterRef}>
        <mesh renderOrder={999}>
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshBasicMaterial color="#4fc3f7" transparent opacity={0.8} />
        </mesh>
        <group scale={0.5}>
          <mesh position={[0.4, 0, 0]} renderOrder={999}>
            <boxGeometry args={[0.4, 0.05, 0.05]} />
            <meshBasicMaterial color="#ff2000" />
          </mesh>
          <mesh position={[0, 0.4, 0]} renderOrder={999}>
            <boxGeometry args={[0.05, 0.4, 0.05]} />
            <meshBasicMaterial color="#00ff00" />
          </mesh>
          <mesh position={[0, 0, 0.4]} renderOrder={999}>
            <boxGeometry args={[0.05, 0.05, 0.4]} />
            <meshBasicMaterial color="#0050ff" />
          </mesh>
        </group>
      </group>
    );
  };
  
  // Create our own basic orbit controls logic from scratch
  useEffect(() => {
    // Set initial orbit center
    orbitTarget.current.set(0, 0, 0);
    
    // Initialize the permanent center marker position
    updateOrbitCenterMarker();
    
    // -------------------------
    // Mouse event handlers with throttling
    // -------------------------
    
    // Throttled camera update function (runs outside of React)
    const updateCamera = () => {
      pendingMove.current = false;
      
      // Skip if not dragging
      if (!isDragging.current) return;
      
      // Handle rotation (left mouse button)
      if (activeButton.current === 0) {
        // Reduce rotation speed for more precise control (Slowed down by 1/9)
        const rotationSpeed = 0.002 / 9; // Was 0.002 / 3
        
        // Split rotation into horizontal (around Y axis) and vertical (elevation angle)
        
        // Get current time for performance tracking
        const now = performance.now();
        
        // Horizontal rotation around Y axis (only if there's significant movement)
        if (Math.abs(lastDeltaX.current) > 0.5) {
          // Create rotation matrix around world Y axis
          const rotationY = new THREE.Matrix4().makeRotationY(-lastDeltaX.current * rotationSpeed);
          
          // Get vector from target to camera
          const cameraToTarget = new THREE.Vector3().subVectors(camera.position, orbitTarget.current);
          
          // Apply rotation
          cameraToTarget.applyMatrix4(rotationY);
          
          // Update camera position
          camera.position.copy(orbitTarget.current).add(cameraToTarget);
          
          // Reset delta after applying
          lastDeltaX.current = 0;
        }
        
        // Vertical rotation (change elevation angle) (only if there's significant movement)
        if (Math.abs(lastDeltaY.current) > 0.5) {
          // Get current camera-to-target vector
          const cameraToTarget = new THREE.Vector3().subVectors(camera.position, orbitTarget.current);
          const distance = cameraToTarget.length();
          
          // Calculate current angles
          const currentAzimuth = Math.atan2(cameraToTarget.x, cameraToTarget.z);
          let currentPolar = Math.acos(cameraToTarget.y / distance);
          
          // Update polar angle with constraints to prevent going below ground or flipping over
          currentPolar = Math.max(0.1, Math.min(Math.PI * 0.85, currentPolar + lastDeltaY.current * rotationSpeed));
          
          // Convert back to cartesian
          const x = distance * Math.sin(currentPolar) * Math.sin(currentAzimuth);
          const y = distance * Math.cos(currentPolar);
          const z = distance * Math.sin(currentPolar) * Math.cos(currentAzimuth);
          
          // Update camera position
          camera.position.set(
            orbitTarget.current.x + x,
            orbitTarget.current.y + y,
            orbitTarget.current.z + z
          );
          
          // Reset delta after applying
          lastDeltaY.current = 0;
        }
        
        // Always look at the target
        camera.lookAt(orbitTarget.current);
        camera.updateProjectionMatrix();
        
        // Update the permanent center marker
        updateOrbitCenterMarker();
        
        // Track performance
        lastCameraUpdate.current = now;
      }
      
      // Handle panning (right mouse button or middle mouse button)
      if (activeButton.current === 2 || activeButton.current === 1) {
        // Only pan if we have movement to apply
        if (Math.abs(lastDeltaX.current) > 0.5 || Math.abs(lastDeltaY.current) > 0.5) {
          // Calculate pan speed relative to distance
          const distance = camera.position.distanceTo(orbitTarget.current);
          const panSpeed = distance * 0.001;
          
          // Use fixed world vectors for both horizontal and vertical movement
          // This restricts movement to the global XY plane (screen space)
          const worldRight = new THREE.Vector3(1, 0, 0);
          const worldUp = new THREE.Vector3(0, 1, 0); // Direct vertical movement, no camera orientation
          
          // Calculate movement vectors - both movements are now world-aligned
          const moveRight = worldRight.clone().multiplyScalar(-lastDeltaX.current * panSpeed);
          const moveUp = worldUp.clone().multiplyScalar(lastDeltaY.current * panSpeed);
          
          // Apply movement to both camera and target
          camera.position.add(moveRight).add(moveUp);
          orbitTarget.current.add(moveRight).add(moveUp);
          
          // Update the permanent center marker
          updateOrbitCenterMarker();
          
          // Reset deltas after applying
          lastDeltaX.current = 0;
          lastDeltaY.current = 0;
          
          // No need to update lookAt since relative position hasn't changed
          camera.updateProjectionMatrix();
        }
      }
    };
    
    // Track mouse position for center point placement
    const handleMouseMove = (event: MouseEvent) => {
      // Convert mouse position to normalized device coordinates (-1 to +1)
      const rect = gl.domElement.getBoundingClientRect();
      cursorPositionRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      cursorPositionRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Update position for dragging if needed
      if (isDragging.current) {
        // Calculate delta movement and accumulate for throttled updates
        const deltaX = event.clientX - prevMousePos.current.x;
        const deltaY = event.clientY - prevMousePos.current.y;
        
        // Accumulate deltas
        lastDeltaX.current += deltaX;
        lastDeltaY.current += deltaY;
        
        // Store new position for next frame
        prevMousePos.current.x = event.clientX;
        prevMousePos.current.y = event.clientY;
        
        // Throttle updates for better performance
        if (!pendingMove.current) {
          pendingMove.current = true;
          // Use requestAnimationFrame instead of setTimeout for better performance
          animationFrameId.current = requestAnimationFrame(updateCamera);
        }
        
        // Prevent defaults
        event.preventDefault();
      }
      
      // If in center setting mode, update the preview position
      if (setCenterModeActive && centerPreviewRef.current) {
        // Set up raycaster from mouse position
        raycaster.current.setFromCamera(cursorPositionRef.current, camera);
        
        // Get intersections with scene objects
        const intersects = raycaster.current.intersectObjects(scene.children, true);
        
        // Find first valid intersection that is not a helper or gizmo
        const validIntersection = intersects.find(i => 
          i.object.visible && 
          !i.object.name.includes('helper') &&
          !i.object.name.includes('gizmo') &&
          i.object.type !== 'GridHelper' && 
          i.object.type !== 'AxesHelper'
        );
        
        if (validIntersection) {
          // Update the preview position to the intersection point
          centerPreviewRef.current.position.copy(validIntersection.point);
          
          // Ensure preview size scales with distance
          const distance = camera.position.distanceTo(validIntersection.point);
          const scale = Math.max(0.2, distance * 0.01);
          centerPreviewRef.current.scale.set(scale, scale, scale);
        }
      }
    };
    
    // More efficient non-react mouse handlers
    const handleMouseDown = (event: MouseEvent) => {
      // Skip if right mouse is used for context menu
      if (event.button === 2 && event.ctrlKey) return;
      
      // Skip double-clicks (handled separately)
      if (event.detail === 2 && event.button === 0) return;
      
      // Store button pressed
      activeButton.current = event.button;
      
      // Store initial position
      isDragging.current = true;
      prevMousePos.current.x = event.clientX;
      prevMousePos.current.y = event.clientY;
      
      // Update cursor style
      gl.domElement.style.cursor = 'grabbing';
      
      // Prevent default behavior
      event.preventDefault();
    };
    
    // Handle double click to set orbit center
    const handleDoubleClick = (event: MouseEvent) => {
      // Skip if not left button
      if (event.button !== 0) return;
      
      // Convert to normalized device coordinates
      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Set up raycaster
      raycaster.current.setFromCamera(mouse.current, camera);
      
      // Get intersections with scene objects
      const intersects = raycaster.current.intersectObjects(scene.children, true);
      
      // Find first valid object intersection that is ABOVE the ground plane
      const validIntersection = intersects.find(i => 
        i.object.visible && 
        !i.object.name.includes('helper') &&
        !i.object.name.includes('gizmo') &&
        i.object.type !== 'GridHelper' && 
        i.object.type !== 'AxesHelper' &&
        i.point.y > 0 // Ensure intersection point is above ground plane (y > 0)
      );
      
      if (validIntersection) {
        // Set new orbit center
        orbitTarget.current.copy(validIntersection.point);
        
        // Update camera to look at new target
        camera.lookAt(orbitTarget.current);
        camera.updateProjectionMatrix();
        
        // Update the permanent center marker
        updateOrbitCenterMarker();

        // Dispatch a custom event that can be used by scene to inform about object selection
        // Only allow selection of objects above the ground plane
        if (validIntersection.object && validIntersection.object.userData && validIntersection.point.y > 0) {
          const selectObjectEvent = new CustomEvent('select-scene-object', {
            detail: {
              object: validIntersection.object,
              point: validIntersection.point
            }
          });
          window.dispatchEvent(selectObjectEvent);
        }
      }
      
      // Prevent default to avoid unwanted selections
      event.preventDefault();
    };
    
    // Handle "C" key press to enter center setting mode
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if not typing in an input field
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement) return;
      
      // Add "C" key handling for center point
      if (event.key === 'c' && !setCenterModeActive) {
        setSetCenterModeActive(true);
        gl.domElement.style.cursor = 'crosshair';
      }
      
      // Toggle orbit center visibility with "O" key
      if (event.key === 'o') {
        setOrbitCenterVisible(prev => !prev);
      }
    };
    
    // Handle "C" key release to set the center point
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'c' && setCenterModeActive) {
        setSetCenterModeActive(false);
        gl.domElement.style.cursor = 'auto';
        
        // Set up raycaster from current mouse position
        raycaster.current.setFromCamera(cursorPositionRef.current, camera);
        
        // Get intersections with scene objects
        const intersects = raycaster.current.intersectObjects(scene.children, true);
        
        // Find first valid intersection that is not a helper or gizmo
        const validIntersection = intersects.find(i => 
          i.object.visible && 
          !i.object.name.includes('helper') &&
          !i.object.name.includes('gizmo') &&
          i.object.type !== 'GridHelper' && 
          i.object.type !== 'AxesHelper'
        );
        
        if (validIntersection) {
          // Set new orbit center
          orbitTarget.current.copy(validIntersection.point);
          
          // Update camera to look at new target
          camera.lookAt(orbitTarget.current);
          camera.updateProjectionMatrix();
          
          // Ensure the permanent marker is visible
          setOrbitCenterVisible(true);
          
          // Update the permanent center marker
          updateOrbitCenterMarker();
          
          // Notify components about orbit center change
          window.dispatchEvent(new CustomEvent('orbit-target-changed', {
            detail: { position: orbitTarget.current.clone() }
          }));
          
          // Show a success animation
          if (centerPreviewRef.current) {
            // Animate the preview to fade out
            gsap.to(centerPreviewRef.current.scale, {
              x: 0.01, y: 0.01, z: 0.01,
              duration: 0.5,
              ease: "power2.out",
              onComplete: () => {
                if (centerPreviewRef.current) {
                  centerPreviewRef.current.scale.set(1, 1, 1);
                }
              }
            });
          }
        }
      }
    };
    
    // Handle mouse up - end orbital rotation or panning
    const handleMouseUp = (event: MouseEvent) => {
      // Only handle if we were dragging
      if (isDragging.current) {
        isDragging.current = false;
        activeButton.current = -1;
        gl.domElement.style.cursor = 'auto';
        
        // Apply any remaining movement
        if (pendingMove.current) {
          updateCamera();
        }
        
        // Reset accumulated deltas
        lastDeltaX.current = 0;
        lastDeltaY.current = 0;
        
        event.preventDefault();
      }
    };
    
    // Handle mouse leave - end orbital rotation or panning
    const handleMouseLeave = (event: MouseEvent) => {
      if (isDragging.current) {
        isDragging.current = false;
        activeButton.current = -1;
        gl.domElement.style.cursor = 'auto';
        
        // Apply any remaining movement
        if (pendingMove.current) {
          updateCamera();
        }
        
        // Reset accumulated deltas
        lastDeltaX.current = 0;
        lastDeltaY.current = 0;
      }
    };
    
    // Optimized wheel handler with debouncing
    let wheelTimeout: number | null = null;
    const handleWheel = (event: WheelEvent) => {
      // Prevent default scrolling
      event.preventDefault();
      event.stopPropagation();
      
      // Use requestAnimationFrame for smoother zooming
      if (wheelTimeout !== null) {
        cancelAnimationFrame(wheelTimeout);
      }
      
      wheelTimeout = requestAnimationFrame(() => {
        // Determine zoom direction (INVERTED: Up = Out, Down = In)
        const zoomOut = event.deltaY < 0;
        
        // Calculate current distance for adaptive zoom factor
        const currentDistance = camera.position.distanceTo(orbitTarget.current);
        
        // Adjusted zoom factor (Original / 15 * 6 = Original / 2.5)
        const zoomSpeedMultiplier = 6 / 15; // Was 2/15, now tripled for faster zooming
        const zoomOutFactor = 0.1 * zoomSpeedMultiplier;
        const zoomInFactor = 0.08 * zoomSpeedMultiplier;

        // More subtle zoom factor that depends on current distance
        const adaptiveZoomFactor = zoomOut ? 
          1 + (zoomOutFactor * Math.min(1, currentDistance / 100)) : 
          1 - (zoomInFactor * Math.min(1, currentDistance / 100));
        
        // Calculate the distance to move based on the zoom factor
        // For zoom in (adaptiveZoomFactor < 1), delta is negative (move forward)
        // For zoom out (adaptiveZoomFactor > 1), delta is positive (move backward)
        const deltaDistance = currentDistance * (1 - adaptiveZoomFactor);

        // Get the camera's current forward direction
        const forwardDirection = new THREE.Vector3();
        camera.getWorldDirection(forwardDirection);
        
        // Calculate the movement vector along the forward direction
        const movementVector = forwardDirection.multiplyScalar(-deltaDistance); // Negate deltaDistance because forward is negative Z
        
        // Apply the movement to the camera's position
        // Clamp movement to prevent zooming past the target or excessively far
        const newPosition = camera.position.clone().add(movementVector);
        const newDistanceToTarget = newPosition.distanceTo(orbitTarget.current);
        const minDistance = 30; // Increased from 0.5 to 30 to prevent erratic behavior
        const maxDistance = 10000;

        if (newDistanceToTarget >= minDistance && newDistanceToTarget <= maxDistance) {
            camera.position.copy(newPosition);
        } else if (newDistanceToTarget < minDistance) {
            // If trying to zoom closer than minDistance, move to minDistance
            const clampedDirection = new THREE.Vector3().subVectors(camera.position, orbitTarget.current).normalize();
            camera.position.copy(orbitTarget.current).add(clampedDirection.multiplyScalar(minDistance));
        }
        // Note: We don't clamp maxDistance here as it's less critical than minDistance,
        // but you could add similar logic if needed.

        // DO NOT call lookAt() here, as we want to preserve orientation
        // camera.lookAt(orbitTarget.current); // REMOVED
        
        // Update the projection matrix is still necessary
        camera.updateProjectionMatrix();
        
        // Update the permanent center marker after zoom
        updateOrbitCenterMarker();
        
        // Throttle LOD updates during zoom to prevent excessive recalculations
        if (window.dispatchEvent) {
          // Dispatch a custom event for ThreeJSOptimizer to handle
          window.dispatchEvent(new CustomEvent('zoom-operation', { 
            detail: { 
              inProgress: true,
              distance: newDistanceToTarget // Use the potentially clamped distance
            }
          }));
        }
      });
    };
    
    // Add event listeners directly to domElement for better performance
    const domElement = gl.domElement;
    domElement.addEventListener('mousedown', handleMouseDown);
    domElement.addEventListener('dblclick', handleDoubleClick);
    domElement.addEventListener('mousemove', handleMouseMove);
    domElement.addEventListener('mouseup', handleMouseUp);
    domElement.addEventListener('mouseleave', handleMouseLeave);
    domElement.addEventListener('wheel', handleWheel, { passive: false });
    
    // Add keyboard event listeners for center point mode
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Clean up event listeners
    return () => {
      domElement.removeEventListener('mousedown', handleMouseDown);
      domElement.removeEventListener('dblclick', handleDoubleClick);
      domElement.removeEventListener('mousemove', handleMouseMove);
      domElement.removeEventListener('mouseup', handleMouseUp);
      domElement.removeEventListener('mouseleave', handleMouseLeave);
      domElement.removeEventListener('wheel', handleWheel);
      
      // Remove keyboard event listeners
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      
      // Cancel any pending animation frame
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
      
      // Clear any pending wheel timeout
      if (wheelTimeout !== null) {
        clearTimeout(wheelTimeout);
      }
    };
  }, [camera, gl, scene, setCenterModeActive, updateOrbitCenterMarker]);
  
  // Return both the temporary and permanent center markers
  return (
    <>
      <CenterPointPreview />
      <PermanentOrbitCenterMarker />
    </>
  );
};

// Canvas component with scene access
const sceneRef = React.createRef<THREE.Scene>();
const rendererRef = React.createRef<THREE.WebGLRenderer>();

// Main 3D viewer component
const Local3DViewer: React.FC<Local3DViewerProps> = ({ 
  height = '100%', 
  liveDronePosition, 
  liveDroneRotation,
  loadingMessage
}) => {
  const { state, dispatch } = useMission();
  const { forceRerender } = useThreeJSState();
  const { 
    sceneSettings, 
    editingSceneObjectId, 
    isCameraFrustumVisible,
    currentMission,
    isPerformingHeavyOperation,
    hardware
  } = state;

  // Create a ref for OrbitControls
  const controlsRef = useRef(null);
  
  // Use a ref to track if ship has been positioned to prevent repeated repositioning
  const shipPositionedRef = useRef(false);

  // State for panels and drone control
  const [isPositionPanelOpen, setIsPositionPanelOpen] = useState(false);
  const [manualDronePosition, setManualDronePosition] = useState<LocalCoord | null>(null);
  const [manualCameraFollow, setManualCameraFollow] = useState(true);
  const [isHardwareSettingsPanelOpen, setIsHardwareSettingsPanelOpen] = useState(false);
  const [isSceneSettingsPanelOpen, setIsSceneSettingsPanelOpen] = useState(false);
  const [isCameraViewportVisible, setIsCameraViewportVisible] = useState(false);
  const [isSceneLoading, setIsSceneLoading] = useState(true);
  const [rendererReady, setRendererReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(10); // Start at 10% to show initial activity
  const [loadingModelName, setLoadingModelName] = useState<string | null>(null);
  // Add flag to track if scene is fully initialized
  const [sceneFullyInitialized, setSceneFullyInitialized] = useState(false);
  const [hardwareVisualizationSettings, setHardwareVisualizationSettings] = useState({
    showNearFocusPlane: true,
    showFarFocusPlane: false,
    showFocusPlaneInfo: false,
    showDOFInfo: false,
    showFootprintInfo: false,
    showFocusPlaneLabels: false
  });
  
  // Refs to store the scene and renderer
  const mainSceneRef = useRef<THREE.Scene | null>(null);
  const mainRendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Example setup of PX4 camera control handlers (add this inside the component)
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [dronePosition, setDronePosition] = useState<LocalCoord>({ x: 0, y: 0, z: 10 });
  const [cameraFollows, setCameraFollows] = useState(true);
  const [gimbalPitch, setGimbalPitch] = useState(0);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');
  const [isRecording, setIsRecording] = useState(false);

  // ADDED: State for manual drone heading
  const [manualDroneHeading, setManualDroneHeading] = useState<number>(0);

  // Add state for FPS counter
  const [showFpsCounter, setShowFpsCounter] = useState<boolean>(false);

  // Start and complete loading state
  useEffect(() => {
    setIsSceneLoading(true);
    setLoadingProgress(10);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        // Cap progress at 90% until fully loaded
        const nextProgress = prev + Math.random() * 5;
        return Math.min(nextProgress, rendererReady ? 100 : 90);
      });
    }, 200);
    
    const loadingTimer = setTimeout(() => {
      if (rendererReady) {
        setLoadingProgress(100);
        // Small delay before hiding the loading screen for a smooth transition
        setTimeout(() => {
          setIsSceneLoading(false);
          // Mark scene as fully initialized after loading completes
          setSceneFullyInitialized(true);
        }, 500);
      }
    }, 1500); // Minimum load time for UI stability
    
    return () => {
      clearTimeout(loadingTimer);
      clearInterval(progressInterval);
    };
  }, [rendererReady]);
  
  // Watch for heavy operations to show loading message
  useEffect(() => {
    if (isPerformingHeavyOperation) {
      // Reset loading state when starting a heavy operation
      setIsSceneLoading(true);
      setLoadingProgress(30); // Start at 30% for model loading
      setLoadingModelName("Loading model...");
      
      // Simulate progress
      const heavyOpInterval = setInterval(() => {
        setLoadingProgress(prev => {
          const nextProgress = prev + Math.random() * 3;
          return Math.min(nextProgress, 95); // Cap at 95% until operation completes
        });
      }, 300);
      
      return () => clearInterval(heavyOpInterval);
    } else if (loadingModelName) {
      // When heavy operation ends, finalize loading
      setLoadingProgress(100);
      setTimeout(() => {
        setIsSceneLoading(false);
        setLoadingModelName(null);
      }, 500);
    }
  }, [isPerformingHeavyOperation]);

  // Determine the current drone position with improved takeoff point handling
  const actualCurrentDronePosition = useMemo(() => {
    // First priority: Manual position (user has explicitly set it)
    if (manualDronePosition) {
      return manualDronePosition;
    }
    
    // Second priority: Live drone position from telemetry
    if (liveDronePosition) {
      return liveDronePosition;
    }
    
    // Third priority: Takeoff point
    // Since we've made takeoff point the origin (0,0,0), return origin
    return { x: 0, y: 0, z: 0 };
  }, [manualDronePosition, liveDronePosition]);

  // Determine the current drone rotation
  const actualCurrentDroneRotation = useMemo(() => {
    // Prioritize manual heading if manual position is also set
    if (manualDronePosition !== null) {
      return { heading: manualDroneHeading, pitch: 0, roll: 0 }; // Assuming manual control resets pitch/roll
    }
    // Prioritize live rotation if available
    if (liveDroneRotation) return liveDroneRotation;
    // Add other potential sources of rotation if needed (e.g., from mission plan)
    return { heading: 0, pitch: 0, roll: 0 }; // Default rotation
  }, [manualDronePosition, manualDroneHeading, liveDroneRotation]); // Added manualDroneHeading dependency

  // Handlers
  const handleDroneDoubleClick = () => {
    if (!isPositionPanelOpen) {
      // Initialize manual position with the current position when opening
      setManualDronePosition(actualCurrentDronePosition);
    }
    setIsPositionPanelOpen(!isPositionPanelOpen);
    forceRerender();
  };

  const handleManualPositionChange = (newPosition: LocalCoord) => {
    setManualDronePosition(newPosition);
    forceRerender();
  };

  const handleManualCameraFollowChange = (follows: boolean) => {
    setManualCameraFollow(follows);
    forceRerender();
  };

  const handleToggleCameraViewport = (visible: boolean) => {
    setIsCameraViewportVisible(visible);
  };

  const handleSceneInit = () => {
    setRendererReady(true);
  };

  // PX4 camera control handlers
  const handleGimbalPitchChange = (pitch: number) => {
    setGimbalPitch(pitch);
    console.log(`Setting gimbal pitch to ${pitch}°`);
  };

  const handleCameraModeChange = (mode: 'photo' | 'video') => {
    setCameraMode(mode);
    console.log(`Switching camera to ${mode} mode`);
  };

  const handleTriggerCamera = () => {
    console.log('Capturing photo');
  };

  const handleToggleRecording = () => {
    const newRecordingState = !isRecording;
    setIsRecording(newRecordingState);
    console.log(newRecordingState ? 'Starting video recording' : 'Stopping video recording');
  };

  // ADDED: Handler for manual heading change
  const handleManualHeadingChange = (newHeading: number) => {
    setManualDroneHeading(newHeading);
    forceRerender(); // Ensure scene updates with new heading
  };

  // Determine loading message
  const displayLoadingMessage = loadingMessage || 
    (loadingModelName ? loadingModelName : 
      isPerformingHeavyOperation ? "Processing mission data..." : "Loading 3D scene...");

  // Add these to Local3DViewer component state
  // Initialize orbit target based on initial drone position
  const initialDronePosVec = useMemo(() => localCoordToThree(actualCurrentDronePosition), [actualCurrentDronePosition]);

  // Add event listener for FPS toggle
  useEffect(() => {
    const handleToggleFps = (event: CustomEvent) => {
      setShowFpsCounter(event.detail.visible);
    };
    
    window.addEventListener('toggle-fps-display', handleToggleFps as EventListener);
    
    return () => {
      window.removeEventListener('toggle-fps-display', handleToggleFps as EventListener);
    };
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clean up function that will run when component unmounts
      console.log("[Local3DViewer] Unmounting and releasing resources");
      
      // Force garbage collection and clear any animation loops
      if (mainRendererRef.current) {
        const renderer = mainRendererRef.current;
        
        // Release all cached textures and objects
        renderer.dispose();
        
        // Clear WebGL context by setting size to 0
        renderer.setSize(0, 0);
        
        // Force context loss
        const gl = renderer.getContext();
        if (gl && typeof gl.getExtension === 'function') {
          const loseContext = gl.getExtension('WEBGL_lose_context');
          if (loseContext) {
            loseContext.loseContext();
          }
        }
      }
      
      // Clean up the scene
      if (mainSceneRef.current) {
        const scene = mainSceneRef.current;
        
        // Dispose of all meshes, materials, textures
        scene.traverse((object) => {
          // Clean up geometries
          if ((object as THREE.Mesh).geometry) {
            (object as THREE.Mesh).geometry.dispose();
          }
          
          // Clean up materials
          if ((object as THREE.Mesh).material) {
            const material = (object as THREE.Mesh).material;
            
            // Handle array of materials
            if (Array.isArray(material)) {
              material.forEach(mat => {
                disposeTextures(mat);
                mat.dispose();
              });
            } else if (material) {
              // Handle single material
              disposeTextures(material);
              material.dispose();
            }
          }
        });
        
        // Clear scene
        while (scene.children.length > 0) {
          scene.remove(scene.children[0]);
        }
      }
      
      // Clear any post-processing effects
      // (Add code for specific effects if you have them)
      
      // Manually run garbage collection if in development
      if (process.env.NODE_ENV === 'development') {
        // This is not standard practice and only works in some environments
        if (window.gc) {
          console.log("[Local3DViewer] Forcing garbage collection");
          window.gc();
        }
      }
    };
  }, []);
  
  // Helper function to dispose of textures in a material
  const disposeTextures = (material: THREE.Material) => {
    // Find all texture properties
    if (!material) return;
    
    // Check common texture properties
    const textureProps = [
      'map', 'normalMap', 'specularMap', 'emissiveMap', 
      'roughnessMap', 'metalnessMap', 'alphaMap', 'aoMap',
      'bumpMap', 'displacementMap', 'envMap'
    ];
    
    // Release each texture
    textureProps.forEach(prop => {
      if (material[prop as keyof THREE.Material]) {
        const texture = material[prop as keyof THREE.Material] as THREE.Texture;
        if (texture && texture.dispose) {
          texture.dispose();
        }
      }
    });
  };

  // Render the main component
  return (
    <ErrorBoundary>
      <Paper 
        elevation={0} 
        sx={{ 
          height: height,
          position: 'relative', 
          overflow: 'hidden', 
          borderRadius: 0,
          backgroundColor: sceneSettings.backgroundColor, 
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Heavy operation indicator */}
        {isPerformingHeavyOperation && !isSceneLoading && (
          <MuiBox sx={{ 
            position: 'absolute',
            bottom: 20,
            right: 20,
            zIndex: 10,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: 1,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <CircularProgress size={16} color="primary" />
            <Typography variant="caption" color="white">
              Processing...
            </Typography>
          </MuiBox>
        )}
        
        {/* Settings buttons */}
        <MuiBox sx={{ 
          position: 'absolute', 
          top: 10, 
          right: 10, 
          zIndex: 10,
          display: 'flex',
          gap: 1
        }}>
          <IconButton 
            onClick={() => {
              setIsSceneSettingsPanelOpen(prev => !prev);
              forceRerender();
            }}
            sx={{ 
              bgcolor: 'rgba(0,0,0,0.5)', 
              color: 'white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
            }}
            size="small"
          >
            <SettingsIcon />
          </IconButton>
          <IconButton 
            onClick={() => {
              setIsHardwareSettingsPanelOpen(prev => !prev);
              forceRerender();
            }}
            sx={{ 
              bgcolor: 'rgba(0,0,0,0.5)', 
              color: isCameraFrustumVisible ? '#4fc3f7' : 'white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
            }}
            size="small"
          >
            <TuneIcon />
          </IconButton>
        </MuiBox>
        
        {/* Enhanced loading indicator with fade transition */}
        <Fade in={isSceneLoading} timeout={{ enter: 300, exit: 500 }}>
          <MuiBox sx={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: 'rgba(21, 21, 21, 0.9)',
            zIndex: 50,
            padding: 4
          }}>
            <MuiBox sx={{ textAlign: 'center', width: '80%', maxWidth: '400px' }}>
              <CircularProgress 
                color="primary" 
                size={50} 
                thickness={4}
                variant="determinate"
                value={loadingProgress}
              />
              <Typography variant="h6" color="primary" sx={{ mt: 3, fontWeight: 500 }}>
                {displayLoadingMessage}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={loadingProgress} 
                sx={{ 
                  mt: 2, 
                  height: 6, 
                  borderRadius: 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#4fc3f7'
                  }
                }} 
              />
              <Typography variant="caption" color="white" sx={{ mt: 1, opacity: 0.7, display: 'block' }}>
                {loadingProgress >= 100 ? 'Complete!' : `${Math.round(loadingProgress)}% complete`}
              </Typography>
            </MuiBox>
          </MuiBox>
        </Fade>
        
        {/* 3D Canvas with optimized settings */}
        <Canvas 
          key={`canvas-${sceneSettings.waterEnabled}-${sceneSettings.hideGroundPlane}-${sceneSettings.gridVisible}`}
          shadows={sceneSettings.shadowsEnabled ?? true}
          camera={{ 
            position: [initialDronePosVec.x + 60, initialDronePosVec.y + 45, initialDronePosVec.z + 120], // Closer to the scene 
            fov: sceneSettings.fov,
            near: 0.1,
            far: 4000, // Reduced from 6000 to 4000 for better performance with smaller scene
          }}
          dpr={window.devicePixelRatio > 1 ? 1 : window.devicePixelRatio}
          gl={{ 
            antialias: true,
            alpha: false,
            stencil: false,
            depth: true,
            powerPreference: 'high-performance',
            logarithmicDepthBuffer: true,
            precision: 'mediump',
          }}
          frameloop="always"
          performance={{ 
            min: 0.5,
            max: 1,
            debounce: 200
          }}
          onCreated={({ gl, scene }) => {
            // Store references to the scene and renderer
            mainSceneRef.current = scene;
            mainRendererRef.current = gl;
            
            // Performance optimizations
            gl.setPixelRatio(window.devicePixelRatio > 1 ? 1 : window.devicePixelRatio);
            
            // Enable memory-efficient buffer usage mode
            gl.autoClear = false;
            // Disable shader error checking in production for performance
            gl.debug.checkShaderErrors = false;
            
            // Disable shadow auto-update for performance
            scene.traverse((obj: any) => {
              if (obj.isMesh) {
                obj.castShadow = sceneSettings.shadowsEnabled ?? true;
                obj.receiveShadow = sceneSettings.shadowsEnabled ?? true;
                obj.matrixAutoUpdate = false;
                obj.updateMatrix();
                
                // Optimize materials when available
                if (obj.material) {
                  const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
                  materials.forEach((material: THREE.Material) => {
                    if (material.type === 'MeshStandardMaterial') {
                      (material as THREE.MeshStandardMaterial).flatShading = true;
                    }
                  });
                }
              }
            });
            
            // Wait for the next frame to ensure the renderer is actually ready
            requestAnimationFrame(() => handleSceneInit());
          }}
        >
          <Suspense fallback={null}>
            <DetailedErrorBoundary>
              <ThreeJSOptimizer>
                <LODManager />
                <CADControls />
                <MissionScene 
                  liveDronePosition={liveDronePosition} 
                  liveDroneRotation={liveDroneRotation}
                  manualDronePosition={manualDronePosition} 
                  onDroneDoubleClick={handleDroneDoubleClick} 
                  cameraFollowsDrone={manualCameraFollow} 
                  visualizationSettings={hardwareVisualizationSettings}
                  gimbalPitch={gimbalPitch}
                  droneRotation={actualCurrentDroneRotation}
                />
              </ThreeJSOptimizer>
            </DetailedErrorBoundary>
          </Suspense>
        </Canvas>

        {/* Panels and modals */}
        <DronePositionControlPanel
          isOpen={isPositionPanelOpen}
          onClose={() => {
            setIsPositionPanelOpen(false);
            forceRerender();
          }}
          initialPosition={manualDronePosition || actualCurrentDronePosition}
          onPositionChange={handleManualPositionChange}
          initialHeading={manualDroneHeading} // Pass heading state
          onHeadingChange={handleManualHeadingChange} // Pass heading handler
          initialCameraFollow={manualCameraFollow}
          onCameraFollowChange={handleManualCameraFollowChange}
          gimbalPitch={gimbalPitch}
          onGimbalPitchChange={handleGimbalPitchChange}
          cameraMode={cameraMode}
          onCameraModeChange={handleCameraModeChange}
          isRecording={isRecording}
          onTriggerCamera={handleTriggerCamera}
          onToggleRecording={handleToggleRecording}
          isCameraViewportVisible={isCameraViewportVisible}
          onToggleCameraViewport={handleToggleCameraViewport}
        />

        <HardwareVisualizationSettings 
          isOpen={isHardwareSettingsPanelOpen}
          onClose={() => {
            setIsHardwareSettingsPanelOpen(false);
            forceRerender();
          }}
          onVisualizationSettingsChange={(settings) => {
            setHardwareVisualizationSettings(settings);
            forceRerender();
          }}
        />

        {/* Only show SceneObjectEditModal when NOT loading and scene is fully initialized */}
        {!isSceneLoading && sceneFullyInitialized && (
          <SceneObjectEditModal
            objectId={editingSceneObjectId || ''}
            open={!!editingSceneObjectId}
            onClose={() => {
              dispatch({ type: 'SET_EDITING_SCENE_OBJECT_ID', payload: null });
              forceRerender();
            }}
          />
        )}

        {/* Scene Settings Panel - Updated */}
        <MuiBox 
          sx={{ 
            position: 'absolute', 
            top: '55px', 
            right: '10px', 
            zIndex: 100,
            display: isSceneSettingsPanelOpen ? 'block' : 'none',
            transition: 'all 0.3s ease',
            maxWidth: '450px',
            width: '100%',
            opacity: isSceneSettingsPanelOpen ? 1 : 0,
            pointerEvents: isSceneSettingsPanelOpen ? 'auto' : 'none',
          }}
        >
          <SceneSettingsPanel 
            settings={sceneSettings}
            onChange={(field, value) => {
              dispatch({ 
                type: 'UPDATE_SCENE_SETTINGS', 
                payload: { [field]: value } 
              });
              forceRerender();
            }}
            open={isSceneSettingsPanelOpen}
            onClose={() => {
              setIsSceneSettingsPanelOpen(false);
              forceRerender();
            }}
          />
        </MuiBox>
        
        {/* Conditionally render the Camera Viewport Window */}
        {isCameraViewportVisible && mainSceneRef.current && (
          <CameraViewportWindow
            mainScene={mainSceneRef.current}
            onClose={() => handleToggleCameraViewport(false)}
            cameraDetails={hardware?.cameraDetails ?? null}
            lensDetails={hardware?.lensDetails ?? null}
            dronePosition={actualCurrentDronePosition}
            droneRotation={actualCurrentDroneRotation}
            gimbalPitch={gimbalPitch}
            shadowsEnabled={sceneSettings.shadowsEnabled ?? true}
          />
        )}

        {showFpsCounter && <SimpleFpsDisplay visible={showFpsCounter} />}

        {/* User hint for CAD controls */}
        <MuiBox
          sx={{
            position: 'absolute',
            left: '10px',
            bottom: '10px',
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '0.8rem',
            pointerEvents: 'none',
            opacity: 0.8,
            transition: 'opacity 0.3s',
            '&:hover': { opacity: 0.3 }
          }}
        >
          Hold C + hover to set orbit center | Press O to toggle center marker | Double-click to select objects
        </MuiBox>
      </Paper>
    </ErrorBoundary>
  );
};

// Level of Detail component generator
export const withLOD = (
  _Component: React.ComponentType<any> | string,
  config: {
    distanceThresholds: number[];
    getDetailLevel: (level: number) => React.ReactNode;
  }
) => {
  // Create a simple functional component for React Three Fiber
  // Avoiding any direct use of THREE namespace inside the component definition
  const LODComponent = () => {
    const { camera } = useThree();
    const [currentLevel, setCurrentLevel] = useState(0);
    const prevLevelRef = useRef(0);
    const groupRef = useRef<THREE.Group | null>(null);
    
    // Store original distances when the component mounts
    useEffect(() => {
      if (!groupRef.current) return;
      
      // Store distances as regular object property instead of userData
      // to avoid potential THREE namespace conflicts
      const originalDistances = [...config.distanceThresholds];
      
      // Use a simpler event-based approach that doesn't rely on THREE objects in events
      const uuid = groupRef.current.uuid;
      
      // Skip the global registration to avoid potential issues
      // This simplifies the implementation and removes a potential source of errors
      
      return () => {
        // Clean up is also simplified
      };
    }, []);
    
    // Use a simpler distance check that doesn't modify THREE objects
    useFrame(() => {
      if (!groupRef.current || !camera) return;
      
      // Get current position
      const position = new THREE.Vector3();
      if (groupRef.current) {
        groupRef.current.getWorldPosition(position);
      }
      
      // Calculate distance to camera
      const distance = position.distanceTo(camera.position);
      
      // Find appropriate detail level
      let newLevel = config.distanceThresholds.length;
      for (let i = 0; i < config.distanceThresholds.length; i++) {
        if (distance < config.distanceThresholds[i]) {
          newLevel = i;
          break;
        }
      }
      
      // Only update state if level changed
      if (newLevel !== prevLevelRef.current) {
        setCurrentLevel(newLevel);
        prevLevelRef.current = newLevel;
      }
    });
    
    // Return a simple group with the appropriate detail level
    return (
      <group ref={groupRef}>
        {config.getDetailLevel(currentLevel)}
      </group>
    );
  };
  
  return LODComponent;
};

// Add this to Local3DViewer.tsx
class DetailedErrorBoundary extends React.Component<
  {children: React.ReactNode}, 
  {hasError: boolean, error: Error | null, errorInfo: React.ErrorInfo | null}
> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Set state with error details
    this.setState({ hasError: true, error, errorInfo });
    
    // Log detailed error information
    console.group('%c🐞 R3F Error Details', 'color: red; font-size: 16px; font-weight: bold');
    console.error('Error:', error.message);
    console.log('Component Stack:', errorInfo.componentStack);
    
    // Parse component stack to find the problematic component
    const stackLines = errorInfo.componentStack?.split('\n') || [];
    let suspectedComponents: string[] = [];
    
    for (const line of stackLines) {
      // Look for Text or HTML elements that might be causing issues in Three.js context
      if (line.includes('Text') || 
          /in (H[1-6]|div|span|p)/i.test(line)) {
        suspectedComponents.push(line.trim());
      }
    }
    
    if (suspectedComponents.length > 0) {
      console.log('%c🔍 Suspected Components:', 'color: orange; font-weight: bold');
      suspectedComponents.forEach((comp, i) => console.log(`${i+1}. ${comp}`));
      console.log('HTML elements cannot be used directly in Three.js/R3F context. Use Three.js compatible components instead.');
    }
    
    console.groupEnd();
  }

  render() {
    if (this.state.hasError) {
      // For errors inside a Three.js canvas, return an empty group to avoid rendering HTML elements
      return null;
    }
    return this.props.children;
  }
}

// At the bottom of Local3DViewer.tsx, add this component
const SimpleFpsDisplay: React.FC<{visible: boolean}> = ({ visible }) => {
  const [fps, setFps] = useState(0);
  
  useEffect(() => {
    if (!visible) return;
    
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;
    
    const updateFps = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      animationFrameId = requestAnimationFrame(updateFps);
    };
    
    animationFrameId = requestAnimationFrame(updateFps);
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [visible]);
  
  if (!visible) return null;
  
  return (
    <MuiBox
      sx={{
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: fps < 30 ? '#ff3d00' : fps < 50 ? '#ffab00' : '#64ffda',
        padding: '4px 8px',
        borderRadius: 1,
        fontSize: '0.8rem',
        fontWeight: 'bold',
        zIndex: 1000,
      }}
    >
      {fps} FPS
    </MuiBox>
  );
};

export default Local3DViewer; 