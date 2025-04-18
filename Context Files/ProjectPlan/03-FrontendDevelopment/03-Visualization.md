# 3D Visualization System

## Overview

The OverWatch Mission Control system implements a sophisticated 3D visualization architecture using Babylon.js to render drone operations, mission paths, and environmental data. This document details the technical implementation, focusing on the Web Worker architecture, optimization strategies, and integration with ROS for real-time telemetry visualization.

## Visualization Architecture

The visualization system is built around a multi-threaded architecture that offloads complex rendering and computation tasks to Web Workers, keeping the main UI thread responsive.

### Core Components

```
src/visualization/
├── components/               # React Babylon.js components
│   ├── Scene.tsx             # Main 3D scene container
│   ├── Drone.tsx             # Drone model and animations
│   ├── Terrain.tsx           # Terrain visualization
│   ├── FlightPath.tsx        # Flight path visualization
│   ├── POI.tsx               # Points of interest
│   └── Controls.tsx          # Camera and interaction controls
├── workers/                  # Web Workers implementation
│   ├── SceneWorker.ts        # Main scene computation worker
│   ├── TerrainWorker.ts      # Terrain processing worker
│   ├── PhysicsWorker.ts      # Physics simulation worker
│   └── DataProcessingWorker.ts # Data processing worker
├── hooks/                    # React hooks for Babylon.js (replace with Babylon.js)
│   ├── useThreeScene.ts      # Scene management hook
│   ├── useWorkerCommunication.ts # Worker communication
│   └── useThreeInteraction.ts # Interaction handling
├── utils/                    # Utility functions
│   ├── geometry.ts           # Geometry utilities
│   ├── materials.ts          # Material definitions
│   ├── loaders.ts            # Model and texture loaders
│   └── shaders/              # Custom shader implementations
│       ├── terrain.glsl      # Terrain shader
│       ├── atmosphere.glsl   # Atmospheric effects
│       └── heatmap.glsl      # Heatmap visualization
└── assets/                   # 3D models and textures
    ├── models/               # 3D model files
    └── textures/             # Texture files
```

### Multi-Threaded Architecture

The application employs a Web Worker-based architecture to separate rendering and computation:

```
┌───────────────────────────┐      ┌─────────────────────────┐
│       Main Thread         │      │    Worker Threads       │
│                           │      │                         │
│  - React Components       │◄─────┤  - Scene Computation    │
│  - User Interaction       │      │  - Physics Simulation   │
│  - Rendering Context      │◄─────┤  - Terrain Generation   │
│  - State Management       │      │  - Data Processing      │
└─────────────┬─────────────┘      └───────────┬─────────────┘
              │                                │
              ▼                                ▼
┌───────────────────────────────────────────────────────────┐
│               Comlink Communication Layer                 │
└─────────────────────────┬─────────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────────┐
│                    Data Sources                           │
│                                                           │
│  - ROS WebSocket Feed   - API Data   - Local State        │
└───────────────────────────────────────────────────────────┘
```

## Scene Structure

The Babylon.js scene follows a hierarchical organization:

```
Scene
├── PerspectiveCamera
├── AmbientLight
├── DirectionalLight
├── TerrainGroup
│   ├── TerrainMesh
│   └── WaterMesh
├── DronesGroup
│   ├── Drone1
│   │   ├── DroneModel
│   │   ├── PropellersGroup
│   │   └── CameraViewHelper
│   └── Drone2
│       └── ...
├── FlightPathsGroup
│   ├── Path1
│   └── Path2
├── PointsOfInterestGroup
│   ├── POI1
│   └── POI2
└── UIElementsGroup
    ├── Labels
    └── Indicators
```

## Web Worker Implementation

### Worker Communication

Communication between the main thread and workers is handled using Comlink:

```typescript
// Main thread
import * as Comlink from 'comlink';

// Create and wrap worker
const worker = new Worker(new URL('./workers/SceneWorker.ts', import.meta.url));
const workerApi = Comlink.wrap<SceneWorkerAPI>(worker);

// Call worker methods
await workerApi.processMesh(meshData);
await workerApi.calculateVisibility(cameraPosition);
```

```typescript
// Worker implementation (SceneWorker.ts)
import * as Comlink from 'comlink';
import * as THREE from 'three';

class SceneWorker {
  private scene?: THREE.Scene;
  private offscreenRenderer?: THREE.WebGLRenderer;
  
  initialize(canvasWidth: number, canvasHeight: number, sceneData: SceneInitData) {
    // Initialize offscreen renderer and scene
    this.offscreenRenderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.offscreenRenderer.setSize(canvasWidth, canvasHeight);
    
    // Create scene
    this.scene = new THREE.Scene();
    
    // Set up basic scene elements
    this.setupLights();
    this.setupCamera();
    
    // Process and add initial meshes
    this.processMeshes(sceneData.meshes);
  }
  
  processMesh(meshData: Float32Array) {
    // Heavy computation for mesh processing
    // Create geometry, apply transformations, optimize
    return processedData;
  }
  
  // Additional methods for scene management
}

// Expose the worker API
Comlink.expose(new SceneWorker());
```

### Worker Tasks

Workers handle various computationally intensive tasks:

1. **Mesh Processing**:
   - Terrain generation from elevation data
   - Complex geometry manipulation
   - Mesh optimization and LOD generation

2. **Physics Simulation**:
   - Drone flight physics
   - Environment interactions
   - Collision detection

3. **Data Processing**:
   - Telemetry data transformation
   - Path optimization
   - Visibility calculations

## React Integration

The Babylon.js scene is integrated with React using react-three-fiber:

```tsx
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky } from '@react-three/drei';
import { Suspense, useEffect, useState } from 'react';
import { useWorkerCommunication } from '../hooks/useWorkerCommunication';

const Main3DScene = ({ mission, telemetryData }) => {
  const { workerApi } = useWorkerCommunication();
  const [sceneData, setSceneData] = useState(null);
  
  // Initialize scene data
  useEffect(() => {
    async function initSceneData() {
      const data = await workerApi.processSceneData(mission);
      setSceneData(data);
    }
    
    initSceneData();
  }, [mission, workerApi]);
  
  return (
    <div className="scene-container">
      <Canvas shadows camera={{ position: [0, 100, 200], fov: 60 }}>
        <Suspense fallback={<LoadingIndicator />}>
          <Sky />
          <ambientLight intensity={0.5} />
          <directionalLight 
            position={[50, 100, 50]} 
            intensity={0.8} 
            castShadow 
          />
          
          {sceneData && (
            <>
              <Terrain data={sceneData.terrain} />
              <DroneModel 
                position={telemetryData.position}
                rotation={telemetryData.rotation}
              />
              <FlightPaths paths={mission.paths} />
              <Waypoints waypoints={mission.waypoints} />
            </>
          )}
          
          <OrbitControls />
        </Suspense>
      </Canvas>
    </div>
  );
};
```

## Performance Optimization

### Rendering Optimization

1. **Level of Detail (LOD)**:
   ```typescript
   const createTerrainWithLOD = (heightData, resolution) => {
     const lod = new THREE.LOD();
     
     // High detail (close to camera)
     const highDetailGeo = new THREE.PlaneGeometry(
       size, size, resolution, resolution
     );
     highDetailGeo.applyMatrix4(new THREE.Matrix4()
       .makeRotationX(-Math.PI / 2));
     applyHeightData(highDetailGeo, heightData);
     const highDetailMesh = new THREE.Mesh(
       highDetailGeo, 
       terrainMaterial
     );
     
     // Medium detail
     const medDetailGeo = new THREE.PlaneGeometry(
       size, size, resolution / 2, resolution / 2
     );
     // Apply transformations
     
     // Low detail (far from camera)
     const lowDetailGeo = new THREE.PlaneGeometry(
       size, size, resolution / 4, resolution / 4
     );
     // Apply transformations
     
     // Add LOD levels
     lod.addLevel(highDetailMesh, 0);
     lod.addLevel(medDetailMesh, 500);
     lod.addLevel(lowDetailMesh, 1000);
     
     return lod;
   };
   ```

2. **Geometry Instancing**:
   ```typescript
   const createInstancedMarkers = (positions) => {
     const geometry = new THREE.SphereGeometry(1, 8, 8);
     const material = new THREE.MeshStandardMaterial({ 
       color: 0xff0000 
     });
     
     const instancedMesh = new THREE.InstancedMesh(
       geometry, 
       material, 
       positions.length
     );
     
     const matrix = new THREE.Matrix4();
     positions.forEach((position, i) => {
       matrix.setPosition(position.x, position.y, position.z);
       instancedMesh.setMatrixAt(i, matrix);
     });
     
     return instancedMesh;
   };
   ```

3. **Frustum Culling**:
   ```typescript
   const performFrustumCulling = (objects, camera) => {
     const frustum = new THREE.Frustum();
     const matrix = new THREE.Matrix4()
       .multiplyMatrices(
         camera.projectionMatrix, 
         camera.matrixWorldInverse
       );
     frustum.setFromProjectionMatrix(matrix);
     
     return objects.filter(object => {
       if (!object.geometry.boundingSphere) {
         object.geometry.computeBoundingSphere();
       }
       
       const center = object.geometry.boundingSphere.center
         .clone()
         .applyMatrix4(object.matrixWorld);
       const radius = object.geometry.boundingSphere.radius * 
         Math.max(object.scale.x, object.scale.y, object.scale.z);
         
       return frustum.intersectsSphere(
         new THREE.Sphere(center, radius)
       );
     });
   };
   ```

### Memory Management

1. **Resource Disposal**:
   ```typescript
   const disposeObject = (object) => {
     if (object.geometry) {
       object.geometry.dispose();
     }
     
     if (object.material) {
       if (Array.isArray(object.material)) {
         object.material.forEach(material => disposeMaterial(material));
       } else {
         disposeMaterial(object.material);
       }
     }
     
     if (object.children) {
       object.children.forEach(child => disposeObject(child));
     }
   };
   
   const disposeMaterial = (material) => {
     if (material.map) material.map.dispose();
     if (material.lightMap) material.lightMap.dispose();
     if (material.bumpMap) material.bumpMap.dispose();
     if (material.normalMap) material.normalMap.dispose();
     if (material.specularMap) material.specularMap.dispose();
     if (material.envMap) material.envMap.dispose();
     material.dispose();
   };
   ```

2. **Asset Preloading**:
   ```typescript
   // Asset management with cache
   const assetCache = new Map();
   
   const preloadAssets = async (assetList) => {
     const loader = new THREE.GLTFLoader();
     
     const loadPromises = assetList.map(async (asset) => {
       if (assetCache.has(asset.url)) {
         return;
       }
       
       try {
         const result = await new Promise((resolve, reject) => {
           loader.load(
             asset.url,
             (gltf) => resolve(gltf),
             undefined,
             (error) => reject(error)
           );
         });
         
         assetCache.set(asset.url, result);
       } catch (error) {
         console.error(`Failed to load asset: ${asset.url}`, error);
       }
     });
     
     await Promise.all(loadPromises);
   };
   ```

## ROS Integration

### ROS Bridge WebSocket Communication

The visualization system connects to ROS through the rosbridge_suite:

```typescript
import ROSLIB from 'roslib';

class ROSConnection {
  private ros: ROSLIB.Ros;
  private topics: Map<string, ROSLIB.Topic>;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  
  constructor(url: string) {
    this.ros = new ROSLIB.Ros({ url });
    this.topics = new Map();
    
    this.setupConnectionHandlers();
  }
  
  private setupConnectionHandlers() {
    this.ros.on('connection', () => {
      console.log('Connected to websocket server.');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Resubscribe to topics
      this.resubscribeToTopics();
    });
    
    this.ros.on('error', (error) => {
      console.error('Error connecting to websocket server: ', error);
      this.isConnected = false;
    });
    
    this.ros.on('close', () => {
      console.log('Connection to websocket server closed.');
      this.isConnected = false;
      
      // Attempt to reconnect
      this.attemptReconnect();
    });
  }
  
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached.');
      return;
    }
    
    this.reconnectAttempts++;
    
    // Exponential backoff
    const delay = Math.pow(2, this.reconnectAttempts) * 1000;
    
    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts})...`);
      this.ros.connect(this.ros.url);
    }, delay);
  }
  
  private resubscribeToTopics() {
    this.topics.forEach((topic, topicName) => {
      topic.subscribe((message: any) => {
        // Process message
        this.messageCallbacks.get(topicName)?.(message);
      });
    });
  }
  
  subscribeTopic(
    topicName: string, 
    messageType: string, 
    callback: (message: any) => void
  ) {
    const topic = new ROSLIB.Topic({
      ros: this.ros,
      name: topicName,
      messageType: messageType
    });
    
    this.topics.set(topicName, topic);
    this.messageCallbacks.set(topicName, callback);
    
    if (this.isConnected) {
      topic.subscribe(callback);
    }
    
    return () => {
      topic.unsubscribe();
      this.topics.delete(topicName);
      this.messageCallbacks.delete(topicName);
    };
  }
}
```

### Telemetry Visualization

Real-time telemetry data from ROS is visualized in the 3D scene:

```typescript
function useTelemetryVisualization(rosConnection) {
  const [dronePosition, setDronePosition] = useState({ x: 0, y: 0, z: 0 });
  const [droneRotation, setDroneRotation] = useState({ x: 0, y: 0, z: 0 });
  
  useEffect(() => {
    // Subscribe to position updates
    const unsubscribePosition = rosConnection.subscribeTopic(
      '/drone/telemetry/position',
      'geometry_msgs/PoseStamped',
      (message) => {
        const { position } = message.pose;
        
        // Convert ROS coordinates to Babylon.js coordinates
        const threeJsPosition = convertROSToThreeJS({
          x: position.x,
          y: position.y,
          z: position.z
        });
        
        setDronePosition(threeJsPosition);
      }
    );
    
    // Subscribe to orientation updates
    const unsubscribeOrientation = rosConnection.subscribeTopic(
      '/drone/telemetry/orientation',
      'geometry_msgs/QuaternionStamped',
      (message) => {
        const { orientation } = message;
        
        // Convert ROS quaternion to Babylon.js Euler angles
        const quaternion = new THREE.Quaternion(
          orientation.x,
          orientation.y,
          orientation.z,
          orientation.w
        );
        
        const euler = new THREE.Euler().setFromQuaternion(quaternion);
        
        setDroneRotation({
          x: euler.x,
          y: euler.y,
          z: euler.z
        });
      }
    );
    
    return () => {
      unsubscribePosition();
      unsubscribeOrientation();
    };
  }, [rosConnection]);
  
  return { dronePosition, droneRotation };
}
```

## Coordinate Systems

The visualization system manages multiple coordinate systems:

### Coordinate System Conversion

```typescript
// Global WGS84 (lat/lon) to Local ENU (East-North-Up)
function globalToLocal(globalCoord, originGlobal) {
  // Implementation based on Earth-centered transforms
}

// Local ENU to Babylon.js coordinate system
function localToThreeJS(localCoord) {
  return {
    x: localCoord.x,         // East → x
    y: localCoord.z,         // Up → y
    z: -localCoord.y         // North → -z
  };
}

// ROS coordinate system to Babylon.js
function rosToThreeJS(rosCoord) {
  // ROS typically uses:
  // x: forward (North in ENU)
  // y: left (West in ENU)
  // z: up (Up in ENU)
  
  return {
    x: -rosCoord.y,          // ROS y (left/west) → Babylon.js -x (west)
    y: rosCoord.z,           // ROS z (up) → Babylon.js y (up)
    z: -rosCoord.x           // ROS x (forward/north) → Babylon.js -z (south)
  };
}
```

## Visualization Features

### 1. Terrain Visualization

The system supports high-fidelity terrain rendering:

```typescript
function createTerrain(heightmapData, textureData, size, resolution) {
  // Create geometry
  const geometry = new THREE.PlaneGeometry(
    size, size, resolution, resolution
  );
  
  // Apply rotation to make horizontal
  geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
  
  // Apply height data
  const vertices = geometry.attributes.position.array;
  for (let i = 0; i < vertices.length; i += 3) {
    const x = Math.floor((i / 3) % resolution);
    const y = Math.floor((i / 3) / resolution);
    
    // Get height value from heightmap data
    const heightIndex = (y * resolution + x);
    const height = heightmapData[heightIndex] * heightScale;
    
    // Apply height to vertex
    vertices[i + 2] = height;
  }
  
  // Update normals for lighting
  geometry.computeVertexNormals();
  
  // Create material with textures
  const material = new THREE.MeshStandardMaterial({
    map: textureData.diffuse,
    normalMap: textureData.normal,
    roughnessMap: textureData.roughness,
    displacementMap: textureData.displacement,
    displacementScale: 0,  // Already applied in geometry
    metalness: 0.1,
    roughness: 0.8
  });
  
  // Create mesh
  const terrain = new THREE.Mesh(geometry, material);
  terrain.receiveShadow = true;
  
  return terrain;
}
```

### 2. Flight Path Visualization

Flight paths are rendered with specialized visual treatments:

```typescript
function createFlightPath(waypoints, pathType) {
  const material = new THREE.LineBasicMaterial({ 
    color: 0x00ff00,
    linewidth: 2
  });
  
  let geometry;
  
  if (pathType === 'straight') {
    // Create straight line segments
    geometry = new THREE.BufferGeometry();
    
    // Create points from waypoints
    const points = waypoints.map(wp => 
      new THREE.Vector3(wp.x, wp.y, wp.z)
    );
    
    geometry.setFromPoints(points);
  } 
  else if (pathType === 'curved') {
    // Create smooth curve
    const curve = new THREE.CatmullRomCurve3(
      waypoints.map(wp => new THREE.Vector3(wp.x, wp.y, wp.z))
    );
    
    geometry = new THREE.BufferGeometry().setFromPoints(
      curve.getPoints(50 * waypoints.length)
    );
  }
  
  // Create the line
  const line = new THREE.Line(geometry, material);
  
  // Add waypoint markers
  const waypointMarkers = createWaypointMarkers(waypoints);
  
  // Create group to hold both
  const pathGroup = new THREE.Group();
  pathGroup.add(line);
  pathGroup.add(waypointMarkers);
  
  return pathGroup;
}

function createWaypointMarkers(waypoints) {
  // Create markers for waypoints
  const geometry = new THREE.SphereGeometry(2, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  
  const group = new THREE.Group();
  
  waypoints.forEach(wp => {
    const marker = new THREE.Mesh(geometry, material);
    marker.position.set(wp.x, wp.y, wp.z);
    group.add(marker);
  });
  
  return group;
}
```

### 3. Drone Model and Animation

Drone models are animated with real-time data:

```typescript
const DroneModel = ({ position, rotation, telemetry }) => {
  const { scene, animations } = useGLTF('/models/drone.glb');
  const groupRef = useRef();
  const mixerRef = useRef();
  
  // Set up animation mixer
  useEffect(() => {
    if (scene && animations.length > 0) {
      mixerRef.current = new THREE.AnimationMixer(scene);
      
      // Apply all animations (propellers, etc.)
      animations.forEach(clip => {
        const action = mixerRef.current.clipAction(clip);
        action.play();
      });
    }
    
    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
      }
    };
  }, [scene, animations]);
  
  // Update animation
  useFrame((_, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
  });
  
  // Update position and rotation
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(position);
      groupRef.current.rotation.set(rotation.x, rotation.y, rotation.z);
    }
  }, [position, rotation]);
  
  // Add visual indicators for telemetry data
  const batteryLevel = telemetry?.battery || 100;
  const batteryColor = batteryLevel > 20 ? 0x00ff00 : 0xff0000;
  
  return (
    <group ref={groupRef}>
      <primitive object={scene.clone()} />
      
      {/* Status indicators */}
      <sprite position={[0, 5, 0]}>
        <spriteMaterial
          attach="material"
          map={getBatteryTexture(batteryLevel)}
          color={batteryColor}
        />
      </sprite>
      
      {/* Camera frustum visualization */}
      {telemetry?.cameraActive && (
        <CameraFrustum
          fov={telemetry.cameraFov}
          aspect={telemetry.cameraAspect}
          position={[0, -0.2, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      )}
    </group>
  );
};
```

## Known Issues and Improvement Areas

### Grid Rendering Issues

The current implementation of the Babylon.js viewer experiences consistent grid rendering issues that need to be addressed:

1. **Current Problems**:
   - Grid lines sometimes disappear at certain camera angles
   - Grid scale inconsistency when zooming in/out
   - Grid intersection points show rendering artifacts
   - Grid line thickness varies across different zoom levels

2. **Root Causes**:
   - Babylon.js `GridHelper` implementation has z-fighting with ground plane
   - Improper material settings for grid lines
   - Shader precision issues at distance
   - Improper depth buffer configuration

3. **Solutions**:
   - Replace standard `GridHelper` with custom grid implementation
   - Use high-contrast shader material for grid lines
   - Implement distance-based grid display with LOD (Level of Detail)
   - Add anti-aliasing for grid lines
   - Adjust render order and depth testing for proper visibility

### Circle Rendering Artifacts

The circular elements in the 3D viewer display artifacts that need correction:

1. **Current Problems**:
   - Jagged edges on circles and curved surfaces
   - Circle thickness inconsistency at different zoom levels
   - Clipping issues when circles intersect other geometry
   - Poor performance with multiple circular elements

2. **Root Causes**:
   - Insufficient segment count in circle geometry
   - Improper material settings for curves
   - Missing anti-aliasing configuration
   - Inefficient rendering of curved surfaces

3. **Solutions**:
   - Increase segment count for circular geometries based on radius and camera distance
   - Apply MSAA (Multi-Sample Anti-Aliasing) specifically for curved edges
   - Implement shader-based circular elements where appropriate
   - Use instanced rendering for multiple similar circular elements
   - Add line thickness consistency through camera distance compensation

### WebSocket Integration for Real-time Updates

The current implementation lacks WebSocket connectivity for real-time updates:

1. **Current Limitations**:
   - Static scene with manual refresh required
   - No real-time position updates for dynamic objects
   - Animations must be client-side only
   - No synchronization between multiple clients

2. **Proposed Architecture**:
   - Create dedicated WebSocket service for Babylon.js scene
   - Implement object delta updates to minimize bandwidth
   - Add scene subscription model for specific object types
   - Create shared transform system between server and client
   - Implement optimistic updates with server reconciliation

3. **Expected Benefits**:
   - Real-time visualization of drone position and telemetry
   - Multiple users can see the same scene state
   - Scene changes propagate immediately to all viewers
   - Reduced application state complexity
   - Improved collaborative mission planning

## Implementation Timeline

| Issue | Priority | Estimated Effort | Dependencies |
|-------|----------|------------------|--------------|
| Grid Rendering | High | 3 days | None |
| Circle Artifacts | High | 2 days | None |
| WebSocket Integration | Critical | 5 days | Backend WebSocket Service |

These improvements should be addressed before proceeding with additional visualization features to ensure a stable foundation for the application's core visual components.

## Summary

The 3D visualization system provides a high-performance, real-time view of drone operations and mission data. By leveraging Web Workers, optimized rendering techniques, and efficient data processing, the system delivers a responsive user experience even with complex scenes and real-time data streams from ROS. 