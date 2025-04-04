/**
 * ThreeMeshBvhDrawing.js
 * 
 * Utility class for drawing 2D and 3D shapes with three-mesh-bvh acceleration
 * Optimized for use with the mission planner's build scene workflow
 */

import * as THREE from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { v4 as uuidv4 } from 'uuid';

// Add accelerated raycast method to THREE.Mesh
THREE.Mesh.prototype.raycast = acceleratedRaycast;

export class ThreeMeshBvhDrawing {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.activeMode = 'none'; // 'none', '2d', '3d'
    this.activeTool = 'select'; // 'select', 'line', 'polygon', etc.
    this.isDrawing = false;
    this.currentPoints = [];
    this.currentObject = null;
    this.meshes = [];
    this.markerPoints = []; // To track marker spheres at clicked points
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.domElement = renderer ? renderer.domElement : null;
    this.debugMode = true; // Enable debug logging
    
    // Log successful initialization
    console.log(`ThreeMeshBvhDrawing initialized with:
      - Scene: ${!!scene}
      - Camera: ${!!camera}
      - Renderer: ${!!renderer}
      - DomElement: ${!!this.domElement}`);
    
    // Helper objects
    this.pointMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    this.lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff });
    this.meshMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ffff, 
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    this.fillMaterial = new THREE.MeshStandardMaterial({
      color: 0x2196f3,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    this.markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.8
    });
    
    // Spline-specific properties
    this.splineCurve = null;
    this.splinePoints = [];
    this.splineObject = null;
    
    // Asset tracking
    this.drawingAssets = {
      '2d': [],
      '3d': []
    };
    
    // Set up the event listeners
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // In debugging mode, always log the status of DOM element
    if (this.debugMode) {
      console.log(`Setting up event listeners with domElement: ${!!this.domElement}`);
    }
    
    // Only attach direct DOM events if we have a valid DOM element
    if (this.domElement) {
      console.log('Attaching direct DOM event listeners to renderer element');
      
      // Add mousedown listener for drawing
      this.domElement.addEventListener('mousedown', (event) => {
        if (this.activeMode !== 'none' && this.activeTool !== 'select') {
          if (this.debugMode) {
            console.log(`Direct mousedown detected in mode: ${this.activeMode}, tool: ${this.activeTool}`);
          }
          
          // Get the mouse coordinates
          const rect = this.domElement.getBoundingClientRect();
          this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          
          // Perform raycasting
          this.raycaster.setFromCamera(this.mouse, this.camera);
          const intersects = this.raycaster.intersectObjects(this.scene.children, true);
          
          // Filter out our own drawing objects
          const validIntersects = intersects.filter(i => 
            !this.meshes.includes(i.object) && 
            i.object !== this.currentObject &&
            (!i.object.parent || !this.meshes.includes(i.object.parent))
          );
          
          if (validIntersects.length > 0) {
            const point = validIntersects[0].point.clone();
            
            if (this.debugMode) {
              console.log(`Drawing point found at: (${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)})`);
            }
            
            // Process the drawing operation
            if (this.activeMode === '2d') {
              this.handle2DDrawing(point);
            } else if (this.activeMode === '3d') {
              this.handle3DDrawing(point);
            }
          } else {
            console.warn('No valid intersection found for drawing');
          }
        }
      });
      
      // Add dblclick listener for finalizing polygons, splines, etc.
      this.domElement.addEventListener('dblclick', (event) => {
        if (this.activeMode !== 'none' && 
            (this.activeTool === 'polygon' || this.activeTool === 'spline' || 
             this.activeTool === '3d-path' || this.activeTool === '3d-spline')) {
          if (this.debugMode) {
            console.log(`Direct double-click detected in mode: ${this.activeMode}, tool: ${this.activeTool}`);
          }
          
          // Get the mouse coordinates
          const rect = this.domElement.getBoundingClientRect();
          this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          
          // Perform raycasting to get the final point
          this.raycaster.setFromCamera(this.mouse, this.camera);
          const intersects = this.raycaster.intersectObjects(this.scene.children, true);
          
          // Filter out our own drawing objects
          const validIntersects = intersects.filter(i => 
            !this.meshes.includes(i.object) && 
            i.object !== this.currentObject &&
            (!i.object.parent || !this.meshes.includes(i.object.parent))
          );
          
          // Add the final point if we have a valid intersection
          if (validIntersects.length > 0) {
            const point = validIntersects[0].point.clone();
            
            // For 2D tools, ensure y=0
            if (this.activeMode === '2d') {
              point.y = 0.01;
            }
            
            // Add the last point if it's different from the last one
            if (this.currentPoints.length > 0) {
              const lastPoint = this.currentPoints[this.currentPoints.length - 1];
              if (lastPoint.distanceTo(point) > 0.01) {
                this.currentPoints.push(point);
                
                // Redraw with the new point
                switch (this.activeTool) {
                  case 'polygon':
                    this.draw2DPolygon();
                    break;
                  case 'spline':
                    this.draw2DSpline();
                    break;
                  case '3d-path':
                    this.draw3DPath();
                    break;
                  case '3d-spline':
                    this.draw3DSpline();
                    break;
                }
              }
            }
          }
          
          // Finalize the shape
          this.handleDoubleClick(event);
        }
      });
      
      // Add mousemove listener for preview
      this.domElement.addEventListener('mousemove', (event) => {
        if (this.activeMode !== 'none' && this.activeTool !== 'select' && this.currentPoints.length > 0) {
          // Get the mouse coordinates
          const rect = this.domElement.getBoundingClientRect();
          this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          
          // Perform raycasting
          this.raycaster.setFromCamera(this.mouse, this.camera);
          const intersects = this.raycaster.intersectObjects(this.scene.children, true);
          
          // Filter valid intersections
          const validIntersects = intersects.filter(i => 
            !this.meshes.includes(i.object) && 
            i.object !== this.currentObject &&
            (!i.object.parent || !this.meshes.includes(i.object.parent))
          );
          
          if (validIntersects.length > 0) {
            const point = validIntersects[0].point.clone();
            
            // Preview update based on mode
            if (this.activeMode === '2d') {
              this.previewUpdate2D(point);
            } else if (this.activeMode === '3d') {
              this.previewUpdate3D(point);
            }
          }
        }
      });
    }
    
    // Still attach the escape key listener globally
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (this.debugMode) {
          console.log('ESC key pressed, canceling current drawing operation');
        }
        this.resetCurrentDraw();
      }
    });
  }
  
  setActiveMode(mode) {
    if (this.debugMode) {
      console.log(`Setting drawing mode to: ${mode} (previous: ${this.activeMode})`);
    }
    
    this.activeMode = mode;
    this.resetCurrentDraw();
    
    // Directly update cursor and apply visual feedback
    if (this.domElement) {
      if (mode === 'none') {
        this.domElement.style.cursor = 'default';
      } else {
        this.domElement.style.cursor = 'crosshair';
        
        // Try to add a class to the parent element for additional styling
        try {
          let parent = this.domElement.parentElement;
          if (parent) {
            if (mode !== 'none') {
              parent.classList.add('drawing-mode');
              if (this.debugMode) console.log('Added drawing-mode class to parent element');
            } else {
              parent.classList.remove('drawing-mode');
              if (this.debugMode) console.log('Removed drawing-mode class from parent element');
            }
          }
        } catch (err) {
          console.warn('Error applying drawing mode class to parent element:', err);
        }
      }
      
      if (this.debugMode) {
        console.log(`Updated cursor to: ${this.domElement.style.cursor}`);
      }
    } else {
      if (this.debugMode) {
        console.warn('No domElement available for cursor/class update');
      }
    }
    
    // Emit event to notify about mode change
    window.dispatchEvent(new CustomEvent('drawing-mode-changed', {
      detail: { 
        mode: mode,
        success: true
      }
    }));
    
    return true;
  }
  
  setActiveTool(tool) {
    if (this.debugMode) {
      console.log(`Setting drawing tool to: ${tool} (previous: ${this.activeTool})`);
    }
    
    this.activeTool = tool;
    this.resetCurrentDraw();
    
    // Update cursor style based on tool
    if (this.domElement) {
      if (tool === 'select' || tool === '3d-select') {
        this.domElement.style.cursor = 'default';
      } else {
        this.domElement.style.cursor = 'crosshair';
      }
      
      if (this.debugMode) {
        console.log(`Updated cursor to: ${this.domElement.style.cursor}`);
      }
      
      // Highlight the active tool buttons in the UI
      try {
        // Find all tool buttons and mark the active one
        document.querySelectorAll('[data-drawing-tool]').forEach(btn => {
          if (btn.dataset.drawingTool === tool) {
            btn.classList.add('active-tool');
          } else {
            btn.classList.remove('active-tool');
          }
        });
      } catch (err) {
        // Just log but don't fail if we can't find buttons
        if (this.debugMode) {
          console.warn('Could not apply active tool highlighting:', err);
        }
      }
    } else {
      if (this.debugMode) {
        console.warn('No domElement available for cursor update');
      }
    }
    
    // Emit event to notify about tool change
    window.dispatchEvent(new CustomEvent('drawing-tool-changed', {
      detail: { 
        tool: tool,
        success: true
      }
    }));
    
    return true;
  }
  
  resetCurrentDraw() {
    this.isDrawing = false;
    this.currentPoints = [];
    if (this.currentObject) {
      this.scene.remove(this.currentObject);
      this.currentObject = null;
    }
    this.splineCurve = null;
    this.splinePoints = [];
    if (this.splineObject) {
      this.scene.remove(this.splineObject);
      this.splineObject = null;
    }
  }
  
  handleMouseDown(event) {
    if (this.activeMode === 'none' || this.activeTool === 'select') return;
    
    console.log('ThreeMeshBvhDrawing handleMouseDown called with event:', event);
    
    // Extract position from event detail
    let point;
    
    if (event.detail && event.detail.position) {
      // Handle custom event with position in detail
      point = new THREE.Vector3(
        event.detail.position.x,
        event.detail.position.y,
        event.detail.position.z
      );
      console.log('Using position from event detail:', point);
    } else if (event.detail && event.detail.mouse) {
      // Handle custom event with mouse coordinates
      console.log('Using mouse coordinates for raycasting:', event.detail.mouse);
      
      // Create raycaster if needed
      if (!this.raycaster) {
        this.raycaster = new THREE.Raycaster();
      }
      
      // Set mouse coordinates
      const mouseX = event.detail.mouse.x || 0;
      const mouseY = event.detail.mouse.y || 0;
      this.mouse.set(mouseX, mouseY);
      
      // Perform raycasting
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);
      
      // Filter valid intersections (skip our own objects)
      const validIntersects = intersects.filter(i => {
        return (i.object !== this.currentObject) && 
               (!i.object.parent || i.object.parent !== this.currentObject);
      });
      
      if (validIntersects.length > 0) {
        point = validIntersects[0].point.clone();
        console.log('Raycasting found point at:', point);
      } else {
        console.warn('No valid intersection found from raycasting');
        return;
      }
    } else if (event.point) {
      // Handle direct THREE.js intersection event
      point = event.point.clone();
      console.log('Using direct point from THREE.js event:', point);
    } else {
      console.warn('Invalid event format for handleMouseDown, trying to extract coordinates manually');
      
      // Last resort - try to extract clientX/Y and do raycasting
      try {
        if (event.clientX && event.clientY && this.domElement) {
          const rect = this.domElement.getBoundingClientRect();
          const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          
          this.mouse.set(mouseX, mouseY);
          this.raycaster.setFromCamera(this.mouse, this.camera);
          
          const intersects = this.raycaster.intersectObjects(this.scene.children, true);
          if (intersects.length > 0) {
            point = intersects[0].point.clone();
            console.log('Successfully extracted point from clientX/Y:', point);
          } else {
            console.error('No intersections found with manual extraction');
            return;
          }
        } else {
          console.error('Invalid event format and no clientX/Y available:', event);
          return;
        }
      } catch (error) {
        console.error('Error extracting coordinates from event:', error);
        return;
      }
    }
    
    console.log(`Processing drawing click at position: (${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)})`);
    
    if (this.activeMode === '2d') {
      this.handle2DDrawing(point);
    } else if (this.activeMode === '3d') {
      this.handle3DDrawing(point);
    }
  }
  
  updateMousePosition(event) {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }
  
  handle2DDrawing(point) {
    // Ensure point is on the ground plane (y=0)
    point.y = 0.01; // Just slightly above ground to avoid z-fighting
    
    // Add marker at click point
    this.addMarkerPoint(point);
    
    this.currentPoints.push(point);
    console.log(`Added 2D point: (${point.x.toFixed(2)}, ${point.z.toFixed(2)})`);
    
    switch (this.activeTool) {
      case 'line':
        this.draw2DLine();
        break;
      case 'polygon':
        this.draw2DPolygon();
        break;
      case 'rectangle':
        this.draw2DRectangle();
        break;
      case 'circle':
        this.draw2DCircle();
        break;
      case 'spline':
        this.draw2DSpline();
        break;
    }
  }
  
  handle3DDrawing(point) {
    this.currentPoints.push(point);
    console.log(`Added 3D point: (${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)})`);
    
    switch (this.activeTool) {
      case '3d-box':
        this.draw3DBox();
        break;
      case '3d-sphere':
        this.draw3DSphere();
        break;
      case '3d-cylinder':
        this.draw3DCylinder();
        break;
      case '3d-path':
        this.draw3DPath();
        break;
      case '3d-spline':
        this.draw3DSpline();
        break;
    }
  }
  
  /* 2D Drawing Methods */
  
  draw2DLine() {
    if (this.currentPoints.length < 2) return;
    
    if (this.currentObject) {
      this.scene.remove(this.currentObject);
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints(this.currentPoints);
    const line = new THREE.Line(geometry, this.lineMaterial);
    this.scene.add(line);
    this.currentObject = line;
    
    // Finalize on second click
    if (this.currentPoints.length === 2) {
      this.finalizeMesh();
    }
  }
  
  draw2DPolygon() {
    if (this.currentPoints.length < 2) return;
    
    if (this.currentObject) {
      this.scene.remove(this.currentObject);
    }
    
    // For preview, just show lines
    const points = [...this.currentPoints];
    
    // Close the polygon if we have more than 2 points
    if (this.currentPoints.length > 2) {
      points.push(this.currentPoints[0].clone());
      
      // Create filled polygon
      const shape = new THREE.Shape();
      shape.moveTo(this.currentPoints[0].x, this.currentPoints[0].z);
      
      for (let i = 1; i < this.currentPoints.length; i++) {
        shape.lineTo(this.currentPoints[i].x, this.currentPoints[i].z);
      }
      
      // Close shape
      shape.lineTo(this.currentPoints[0].x, this.currentPoints[0].z);
      
      // Create geometry for filled shape
      const shapeGeometry = new THREE.ShapeGeometry(shape);
      
      // Adjust vertices to be on XZ plane (y = 0.005)
      const positionAttribute = shapeGeometry.getAttribute('position');
      for (let i = 0; i < positionAttribute.count; i++) {
        const y = 0.005; // Slightly above ground to avoid z-fighting with grid
        positionAttribute.setY(i, y);
      }
      
      // Create filled mesh
      const fillMesh = new THREE.Mesh(shapeGeometry, this.fillMaterial);
      fillMesh.rotation.x = -Math.PI / 2; // Rotate to lie on XZ plane
      this.scene.add(fillMesh);
      
      // Make the line mesh part of a group with the filled mesh
      const group = new THREE.Group();
      
      // Create and add the line mesh to the group
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMesh = new THREE.Line(lineGeometry, this.lineMaterial);
      
      group.add(fillMesh);
      group.add(lineMesh);
      
      this.scene.add(group);
      this.currentObject = group;
    } else {
      // Just show lines if we don't have enough points for a polygon
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, this.lineMaterial);
      this.scene.add(line);
      this.currentObject = line;
    }
    
    // Double-click to finalize (handled separately)
  }
  
  draw2DRectangle() {
    if (this.currentPoints.length < 2) return;
    
    if (this.currentObject) {
      this.scene.remove(this.currentObject);
    }
    
    const start = this.currentPoints[0];
    const end = this.currentPoints[1];
    
    // Create rectangle outline
    const points = [
      new THREE.Vector3(start.x, start.y, start.z),
      new THREE.Vector3(end.x, start.y, start.z),
      new THREE.Vector3(end.x, start.y, end.z),
      new THREE.Vector3(start.x, start.y, end.z),
      new THREE.Vector3(start.x, start.y, start.z)
    ];
    
    // Create filled shape
    const shape = new THREE.Shape();
    shape.moveTo(start.x, start.z);
    shape.lineTo(end.x, start.z);
    shape.lineTo(end.x, end.z);
    shape.lineTo(start.x, end.z);
    shape.lineTo(start.x, start.z);
    
    // Create geometry for filled shape
    const shapeGeometry = new THREE.ShapeGeometry(shape);
    
    // Adjust vertices to be on XZ plane (y = 0.005)
    const positionAttribute = shapeGeometry.getAttribute('position');
    for (let i = 0; i < positionAttribute.count; i++) {
      const y = 0.005; // Slightly above ground to avoid z-fighting with grid
      positionAttribute.setY(i, y);
    }
    
    // Create filled mesh
    const fillMesh = new THREE.Mesh(shapeGeometry, this.fillMaterial);
    fillMesh.rotation.x = -Math.PI / 2; // Rotate to lie on XZ plane
    
    // Create line for outline
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMesh = new THREE.Line(lineGeometry, this.lineMaterial);
    
    // Create group to hold both line and fill
    const group = new THREE.Group();
    group.add(fillMesh);
    group.add(lineMesh);
    
    this.scene.add(group);
    this.currentObject = group;
    
    // Finalize on second click
    if (this.currentPoints.length === 2) {
      this.finalizeMesh();
    }
  }
  
  draw2DCircle() {
    if (this.currentPoints.length < 2) return;
    
    if (this.currentObject) {
      this.scene.remove(this.currentObject);
    }
    
    const center = this.currentPoints[0];
    const edge = this.currentPoints[1];
    const radius = center.distanceTo(edge);
    
    // Create circle
    const geometry = new THREE.CircleGeometry(radius, 32);
    geometry.rotateX(-Math.PI / 2); // Rotate to lie flat on XZ plane
    
    // Move to center
    geometry.translate(center.x, center.y, center.z);
    
    const mesh = new THREE.Mesh(geometry, this.meshMaterial);
    this.scene.add(mesh);
    this.currentObject = mesh;
    
    // Finalize on second click
    if (this.currentPoints.length === 2) {
      this.finalizeMesh();
    }
  }
  
  draw2DSpline() {
    if (this.currentPoints.length < 2) return;
    
    if (this.currentObject) {
      this.scene.remove(this.currentObject);
    }
    
    // Create a smooth curve through points
    const points2D = this.currentPoints.map(p => new THREE.Vector2(p.x, p.z));
    this.splineCurve = new THREE.SplineCurve(points2D);
    
    // Sample points along the curve
    const sampledPoints = this.splineCurve.getPoints(50);
    this.splinePoints = sampledPoints.map(p => new THREE.Vector3(p.x, 0.01, p.y));
    
    // Create line geometry
    const geometry = new THREE.BufferGeometry().setFromPoints(this.splinePoints);
    const line = new THREE.Line(geometry, this.lineMaterial);
    this.scene.add(line);
    this.currentObject = line;
    
    // Double-click to finalize (handled separately)
  }
  
  /* 3D Drawing Methods */
  
  draw3DBox() {
    if (this.currentPoints.length < 2) return;
    
    if (this.currentObject) {
      this.scene.remove(this.currentObject);
    }
    
    const start = this.currentPoints[0];
    const end = this.currentPoints[1];
    
    // Create dimensions
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y) || 1; // Default height if on same plane
    const depth = Math.abs(end.z - start.z);
    
    // Create box
    const geometry = new THREE.BoxGeometry(width, height, depth);
    
    // Position box
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const midZ = (start.z + end.z) / 2;
    
    geometry.translate(midX, midY, midZ);
    
    const mesh = new THREE.Mesh(geometry, this.meshMaterial);
    this.scene.add(mesh);
    this.currentObject = mesh;
    
    // Finalize on second click
    if (this.currentPoints.length === 2) {
      this.finalizeMesh();
    }
  }
  
  draw3DSphere() {
    if (this.currentPoints.length < 2) return;
    
    if (this.currentObject) {
      this.scene.remove(this.currentObject);
    }
    
    const center = this.currentPoints[0];
    const edge = this.currentPoints[1];
    const radius = center.distanceTo(edge);
    
    // Create sphere
    const geometry = new THREE.SphereGeometry(radius, 32, 16);
    
    // Move to center
    geometry.translate(center.x, center.y, center.z);
    
    const mesh = new THREE.Mesh(geometry, this.meshMaterial);
    this.scene.add(mesh);
    this.currentObject = mesh;
    
    // Finalize on second click
    if (this.currentPoints.length === 2) {
      this.finalizeMesh();
    }
  }
  
  draw3DCylinder() {
    if (this.currentPoints.length < 2) return;
    
    if (this.currentObject) {
      this.scene.remove(this.currentObject);
    }
    
    const start = this.currentPoints[0];
    const end = this.currentPoints[1];
    
    // Calculate radius as distance in XZ plane
    const xzStart = new THREE.Vector2(start.x, start.z);
    const xzEnd = new THREE.Vector2(end.x, end.z);
    const radius = xzStart.distanceTo(xzEnd);
    
    // Create cylinder - height is Y distance
    const height = Math.abs(end.y - start.y) || 1; // Default height if on same plane
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 32);
    
    // Translate to position
    geometry.translate(start.x, start.y + height/2, start.z);
    
    const mesh = new THREE.Mesh(geometry, this.meshMaterial);
    this.scene.add(mesh);
    this.currentObject = mesh;
    
    // Finalize on second click
    if (this.currentPoints.length === 2) {
      this.finalizeMesh();
    }
  }
  
  draw3DPath() {
    if (this.currentPoints.length < 2) return;
    
    if (this.currentObject) {
      this.scene.remove(this.currentObject);
    }
    
    // Create a tube along the path
    const curve = new THREE.CatmullRomCurve3(this.currentPoints);
    const tubeGeometry = new THREE.TubeGeometry(curve, 64, 0.1, 8, false);
    
    const mesh = new THREE.Mesh(tubeGeometry, this.meshMaterial);
    this.scene.add(mesh);
    this.currentObject = mesh;
    
    // Double-click to finalize (handled separately)
  }
  
  draw3DSpline() {
    if (this.currentPoints.length < 2) return;
    
    if (this.currentObject) {
      this.scene.remove(this.currentObject);
    }
    
    // Create a smooth 3D spline
    const curve = new THREE.CatmullRomCurve3(this.currentPoints);
    
    // Sample points along the curve
    const sampledPoints = curve.getPoints(50);
    
    // Create tube geometry
    const tubeGeometry = new THREE.TubeGeometry(curve, 64, 0.1, 8, false);
    
    const mesh = new THREE.Mesh(tubeGeometry, this.meshMaterial);
    this.scene.add(mesh);
    this.currentObject = mesh;
    
    // Double-click to finalize (handled separately)
  }
  
  /* Mesh Finalization */
  
  finalizeMesh() {
    if (!this.currentObject) return;
    
    // Generate a unique ID
    const assetId = uuidv4();
    
    // Store metadata on the mesh
    this.currentObject.userData = {
      id: assetId,
      type: this.activeMode === '2d' ? '2dShape' : '3dShape',
      tool: this.activeTool,
      createdAt: new Date().toISOString(),
      points: this.currentPoints.map(p => ({ x: p.x, y: p.y, z: p.z }))
    };
    
    // Add to tracking collections
    if (this.activeMode === '2d') {
      this.drawingAssets['2d'].push({
        id: assetId,
        object: this.currentObject,
        tool: this.activeTool,
        points: [...this.currentPoints.map(p => p.clone())]
      });
    } else {
      this.drawingAssets['3d'].push({
        id: assetId,
        object: this.currentObject,
        tool: this.activeTool,
        points: [...this.currentPoints.map(p => p.clone())]
      });
    }
    
    // Clear the marker points
    this.clearMarkerPoints();
    
    // Signal asset creation
    this.dispatchAssetCreated(this.currentObject);
    
    // Reset for next drawing
    const completedObject = this.currentObject;
    this.meshes.push(completedObject);
    this.currentObject = null;
    this.currentPoints = [];
    this.isDrawing = false;
  }
  
  /* Utility Methods */
  
  clearAll() {
    // Remove all current meshes
    this.meshes.forEach(mesh => {
      this.scene.remove(mesh);
    });
    this.meshes = [];
    
    // Remove all drawing assets
    this.drawingAssets['2d'].forEach(asset => {
      this.scene.remove(asset.object);
    });
    this.drawingAssets['3d'].forEach(asset => {
      this.scene.remove(asset.object);
    });
    this.drawingAssets['2d'] = [];
    this.drawingAssets['3d'] = [];
    
    // Clear any in-progress drawing
    this.resetCurrentDraw();
  }
  
  handleDoubleClick(event) {
    // Only finalize mesh on double click for tools that require it
    if (this.activeTool === 'polygon' || this.activeTool === 'spline' || 
        this.activeTool === '3d-path' || this.activeTool === '3d-spline') {
      
      console.log('Double click detected, finalizing current drawing');
      
      // Add a last point if the event contains position information
      if (event.detail && event.detail.position) {
        const position = event.detail.position;
        const point = new THREE.Vector3(position.x, position.y, position.z);
        
        // Only add if it's different from the last point
        if (this.currentPoints.length > 0) {
          const lastPoint = this.currentPoints[this.currentPoints.length - 1];
          if (lastPoint.distanceTo(point) > 0.1) {
            // For 2D tools, enforce y=0.01
            if (this.activeMode === '2d') {
              point.y = 0.01;
            }
            
            this.currentPoints.push(point);
            
            // Redraw with new point
            if (this.activeTool === 'polygon') {
              this.draw2DPolygon();
            } else if (this.activeTool === 'spline') {
              this.draw2DSpline();
            } else if (this.activeTool === '3d-path') {
              this.draw3DPath();
            } else if (this.activeTool === '3d-spline') {
              this.draw3DSpline();
            }
          }
        }
      }
      
      // We need at least 3 points for a polygon or spline
      if (this.currentPoints.length >= 3 || 
          (this.activeTool === 'spline' && this.currentPoints.length >= 2)) {
        
        // If this is a polygon, ensure it's closed properly
        if (this.activeTool === 'polygon') {
          // Ensure the polygon is closed by checking if first and last points match
          const first = this.currentPoints[0];
          const last = this.currentPoints[this.currentPoints.length - 1];
          
          // If the last point isn't the same as the first, close the polygon
          if (first.distanceTo(last) > 0.01) {
            this.currentPoints.push(first.clone());
            this.draw2DPolygon(); // Redraw with the closed shape
          }
        }
        
        this.finalizeMesh();
      } else {
        console.log('Not enough points to finalize drawing, need at least 3 but have:', this.currentPoints.length);
      }
    }
  }
  
  handleMouseMove(event) {
    // Skip if we're not actively drawing or don't have any points yet
    if (this.activeMode === 'none' || this.activeTool === 'select' || this.currentPoints.length === 0) return;
    
    // Update the mouse position
    this.updateMousePosition(event);
    
    // Raycasting for preview
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    
    // Filter valid intersections
    const validIntersects = intersects.filter(i => {
      return i.object !== this.currentObject;
    });
    
    if (validIntersects.length > 0) {
      // Update the last point for preview (don't add to points array yet)
      const previewPoint = validIntersects[0].point.clone();
      
      // Preview based on the current tool
      if (this.activeMode === '2d') {
        this.previewUpdate2D(previewPoint);
      } else if (this.activeMode === '3d') {
        this.previewUpdate3D(previewPoint);
      }
    }
  }
  
  previewUpdate2D(point) {
    // Make sure point is on the ground plane
    point.y = 0.01;
    
    // Create a temporary array with all current points plus the preview point
    const previewPoints = [...this.currentPoints];
    
    // Handle different tools
    switch (this.activeTool) {
      case 'line':
        if (previewPoints.length === 1) {
          previewPoints.push(point);
          this.updateLinePreview(previewPoints);
        }
        break;
        
      case 'polygon':
        previewPoints.push(point);
        // Close the polygon preview
        if (previewPoints.length > 2) {
          previewPoints.push(previewPoints[0].clone());
        }
        this.updateLinePreview(previewPoints);
        break;
        
      case 'rectangle':
        if (previewPoints.length === 1) {
          const start = previewPoints[0];
          const end = point;
          
          const rectPoints = [
            new THREE.Vector3(start.x, start.y, start.z),
            new THREE.Vector3(end.x, start.y, start.z),
            new THREE.Vector3(end.x, start.y, end.z),
            new THREE.Vector3(start.x, start.y, end.z),
            new THREE.Vector3(start.x, start.y, start.z)
          ];
          
          this.updateLinePreview(rectPoints);
        }
        break;
    }
  }
  
  previewUpdate3D(point) {
    // Handle 3D preview updates
  }
  
  updateLinePreview(points) {
    if (this.currentObject) {
      this.scene.remove(this.currentObject);
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, this.lineMaterial);
    this.scene.add(line);
    this.currentObject = line;
  }
  
  dispose() {
    // Clean up resources
    this.clearAll();
    
    // Remove event listeners
    if (this.domElement) {
      this.domElement.removeEventListener('mousedown', this.handleMouseDown.bind(this));
      this.domElement.removeEventListener('mousemove', this.handleMouseMove.bind(this));
      this.domElement.removeEventListener('dblclick', this.handleDoubleClick.bind(this));
    }
    
    window.removeEventListener('keydown', this.handleKeyDown);
    
    console.log('ThreeMeshBvhDrawing disposed');
  }
  
  // Add a visual marker sphere at the clicked point
  addMarkerPoint(point) {
    console.log(`Adding marker point at: (${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)})`);
    
    try {
      const markerGeometry = new THREE.SphereGeometry(0.2, 16, 16);
      const markerMesh = new THREE.Mesh(markerGeometry, this.markerMaterial);
      markerMesh.position.copy(point);
      
      // Add a unique identifier to help track the marker
      const markerId = this.markerPoints.length;
      markerMesh.name = `marker-point-${markerId}`;
      markerMesh.userData = { 
        type: 'marker-point', 
        createdAt: new Date().toISOString(),
        pointIndex: markerId
      };
      
      this.scene.add(markerMesh);
      this.markerPoints.push(markerMesh);
      
      console.log(`Marker point ${markerId} added to scene. Total markers: ${this.markerPoints.length}`);
      
      // Check if the marker is actually in the scene
      const isInScene = this.scene.children.includes(markerMesh);
      console.log(`Marker point ${markerId} is ${isInScene ? 'present' : 'NOT present'} in scene.`);
      
      return markerMesh;
    } catch (error) {
      console.error('Error adding marker point:', error);
      return null;
    }
  }
  
  // Clear marker points after shape is finalized
  clearMarkerPoints() {
    for (const marker of this.markerPoints) {
      this.scene.remove(marker);
    }
    this.markerPoints = [];
  }
  
  // Dispatch an event when a new drawing asset is created
  dispatchAssetCreated(object) {
    // Dispatch drawing-asset-created for DrawingAssetManager
    const assetEvent = new CustomEvent('drawing-asset-created', {
      detail: {
        id: object.userData.id,
        type: object.userData.type,
        tool: object.userData.tool,
        object: object
      }
    });
    window.dispatchEvent(assetEvent);
    
    // Also dispatch asset-created for MissionSimulation to detect
    // Convert points to a standard format
    const pointsArray = this.currentPoints.map(p => ({ 
      x: p.x, 
      y: p.y, 
      z: p.z 
    }));
    
    const missionEvent = new CustomEvent('asset-created', {
      detail: {
        id: object.userData.id,
        object: object,
        points: pointsArray,
        tool: object.userData.tool,
        type: object.userData.type
      }
    });
    window.dispatchEvent(missionEvent);
    
    console.log('Asset created event dispatched with points:', pointsArray);
  }
  
  // Get all tracked drawing assets
  getDrawingAssets(dimension = 'all') {
    if (dimension === 'all') {
      return [...this.drawingAssets['2d'], ...this.drawingAssets['3d']];
    }
    return this.drawingAssets[dimension] || [];
  }
  
  // Remove a specific drawing asset by ID
  removeDrawingAsset(assetId) {
    // Check 2D assets
    const asset2dIndex = this.drawingAssets['2d'].findIndex(asset => asset.id === assetId);
    if (asset2dIndex >= 0) {
      const asset = this.drawingAssets['2d'][asset2dIndex];
      this.scene.remove(asset.object);
      this.drawingAssets['2d'].splice(asset2dIndex, 1);
      return true;
    }
    
    // Check 3D assets
    const asset3dIndex = this.drawingAssets['3d'].findIndex(asset => asset.id === assetId);
    if (asset3dIndex >= 0) {
      const asset = this.drawingAssets['3d'][asset3dIndex];
      this.scene.remove(asset.object);
      this.drawingAssets['3d'].splice(asset3dIndex, 1);
      return true;
    }
    
    return false;
  }
}

export default ThreeMeshBvhDrawing; 