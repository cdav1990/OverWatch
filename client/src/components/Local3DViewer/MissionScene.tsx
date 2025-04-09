import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Sky, TransformControls } from '@react-three/drei';
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
import { mapLocalCoordsToThree, threeToLocalCoord } from './utils/threeHelpers';
import MissionAreaIndicator from './indicators/MissionAreaIndicator';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import ObjectTransformControls from './controls/ObjectTransformControls';
import { SceneSettings } from './types/SceneSettings';

// Add constants for drag smoothing
const DRAG_SMOOTHING_FACTOR = 0.25; // Lower = smoother/slower, higher = more responsive
const DRAG_SPRING_CONFIG = { mass: 1.5, tension: 80, friction: 40 }; // More mass, less tension, more friction

// Modify the MissionScene component props to include selectedFace state
interface MissionSceneProps {
  liveDronePosition?: LocalCoord | null;
  liveDroneRotation?: { heading: number; pitch: number; roll: number; } | null;
  manualDronePosition?: LocalCoord | null;
  onDroneDoubleClick: (event: ThreeEvent<MouseEvent>) => void;
  cameraFollowsDrone: boolean;
  visualizationSettings?: CameraFrustumProps['visualization'];
}

// Add this interface near the top of the file where other interfaces are defined, before the component
// This interface extends PathSegment to include groundProjections property
interface PathSegmentWithProjections extends PathSegment {
  groundProjections?: Waypoint[];
}

// Scene setup component
const SceneSetup: React.FC = () => {
  const { camera } = useThree();

  useEffect(() => {
    // Set initial camera position
    camera.position.set(30, 50, 50);
    camera.lookAt(0, 0, 0);
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
      material.opacity = sceneSettings.groundOpacity || 0.3;
      material.transparent = true;
      material.side = sceneSettings.showBelowGround ? THREE.DoubleSide : THREE.FrontSide;
      material.needsUpdate = true;
    }
  }, [sceneSettings.groundOpacity, sceneSettings.showBelowGround]);
  
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
        transparent={true}
        opacity={sceneSettings.groundOpacity || 0.3} // Use configured opacity with fallback
        side={sceneSettings.showBelowGround ? THREE.DoubleSide : THREE.FrontSide} // Show both sides when enabled
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
  
  // Create a texture for water with improved performance
  const waterTexture = useMemo(() => {
    const texture = new THREE.TextureLoader().load('/textures/waternormals.jpg');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set((sceneSettings.waterWaveScale || 1.0) * 10, (sceneSettings.waterWaveScale || 1.0) * 10);
    return texture;
  }, [sceneSettings.waterWaveScale]);
  
  // Use ref for animation
  const waterRef = useRef<THREE.Mesh>(null);
  const time = useRef(0);

  // Animate water waves based on speed setting
  useFrame((_, delta) => {
    if (waterRef.current && waterRef.current.material) {
      time.current += delta * (sceneSettings.waterWaveSpeed || 0.5);
      // Apply time to displacement map
      const material = waterRef.current.material as THREE.MeshStandardMaterial;
      if (material.displacementMap) {
        material.displacementMap.offset.set(0, time.current * 0.05);
        material.needsUpdate = true;
      }
    }
  });
  
  // Force rerender on settings change
  useEffect(() => {
    if (waterRef.current) {
      waterRef.current.visible = true;
      // Update material properties from settings
      const material = waterRef.current.material as THREE.MeshStandardMaterial;
      if (material) {
        material.color.set(sceneSettings.waterColor || '#4fc3f7');
        material.opacity = sceneSettings.waterOpacity || 0.6;
        material.needsUpdate = true;
      }
    }
  }, [
    sceneSettings.waterEnabled, 
    sceneSettings.waterColor, 
    sceneSettings.waterOpacity
  ]);
  
  return (
    <mesh 
      ref={waterRef}
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, -0.05, 0]}
      receiveShadow={sceneSettings.shadowsEnabled}
    >
      <planeGeometry args={[10000, 10000, 100, 100]} />
      <meshStandardMaterial
        color={sceneSettings.waterColor || '#4fc3f7'}
        transparent={true}
        opacity={sceneSettings.waterOpacity || 0.6}
        metalness={0.8}
        roughness={0.2}
        side={THREE.DoubleSide}
        displacementMap={waterTexture}
        displacementScale={0.5}
      />
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
                depthWrite={false} // Prevent interference with other transparent objects
            />
        </mesh>
    );
};

// Completely refactor the EnhancedGrid component to avoid TypeScript issues
const EnhancedGrid: React.FC<{
  sceneSettings: SceneSettings;
}> = ({ sceneSettings }) => {
  // Skip if grid is hidden
  if (!sceneSettings.gridVisible) return null;
  
  // Safe grid size and fade distance that are guaranteed to be numbers
  const gridSize = typeof sceneSettings.gridSize === 'number' ? sceneSettings.gridSize : 1000;
  const fadeDistance = typeof sceneSettings.gridFadeDistance === 'number' ? sceneSettings.gridFadeDistance : 1000;
  
  // Calculate cell size based on units
  const cellSize = sceneSettings.gridUnit === 'feet' ? 3.28084 : 1;
  
  // Calculate section size (for major grid lines)
  const sectionSize = sceneSettings.gridUnit === 'feet' ? 32.8084 : 10;
  
  // Create a reference to the grid to efficiently update
  const gridRef = useRef<THREE.Group>(null);
  
  // Update grid rotation to ensure it stays flat and stable
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.rotation.set(-Math.PI / 2, 0, 0);
    }
  }, []);

  // For better visibility, use a larger offset from ground
  const gridOffset = 0.02; // Slightly above ground to avoid z-fighting

  // Safe half grid size for axes
  const halfGridSize = Math.floor(gridSize / 2);

  return (
    <group ref={gridRef} position={[0, gridOffset, 0]}>
      {/* Main grid */}
      <Grid
        args={[gridSize, gridSize]}
        cellSize={cellSize}
        cellThickness={1.5} // Increased thickness for better visibility
        cellColor={sceneSettings.gridColorGrid}
        sectionSize={sectionSize}
        sectionThickness={2} // Increased thickness for better visibility
        sectionColor={sceneSettings.gridColorCenterLine}
        fadeDistance={fadeDistance}
        fadeStrength={1.5} // Increased strength for smoother fade
        infiniteGrid
        followCamera={false} // Don't move with camera - fixes glitching
      />
      
      {/* Add coordinate axes if enabled */}
      {sceneSettings.axesVisible && (
        <>
          {/* X-axis (red) - using correct typed array construction */}
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([-halfGridSize, 0, 0, halfGridSize, 0, 0])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="red" linewidth={3} />
          </line>
          
          {/* Y-axis (green) - using correct typed array construction */}
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([0, 0, -halfGridSize, 0, 0, halfGridSize])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="green" linewidth={3} />
          </line>
        </>
      )}
    </group>
  );
};

// Main scene component - Now accepts live props
const MissionScene: React.FC<MissionSceneProps> = ({
  liveDronePosition,
  liveDroneRotation,
  manualDronePosition,
  onDroneDoubleClick,
  cameraFollowsDrone,
  visualizationSettings
}) => {
  const { state, dispatch } = useMission();
  const threeState = useThree(); // Access camera, mouse, etc.
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  
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
    sceneSettings
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

    const { camera, raycaster, pointer } = threeState;
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
        z: 0 // Assume interaction is on the ground (z=0 in ENU)
      };

      // Handle based on the current interaction mode
      if (isSelectingTakeoffPoint) {
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
    
    // Camera follow logic
    if (cameraFollowsDrone && cameraOffset && activeDronePosition && controlsRef.current) {
      const targetPos = new THREE.Vector3(
        activeDronePosition.x, 
        activeDronePosition.z, 
        -activeDronePosition.y
      );
      const desiredCameraPos = new THREE.Vector3().addVectors(targetPos, cameraOffset);
      
      // Update camera position
      threeState.camera.position.copy(desiredCameraPos);
      
      // Update controls target
      controlsRef.current.target.copy(targetPos);
      controlsRef.current.update();
    }
  });

  // Generate points for the polygon outline visualization
  const polygonDrawPoints = useMemo(() => {
    if (!currentMission) return [];
    
    // Use state for polygon points instead of currentMission
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

  // Determine the currently displayed drone position
  const activeDronePosition = useMemo(() => {
    if (manualDronePosition) return manualDronePosition;
    if (state.isLive && liveDronePosition) return liveDronePosition;
    if (state.isSimulating) return simDronePosition;
    if (currentMission?.takeoffPoint) return currentMission.takeoffPoint;
    return { x: 0, y: 0, z: 0 };
  }, [manualDronePosition, state.isLive, liveDronePosition, state.isSimulating, simDronePosition, currentMission?.takeoffPoint]);

  const activeDroneRotation = useMemo(() => {
    if (state.isLive && liveDroneRotation) return liveDroneRotation;
    if (state.isSimulating) return simDroneRotation;
    return { heading: 0, pitch: 0, roll: 0 }; 
  }, [state.isLive, liveDroneRotation, state.isSimulating, simDroneRotation]);

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
      const offset = new THREE.Vector3().subVectors(threeState.camera.position, currentTargetVec);
      setCameraOffset(offset);
      
      // Ensure target is set correctly when follow is enabled initially
      if (controlsRef.current) {
        controlsRef.current.target.copy(currentTargetVec);
      }
    } else if (justDisabledFollow) {
      setCameraOffset(null);
      // Reset target to origin when follow is disabled
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
      }
    }

    // Update previous state ref for next render
    prevCameraFollowsDrone.current = cameraFollowsDrone;
  }, [cameraFollowsDrone, threeState.camera, controlsRef, activeDronePosition]);

  // New handler for interactions with scene objects
  const handleObjectInteraction = (objectId: string, objectType: 'sceneObject' | 'gcp', isShiftPressed: boolean, event: ThreeEvent<MouseEvent>) => {
    console.log(`Interaction with ${objectType} ${objectId}`);
    
    // Handle different types of interactions based on object type
    if (objectType === 'sceneObject') {
      // Just log for now, keep it simple - actual selection handled in the renderer
      console.log("Scene object clicked:", objectId);
    } else if (objectType === 'gcp') {
      // Add GCP selection logic here if needed
      console.log("GCP clicked:", objectId);
    }
  };

  // Effect to listen for Escape key to cancel dragging/transforming
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && interactingObjectInfo) {
        setInteractingObjectInfo(null);
        setDraggedObjectPreviewPosition(null);
        setInitialTransformState(null);
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
        if (targetWaypoint?.holdTime && targetWaypoint.holdTime > 0) {
          console.log(`Pausing at waypoint for ${targetWaypoint.holdTime} seconds`);
          
          // Enter hold state
          setIsHoldingAtWaypoint(true);
          setHoldTimeRemaining(targetWaypoint.holdTime);
          setWaypointHoldStartTime(state.clock.elapsedTime);
          
          // Initialize camera transition if the waypoint has camera orientation
          if (targetWaypoint.camera) {
            const { pitch, roll } = targetWaypoint.camera;
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

  // Water effect with proper nullish coalescing operators
  return (
    <>
      <SceneSetup />

      {/* Sky and lighting - controlled by settings */}
      {sceneSettings.skyEnabled && <Sky sunPosition={new THREE.Vector3(...sceneSettings.sunPosition)} />}
      <ambientLight intensity={sceneSettings.ambientLightIntensity} />
      <directionalLight
        position={sceneSettings.sunPosition}
        intensity={sceneSettings.directionalLightIntensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={150}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />

      {/* Ground plane and grid */}
      <EnhancedGrid sceneSettings={sceneSettings} />

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
        <SceneObjectRenderer
          key={obj.id}
          sceneObject={obj}
          isSelected={obj.id === selectedFace?.objectId}
          selectedFaceIndex={selectedFace?.objectId === obj.id ? selectedFace.faceIndex : undefined}
          onInteraction={handleObjectInteraction}
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
          onInteraction={handleObjectInteraction}
        />
      ))}

      {/* Render Selected Face Indicator */}
      {selectedFace && <HighlightFaceIndicator faceInfo={selectedFace} />}
      
      {/* Render Mission Areas - Convert missionAreas to array if we get undefined */}
      {(Array.isArray(missionAreas) ? missionAreas : []).map((area) => (
        <MissionAreaIndicator key={area.id} missionArea={area} />
      ))}

      {/* Render Drone */}
      {isDroneVisible && (
        <DroneModel
          position={activeDronePosition}
          heading={activeDroneRotation.heading}
          pitch={activeDroneRotation.pitch}
          roll={activeDroneRotation.roll}
          onDoubleClick={onDroneDoubleClick}
          visualizationSettings={visualizationSettings}
        />
      )}

      {/* Camera controls */}
      <OrbitControls
        ref={controlsRef}
        enableDamping={sceneSettings.cameraDamping ?? false}
        dampingFactor={0.1}
        makeDefault
        reverseOrbit={sceneSettings.cameraInvertY ?? false}
      />

      {/* --- Render Selected Face Visualization --- */}
      <SelectedFaceVisualizer />
      {/* --- End Selected Face Visualization --- */}

      {/* Add ObjectTransformControls */}
      {transformObjectId && (
        <ObjectTransformControls 
          objectId={transformObjectId}
          onComplete={handleExitTransformMode}
        />
      )}
    </>
  );
};

export default MissionScene; 