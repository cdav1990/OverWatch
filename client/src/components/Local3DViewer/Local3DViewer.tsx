import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  
  // Add throttling vars
  const THROTTLE_MS = 16; // ~60fps max
  const pendingMove = useRef(false);
  const lastDeltaX = useRef(0);
  const lastDeltaY = useRef(0);
  
  // Create our own basic orbit controls logic from scratch
    useEffect(() => {
    // Set initial orbit center
    orbitTarget.current.set(0, 0, 0);
    
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
          
          // Calculate local right and up vectors
          const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
          const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
          
          // Calculate movement vectors
          const moveRight = right.clone().multiplyScalar(-lastDeltaX.current * panSpeed);
          const moveUp = up.clone().multiplyScalar(lastDeltaY.current * panSpeed);
          
          // Apply movement to both camera and target
          camera.position.add(moveRight).add(moveUp);
          orbitTarget.current.add(moveRight).add(moveUp);
          
          // Reset deltas after applying
          lastDeltaX.current = 0;
          lastDeltaY.current = 0;
          
          // No need to update lookAt since relative position hasn't changed
          camera.updateProjectionMatrix();
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
    
    // Throttled mouse move handler
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging.current) return;
      
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
        
        // Adjusted zoom factor (Original / 15 * 2 = Original / 7.5)
        const zoomSpeedMultiplier = 2 / 15; // Was 1/15
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
        const minDistance = 0.5; 
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
    
    // Clean up event listeners
    return () => {
      domElement.removeEventListener('mousedown', handleMouseDown);
      domElement.removeEventListener('dblclick', handleDoubleClick);
      domElement.removeEventListener('mousemove', handleMouseMove);
      domElement.removeEventListener('mouseup', handleMouseUp);
      domElement.removeEventListener('mouseleave', handleMouseLeave);
      domElement.removeEventListener('wheel', handleWheel);
      
      // Cancel any pending animation frame
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
      
      // Clear any pending wheel timeout
      if (wheelTimeout !== null) {
        clearTimeout(wheelTimeout);
      }
    };
  }, [camera, gl, scene]);
  
  // Return empty group (we're handling everything through events)
  return null;
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

  // Determine the current drone position
  const actualCurrentDronePosition = useMemo(() => {
    // DEV MODE: Prioritize default takeoff point if no live/manual data yet
    if (currentMission?.takeoffPoint && !liveDronePosition && !manualDronePosition) {
      return currentMission.takeoffPoint;
    }
    if (manualDronePosition) return manualDronePosition;
    if (liveDronePosition) return liveDronePosition;
    // Use takeoff point as final fallback if mission exists
    if (currentMission?.takeoffPoint) return currentMission.takeoffPoint;
    // Absolute fallback
    return { x: 0, y: 0, z: 0 };
  }, [manualDronePosition, liveDronePosition, currentMission?.takeoffPoint]);

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

  // Render the main component
  return (
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
    </Paper>
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

export default Local3DViewer; 