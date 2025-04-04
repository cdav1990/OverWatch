/**
 * JSCADService.js
 * 
 * Service to integrate OpenJSCAD with Three.js
 * Handles conversion between JSCAD objects and Three.js geometries
 */

import * as modeling from '@jscad/modeling';
import { logStartupEvent, registerModule } from '../utils/buildInfo';

// Import JSCAD primitives and operations
const { primitives, transforms, booleans, extrusions, expansions, hulls } = modeling;

// Track created objects
let objects = [];
let currentId = 1;

/**
 * Converts JSCAD geometry to Three.js geometry
 * @param {THREE} THREE - Three.js instance
 * @param {Object} jscadGeom - JSCAD geometry object
 * @param {Object} material - Three.js material
 * @returns {THREE.Mesh} Three.js mesh
 */
const convertToThreeJS = (THREE, jscadGeom, material) => {
  try {
    // Get the triangulated geometry from JSCAD
    const geometry = new THREE.BufferGeometry();
    
    // Convert JSCAD geometry to Three.js compatible format
    const positions = [];
    const normals = [];
    const indices = [];
    
    // Process polygons from JSCAD
    jscadGeom.polygons.forEach((polygon, pIndex) => {
      // Get vertices from polygon
      const vertices = polygon.vertices;
      const baseIndex = positions.length / 3;
      
      // Add vertices to positions
      vertices.forEach(vertex => {
        positions.push(vertex[0], vertex[1], vertex[2]);
      });
      
      // Calculate normal (simple approach for now)
      const normal = calculateNormal(vertices);
      vertices.forEach(() => {
        normals.push(normal[0], normal[1], normal[2]);
      });
      
      // Create triangles (assuming convex polygons)
      for (let i = 2; i < vertices.length; i++) {
        indices.push(baseIndex, baseIndex + i - 1, baseIndex + i);
      }
    });
    
    // Create buffer attributes
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Mark as JSCAD object for tracking
    mesh.userData.isJSCADObject = true;
    mesh.userData.isInteractiveObject = true;
    
    return mesh;
  } catch (error) {
    console.error('Error converting JSCAD to Three.js:', error);
    return null;
  }
};

/**
 * Calculate normal for a polygon
 * @param {Array} vertices - Array of vertices
 * @returns {Array} Normal vector
 */
const calculateNormal = (vertices) => {
  if (vertices.length < 3) return [0, 1, 0];
  
  // Calculate cross product of two edges
  const v1 = [
    vertices[1][0] - vertices[0][0],
    vertices[1][1] - vertices[0][1],
    vertices[1][2] - vertices[0][2]
  ];
  
  const v2 = [
    vertices[2][0] - vertices[0][0],
    vertices[2][1] - vertices[0][1],
    vertices[2][2] - vertices[0][2]
  ];
  
  // Cross product v1 × v2
  const normal = [
    v1[1] * v2[2] - v1[2] * v2[1],
    v1[2] * v2[0] - v1[0] * v2[2],
    v1[0] * v2[1] - v1[1] * v2[0]
  ];
  
  // Normalize
  const length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
  if (length > 0) {
    normal[0] /= length;
    normal[1] /= length;
    normal[2] /= length;
  }
  
  return normal;
};

/**
 * Main JSCAD service
 */
class JSCADService {
  constructor() {
    this.THREE = null;
    this.scene = null;
    this.initialized = false;
    
    // Register this module
    registerModule('JSCADService');
    logStartupEvent('JSCAD integration service created');
  }
  
  /**
   * Initialize the service with Three.js scene
   * @param {Object} scene - Three.js scene
   * @param {Object} THREE - Three.js library
   */
  initialize(scene, THREE) {
    this.scene = scene;
    this.THREE = THREE;
    this.initialized = true;
    logStartupEvent('JSCAD service initialized with Three.js scene');
    return true;
  }
  
  /**
   * Create a 3D box and add it to the scene
   * @param {Object} params - Box parameters
   * @param {Array} position - [x, y, z] position
   * @returns {Object} Created mesh
   */
  createBox(params = {}, position = [0, 0, 0]) {
    if (!this.initialized) return null;
    
    try {
      // Default parameters
      const size = params.size || [1, 1, 1];
      const center = params.center || false;
      const color = params.color || 0xff0000;
      
      // Validate position
      if (!Array.isArray(position) || position.length !== 3) {
        console.error('Error: position must be an array of [x, y, z] values');
        position = [0, 0, 0]; // Use default position if invalid
      }
      
      // Create JSCAD cube
      const jscadBox = primitives.cuboid({
        size: size,
        center: center
      });
      
      // Create Three.js material
      const material = new this.THREE.MeshLambertMaterial({ color: color });
      
      // Convert to Three.js mesh
      const mesh = convertToThreeJS(this.THREE, jscadBox, material);
      
      if (mesh) {
        // Set position
        mesh.position.set(position[0], position[1], position[2]);
        
        // Add tracking metadata
        mesh.userData.type = 'box';
        mesh.userData.params = { ...params };
        mesh.userData.id = `jscad_${currentId++}`;
        
        // Add to scene
        this.scene.add(mesh);
        
        // Track object
        objects.push({
          id: mesh.userData.id,
          mesh: mesh,
          type: 'box',
          params: { ...params },
          position: [...position]
        });
        
        return mesh;
      }
      
      return null;
    } catch (error) {
      console.error('Error creating box:', error);
      return null;
    }
  }
  
  /**
   * Create a 3D cylinder and add it to the scene
   * @param {Object} params - Cylinder parameters
   * @param {Array} position - [x, y, z] position
   * @returns {Object} Created mesh
   */
  createCylinder(params = {}, position = [0, 0, 0]) {
    if (!this.initialized) return null;
    
    try {
      // Default parameters
      const radius = params.radius || 1;
      const height = params.height || 2;
      const segments = params.segments || 32;
      const color = params.color || 0x0000ff;
      
      // Validate position
      if (!Array.isArray(position) || position.length !== 3) {
        console.error('Error: position must be an array of [x, y, z] values');
        position = [0, 0, 0]; // Use default position if invalid
      }
      
      // Create JSCAD cylinder
      const jscadCylinder = primitives.cylinder({
        radius: radius,
        height: height,
        segments: segments
      });
      
      // Create Three.js material
      const material = new this.THREE.MeshLambertMaterial({ color: color });
      
      // Convert to Three.js mesh
      const mesh = convertToThreeJS(this.THREE, jscadCylinder, material);
      
      if (mesh) {
        // Set position
        mesh.position.set(position[0], position[1], position[2]);
        
        // Add tracking metadata
        mesh.userData.type = 'cylinder';
        mesh.userData.params = { ...params };
        mesh.userData.id = `jscad_${currentId++}`;
        
        // Add to scene
        this.scene.add(mesh);
        
        // Track object
        objects.push({
          id: mesh.userData.id,
          mesh: mesh,
          type: 'cylinder',
          params: { ...params },
          position: [...position]
        });
        
        return mesh;
      }
      
      return null;
    } catch (error) {
      console.error('Error creating cylinder:', error);
      return null;
    }
  }
  
  /**
   * Create a 3D sphere and add it to the scene
   * @param {Object} params - Sphere parameters
   * @param {Array} position - [x, y, z] position
   * @returns {Object} Created mesh
   */
  createSphere(params = {}, position = [0, 0, 0]) {
    if (!this.initialized) return null;
    
    try {
      // Default parameters
      const radius = params.radius || 1;
      const segments = params.segments || 32;
      const color = params.color || 0x00ff00;
      
      // Validate position
      if (!Array.isArray(position) || position.length !== 3) {
        console.error('Error: position must be an array of [x, y, z] values');
        position = [0, 0, 0]; // Use default position if invalid
      }
      
      // Create JSCAD sphere
      const jscadSphere = primitives.sphere({
        radius: radius,
        segments: segments
      });
      
      // Create Three.js material
      const material = new this.THREE.MeshLambertMaterial({ color: color });
      
      // Convert to Three.js mesh
      const mesh = convertToThreeJS(this.THREE, jscadSphere, material);
      
      if (mesh) {
        // Set position
        mesh.position.set(position[0], position[1], position[2]);
        
        // Add tracking metadata
        mesh.userData.type = 'sphere';
        mesh.userData.params = { ...params };
        mesh.userData.id = `jscad_${currentId++}`;
        
        // Add to scene
        this.scene.add(mesh);
        
        // Track object
        objects.push({
          id: mesh.userData.id,
          mesh: mesh,
          type: 'sphere',
          params: { ...params },
          position: [...position]
        });
        
        return mesh;
      }
      
      return null;
    } catch (error) {
      console.error('Error creating sphere:', error);
      return null;
    }
  }
  
  /**
   * Create a rectangle and add it to the scene
   * @param {Object} params - Rectangle parameters
   * @param {Array} position - [x, y, z] position
   * @returns {Object} Created mesh
   */
  createRectangle(params = {}, position = [0, 0, 0]) {
    if (!this.initialized) return null;
    
    try {
      // Default parameters
      const size = params.size || [2, 1];
      const extrude = params.extrude || 0.1;
      const color = params.color || 0xffff00;
      
      // Validate position
      if (!Array.isArray(position) || position.length !== 3) {
        console.error('Error: position must be an array of [x, y, z] values');
        position = [0, 0, 0]; // Use default position if invalid
      }
      
      // Create JSCAD rectangle
      const rectangle = primitives.rectangle({
        size: size
      });
      
      // Extrude the rectangle
      const extrudedRectangle = extrusions.extrudeLinear({ height: extrude }, rectangle);
      
      // Create Three.js material
      const material = new this.THREE.MeshLambertMaterial({ color: color });
      
      // Convert to Three.js mesh
      const mesh = convertToThreeJS(this.THREE, extrudedRectangle, material);
      
      if (mesh) {
        // Set position
        mesh.position.set(position[0], position[1], position[2]);
        
        // Add tracking metadata
        mesh.userData.type = 'rectangle';
        mesh.userData.params = { ...params };
        mesh.userData.id = `jscad_${currentId++}`;
        
        // Add to scene
        this.scene.add(mesh);
        
        // Track object
        objects.push({
          id: mesh.userData.id,
          mesh: mesh,
          type: 'rectangle',
          params: { ...params },
          position: [...position]
        });
        
        return mesh;
      }
      
      return null;
    } catch (error) {
      console.error('Error creating rectangle:', error);
      return null;
    }
  }
  
  /**
   * Create a circle and add it to the scene
   * @param {Object} params - Circle parameters
   * @param {Array} position - [x, y, z] position
   * @returns {Object} Created mesh
   */
  createCircle(params = {}, position = [0, 0, 0]) {
    if (!this.initialized) return null;
    
    try {
      // Default parameters
      const radius = params.radius || 1;
      const segments = params.segments || 32;
      const extrude = params.extrude || 0.1;
      const color = params.color || 0xff00ff;
      
      // Validate position
      if (!Array.isArray(position) || position.length !== 3) {
        console.error('Error: position must be an array of [x, y, z] values');
        position = [0, 0, 0]; // Use default position if invalid
      }
      
      // Create JSCAD circle
      const circle = primitives.circle({
        radius: radius,
        segments: segments
      });
      
      // Extrude the circle
      const extrudedCircle = extrusions.extrudeLinear({ height: extrude }, circle);
      
      // Create Three.js material
      const material = new this.THREE.MeshLambertMaterial({ color: color });
      
      // Convert to Three.js mesh
      const mesh = convertToThreeJS(this.THREE, extrudedCircle, material);
      
      if (mesh) {
        // Set position
        mesh.position.set(position[0], position[1], position[2]);
        
        // Add tracking metadata
        mesh.userData.type = 'circle';
        mesh.userData.params = { ...params };
        mesh.userData.id = `jscad_${currentId++}`;
        
        // Add to scene
        this.scene.add(mesh);
        
        // Track object
        objects.push({
          id: mesh.userData.id,
          mesh: mesh,
          type: 'circle',
          params: { ...params },
          position: [...position]
        });
        
        return mesh;
      }
      
      return null;
    } catch (error) {
      console.error('Error creating circle:', error);
      return null;
    }
  }
  
  /**
   * Get all created objects
   * @returns {Array} Array of objects
   */
  getObjects() {
    return [...objects];
  }
  
  /**
   * Get object by ID
   * @param {String} id - Object ID
   * @returns {Object} Object
   */
  getObjectById(id) {
    return objects.find(obj => obj.id === id);
  }
  
  /**
   * Remove object from scene
   * @param {String} id - Object ID
   * @returns {Boolean} Success
   */
  removeObject(id) {
    const objIndex = objects.findIndex(obj => obj.id === id);
    
    if (objIndex >= 0) {
      const obj = objects[objIndex];
      
      // Remove from scene
      if (this.scene && obj.mesh) {
        this.scene.remove(obj.mesh);
      }
      
      // Remove from tracking array
      objects.splice(objIndex, 1);
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Clear all objects from scene
   */
  clearAll() {
    if (!this.scene) return;
    
    // Remove all objects from scene
    objects.forEach(obj => {
      if (obj.mesh) {
        this.scene.remove(obj.mesh);
      }
    });
    
    // Clear tracking array
    objects = [];
  }
}

// Create singleton instance
const jscadService = new JSCADService();

export default jscadService; 