/**
 * ObjectManager - Utility for managing 3D objects in the scene
 * Handles assets, obstacles, and neutral objects
 */

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as GeoUtils from './geoUtils'

// Object types
export const OBJECT_TYPES = {
  ASSET: 'asset',     // Friendly objects (buildings you want to inspect, etc)
  OBSTACLE: 'obstacle', // Objects to avoid (towers, power lines, etc)
  NEUTRAL: 'neutral'  // Context objects (trees, terrain features, etc)
}

// Store for objects by type
const objectRegistry = {
  [OBJECT_TYPES.ASSET]: [],
  [OBJECT_TYPES.OBSTACLE]: [],
  [OBJECT_TYPES.NEUTRAL]: []
}

// Available object models
const MODELS = {
  building: { path: '/models/building.glb', scale: 1.0 },
  solarpanel: { path: '/models/solarpanel.glb', scale: 1.0 },
  windturbine: { path: '/models/windturbine.glb', scale: 1.0 },
  powerline: { path: '/models/powerline.glb', scale: 1.0 },
  tower: { path: '/models/tower.glb', scale: 1.0 },
  crane: { path: '/models/crane.glb', scale: 1.0 },
  tree: { path: '/models/tree.glb', scale: 1.0 },
  rock: { path: '/models/rock.glb', scale: 1.0 },
  water: { path: '/models/water.glb', scale: 1.0 }
}

// State
let scene = null
let originCoordinates = null
let objectCounter = 0
let modelCache = {}

// Drawing mode
let isDrawing = false
let drawingObjectType = null
let drawingModelKey = null

// Placeholder meshes when models not loaded
const DEFAULT_GEOMETRIES = {
  [OBJECT_TYPES.ASSET]: new THREE.BoxGeometry(3, 3, 3),
  [OBJECT_TYPES.OBSTACLE]: new THREE.CylinderGeometry(1.5, 1.5, 4, 8),
  [OBJECT_TYPES.NEUTRAL]: new THREE.SphereGeometry(2, 16, 16)
}

// Materials for different object types
const MATERIALS = {
  [OBJECT_TYPES.ASSET]: new THREE.MeshLambertMaterial({ color: 0x4caf50, transparent: true, opacity: 0.8 }),
  [OBJECT_TYPES.OBSTACLE]: new THREE.MeshLambertMaterial({ color: 0xf44336, transparent: true, opacity: 0.8 }),
  [OBJECT_TYPES.NEUTRAL]: new THREE.MeshLambertMaterial({ color: 0x90a4ae, transparent: true, opacity: 0.8 })
}

/**
 * Initialize the object manager with a Three.js scene
 * @param {THREE.Scene} sceneObj - The Three.js scene
 * @param {Object} origin - The origin coordinates (lat/lng/alt)
 */
export function initObjectManager(sceneObj, origin) {
  scene = sceneObj
  originCoordinates = origin
  
  // Preload models
  preloadModels()
  
  // Add event listener for ground clicks when in drawing mode
  window.addEventListener('ground-click', handleDrawingClick)
}

/**
 * Preload all model assets
 */
function preloadModels() {
  // Skip loading models since we don't have the actual files
  console.log("Using placeholder models instead of loading from files");
  return;
}

/**
 * Sets the drawing mode state
 * @param {boolean} enabled - Whether drawing mode is enabled
 * @param {string} objectType - The type of object being drawn
 * @param {string} modelKey - The model key for the object
 */
export function setDrawingMode(enabled, objectType = null, modelKey = null) {
  isDrawing = enabled
  drawingObjectType = objectType
  drawingModelKey = modelKey
}

/**
 * Checks if drawing mode is enabled
 * @returns {boolean} Whether drawing mode is enabled
 */
export function isDrawingEnabled() {
  return isDrawing
}

/**
 * Handle ground click when in drawing mode
 * @param {Event} event - The click event
 */
function handleDrawingClick(event) {
  if (!isDrawing || !scene) return
  
  // Get the click position from the event
  const position = event.detail.position
  
  // Create a new object at the clicked position
  const newObject = createObject(
    drawingObjectType,
    drawingModelKey,
    position.x,
    position.y,
    position.z
  )
  
  // Add object to the scene
  if (newObject) {
    addObject(newObject)
    
    // Exit drawing mode after placing one object
    setDrawingMode(false)
  }
}

/**
 * Create a new object
 * @param {string} type - The object type
 * @param {string} modelKey - The model key
 * @param {number} x - The x coordinate (East)
 * @param {number} y - The y coordinate (Up)
 * @param {number} z - The z coordinate (North)
 * @returns {THREE.Object3D} The created object
 */
function createObject(type, modelKey, x, y, z) {
  let object;
  
  // Instead of trying to use cached models, just use placeholder shapes
  // since we don't have actual model files
  const geometry = DEFAULT_GEOMETRIES[type];
  const material = MATERIALS[type].clone();
  object = new THREE.Mesh(geometry, material);
  
  // Position the object
  object.position.set(x, y, z);
  
  // Calculate the exact ENU coordinates
  const enuCoords = {
    east: x,
    north: z,
    up: y
  };
  
  // Calculate geodetic coordinates from local ENU
  const globalCoords = GeoUtils.localToGeodetic(
    enuCoords.east,
    enuCoords.north,
    enuCoords.up,
    originCoordinates.lat,
    originCoordinates.lng,
    originCoordinates.alt
  );
  
  // Generate a unique ID for the object
  const objectId = `object_${Date.now()}_${objectCounter++}`;
  
  // Store metadata in userData
  object.userData = {
    id: objectId,
    type: type,
    modelKey: modelKey,
    properties: {
      name: `${modelKey.charAt(0).toUpperCase() + modelKey.slice(1)} ${objectCounter}`,
      rotation: 0,
      scale: 1.0
    },
    enuCoords: enuCoords,
    globalCoords: globalCoords
  };
  
  return object;
}

/**
 * Add an object to the scene and registry
 * @param {THREE.Object3D} object - The object to add
 */
export function addObject(object) {
  if (!scene || !object || !object.userData || !object.userData.type) {
    console.error('Cannot add object: Invalid object or scene not initialized')
    return
  }
  
  // Add to scene
  scene.add(object)
  
  // Add to registry
  objectRegistry[object.userData.type].push(object)
  
  // Dispatch custom event
  window.dispatchEvent(new CustomEvent('object-added', { detail: { object } }))
}

/**
 * Remove an object from the scene and registry
 * @param {THREE.Object3D} object - The object to remove
 */
export function removeObject(object) {
  if (!scene || !object || !object.userData || !object.userData.type) {
    console.error('Cannot remove object: Invalid object or scene not initialized')
    return
  }
  
  // Remove from scene
  scene.remove(object)
  
  // Remove from registry
  const index = objectRegistry[object.userData.type].indexOf(object)
  if (index !== -1) {
    objectRegistry[object.userData.type].splice(index, 1)
  }
  
  // Dispatch custom event
  window.dispatchEvent(new CustomEvent('object-removed', { detail: { object } }))
}

/**
 * Update an object's properties
 * @param {THREE.Object3D} object - The object to update
 * @param {Object} properties - The properties to update
 */
export function updateObject(object, properties) {
  if (!object || !object.userData) {
    console.error('Cannot update object: Invalid object')
    return
  }
  
  // Update position if provided
  if (properties.position) {
    object.position.set(
      properties.position.x,
      properties.position.y,
      properties.position.z
    )
    
    // Update ENU and global coordinates
    const enuCoords = {
      east: properties.position.x,
      north: properties.position.z,
      up: properties.position.y
    }
    
    const globalCoords = GeoUtils.localToGeodetic(
      enuCoords.east,
      enuCoords.north,
      enuCoords.up,
      originCoordinates.lat,
      originCoordinates.lng,
      originCoordinates.alt
    )
    
    object.userData.enuCoords = enuCoords
    object.userData.globalCoords = globalCoords
  }
  
  // Update properties
  if (properties.name) {
    object.userData.properties.name = properties.name
  }
  
  // Update rotation
  if (properties.rotation !== undefined) {
    object.userData.properties.rotation = properties.rotation
    object.rotation.y = properties.rotation * (Math.PI / 180)
  }
  
  // Update scale
  if (properties.scale !== undefined) {
    object.userData.properties.scale = properties.scale
    object.scale.set(properties.scale, properties.scale, properties.scale)
  }
  
  // Dispatch custom event
  window.dispatchEvent(new CustomEvent('object-updated', { detail: { object } }))
  
  return object
}

/**
 * Get all objects of a specific type
 * @param {string} type - The object type
 * @returns {Array} The objects of the specified type
 */
export function getObjectsByType(type) {
  if (!objectRegistry[type]) {
    return []
  }
  return [...objectRegistry[type]]
}

/**
 * Get all objects
 * @returns {Array} All objects
 */
export function getAllObjects() {
  return [
    ...objectRegistry[OBJECT_TYPES.ASSET],
    ...objectRegistry[OBJECT_TYPES.OBSTACLE],
    ...objectRegistry[OBJECT_TYPES.NEUTRAL]
  ]
}

/**
 * Clear all objects of a specific type
 * @param {string} type - The object type to clear
 */
export function clearObjectsByType(type) {
  if (!objectRegistry[type]) return
  
  // Remove from scene
  objectRegistry[type].forEach(object => {
    scene.remove(object)
  })
  
  // Clear registry
  objectRegistry[type] = []
}

/**
 * Clear all objects
 */
export function clearAllObjects() {
  Object.keys(objectRegistry).forEach(type => {
    clearObjectsByType(type)
  })
  
  // Reset counter
  objectCounter = 0
}

/**
 * Export objects as GeoJSON
 * @returns {Object} GeoJSON representation of objects
 */
export function exportObjectsAsGeoJSON() {
  const allObjects = getAllObjects()
  
  const features = allObjects.map(object => {
    const { globalCoords, properties, type, modelKey } = object.userData
    
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [globalCoords.lon, globalCoords.lat, globalCoords.height]
      },
      properties: {
        ...properties,
        objectType: type,
        modelKey: modelKey
      }
    }
  })
  
  return {
    type: 'FeatureCollection',
    features: features
  }
}

/**
 * Import objects from GeoJSON
 * @param {Object} geoJSON - The GeoJSON object
 * @returns {boolean} Success flag
 */
export function importObjectsFromGeoJSON(geoJSON) {
  try {
    if (!geoJSON || !geoJSON.type || geoJSON.type !== 'FeatureCollection' || !geoJSON.features) {
      throw new Error('Invalid GeoJSON format')
    }
    
    // Process each feature
    geoJSON.features.forEach(feature => {
      if (feature.geometry.type !== 'Point') return
      
      const [lon, lat, height] = feature.geometry.coordinates
      const { objectType, modelKey, ...properties } = feature.properties
      
      // Convert from global coordinates to local ENU
      const localCoords = GeoUtils.geodeticToLocal(
        lat,
        lon,
        height || 0,
        originCoordinates.lat,
        originCoordinates.lng,
        originCoordinates.alt
      )
      
      // Create object at the local coordinates
      const object = createObject(
        objectType,
        modelKey,
        localCoords.east,
        localCoords.up,
        localCoords.north
      )
      
      // Update properties
      if (object) {
        object.userData.properties = { ...object.userData.properties, ...properties }
        
        // Apply rotation and scale
        if (properties.rotation !== undefined) {
          object.rotation.y = properties.rotation * (Math.PI / 180)
        }
        
        if (properties.scale !== undefined) {
          object.scale.set(properties.scale, properties.scale, properties.scale)
        }
        
        addObject(object)
      }
    })
    
    return true
  } catch (error) {
    console.error('Error importing GeoJSON:', error)
    console.error("Error importing GeoJSON:", error)
    return false
  }
} 