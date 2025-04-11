import { v4 as uuidv4 } from 'uuid';
import { LocalCoord } from '../types/mission';
import { SceneObject } from '../context/MissionContext';

// Function to add a dock object to the scene
export const addDockToScene = (
  dispatch: any, 
  position: LocalCoord = { x: 0, y: 0, z: 0 },
  rotation: LocalCoord = { x: 0, y: 0, z: 0 },
  scale: { x: number; y: number; z: number } = { x: 0.009, y: 0.009, z: 0.009 },
  realWorldLength: number = 500,
  heightOffset: number = -75
): void => {
  const dockObject: SceneObject = {
    id: uuidv4(),
    type: 'dock',
    position,
    rotation,
    scale,
    realWorldLength,
    heightOffset,
    createdAt: new Date().toISOString(),
    source: 'build-scene-ui',
    color: '#7D8B98',
    class: 'neutral'
  };

  dispatch({ type: 'ADD_SCENE_OBJECT', payload: dockObject });
};

// Function to add a ship object to the scene (if it doesn't exist)
export const addShipToScene = (
  dispatch: any, 
  position: LocalCoord = { x: 0, y: 0, z: 0 },
  rotation: LocalCoord = { x: 0, y: 0, z: 0 },
  scale: { x: number; y: number; z: number } = { x: 1, y: 1, z: 1 },
  realWorldLength: number = 1106,
  heightOffset: number = -25
): void => {
  const shipObject: SceneObject = {
    id: uuidv4(),
    type: 'ship',
    position,
    rotation,
    scale,
    realWorldLength,
    heightOffset,
    createdAt: new Date().toISOString(),
    source: 'build-scene-ui',
    color: '#667788',
    class: 'neutral'
  };

  dispatch({ type: 'ADD_SCENE_OBJECT', payload: shipObject });
};

// New function to add both dock and ship to the scene for development mode
export const addDefaultDevSceneObjects = (dispatch: any): void => {
  // Add dock at origin
  addDockToScene(
    dispatch,
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
    { x: 0.009, y: 0.009, z: 0.009 },
    500,
    -75
  );
  
  // Add ship already at the correct position
  addShipToScene(
    dispatch,
    { x: -356.6, y: -25.0, z: 0 },
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 1, z: 1 },
    1106,
    -25
  );
  
  // Remove the redundant position update dispatch - the ship is already being created
  // at the desired position (-1150, -870, 0) above
  
  console.log("Added default scene objects with ship positioned at (-356.6, -25.0, 0) meters");
};

// Add a new function to move an existing scene object to a specified position
export const moveSceneObject = (
  dispatch: any,
  objectType: 'ship' | 'dock',
  position: LocalCoord,
  heightOffset?: number
): void => {
  // Get all scene objects from the state
  dispatch({ 
    type: 'MOVE_SCENE_OBJECT', 
    payload: { 
      type: objectType, 
      position,
      heightOffset
    } 
  });
}; 