import React, { Suspense } from 'react';
import { Box, Cylinder, Plane } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneObject, SelectedFaceInfo } from '../../../context/MissionContext';
import { useMission } from '../../../context/MissionContext';
import ShipModel from '../models/ShipModel';
import ShipFallbackModel from '../models/ShipFallbackModel';
import { ThreeErrorBoundary } from '../ErrorBoundary';

interface SceneObjectRendererProps {
  sceneObject: SceneObject;
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

// --- Helper to get World Face Info --- 
// (Adapted from three.js discourse examples)
const getIntersectedFaceInfo = (event: ThreeEvent<MouseEvent>): SelectedFaceInfo | null => {
    if (!event.face || event.faceIndex === undefined || !event.object || !(event.object instanceof THREE.Mesh)) {
        console.warn("Face click event missing required data.", event);
        return null;
    }

    const mesh = event.object;
    const geometry = mesh.geometry;
    const faceIndex = event.faceIndex!;
    const objectId = mesh.userData.sceneObjectId; // Get from userData

    if (!geometry.index || !geometry.attributes.position || !objectId) {
        console.warn("Geometry missing index/position or mesh missing userData.sceneObjectId.");
        return null;
    }

    const indexAttribute = geometry.index;

    try {
        const indices = new THREE.Vector3();
        indices.fromBufferAttribute(indexAttribute, faceIndex as number); // Get vertex indices for the face

        const posAttr = geometry.attributes.position;
        const vA = new THREE.Vector3().fromBufferAttribute(posAttr, indices.x);
        const vB = new THREE.Vector3().fromBufferAttribute(posAttr, indices.y);
        const vC = new THREE.Vector3().fromBufferAttribute(posAttr, indices.z);

        // Transform vertices to world space
        vA.applyMatrix4(mesh.matrixWorld);
        vB.applyMatrix4(mesh.matrixWorld);
        vC.applyMatrix4(mesh.matrixWorld);

        // Create triangle and get normal/area
        const triangle = new THREE.Triangle(vA, vB, vC);
        const normal = new THREE.Vector3();
        triangle.getNormal(normal);
        const area = triangle.getArea();

        // Format for state
        const faceInfo: SelectedFaceInfo = {
            objectId: objectId,
            faceId: `${objectId}-face-${faceIndex}`, // Create a unique ID
            faceIndex: faceIndex,
            normal: { x: normal.x, y: normal.y, z: normal.z },
            vertices: [
                { x: vA.x, y: vA.y, z: vA.z },
                { x: vB.x, y: vB.y, z: vB.z },
                { x: vC.x, y: vC.y, z: vC.z },
            ],
            area: area,
        };
        return faceInfo;
    } catch (error) {
        console.error("Error processing face info:", error);
        return null;
    }
};

const SceneObjectRenderer: React.FC<SceneObjectRendererProps> = ({ 
  sceneObject, 
  isSelected, 
  selectedFaceIndex, 
  onInteraction, 
  onPointerOver, 
  onPointerOut
}) => {
  const { state, dispatch } = useMission(); // Get context state and dispatch
  const { isFaceSelectionModeActive } = state;

  // Handle click for face selection
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    console.log("Mesh clicked. Face selection mode:", isFaceSelectionModeActive);
    if (isFaceSelectionModeActive) {
        event.stopPropagation(); // Prevent other click handlers (like orbit controls)
        
        const faceInfo = getIntersectedFaceInfo(event);
        console.log("Selected Face Info:", faceInfo);

        if (faceInfo) {
            dispatch({ type: 'SET_SELECTED_FACE', payload: faceInfo });
            // No need to dispatch TOGGLE_FACE_SELECTION_MODE(false) here,
            // the reducer handles that when SET_SELECTED_FACE has a payload.
        } else {
            // Optionally dispatch to clear selection if click failed?
             dispatch({ type: 'SET_SELECTED_FACE', payload: null });
             // Maybe turn off selection mode too if click failed?
             dispatch({ type: 'TOGGLE_FACE_SELECTION_MODE', payload: false });
        }
    } else {
        // If not in face selection mode, allow regular interactions (handled by onDoubleClick etc. on parent)
        // Or call the passed onInteraction prop if needed for single clicks
        onInteraction(sceneObject.id, 'sceneObject', event.nativeEvent.shiftKey, event);
    }
  };

  // Handle double-click to open edit modal
  const handleDoubleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    console.log("Double-clicked on object:", sceneObject.id);
    
    // If shift key is pressed, activate transform mode
    if (event.nativeEvent.shiftKey) {
      console.log("Shift+double-click detected - activating transform mode");
      dispatch({ type: 'SET_TRANSFORM_OBJECT_ID', payload: sceneObject.id });
    } else {
      // Regular double-click - open edit modal
      dispatch({ type: 'SET_EDITING_SCENE_OBJECT_ID', payload: sceneObject.id });
    }
  };

  // Determine object color based on class or default
  const objectColor = sceneObject.class === 'obstacle' 
                        ? '#ff4d4d' // Red for obstacles
                        : sceneObject.class === 'asset' 
                        ? '#4CAF50' // Green for assets
                        : sceneObject.color || '#888888'; // Default or neutral

  // Render different geometries based on type
  switch (sceneObject.type) {
    case 'box':
      return (
        <Box
          args={[sceneObject.width || 1, sceneObject.height || 1, sceneObject.length || 1]} // Note: THREE.Box args are width, height, depth
          position={[sceneObject.position.x, sceneObject.position.z, -sceneObject.position.y]} // Map local Z to THREE Y, negate local Y for THREE Z
          // Apply rotation if available (convert degrees to radians if needed)
          rotation={[
            THREE.MathUtils.degToRad(sceneObject.rotation?.x || 0),
            THREE.MathUtils.degToRad(sceneObject.rotation?.z || 0), // Map local Z rot to THREE Y rot
           -THREE.MathUtils.degToRad(sceneObject.rotation?.y || 0)  // Map local Y rot to THREE Z rot (negated)
          ]}
          // Add userData to identify the object
          userData={{ sceneObjectId: sceneObject.id }}
          onClick={handleClick} // Add click handler
          onDoubleClick={handleDoubleClick} // Add double-click handler
          onPointerOver={() => onPointerOver(sceneObject.id)}
          onPointerOut={() => onPointerOut(sceneObject.id)}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={objectColor} />
        </Box>
      );
    case 'ship':
      return (
        <ThreeErrorBoundary fallback={
          <ShipFallbackModel 
            position={sceneObject.position} 
            rotation={sceneObject.rotation}
            scale={0.1}
          />
        }>
          <Suspense fallback={
            <ShipFallbackModel 
              position={sceneObject.position} 
              rotation={sceneObject.rotation}
              scale={0.1}
            />
          }>
            <group
              onClick={handleClick}
              onDoubleClick={handleDoubleClick}
              onPointerOver={() => onPointerOver(sceneObject.id)}
              onPointerOut={() => onPointerOut(sceneObject.id)}
              userData={{ sceneObjectId: sceneObject.id }}
            >
              <ShipModel 
                position={sceneObject.position}
                rotation={sceneObject.rotation}
                realWorldLength={sceneObject.realWorldLength}
              />
            </group>
          </Suspense>
        </ThreeErrorBoundary>
      );
    // Add cases for 'model', 'area', 'cylinder' etc. as needed
    // case 'model': return <ModelRenderer ... />;
    default:
      console.warn(`Unsupported scene object type: ${sceneObject.type}`);
      return null;
  }
};

export default SceneObjectRenderer; 