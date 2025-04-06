import React from 'react';
import { Sphere, Line } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneObject, SelectedFaceInfo } from '../../../context/MissionContext';
import BoxObject from './BoxObject';

interface SceneObjectRendererProps {
  sceneObject: SceneObject;
  onInteraction: (objectId: string, objectType: 'sceneObject', isShiftPressed: boolean, event: ThreeEvent<MouseEvent>) => void;
  onFaceSelect?: (faceInfo: SelectedFaceInfo | null) => void;
  onPointerOver?: (objectId: string, event: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (objectId: string, event: ThreeEvent<PointerEvent>) => void;
}

const SceneObjectRenderer: React.FC<SceneObjectRendererProps> = ({ 
  sceneObject, 
  onInteraction, 
  onFaceSelect, 
  onPointerOver, 
  onPointerOut 
}) => {
  // Map position to Three.js coordinates - Use object's position or spring position if provided
  const basePosition = sceneObject.position;
  
  // Use the static position if provided
  const position = basePosition ? 
    [basePosition.x, basePosition.z, -basePosition.y] as [number, number, number] : 
    [0, 0, 0] as [number, number, number];
  
  // Handle interaction (double-click) on scene objects
  const handleDoubleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation(); // Prevent the event from bubbling up
    const isShiftPressed = event.nativeEvent.shiftKey;
    onInteraction(sceneObject.id, 'sceneObject', isShiftPressed, event);
  };

  // Handle pointer events
  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    if (onPointerOver) {
      event.stopPropagation();
      onPointerOver(sceneObject.id, event);
    }
  };

  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    if (onPointerOut) {
      event.stopPropagation();
      onPointerOut(sceneObject.id, event);
    }
  };

  // Render different types of objects
  if (sceneObject.type === 'box') {
    return (
      <BoxObject
        sceneObject={sceneObject}
        onDoubleClick={handleDoubleClick}
        onFaceClick={onFaceSelect}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
    );
  } else if (sceneObject.type === 'model' && sceneObject.url) {
    // For 3D models, you would use something like:
    // return <Model url={sceneObject.url} position={position} rotation={rotation} />
    return (
      <Sphere
        args={[1, 16, 16]}
        position={position}
        onDoubleClick={handleDoubleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
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
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={handleDoubleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
    );
  }

  // Default fallback
  return null;
};

export default SceneObjectRenderer; 