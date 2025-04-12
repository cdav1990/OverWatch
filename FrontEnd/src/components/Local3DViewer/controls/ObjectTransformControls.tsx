import React, { useRef, useEffect, useState } from 'react';
import { TransformControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useMission } from '../../../context/MissionContext';
import { SceneObject } from '../../../context/MissionContext';
import { feetToMeters } from '../../../utils/sensorCalculations';
import ReactDOM from 'react-dom/client';

interface ObjectTransformControlsProps {
  objectId: string | null;
  onComplete: () => void;
}

// Create a simpler fixed overlay for transform controls info
const TransformControlsOverlay: React.FC<{ mode: string; space: string }> = ({ mode, space }) => {
  return (
    <div id="transform-controls-overlay">
      <span className="transform-mode">
        Transform | Mode: <span className="highlight">{mode}</span> | Space: {space}
      </span>
      <span className="separator">|</span>
      <span className="shortcut">
        <span className="key">T</span>:Translate
      </span>
      <span className="shortcut">
        <span className="key">R</span>:Rotate
      </span>
      <span className="shortcut">
        <span className="key">S</span>:Scale
      </span>
      <span className="separator">|</span>
      <span className="shortcut">
        <span className="key">Space</span>:Toggle
      </span>
      <span className="shortcut">
        <span className="key">Enter</span>:Apply
      </span>
      <span className="shortcut">
        <span className="key">Esc</span>:Cancel
      </span>
    </div>
  );
};

const ObjectTransformControls: React.FC<ObjectTransformControlsProps> = ({ 
  objectId, 
  onComplete 
}) => {
  const { state, dispatch } = useMission();
  const { scene } = useThree();
  const transformRef = useRef<any>(null);
  const [mode, setMode] = useState<'translate' | 'rotate' | 'scale'>('translate'); // Default to translate mode
  const [space, setSpace] = useState<'world' | 'local'>('local');
  const [targetMesh, setTargetMesh] = useState<THREE.Object3D | null>(null);
  const [initialState, setInitialState] = useState<{
    position: THREE.Vector3;
    scale: THREE.Vector3;
    rotation: THREE.Euler;
  } | null>(null);

  // Find the object to transform
  useEffect(() => {
    if (!objectId) {
      setTargetMesh(null);
      return;
    }

    // Find the object in the scene
    let objectToTransform: THREE.Object3D | undefined;
    
    // Search the scene for an object with matching userData.sceneObjectId
    scene.traverse((object) => {
      if (object.userData && object.userData.sceneObjectId === objectId) {
        objectToTransform = object;
      }
    });
    
    if (objectToTransform) {
      setTargetMesh(objectToTransform);
      // Store initial state
      setInitialState({
        position: objectToTransform.position.clone(),
        scale: objectToTransform.scale.clone(),
        rotation: objectToTransform.rotation.clone()
      });
    } else {
      console.warn("Could not find object to transform:", objectId);
      setTargetMesh(null);
    }
  }, [objectId, scene]);

  // Switch between transform modes with keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!objectId) return;

      switch (event.key.toLowerCase()) {
        case 't':
          setMode('translate');
          break;
        case 'r':
          setMode('rotate');
          break;
        case 's':
          setMode('scale');
          break;
        case 'escape':
          // Cancel transform and revert to original state
          if (targetMesh && initialState) {
            targetMesh.position.copy(initialState.position);
            targetMesh.scale.copy(initialState.scale);
            targetMesh.rotation.copy(initialState.rotation);
          }
          onComplete();
          break;
        case 'enter':
          // Confirm transform and save changes
          if (targetMesh && objectId) {
            saveChanges();
          }
          onComplete();
          break;
        case ' ': // Spacebar
          // Toggle between local and world space
          setSpace(prev => prev === 'world' ? 'local' : 'world');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [objectId, targetMesh, initialState, onComplete]);

  // Save changes to the object
  const saveChanges = () => {
    if (!targetMesh || !objectId) return;

    const sceneObject = state.sceneObjects.find(obj => obj.id === objectId);
    if (!sceneObject) return;

    // Convert Three.js coordinates back to our system
    // THREE: [x, y, z] = ENU: [x, -z, y]
    const updatedObject: Partial<SceneObject> & { id: string } = {
      id: objectId,
      position: {
        x: targetMesh.position.x,
        y: -targetMesh.position.z,
        z: targetMesh.position.y
      },
      // Update dimensions based on scale changes
      width: (sceneObject.width || 1) * targetMesh.scale.x,
      height: (sceneObject.height || 1) * targetMesh.scale.y,
      length: (sceneObject.length || 1) * targetMesh.scale.z,
      // Update rotation if needed
      rotation: {
        x: THREE.MathUtils.radToDeg(targetMesh.rotation.x),
        y: -THREE.MathUtils.radToDeg(targetMesh.rotation.z),
        z: THREE.MathUtils.radToDeg(targetMesh.rotation.y)
      }
    };

    dispatch({ type: 'UPDATE_SCENE_OBJECT', payload: updatedObject });
  };

  // When transform control changes (for orbit controls interaction)
  useEffect(() => {
    if (transformRef.current) {
      const controls = transformRef.current;
      
      const onDraggingChange = (event: any) => {
        const isDragging = event.value;
        if (!isDragging) {
          // When dragging ends, save the new state
          if (targetMesh && objectId) {
            saveChanges();
          }
        }
      };

      controls.addEventListener('dragging-changed', onDraggingChange);
      return () => {
        controls.removeEventListener('dragging-changed', onDraggingChange);
      };
    }
  }, [transformRef, targetMesh, objectId]);

  // Use an effect to create and remove the overlay
  useEffect(() => {
    // Create the overlay container if it doesn't exist
    let overlayContainer = document.getElementById('transform-controls-overlay-container');
    if (!overlayContainer) {
      overlayContainer = document.createElement('div');
      overlayContainer.id = 'transform-controls-overlay-container';
      document.body.appendChild(overlayContainer);
    }

    // Add the overlay when targetMesh exists (transform mode is active)
    if (targetMesh) {
      const root = ReactDOM.createRoot(overlayContainer);
      root.render(<TransformControlsOverlay mode={mode} space={space} />);
    }

    // Clean up when component unmounts
    return () => {
      if (overlayContainer && document.body.contains(overlayContainer)) {
        ReactDOM.createRoot(overlayContainer).unmount();
        overlayContainer.remove();
      }
    };
  }, [targetMesh, mode, space]);

  // Don't render anything if no object is selected
  if (!targetMesh || !objectId) return null;

  return (
    <TransformControls
      ref={transformRef}
      object={targetMesh}
      mode={mode}
      space={space}
      size={1} // Size of the control handles
      translationSnap={0.25} // Optional snapping for translation
      rotationSnap={Math.PI / 12} // Optional snapping for rotation (15 degrees)
      scaleSnap={0.25} // Optional snapping for scaling
    />
  );
};

export default ObjectTransformControls; 