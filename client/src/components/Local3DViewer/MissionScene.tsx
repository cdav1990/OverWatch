import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Sky, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useMission } from '../../context/MissionContext';
import { LocalCoord } from '../../types/mission';
import { useSpring, animated } from '@react-spring/three';
import WaypointMarker from './markers/WaypointMarker';
import PathLine from './markers/PathLine';
import GCPMarker from './markers/GCPMarker';
import SceneObjectRenderer from './objects/SceneObjectRenderer';
import HighlightFaceIndicator from './indicators/HighlightFaceIndicator';
import DroneModel from './drone/DroneModel';
import { CameraFrustumProps } from './drone/CameraFrustum';
import { mapLocalCoordsToThree } from './utils/threeHelpers';
import MissionAreaIndicator from './indicators/MissionAreaIndicator';

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
    isDroneVisible, missionAreas, selectedFace 
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

  // Refs for scene objects
  const groundMeshRef = useRef<THREE.Mesh>(null);

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
    if (event.object === groundMeshRef.current) {
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

    if (!groundMeshRef.current) return;

    // Check if the click was on our invisible ground plane mesh
    if (event.intersections.length > 0 && event.intersections[0].object === groundMeshRef.current) {
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
  const handleWaypointClick = (waypoint: any) => {
    dispatch({ type: 'SELECT_WAYPOINT', payload: waypoint });
  };

  // Handle path segment selection
  const handleSegmentClick = (segment: any) => {
    dispatch({ type: 'SELECT_PATH_SEGMENT', payload: segment });
  };

  // Determine the currently displayed drone position
  const activeDronePosition = useMemo(() => {
    if (manualDronePosition) return manualDronePosition;
    if (currentMission?.takeoffPoint) return currentMission.takeoffPoint;
    if (simDronePosition) return simDronePosition;
    return null;
  }, [manualDronePosition, currentMission?.takeoffPoint, simDronePosition]);

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
    if (isShiftPressed) {
      // Handle dragging/transforming
      setInteractingObjectInfo({ id: objectId, type: objectType, mode: 'drag' });
    } else {
      // Open edit modal
      dispatch({ type: 'SET_EDITING_SCENE_OBJECT_ID', payload: objectId });
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

  return (
    <>
      <SceneSetup />

      {/* Sky and lighting */}
      <Sky sunPosition={[100, 100, 20]} />
      <ambientLight intensity={state.sceneSettings.ambientLightIntensity} />
      <directionalLight
        position={[10, 30, 10]}
        intensity={state.sceneSettings.directionalLightIntensity}
        castShadow
      />

      {/* Ground plane and grid */}
      <Grid
        args={[300, state.sceneSettings.gridDivisions]}
        position={[0, 0, 0]}
        cellColor={state.sceneSettings.gridColorGrid}
        sectionSize={50}
        sectionThickness={1}
        sectionColor={state.sceneSettings.gridColorCenterLine}
        infiniteGrid
        fadeDistance={600}
        fadeStrength={1}
      />

      {/* Invisible ground plane for interactions */}
      <mesh
        ref={groundMeshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]} 
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onClick={handleBackgroundClick}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Render Scene Objects */}
      {state.sceneObjects.map((sceneObject) => (
        <SceneObjectRenderer
          key={sceneObject.id}
          sceneObject={sceneObject}
          onInteraction={handleObjectInteraction}
          onFaceSelect={handleFaceSelect}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        />
      ))}

      {/* Render Mission Elements */}
      {currentMission?.pathSegments?.map((segment) => (
        <PathLine
          key={segment.id}
          segment={segment}
          selected={state.selectedPathSegment?.id === segment.id}
          onClick={() => handleSegmentClick(segment)}
        />
      ))}

      {currentMission?.pathSegments?.flatMap(segment => segment.waypoints).map((waypoint) => (
        <WaypointMarker
          key={waypoint.id}
          waypoint={waypoint}
          selected={state.selectedWaypoint?.id === waypoint.id}
          onClick={() => handleWaypointClick(waypoint)}
        />
      ))}

      {/* Render GCPs */}
      {currentMission?.gcps?.map((gcp) => (
        <GCPMarker
          key={gcp.id}
          gcp={gcp}
          onInteraction={handleObjectInteraction}
        />
      ))}

      {/* Render Selected Face Indicator */}
      {selectedFace && <HighlightFaceIndicator faceInfo={selectedFace} />}
      
      {/* Render Mission Areas - Convert missionAreas to array if we get undefined */}
      {(Array.isArray(missionAreas) ? missionAreas : []).map(area => (
        <MissionAreaIndicator key={area.id} missionArea={area} />
      ))}

      {/* Render Drone */}
      {isDroneVisible && activeDronePosition && (
        <DroneModel
          position={activeDronePosition}
          heading={liveDroneRotation?.heading || simDroneRotation.heading || 0}
          pitch={liveDroneRotation?.pitch || simDroneRotation.pitch || 0}
          roll={liveDroneRotation?.roll || simDroneRotation.roll || 0}
          onDoubleClick={onDroneDoubleClick}
          visualizationSettings={visualizationSettings}
        />
      )}

      {/* Camera controls */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={drawingMode === null && !isSelectingTakeoffPoint && interactingObjectInfo === null}
        maxDistance={500}
        minDistance={5}
        enableDamping={true}
        dampingFactor={0.1}
      />
    </>
  );
};

export default MissionScene; 