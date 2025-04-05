import React, { useRef, useState, useEffect, Suspense, useMemo } from 'react';
import { Canvas, useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Box, Sky, Sphere, Line, Cone, Edges, TransformControls } from '@react-three/drei';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'; // Import the implementation type for the ref
import { Paper, CircularProgress, Box as MuiBox } from '@mui/material';
import * as THREE from 'three';
import { useMission } from '../../context/MissionContext';
import { Waypoint, PathSegment, GCP, PathType, LocalCoord } from '../../types/mission';
import DronePositionControlPanel from '../DronePositionControlPanel/DronePositionControlPanel';
import { metersToFeet, feetToMeters } from '../../utils/sensorCalculations'; // <-- Import conversion functions
import { SceneObject } from '../../context/MissionContext';
import SceneObjectEditModal from './SceneObjectEditModal'; // Import SceneObjectEditModal

// Extend props to accept live telemetry data
interface Local3DViewerProps {
  height?: string | number;
  liveDronePosition?: LocalCoord | null;
  liveDroneRotation?: { heading: number; pitch: number; roll: number; };
}

// Waypoint visualization
const WaypointMarker: React.FC<{ waypoint: Waypoint; selected: boolean; onClick: () => void }> = ({ 
  waypoint, 
  selected, 
  onClick 
}) => {
  const { local } = waypoint;
  
  if (!local) {
    return null; // Skip rendering if no local coordinates
  }
  
  return (
    <Sphere
      args={[0.35, 16, 16]} // Reduced radius from previous potential size (e.g., 0.5)
      position={[local.x, local.z, -local.y]} // Map to threejs coordinates (z-up to y-up)
      onClick={(e) => { e.stopPropagation(); onClick(); }} 
    >
      <meshStandardMaterial 
        color={selected ? '#ff9800' : '#2979ff'}
        roughness={0.6}
        emissive={selected ? '#ff9800' : '#000000'} // Glow slightly when selected
        emissiveIntensity={selected ? 0.5 : 0}
      />
    </Sphere>
  );
};

// Path visualization
const PathLine: React.FC<{ 
  segment: PathSegment; 
  selected: boolean; 
  onClick: () => void 
}> = ({ segment, selected, onClick }) => {
  const { waypoints, type } = segment;
  
  if (waypoints.length < 2 || !waypoints[0].local) {
    return null; // Need at least 2 waypoints with local coords
  }

  // Map waypoints to 3D positions (convert from ENU to Three.js coordinate system)
  const points = waypoints
    .filter(wp => wp.local)
    .map(wp => wp.local!)
    .map(local => new THREE.Vector3(local.x, local.z, -local.y));
    // Convert LocalCoord (assumed ENU: East, North, Up) to Three.js coordinates (x=East, y=Up, z=South)
  
  // For curved paths, generate a smooth curve with more points
  let curvePoints = points;
  
  if (type === PathType.BEZIER && points.length >= 2) {
    const curve = new THREE.CatmullRomCurve3(points, false);
    curvePoints = curve.getPoints(Math.max(points.length * 10, 50));
  }
  
  const lineColor = selected ? '#ffeb3b' : '#ffffff'; // Yellow when selected, white otherwise
  const lineOpacity = selected ? 1.0 : 0.75; 

  return (
    <Line
      points={curvePoints}
      color={lineColor}
      lineWidth={selected ? 2.5 : 1.5} // Thicker when selected
      dashed={false}
      onClick={(e) => { e.stopPropagation(); onClick(); }} 
      // Pass transparency props directly to the Line component
      transparent={true} 
      opacity={lineOpacity}
    />
  );
};

// Ground Control Point visualization
const GCPMarker: React.FC<{
  gcp: GCP;
  onInteraction: (objectId: string, objectType: 'gcp', isShiftPressed: boolean, event: ThreeEvent<MouseEvent>) => void;
}> = ({ gcp, onInteraction }) => {
  const { local, color = '#ff0000' } = gcp;
  const { state } = useMission(); // Get context state
  const { hiddenGcpIds } = state;

  // Check if this GCP is hidden
  if (hiddenGcpIds.includes(gcp.id)) {
    return null; // Don't render if hidden
  }
  
  // GCPs are typically on the ground, so Z (three.js Y) is often 0 or based on terrain
  // Ensure position is always a tuple [number, number, number]
  const position = local ? [local.x, local.z, -local.y] as [number, number, number] : [0, 0, 0] as [number, number, number];

  const handleDoubleClick = (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      const isShiftPressed = event.nativeEvent.shiftKey;
      onInteraction(gcp.id, 'gcp', isShiftPressed, event);
  };

  return (
    <Sphere
      args={[1, 16, 16]} // Size (radius) and detail
      position={position} // Use potentially updated position
      onDoubleClick={handleDoubleClick} // Add double click handler
    >
      <meshStandardMaterial
        color={color} // Use original color
        roughness={0.2}
        metalness={0.8}
        emissive={color} // Use original color
        emissiveIntensity={0.5} // Keep original intensity
      />
    </Sphere>
  );
};

// Add SceneObjectRenderer component after the GCPMarker component
// This will render the box objects and other 3D models from the scene
const SceneObjectRenderer: React.FC<{
  sceneObject: SceneObject;
  onInteraction: (objectId: string, objectType: 'sceneObject', isShiftPressed: boolean, event: ThreeEvent<MouseEvent>) => void; // Modified callback
}> = ({ sceneObject, onInteraction }) => {
  // Map position to Three.js coordinates - Use object's position
  const basePosition = sceneObject.position;
  const position = basePosition ?
    [basePosition.x, basePosition.z, -basePosition.y] as [number, number, number] :
    [0, 0, 0] as [number, number, number];

  // Handle interaction (double-click) on scene objects
  const handleDoubleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation(); // Prevent the event from bubbling up
    const isShiftPressed = event.nativeEvent.shiftKey;
    onInteraction(sceneObject.id, 'sceneObject', isShiftPressed, event); // Call the parent handler, specify type
  };

  // Render different types of objects
  if (sceneObject.type === 'box') {
    return (
      <Box
        args={[
          sceneObject.width || 10,
          sceneObject.height || 10, // Use Z for height in Three.js Y-up
          sceneObject.length || 10
        ]}
        position={position}
        onDoubleClick={handleDoubleClick} // Use the updated handler
      >
        <meshStandardMaterial
          color={sceneObject.color || '#ff0000'} // Use original color
          opacity={0.8} // Use original opacity
          transparent
        />
        <Edges color="#ffffff" />
      </Box>
    );
  } else if (sceneObject.type === 'model' && sceneObject.url) {
    // For 3D models, you would use something like:
    // return <Model url={sceneObject.url} position={position} rotation={rotation} />
    return (
      <Sphere 
        args={[1, 16, 16]} 
        position={position}
        onDoubleClick={handleDoubleClick}
      >
        <meshStandardMaterial color="#ff00ff" />
      </Sphere>
    );
  } else if (sceneObject.type === 'area' && sceneObject.points && sceneObject.points.length > 2) {
    // For area objects (polygons)
    // Convert points from LocalCoord to Three.js Vector3
    const threePoints = sceneObject.points.map(p => 
      new THREE.Vector3(p.x, p.z || 0, -p.y)
    );
    
    return (
      <Line
        points={threePoints}
        color={sceneObject.color || '#00ff00'}
        lineWidth={2}
        onClick={(e) => e.stopPropagation()} // Add simple click handler to catch clicks
        onDoubleClick={handleDoubleClick} // Use the updated handler
      />
    );
  }
  
  // Default fallback 
  return null;
};

// Drone model for simulation
const DroneModel: React.FC<{ 
  position: LocalCoord; 
  heading: number; // ENU Heading (degrees, 0=North, 90=East)
  pitch: number;   // Pitch degrees
  roll: number;    // Roll degrees
  onDoubleClick?: (event: ThreeEvent<MouseEvent>) => void;
}> = ({ position, heading, pitch, roll, onDoubleClick }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { state } = useMission(); // Get state to check camera visibility
  const { isCameraFrustumVisible } = state;
  
  // Map simulation position (LocalCoord: x[East], y[North], z[Up]) to Three.js coordinates (Vector3: x, z[Up], -y[South])
  const threePosition = new THREE.Vector3(position.x, position.z, -position.y);
 
  // For propeller animation
  const [propellerRotation, setPropellerRotation] = useState<number[]>([0, 0, 0, 0]);
  
  // Animate propellers
  useFrame(() => {
    // Update propeller rotations at different speeds for visual interest
    setPropellerRotation(prev => [
      (prev[0] + 0.4) % (Math.PI * 2), 
      (prev[1] - 0.5) % (Math.PI * 2),
      (prev[2] + 0.4) % (Math.PI * 2),
      (prev[3] - 0.5) % (Math.PI * 2)
    ]);
  });

  useEffect(() => {
    if (groupRef.current) {
      // Apply rotations in ZYX order (Roll, Pitch, Yaw/Heading)
      // Three.js Y is Up. ENU Heading needs conversion.
      // Convert ENU heading (0=N, 90=E) to Three.js rotation around Y-axis (0=along +Z, positive rotation is counter-clockwise)
      const yaw = THREE.MathUtils.degToRad(-(heading - 90)); // Adjust for Three.js Y-up, 0=East
      groupRef.current.rotation.set(
        THREE.MathUtils.degToRad(pitch), // Rotation around X (Pitch)
        yaw,                           // Rotation around Y (Heading/Yaw)
        THREE.MathUtils.degToRad(roll),  // Rotation around Z (Roll)
        'YXZ' // Specify Euler order common for aircraft/drones (Yaw, Pitch, Roll)
      );
    }
  }, [heading, pitch, roll]);
  
  return (
    <group
      ref={groupRef}
      position={threePosition} // Use the mapped position
      onDoubleClick={onDoubleClick}
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
          <group rotation={[0, propellerRotation[0], 0]}>
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
          <group rotation={[0, propellerRotation[1], 0]}>
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
          <group rotation={[0, propellerRotation[2], 0]}>
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
          <group rotation={[0, propellerRotation[3], 0]}>
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
      
      {/* Conditionally render Camera Frustum */}
      {isCameraFrustumVisible && <CameraFrustum />}
      
    </group>
  );
};

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

// Interface for props passed to MissionScene
interface MissionSceneProps {
  liveDronePosition?: LocalCoord | null;
  liveDroneRotation?: { heading: number; pitch: number; roll: number; };
  manualDronePosition?: LocalCoord | null;
  onDroneDoubleClick: (event: ThreeEvent<MouseEvent>) => void;
  cameraFollowsDrone: boolean;
}

// Simple sphere marker for polygon vertices during drawing
const PolygonVertexMarker: React.FC<{ position: LocalCoord }> = ({ position }) => {
  // Convert LocalCoord (ENU assumed) to Three.js (x, y=Up, z=South)
  const threePosition = new THREE.Vector3(position.x, position.z, -position.y);
  return (
    <Sphere args={[0.5, 12, 12]} position={threePosition}>
      <meshBasicMaterial color="#ffff00" transparent opacity={0.7} />
    </Sphere>
  );
};

// Main scene component - Now accepts live props
const MissionScene: React.FC<MissionSceneProps> = ({ 
  liveDronePosition, 
  liveDroneRotation, 
  manualDronePosition,
  onDroneDoubleClick,
  cameraFollowsDrone
}) => {
  const { state, dispatch } = useMission();
  const threeState = useThree(); // Access camera, mouse, etc.
  const controlsRef = useRef<OrbitControlsImpl>(null); // Ref for OrbitControls
  // Get isLive and selection state from context
  const { 
    currentMission, 
    isSimulating, 
    isLive, 
    simulationSpeed, 
    selectedPathSegment, 
    drawingMode, 
    polygonPoints, 
    polygonPreviewPoint,
    isSelectingTakeoffPoint,
    isDroneVisible,
    sceneSettings,
    hardware
  } = state;
  
  // State for drone simulation (only used when isSimulating is true)
  const [simDronePosition, setSimDronePosition] = useState<LocalCoord>({ x: 0, y: 0, z: 0 });
  const [simDroneRotation, setSimDroneRotation] = useState({ heading: 0, pitch: 0, roll: 0 });
  const [currentTargetWaypointIndex, setCurrentTargetWaypointIndex] = useState<number>(0);
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0); // Progress along current leg (0 to 1)

  // State for object dragging/transforming - Consolidated state
  const [interactingObjectInfo, setInteractingObjectInfo] = useState<{ id: string; type: 'sceneObject' | 'gcp'; mode: 'drag' | 'transform' } | null>(null);
  const [draggedObjectPreviewPosition, setDraggedObjectPreviewPosition] = useState<LocalCoord | null>(null); // Still needed for GCP drag
  // State to store initial properties ONLY when transform starts
  const [initialTransformState, setInitialTransformState] = useState<{
      object: SceneObject;
      position: [number, number, number];
      rotation: [number, number, number];
      scale: THREE.Vector3; // Still needed for dimension calculation relative to start
  } | null>(null);
  const transformControlsRef = useRef<any>(null!); // Ref for TransformControls instance - ENSURE ONLY ONE
  const objectToTransformRef = useRef<THREE.Mesh>(null!); // Ref for the mesh being transformed

  // Refs for scene objects
  const groundMeshRef = useRef<THREE.Mesh>(null); // Ref for the invisible ground mesh

  // Define the ground plane for raycasting (Y=0 in Three.js coordinates)
  const groundPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)).current;

  // State to store the camera offset vector when following
  const [cameraOffset, setCameraOffset] = useState<THREE.Vector3 | null>(null);
  // Ref to track the previous follow state
  const prevCameraFollowsDrone = useRef<boolean>(cameraFollowsDrone);

  // Handle mouse move for drawing preview AND object dragging
  const handlePointerMove = (event: THREE.Event) => {
    // Perform raycasting only if needed (drawing or DRAGGING GCP)
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
      } else if (interactingObjectInfo?.mode === 'drag') { // Only update preview for GCP drag
        // GCPs are assumed to be on the ground (z=0 local)
        const heightOffset = 0;
        setDraggedObjectPreviewPosition({ ...groundCoord, z: heightOffset });
      }
    }
  };

  // Modified pointer down handler for polygon drawing, takeoff selection, OR potentially initiating drag (though double-click handles initiation)
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
          console.log("Dispatching SET_TAKEOFF_POINT with:", clickedCoord);
          dispatch({ type: 'SET_TAKEOFF_POINT', payload: clickedCoord });
          // Reducer automatically sets isSelectingTakeoffPoint back to false
      } else if (drawingMode === 'polygon') {
          console.log("Dispatching ADD_POLYGON_POINT with:", clickedCoord);
          dispatch({ type: 'ADD_POLYGON_POINT', payload: clickedCoord });

          // Check if the polygon should be completed (reducer logic handles distance check)
          if (polygonPoints.length >= 2) { // Need at least 2 existing points + the new one
            const firstPoint = polygonPoints[0];
            const lastPoint = clickedCoord; // Use the point just added
            const dx = firstPoint.x - lastPoint.x;
            const dy = firstPoint.y - lastPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const closingThreshold = 5; // Match threshold in reducer

            if (distance < closingThreshold) {
              dispatch({ type: 'COMPLETE_POLYGON_DRAWING' });
            }
          }
      }
    }
  };

  // Reset simulation state when simulation starts or mission/segment changes
  useEffect(() => {
    if (isSimulating && currentMission && currentMission.pathSegments.length > 0) {
      // Simulate the first segment by default, or the selected one if available
      const segmentToSimulate = selectedPathSegment || currentMission.pathSegments.find(seg => seg.waypoints.length > 1);
      
      if (segmentToSimulate && segmentToSimulate.waypoints.length > 1 && segmentToSimulate.waypoints[0].local) {
        setCurrentSegmentId(segmentToSimulate.id);
        setCurrentTargetWaypointIndex(1); // Start moving towards the second waypoint (index 1)
        setProgress(0);
        setSimDronePosition(segmentToSimulate.waypoints[0].local);
        
        // Set initial rotation based on first leg direction
        if (segmentToSimulate.waypoints[1].local) {
          const p1 = segmentToSimulate.waypoints[0].local;
          const p2 = segmentToSimulate.waypoints[1].local;
          // Calculate heading in ENU (degrees, 0=N, 90=E)
          const heading = (Math.atan2(p2.x - p1.x, p2.y - p1.y) * (180 / Math.PI) + 360) % 360;
          setSimDroneRotation({ heading: heading, pitch: 0, roll: 0 });
        } else {
          setSimDroneRotation({ heading: 0, pitch: 0, roll: 0 });
        }

        // Dispatch initial progress state
        dispatch({ 
          type: 'SET_SIMULATION_PROGRESS', 
          payload: { 
            segmentId: segmentToSimulate.id, 
            waypointIndex: 1, // Starting to head towards index 1
            totalWaypoints: segmentToSimulate.waypoints.length 
          } 
        });

      } else {
        // Cannot simulate if no suitable segment found
        if(isSimulating) dispatch({ type: 'STOP_SIMULATION' }); // Stop simulation if invalid start state
        // Ensure progress is cleared if simulation stops immediately
        dispatch({ 
          type: 'SET_SIMULATION_PROGRESS', 
          payload: { segmentId: null, waypointIndex: 0, totalWaypoints: 0 } 
        });
      }
    } else {
      // Reset state if not simulating or no mission/segments
      setCurrentSegmentId(null);
      setCurrentTargetWaypointIndex(0);
      setProgress(0);
      // Optionally reset drone position to an origin or last known?
      // setSimDronePosition({ x: 0, y: 0, z: 0 }); 
      // Clear progress if not simulating
      if (!isSimulating) {
        dispatch({ 
          type: 'SET_SIMULATION_PROGRESS', 
          payload: { segmentId: null, waypointIndex: 0, totalWaypoints: 0 } 
        });
      }
    }
    // Depend on isSimulating, currentMission, and selectedPathSegment to re-trigger reset
  }, [isSimulating, currentMission, selectedPathSegment, dispatch]);

  // Simulation loop using useFrame
  useFrame((_threeState, delta) => {
    if (!isSimulating || !currentSegmentId || !currentMission) {
      return; // Not simulating or no valid segment/mission
    }

    const segment = currentMission.pathSegments.find(s => s.id === currentSegmentId);
    
    // Validate segment and waypoint index
    if (!segment || segment.waypoints.length < 2 || currentTargetWaypointIndex <= 0 || currentTargetWaypointIndex >= segment.waypoints.length) {
        if (isSimulating) dispatch({ type: 'STOP_SIMULATION' });
        return; // Invalid state for simulation
    }

    const startWaypoint = segment.waypoints[currentTargetWaypointIndex - 1];
    const endWaypoint = segment.waypoints[currentTargetWaypointIndex];

    // Validate waypoints have local coordinates
    if (!startWaypoint?.local || !endWaypoint?.local) {
      if (isSimulating) dispatch({ type: 'STOP_SIMULATION' });
      return; // Cannot simulate without local coords
    }

    // Use THREE.Vector3 for calculations internally (easier)
    const startVec = new THREE.Vector3(startWaypoint.local.x, startWaypoint.local.y, startWaypoint.local.z);
    const endVec = new THREE.Vector3(endWaypoint.local.x, endWaypoint.local.y, endWaypoint.local.z);
    const legVector = endVec.clone().sub(startVec);
    const legLength = legVector.length();
    
    // Use segment speed or global simulation speed (context)
    const speed = segment.speed || simulationSpeed || 1; // Default to 1 m/s if undefined

    // Update progress along the leg
    if (legLength === 0) { 
      // Waypoints are coincident, jump to next
      setProgress(1);
    } else {
      const distanceThisFrame = speed * delta;
      const progressThisFrame = distanceThisFrame / legLength;
      // Ensure progress doesn't exceed 1 due to large delta or high speed
      setProgress(prev => Math.min(1, prev + progressThisFrame)); 
    }

    // Interpolate position using THREE.Vector3.lerp
    const currentPosVec = startVec.clone().lerp(endVec, progress);
    // Update state (convert back to LocalCoord)
    setSimDronePosition({ x: currentPosVec.x, y: currentPosVec.y, z: currentPosVec.z });

    // Update heading based on leg direction (only if moving)
    if (legLength > 0) {
       // Calculate heading in ENU (degrees, 0=N, 90=E)
       const heading = (Math.atan2(legVector.x, legVector.y) * (180 / Math.PI) + 360) % 360;
       setSimDroneRotation(prev => ({ ...prev, heading }));
    }
    // Pitch and roll can be updated here based on waypoint data or other logic if needed

    // Check if target waypoint reached
    if (progress >= 1) {
      const nextWaypointIndex = currentTargetWaypointIndex + 1;
      if (nextWaypointIndex < segment.waypoints.length) {
        // Move to the next waypoint
        setCurrentTargetWaypointIndex(nextWaypointIndex);
        setProgress(0); // Reset progress for the new leg
        // Dispatch progress update
        dispatch({ 
          type: 'SET_SIMULATION_PROGRESS', 
          payload: { 
            segmentId: segment.id, 
            waypointIndex: nextWaypointIndex, 
            totalWaypoints: segment.waypoints.length 
          } 
        });
      } else {
        // Reached the end of the segment
        if (isSimulating) dispatch({ type: 'STOP_SIMULATION' }); // Stop simulation (reducer clears progress)
      }
    }

    // --- Camera Follow Position Logic --- 
    if (cameraFollowsDrone && cameraOffset && currentPosVec && controlsRef.current) {
      const currentTargetVec = currentPosVec;
      const desiredCameraPos = new THREE.Vector3().addVectors(currentTargetVec, cameraOffset);

      // Directly update camera position if it has changed significantly
      if (!threeState.camera.position.equals(desiredCameraPos)) { 
        threeState.camera.position.copy(desiredCameraPos);
      }
      
      // Also update OrbitControls target
      if (!controlsRef.current.target.equals(currentTargetVec)) {
          controlsRef.current.target.copy(currentTargetVec);
      }

      // Crucial: Update controls state after manual changes
      controlsRef.current.update(); 
    }
    // --- END Camera Follow Position Logic --- 
  });

  // Convert LocalCoord points to Three.js Vector3 array
  const mapLocalToThree = (points: LocalCoord[]): THREE.Vector3[] => {
    return points.map(p => new THREE.Vector3(p.x, p.z, -p.y));
  };

  // Generate points for the polygon outline visualization
  const polygonDrawPoints = useMemo(() => {
    const points = mapLocalToThree(polygonPoints);
    if (polygonPreviewPoint && points.length > 0) {
      points.push(mapLocalToThree([polygonPreviewPoint])[0]); // Add preview point
    }
    return points;
  }, [polygonPoints, polygonPreviewPoint]);

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
    if (isLive && liveDronePosition) return liveDronePosition;
    if (isSimulating) return simDronePosition;
    if (currentMission?.takeoffPoint) return currentMission.takeoffPoint;
    return null; // Return null if no drone position is active
  }, [manualDronePosition, isLive, liveDronePosition, isSimulating, simDronePosition, currentMission?.takeoffPoint]);

  // Effect to calculate/clear offset and reset target when follow state changes
  useEffect(() => {
    const justEnabledFollow = cameraFollowsDrone && !prevCameraFollowsDrone.current;
    const justDisabledFollow = !cameraFollowsDrone && prevCameraFollowsDrone.current;

    if (justEnabledFollow && activeDronePosition) {
      const currentTargetVec = mapLocalToThree([activeDronePosition])[0];
      const offset = new THREE.Vector3().subVectors(threeState.camera.position, currentTargetVec);
      setCameraOffset(offset);
      // Ensure target is set correctly when follow is enabled initially
      if (controlsRef.current) {
          controlsRef.current.target.copy(currentTargetVec);
          // controlsRef.current.update(); // update happens in useFrame now
      }
    } else if (justDisabledFollow) {
      setCameraOffset(null);
      // Reset target to origin when follow is disabled
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        // controlsRef.current.update(); // update happens in useFrame now
      }
    }

    // Update previous state ref for next render
    prevCameraFollowsDrone.current = cameraFollowsDrone;

  // Dependencies: We need to recalculate offset if the drone position changes *while* follow is enabled, 
  // but only if the user perhaps manually moved the camera, invalidating the old offset.
  // For now, let's recalculate only when the follow state *changes*. Recalculating on activeDronePosition
  // change would constantly fight user camera movement while following.
  }, [cameraFollowsDrone, threeState.camera, controlsRef]); 

  // New handler for interactions originating from SceneObjectRenderer or GCPMarker
  const handleObjectInteraction = (objectId: string, objectType: 'sceneObject' | 'gcp', isShiftPressed: boolean, event: ThreeEvent<MouseEvent>) => {
    if (isShiftPressed) {
        let draggedObjectPosition: LocalCoord | undefined | null = null;
        if (objectType === 'sceneObject') {
            const obj = state.sceneObjects.find(o => o.id === objectId);
            // Only allow transform for 'box' type for now
            if (obj?.type === 'box') {
                console.log(`Starting transform for SceneObject: ${objectId}`);
                setInteractingObjectInfo({ id: objectId, type: 'sceneObject', mode: 'transform' });
                // Store initial state for scaling calculation
                const initialPos = obj.position ? [obj.position.x, obj.position.z, -obj.position.y] : [0,0,0];
                const initialRot = obj.rotation ? [THREE.MathUtils.degToRad(obj.rotation.x), THREE.MathUtils.degToRad(obj.rotation.y), THREE.MathUtils.degToRad(obj.rotation.z)] : [0,0,0];
                // Rename variable to avoid potential scope conflicts
                const gizmoInitialScale = new THREE.Vector3(1, 1, 1); // Gizmo starts at scale 1
                setInitialTransformState({
                    object: obj,
                    position: initialPos as [number, number, number],
                    rotation: initialRot as [number, number, number],
                    scale: gizmoInitialScale // Use renamed variable
                });
                // Clear GCP drag state just in case
                setDraggedObjectPreviewPosition(null);
            } else {
                // For non-box objects, maybe just open the modal on shift+click for now?
                dispatch({ type: 'SET_EDITING_SCENE_OBJECT_ID', payload: objectId });
            }
        } else if (objectType === 'gcp') {
            draggedObjectPosition = currentMission?.gcps.find(gcp => gcp.id === objectId)?.local;
            if (draggedObjectPosition) {
                console.log(`Starting drag for GCP: ${objectId}`);
                setInteractingObjectInfo({ id: objectId, type: 'gcp', mode: 'drag' });
                setDraggedObjectPreviewPosition(draggedObjectPosition);
                // Clear transform state just in case
                setInitialTransformState(null);
            } else {
                console.warn(`Could not find GCP with id ${objectId} to start dragging.`);
            }
        }
    } else {
        // Open edit modal
        if (objectType === 'sceneObject') {
            dispatch({ type: 'SET_EDITING_SCENE_OBJECT_ID', payload: objectId });
        } else if (objectType === 'gcp') {
            dispatch({ type: 'SET_EDITING_GCP_ID', payload: objectId }); // Dispatch action to open GCP modal
        }
    }
  };

  // Handler for when TransformControls finishes a transformation (mouse up)
  const handleTransformEnd = () => {
      if (interactingObjectInfo?.type === 'sceneObject' && interactingObjectInfo.mode === 'transform' && transformControlsRef.current?.object && initialTransformState) {
          const transformedObject = objectToTransformRef.current;
          if (!transformedObject) return;

          const newScale = transformedObject.scale;
          const initialDims = { 
              width: initialTransformState.object.width ?? 1, 
              length: initialTransformState.object.length ?? 1, 
              height: initialTransformState.object.height ?? 1 
          };

          // Calculate new dimensions based on the scale change relative to the initial scale (which was 1,1,1)
          // Note: Three.js scale applies to X, Y, Z, which map differently to Width, Height, Length
          // Assuming Box args are [width (X), height (Y), length (Z)] in THREE coords
          const newWidth = initialDims.width * newScale.x;
          const newHeight = initialDims.height * newScale.y; // Three.js Y is SceneObject Height
          const newLength = initialDims.length * newScale.z; // Three.js Z is SceneObject Length

          console.log(`Transform end for ${interactingObjectInfo.id}. New dims: W=${newWidth}, L=${newLength}, H=${newHeight}`);

          // Dispatch update with new dimensions (and potentially position/rotation if mode included translate/rotate)
          // Position might also need update if scale pivot isn't center
          const newPosition: LocalCoord = {
              x: transformedObject.position.x,
              y: -transformedObject.position.z, // Convert back from Three.js Z
              // Set the center Z coordinate to half the new height to keep the base on the ground
              z: newHeight / 2 
          };
          
          //TODO: consider rotation changes if transform mode includes rotation

          dispatch({
              type: 'UPDATE_SCENE_OBJECT',
              payload: { 
                  id: interactingObjectInfo.id, 
                  width: newWidth, 
                  length: newLength, 
                  height: newHeight, 
                  position: newPosition
              }
          });

          // Clear interaction state AFTER dispatching
          setInteractingObjectInfo(null);
          setInitialTransformState(null); 
      }
  };

  // Effect to listen for Escape key to cancel dragging/transforming
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && interactingObjectInfo) {
        console.log(`Cancelling interaction for ${interactingObjectInfo.type}: ${interactingObjectInfo.id}`);
        
        // Reset TransformControls if it was active
        if (interactingObjectInfo.mode === 'transform' && transformControlsRef.current?.object && initialTransformState) {
             // Reset scale, position, rotation? Or just detach?
             // Detaching is simplest by clearing interactingObjectInfo
        }
        
        setInteractingObjectInfo(null); // Exit interaction mode (drag or transform)
        setDraggedObjectPreviewPosition(null); // Clear preview position
        setInitialTransformState(null); // Clear initial data
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // Depend on the state needed to perform the update
  }, [interactingObjectInfo, draggedObjectPreviewPosition, dispatch, initialTransformState]); // Update dependency

  // Get the object currently being transformed, if any
  const transformingObject = useMemo(() => {
      if (interactingObjectInfo?.type === 'sceneObject' && interactingObjectInfo.mode === 'transform') {
          return state.sceneObjects.find(obj => obj.id === interactingObjectInfo.id);
      }
      return null;
  }, [interactingObjectInfo, state.sceneObjects]);

  // Get the GCP currently being dragged, if any
  const draggingGcp = useMemo(() => {
      if (interactingObjectInfo?.type === 'gcp' && interactingObjectInfo.mode === 'drag' && draggedObjectPreviewPosition) {
          const gcpData = currentMission?.gcps.find(g => g.id === interactingObjectInfo.id);
          if (!gcpData) return null;
          // Return a temporary GCP object with the preview position for rendering
          return { 
              ...gcpData, 
              local: draggedObjectPreviewPosition 
          };
      }
      return null;
  }, [interactingObjectInfo, currentMission?.gcps, draggedObjectPreviewPosition]);

  // Effect to attach/detach TransformControls
  useEffect(() => {
      const controls = transformControlsRef.current;
      const targetMesh = objectToTransformRef.current; // The persistent, invisible mesh
      const shouldBeAttached = interactingObjectInfo?.mode === 'transform' && initialTransformState;

      if (controls && targetMesh) {
          if (shouldBeAttached) {
              // Sync the invisible mesh to the initial state of the object
              targetMesh.position.set(...initialTransformState.position);
              targetMesh.rotation.set(...initialTransformState.rotation);
              targetMesh.scale.set(1, 1, 1); // Start scale at 1
              targetMesh.visible = true; // Make the control target visible
              targetMesh.updateMatrixWorld(); // Ensure matrix is up-to-date before attach
              console.log("Attaching TransformControls to target mesh:", targetMesh);
              controls.attach(targetMesh);
          } else if (controls.object === targetMesh) { // Detach only if attached to our target
              console.log("Detaching TransformControls from target mesh");
              controls.detach();
              targetMesh.visible = false; // Hide the control target
          }
      }

      // Cleanup: Detach if component unmounts while attached
      return () => {
          if (controls?.object === targetMesh) {
              console.log("Detaching TransformControls on unmount/cleanup");
              controls.detach();
              targetMesh.visible = false;
          }
      };
  // Rerun when interaction state or initial data changes
  }, [interactingObjectInfo, initialTransformState]); 

  return (
    <>
      <SceneSetup />
      
      {/* Sky and lighting */}
      <Sky sunPosition={[100, 100, 20]} />
      <ambientLight intensity={sceneSettings.ambientLightIntensity} />
      <directionalLight 
        position={[10, 30, 10]} 
        intensity={sceneSettings.directionalLightIntensity}
        castShadow 
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      
      {/* Ground plane and grid - Use scene settings */}
      <Grid 
        args={[sceneSettings.gridSize, sceneSettings.gridDivisions]} // Use size/divisions
        position={[0, 0, 0]} 
        cellColor={sceneSettings.gridColorGrid} // Use grid color
        sectionSize={sceneSettings.gridSize / (sceneSettings.gridDivisions / 5)} // Keep section size proportional (e.g., every 5 grid lines)
        sectionThickness={1}
        sectionColor={sceneSettings.gridColorCenterLine} // Use center line color
        infiniteGrid
        fadeDistance={sceneSettings.gridSize * 2} // Fade based on size
        fadeStrength={1}
      />
      {/* Add an invisible mesh on the ground plane for raycasting interactions */}
      <mesh 
        ref={groundMeshRef} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0.01, 0]} 
        onPointerMove={handlePointerMove} // Keep for polygon preview
        onPointerDown={handlePointerDown} // Use the combined handler
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      
      {/* Origin marker */}
      <Sphere position={[0, 0, 0]} args={[1, 16, 16]}>
        <meshStandardMaterial color="red" />
      </Sphere>
      
      {/* Mission elements */}
      {currentMission?.pathSegments.map(segment => {
        if (segment.type === PathType.POLYGON) {
          // Render completed polygons (outline + fill)
          // Extract local coordinates first, filtering out any undefined ones
          const localCoords = segment.waypoints.map(wp => wp.local).filter((p): p is LocalCoord => !!p);
          if (localCoords.length < 3) return null; // Need at least 3 valid local points
          
          const polygonPoints3D = mapLocalToThree(localCoords);
          if (polygonPoints3D.length < 3) return null; // Need at least 3 points

          // Create shape for fill (assuming Y is up in Three.js, we use X and Z)
          const shape = new THREE.Shape(polygonPoints3D.map(p => new THREE.Vector2(p.x, p.z))); 
          const shapeGeometry = new THREE.ShapeGeometry(shape);

          return (
            <group key={segment.id}>
              {/* Filled Shape */}
              <mesh geometry={shapeGeometry} position={[0, 0.02, 0]}> {/* Slightly above ground */}
                <meshBasicMaterial 
                  color={selectedPathSegment?.id === segment.id ? "#ff9900" : "#0033A0"}
                  side={THREE.DoubleSide} 
                  transparent 
                  opacity={0.3} 
                />
              </mesh>
              {/* Outline */}
              <Line
                points={polygonPoints3D}
                color={selectedPathSegment?.id === segment.id ? "#ff9900" : "#0033A0"}
                lineWidth={selectedPathSegment?.id === segment.id ? 3 : 2}
              />
            </group>
          );
        }
        return (
          <PathLine 
            key={segment.id} 
            segment={segment} 
            selected={segment.id === selectedPathSegment?.id}
            onClick={() => handleSegmentClick(segment)}
          />
        );
      })}
      
      {/* Waypoints */}
      {currentMission?.pathSegments.flatMap(segment => 
        segment.waypoints.map(waypoint => (
          <WaypointMarker 
            key={waypoint.id} 
            waypoint={waypoint}
            selected={waypoint.id === state.selectedWaypoint?.id}
            onClick={() => handleWaypointClick(waypoint)}
          />
        ))
      )}
      
      {/* Ground Control Points - Filter out the one being dragged */}
      {currentMission?.gcps
        .filter(gcp => !(interactingObjectInfo?.type === 'gcp' && interactingObjectInfo?.id === gcp.id)) // Correct filtering logic
        .map(gcp => (
        <GCPMarker
            key={gcp.id}
            gcp={gcp}
            onInteraction={handleObjectInteraction}
        />
      ))}
      
      {/* Render the dragging GCP separately if needed */}
      {draggingGcp && (
          <Sphere
              args={[1, 16, 16]} // Use same args as GCPMarker
              position={[draggingGcp.local.x, draggingGcp.local.z, -draggingGcp.local.y]}
          >
              <meshStandardMaterial
                  color={'#ffff00'} // Highlight color during drag
                  emissive={'#ffff00'}
                  metalness={0.8}
                  roughness={0.2}
              />
          </Sphere>
      )}

      {/* Scene Objects - Render ALL, including the one being transformed */}
      {currentMission && state.sceneObjects.map((sceneObject) => (
        <SceneObjectRenderer
          key={sceneObject.id}
          sceneObject={sceneObject}
          onInteraction={handleObjectInteraction} // Pass interaction handler
        />
      ))}

      {/* Render TransformControls unconditionally, manage attachment via useEffect */}
      <TransformControls
          ref={transformControlsRef}
          mode="scale"
          onMouseUp={handleTransformEnd} // Keep mouse up handler here
          showX={interactingObjectInfo?.mode === 'transform'} // Show handles only when transforming
          showY={interactingObjectInfo?.mode === 'transform'}
          showZ={interactingObjectInfo?.mode === 'transform'}
          enabled={interactingObjectInfo?.mode === 'transform'} // Enable controls only when transforming
      >
          {/* Persistent, invisible mesh for TransformControls to attach to */}
          <mesh ref={objectToTransformRef} visible={false}>
              {/* Basic geometry, doesn't really matter as it's invisible */} 
              <boxGeometry args={[1, 1, 1]} /> 
              <meshBasicMaterial wireframe />
          </mesh>
      </TransformControls>

      {/* Polygon Drawing Visualization */}
      {drawingMode === 'polygon' && (
        <>
          {/* Draw vertices */}
          {polygonPoints.map((point, index) => (
            <PolygonVertexMarker key={index} position={point} />
          ))}
          
          {/* Draw lines connecting vertices and preview line */}
          {polygonDrawPoints.length >= 2 && (
            <Line
              points={polygonDrawPoints}
              color="#ffff00" // Yellow color for drawing lines
              lineWidth={2}
              dashed
              dashSize={3}
              gapSize={1.5}
            />
          )}
        </>
      )}
      
      {/* Render Drone - Conditionally based on isDroneVisible */}
      {isDroneVisible && (
          <> 
              {/* Prioritize manual position if active */}
              {manualDronePosition ? (
                  <DroneModel 
                    position={manualDronePosition} 
                    heading={simDroneRotation.heading} 
                    pitch={simDroneRotation.pitch}
                    roll={simDroneRotation.roll}
                    onDoubleClick={onDroneDoubleClick}
                  />
              ) : isLive && liveDronePosition ? (
                <DroneModel 
                  position={liveDronePosition} 
                  heading={liveDroneRotation?.heading ?? 0}
                  pitch={liveDroneRotation?.pitch ?? 0}
                  roll={liveDroneRotation?.roll ?? 0}
                  onDoubleClick={onDroneDoubleClick}
                />
              ) : isSimulating && currentSegmentId ? (
                <DroneModel 
                  position={simDronePosition} 
                  heading={simDroneRotation.heading}
                  pitch={simDroneRotation.pitch}
                  roll={simDroneRotation.roll}
                  onDoubleClick={onDroneDoubleClick}
                />
               ) : currentMission?.takeoffPoint ? (
                  <DroneModel 
                    position={currentMission.takeoffPoint} 
                    heading={0} 
                    pitch={0}
                    roll={0}
                    onDoubleClick={onDroneDoubleClick}
                  />
              ) : null}
          </>
      )}
      
      {/* Camera controls */}
      <OrbitControls 
        ref={controlsRef}
        makeDefault 
        enabled={drawingMode === null && !isSelectingTakeoffPoint && interactingObjectInfo === null} // Disable when drawing, selecting takeoff, OR interacting
        maxDistance={500}
        minDistance={5}
        enableDamping={true}
        dampingFactor={0.1}
      />
    </>
  );
};

// --- Camera Frustum Visualization --- 
const CameraFrustum: React.FC = () => {
  // Define basic camera parameters (can be made dynamic later)
  const fov = 60; // Field of view in degrees
  const aspect = 16 / 9; // Aspect ratio
  const near = 0.5; // Near plane distance
  const far = 30; // Far plane distance (adjust as needed)

  // Create a perspective camera helper
  const camera = useMemo(() => new THREE.PerspectiveCamera(fov, aspect, near, far), [fov, aspect, near, far]);
  const helper = useMemo(() => new THREE.CameraHelper(camera), [camera]);

  // Position the frustum relative to the drone (local coordinates within DroneModel group)
  // Assuming camera is looking down slightly (-15 degrees pitch)
  const pitchRad = THREE.MathUtils.degToRad(-15);

  return (
    <primitive 
      object={helper} 
      rotation={[pitchRad, 0, 0]} // Apply local pitch relative to drone body
      // No position offset needed if it's a child of the DroneModel group
    />
  );
};
// --- End Camera Frustum --- 

// Main 3D viewer component - Passes props down
const Local3DViewer: React.FC<Local3DViewerProps> = ({ 
  height = '100%', 
  liveDronePosition, 
  liveDroneRotation 
}) => {
  const { state, dispatch } = useMission(); // Get state for scene settings & dispatch
  const { sceneSettings, hardware, isSimulating, simulationProgress, isLive, currentMission, editingSceneObjectId, editingGcpId } = state; 

  // State for the manual position control panel
  const [isPositionPanelOpen, setIsPositionPanelOpen] = useState(false);
  // This state now represents the manually set position, persisting after panel close
  const [manualDronePosition, setManualDronePosition] = useState<LocalCoord | null>(null);
  const [manualCameraFollow, setManualCameraFollow] = useState(true); 
  // Explicitly type the state here
  const [manualCameraSettings, setManualCameraSettings] = useState<{ 
      fStop: number | string; 
      focusDistance: number; 
  }>({ 
      fStop: hardware?.fStop ?? 8, 
      focusDistance: hardware?.focusDistance ?? 10 
  });

  // Determine the *actual* current drone position based on mode and manual override
  const actualCurrentDronePosition = useMemo(() => {
    // Manual position takes highest priority if set
    if (manualDronePosition) return manualDronePosition;
    // Then live data
    if (isLive && liveDronePosition) return liveDronePosition;
    // Then simulation data (Need access to simDronePosition state from MissionScene or context)
    // For now, let's assume sim data might need context integration. 
    // Placeholder: If simulating, maybe use takeoff or last known?
    // TODO: Integrate simDronePosition access if needed here
    if (isSimulating) {
       // If simulation is running but we don't have simDronePosition here, 
       // maybe return null or takeoff? Returning takeoff for now.
       return currentMission?.takeoffPoint ?? { x: 0, y: 0, z: 0 }; 
    }
    // Then takeoff point
    if (currentMission?.takeoffPoint) return currentMission.takeoffPoint;
    // Default fallback
    return { x: 0, y: 0, z: 0 }; 
  }, [
    manualDronePosition, 
    isLive, 
    liveDronePosition, 
    isSimulating, 
    currentMission?.takeoffPoint, 
    // simulationProgress // Add dependency if sim position logic is added
    // Add simDronePosition if integrated into context or passed down
  ]);

  // Determine current drone rotation (unaffected by this change)
  const currentDroneRotation = useMemo(() => {
     // Manual rotation isn't controlled by this panel, so use live/sim/default
     if (isLive && liveDroneRotation) return liveDroneRotation;
     // TODO: Integrate simDroneRotation access if needed here
     // if (isSimulating) return simDroneRotation; 
     return { heading: 0, pitch: 0, roll: 0 }; // Default
  }, [isLive, liveDroneRotation, isSimulating]);


  // Handler to open/close the panel
  const handleDroneDoubleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation(); // Prevent OrbitControls interaction
    if (!isPositionPanelOpen) {
      // Initialize manual position with the *actual* current position when opening
      setManualDronePosition(actualCurrentDronePosition); 
    }
    // We don't reset manualDronePosition when closing, letting it persist
    setIsPositionPanelOpen(!isPositionPanelOpen);
  };

  // Handler for position changes from the panel
  const handleManualPositionChange = (newPosition: LocalCoord) => {
    setManualDronePosition(newPosition); // Update the persistent manual position
  };

  // Handler for camera follow changes
  const handleManualCameraFollowChange = (follows: boolean) => {
    setManualCameraFollow(follows);
  };

  // Handler for camera settings changes
  const handleManualCameraSettingsChange = (settings: { fStop: number | string; focusDistance: number; }) => {
     // ... (dispatch logic remains the same)
     setManualCameraSettings(settings); 
     if (hardware) {
         dispatch({ type: 'UPDATE_HARDWARE_FIELD', payload: { field: 'fStop', value: settings.fStop } });
         dispatch({ type: 'UPDATE_HARDWARE_FIELD', payload: { field: 'focusDistance', value: feetToMeters(settings.focusDistance) } }); // Ensure conversion if needed
     }
  };

  // Recalculate initial props for the panel based on actual current state
  const panelInitialPosition = actualCurrentDronePosition;
  const panelInitialCameraSettings = {
      fStop: hardware?.fStop ?? 8,
      focusDistance: metersToFeet(hardware?.focusDistance ?? 10)
  };


  return (
    <Paper elevation={0} sx={{ 
      height, 
      position: 'relative', 
      overflow: 'hidden', 
      borderRadius: 0,
      backgroundColor: sceneSettings.backgroundColor, // Use background color from settings
      flex: 1,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Canvas 
        shadows 
        camera={{ 
            position: [30, 30, 30], // Keep initial position or make configurable?
            fov: sceneSettings.fov // Use FOV from settings
        }}
      >
        <Suspense fallback={
          <MuiBox sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%' 
          }}>
            <CircularProgress />
          </MuiBox>
        }>
          <MissionScene 
            liveDronePosition={liveDronePosition} 
            liveDroneRotation={liveDroneRotation}
            // Always pass manualDronePosition down. MissionScene will prioritize it.
            manualDronePosition={manualDronePosition} 
            onDroneDoubleClick={handleDroneDoubleClick} 
            cameraFollowsDrone={manualCameraFollow} 
          />
        </Suspense>
      </Canvas>

      {/* Render the Control Panel */} 
      <DronePositionControlPanel
        isOpen={isPositionPanelOpen}
        onClose={() => setIsPositionPanelOpen(false)} // Close still just hides panel
        initialPosition={panelInitialPosition} // Initialize with actual current pos
        onPositionChange={handleManualPositionChange}
        initialCameraFollow={manualCameraFollow}
        onCameraFollowChange={handleManualCameraFollowChange}
        initialCameraSettings={panelInitialCameraSettings} // Initialize with actual current settings
        onCameraSettingsChange={handleManualCameraSettingsChange}
      />

      {/* Render the SceneObjectEditModal when an object is being edited */}
      <SceneObjectEditModal
        objectId={editingSceneObjectId || ''}
        open={!!editingSceneObjectId}
        onClose={() => dispatch({ type: 'SET_EDITING_SCENE_OBJECT_ID', payload: null })}
      />

      {/* Render the GcpEditModal when a GCP is being edited */}
      {/* 
      <GcpEditModal
        gcpId={editingGcpId || ''} // Pass GCP ID 
        open={!!editingGcpId}       // Control visibility
        onClose={() => dispatch({ type: 'SET_EDITING_GCP_ID', payload: null })} // Action to close modal
      />
      */}
    </Paper>
  );
};

export default Local3DViewer; 