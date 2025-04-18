# Frontend Performance Optimization

## Overview

Performance is a critical aspect of the OverWatch Mission Control system, particularly for the 3D visualization components and real-time data handling. This document outlines performance optimization strategies and techniques that should be implemented during the frontend development to ensure a responsive and efficient user experience.

## Performance Metrics & Targets

| Metric | Target | Measurement Tool |
|--------|--------|-----------------|
| First Contentful Paint (FCP) | < 1.8s | Lighthouse |
| Time to Interactive (TTI) | < 3.8s | Lighthouse |
| Total Blocking Time (TBT) | < 200ms | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse |
| 3D Scene Rendering | > 30 FPS | Custom FPS Monitor |
| Memory Usage | < 500MB | Chrome Performance Tab |
| Initial Bundle Size | < 250KB (gzipped) | Webpack Bundle Analyzer |
| API Response Time | < 300ms (95th percentile) | Custom Network Monitor |

## Core Optimization Strategies

### 1. Application Architecture

#### Web Worker Architecture

The application uses a multi-threaded architecture to offload heavy computations:

```
┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │
│  Main Thread    │     │  Worker Thread  │
│                 │     │                 │
│  - UI Rendering │     │  - Path         │
│  - User Input   │ ◄─► │    Calculations │
│  - Animation    │     │  - Coordinate   │
│  - State Mgmt   │     │    Transforms   │
│                 │     │  - Data         │
│                 │     │    Processing   │
└─────────────────┘     └─────────────────┘
```

**Implementation Example:**

```typescript
// workerManager.ts
export class WorkerManager {
  private worker: Worker;
  private taskCallbacks: Map<string, (result: any) => void> = new Map();
  
  constructor(workerScript: string) {
    this.worker = new Worker(workerScript);
    
    this.worker.onmessage = (event) => {
      const { taskId, result } = event.data;
      const callback = this.taskCallbacks.get(taskId);
      
      if (callback) {
        callback(result);
        this.taskCallbacks.delete(taskId);
      }
    };
  }
  
  executeTask<T, R>(task: string, data: T): Promise<R> {
    return new Promise((resolve) => {
      const taskId = `task_${Date.now()}_${Math.random()}`;
      
      this.taskCallbacks.set(taskId, resolve);
      
      this.worker.postMessage({
        taskId,
        task,
        data
      });
    });
  }
  
  terminate() {
    this.worker.terminate();
    this.taskCallbacks.clear();
  }
}
```

**Usage Example:**

```typescript
// Component using worker
import { useEffect, useState } from 'react';
import { WorkerManager } from './workerManager';

export function MissionPathCalculator({ waypoints }) {
  const [path, setPath] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);
  
  useEffect(() => {
    const workerManager = new WorkerManager('pathCalculationWorker.js');
    
    setIsCalculating(true);
    workerManager
      .executeTask('calculatePath', { waypoints })
      .then((result) => {
        setPath(result.path);
        setIsCalculating(false);
      });
    
    return () => {
      workerManager.terminate();
    };
  }, [waypoints]);
  
  return (
    <div>
      {isCalculating && <LoadingSpinner />}
      <PathVisualization path={path} />
    </div>
  );
}
```

#### Module Federation

For large features, implement Webpack Module Federation to load modules on demand:

```javascript
// webpack.config.js
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  // ...
  plugins: [
    new ModuleFederationPlugin({
      name: 'main_app',
      filename: 'remoteEntry.js',
      remotes: {
        mission_planner: 'mission_planner@http://localhost:3001/remoteEntry.js',
        telemetry: 'telemetry@http://localhost:3002/remoteEntry.js',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
        'styled-components': { singleton: true },
      },
    }),
  ],
};
```

### 2. Babylon.js Rendering Optimization

#### Level of Detail (LOD)

Implement LOD for complex 3D models:

```typescript
// modelLOD.ts
import * as THREE from 'three';

export function createDroneLODModel() {
  const lod = new THREE.LOD();
  
  // High detail model (when close)
  const highDetailGeometry = new THREE.BoxGeometry(1, 0.25, 1, 8, 2, 8);
  const highDetailMaterial = new THREE.MeshStandardMaterial({ color: 0x2194ce });
  const highDetailMesh = new THREE.Mesh(highDetailGeometry, highDetailMaterial);
  
  // Medium detail model
  const mediumDetailGeometry = new THREE.BoxGeometry(1, 0.25, 1, 4, 1, 4);
  const mediumDetailMesh = new THREE.Mesh(mediumDetailGeometry, highDetailMaterial);
  
  // Low detail model (when far)
  const lowDetailGeometry = new THREE.BoxGeometry(1, 0.25, 1, 2, 1, 2);
  const lowDetailMesh = new THREE.Mesh(lowDetailGeometry, highDetailMaterial);
  
  lod.addLevel(highDetailMesh, 0);    // Used when camera is < 10 units away
  lod.addLevel(mediumDetailMesh, 10); // Used when camera is 10-50 units away
  lod.addLevel(lowDetailMesh, 50);    // Used when camera is > 50 units away
  
  return lod;
}
```

#### Frustum Culling and Object Pooling

Implement frustum culling to only render objects in the camera's view:

```typescript
// objectManager.ts
import * as THREE from 'three';

export class ObjectManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private frustum: THREE.Frustum;
  private objectPool: Map<string, THREE.Object3D[]>;
  private activeObjects: Map<string, THREE.Object3D[]>;
  
  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.frustum = new THREE.Frustum();
    this.objectPool = new Map();
    this.activeObjects = new Map();
  }
  
  updateFrustum() {
    const matrix = new THREE.Matrix4().multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(matrix);
  }
  
  getObject(type: string): THREE.Object3D | null {
    // Get from pool or create new
    const pool = this.objectPool.get(type) || [];
    let object: THREE.Object3D;
    
    if (pool.length > 0) {
      object = pool.pop()!;
    } else {
      // Create new object based on type
      switch (type) {
        case 'waypoint':
          object = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
          );
          break;
        // Add other object types
        default:
          return null;
      }
    }
    
    // Add to active objects
    if (!this.activeObjects.has(type)) {
      this.activeObjects.set(type, []);
    }
    this.activeObjects.get(type)!.push(object);
    
    this.scene.add(object);
    return object;
  }
  
  releaseObject(type: string, object: THREE.Object3D) {
    // Remove from scene and active objects
    this.scene.remove(object);
    
    const active = this.activeObjects.get(type) || [];
    const index = active.indexOf(object);
    if (index !== -1) {
      active.splice(index, 1);
    }
    
    // Add to pool
    if (!this.objectPool.has(type)) {
      this.objectPool.set(type, []);
    }
    this.objectPool.get(type)!.push(object);
  }
  
  updateVisibility(objects: { type: string, object: THREE.Object3D, position: THREE.Vector3 }[]) {
    this.updateFrustum();
    
    for (const { type, object, position } of objects) {
      // Check if in frustum
      const inFrustum = this.frustum.containsPoint(position);
      
      if (inFrustum && !object.visible) {
        object.visible = true;
      } else if (!inFrustum && object.visible) {
        object.visible = false;
      }
    }
  }
}
```

#### Instanced Mesh Rendering

For rendering many identical objects (like trees, buildings), use instanced mesh rendering:

```typescript
// instancedObjects.ts
import * as THREE from 'three';

export function createInstancedMeshes(positions: THREE.Vector3[], model: THREE.BufferGeometry, material: THREE.Material) {
  const instancedMesh = new THREE.InstancedMesh(
    model,
    material,
    positions.length
  );
  
  const matrix = new THREE.Matrix4();
  
  positions.forEach((position, i) => {
    matrix.setPosition(position);
    instancedMesh.setMatrixAt(i, matrix);
  });
  
  instancedMesh.instanceMatrix.needsUpdate = true;
  
  return instancedMesh;
}
```

### 3. React Optimization

#### Memoization and Virtualization

Implement memoization for expensive components and virtualize long lists:

```tsx
// MissionList.tsx
import React, { memo, useMemo } from 'react';
import { FixedSizeList } from 'react-window';

interface MissionItemProps {
  mission: Mission;
  onClick: (id: string) => void;
}

// Memoized component to prevent unnecessary re-renders
const MissionItem = memo(({ mission, onClick }: MissionItemProps) => {
  console.log(`Rendering mission: ${mission.id}`);
  
  return (
    <div 
      className="mission-item" 
      onClick={() => onClick(mission.id)}
    >
      <h3>{mission.name}</h3>
      <p>{mission.description}</p>
      <span>{new Date(mission.createdAt).toLocaleDateString()}</span>
    </div>
  );
});

// Parent component with virtualized list
export function MissionList({ missions, onSelectMission }) {
  // Memoize row renderer to prevent recreating on each render
  const Row = useMemo(() => 
    ({ index, style }) => (
      <div style={style}>
        <MissionItem 
          mission={missions[index]} 
          onClick={onSelectMission}
        />
      </div>
    ),
    [missions, onSelectMission]
  );
  
  return (
    <FixedSizeList
      height={500}
      width="100%"
      itemCount={missions.length}
      itemSize={80}
    >
      {Row}
    </FixedSizeList>
  );
}
```

#### React.lazy and Code Splitting

Implement code splitting for large components:

```tsx
// App.tsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import { LoadingSpinner } from './components/LoadingSpinner';

// Lazy-loaded components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MissionPlanner = lazy(() => import('./pages/MissionPlanner'));
const MissionExecution = lazy(() => import('./pages/MissionExecution'));
const Settings = lazy(() => import('./pages/Settings'));

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Switch>
          <Route exact path="/" component={Dashboard} />
          <Route path="/mission/plan" component={MissionPlanner} />
          <Route path="/mission/execute/:id" component={MissionExecution} />
          <Route path="/settings" component={Settings} />
        </Switch>
      </Suspense>
    </BrowserRouter>
  );
}
```

### 4. State Management Optimization

#### Selective Re-Rendering

Use context selectors or Redux selectors to prevent unnecessary re-renders:

```tsx
// missionContext.tsx
import React, { createContext, useContext, useReducer, useCallback } from 'react';

// State types
interface MissionState {
  missions: Mission[];
  activeMission: Mission | null;
  loading: boolean;
  error: string | null;
}

const MissionContext = createContext<MissionState | undefined>(undefined);
const MissionDispatchContext = createContext<React.Dispatch<any> | undefined>(undefined);

// Provider component
export function MissionProvider({ children }) {
  const [state, dispatch] = useReducer(missionReducer, initialState);
  
  return (
    <MissionContext.Provider value={state}>
      <MissionDispatchContext.Provider value={dispatch}>
        {children}
      </MissionDispatchContext.Provider>
    </MissionContext.Provider>
  );
}

// Custom hooks with selectors for performance
export function useMissions() {
  const state = useContext(MissionContext);
  if (!state) throw new Error('useMissions must be used within MissionProvider');
  
  return state.missions;
}

export function useActiveMission() {
  const state = useContext(MissionContext);
  if (!state) throw new Error('useActiveMission must be used within MissionProvider');
  
  return state.activeMission;
}

export function useMissionLoading() {
  const state = useContext(MissionContext);
  if (!state) throw new Error('useMissionLoading must be used within MissionProvider');
  
  return state.loading;
}

export function useMissionActions() {
  const dispatch = useContext(MissionDispatchContext);
  if (!dispatch) throw new Error('useMissionActions must be used within MissionProvider');
  
  const loadMission = useCallback((id: string) => {
    dispatch({ type: 'LOAD_MISSION', payload: id });
  }, [dispatch]);
  
  const saveMission = useCallback((mission: Mission) => {
    dispatch({ type: 'SAVE_MISSION', payload: mission });
  }, [dispatch]);
  
  return { loadMission, saveMission };
}
```

#### Immutable Update Patterns

Use immutable update patterns for state updates:

```typescript
// missionReducer.ts
import produce from 'immer';

export const missionReducer = produce((draft, action) => {
  switch (action.type) {
    case 'LOAD_MISSIONS_SUCCESS':
      draft.missions = action.payload;
      draft.loading = false;
      draft.error = null;
      break;
      
    case 'LOAD_MISSION_SUCCESS':
      draft.activeMission = action.payload;
      draft.loading = false;
      draft.error = null;
      break;
      
    case 'ADD_WAYPOINT':
      if (draft.activeMission) {
        if (!draft.activeMission.waypoints) {
          draft.activeMission.waypoints = [];
        }
        draft.activeMission.waypoints.push(action.payload);
      }
      break;
      
    case 'UPDATE_WAYPOINT':
      if (draft.activeMission && draft.activeMission.waypoints) {
        const index = draft.activeMission.waypoints.findIndex(
          w => w.id === action.payload.id
        );
        if (index !== -1) {
          draft.activeMission.waypoints[index] = action.payload;
        }
      }
      break;
      
    case 'REQUEST_START':
      draft.loading = true;
      break;
      
    case 'REQUEST_ERROR':
      draft.error = action.payload;
      draft.loading = false;
      break;
  }
});
```

### 5. Network Optimization

#### API Request Batching

Batch API requests to reduce network overhead:

```typescript
// apiBatcher.ts
interface BatchRequest {
  id: string;
  url: string;
  method: string;
  data?: any;
  resolve: (data: any) => void;
  reject: (error: any) => void;
}

export class ApiBatcher {
  private batchQueue: BatchRequest[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private batchInterval = 50; // ms
  
  constructor(private apiBaseUrl: string) {}
  
  request<T>(url: string, method: string, data?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = `${Date.now()}_${Math.random()}`;
      
      this.batchQueue.push({
        id: requestId,
        url,
        method,
        data,
        resolve,
        reject
      });
      
      if (!this.timer) {
        this.timer = setTimeout(() => this.processBatch(), this.batchInterval);
      }
    });
  }
  
  private async processBatch() {
    this.timer = null;
    
    if (this.batchQueue.length === 0) return;
    
    const currentBatch = [...this.batchQueue];
    this.batchQueue = [];
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: currentBatch.map(({ id, url, method, data }) => ({
            id, url, method, data
          }))
        })
      });
      
      if (!response.ok) {
        throw new Error(`Batch request failed: ${response.status}`);
      }
      
      const results = await response.json();
      
      // Process results
      results.forEach(result => {
        const request = currentBatch.find(req => req.id === result.id);
        
        if (request) {
          if (result.error) {
            request.reject(result.error);
          } else {
            request.resolve(result.data);
          }
        }
      });
    } catch (error) {
      // If batch request fails, reject all individual requests
      currentBatch.forEach(request => {
        request.reject(error);
      });
    }
  }
}
```

#### GraphQL for Efficient Data Fetching

Implement GraphQL for fetching only needed data:

```typescript
// graphqlClient.ts
export const graphqlClient = {
  async query<T>(query: string, variables?: Record<string, any>): Promise<T> {
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        variables
      })
    });
    
    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }
    
    return result.data;
  }
};

// Example Usage:
async function fetchMissionDetails(id: string) {
  const data = await graphqlClient.query(`
    query GetMission($id: ID!) {
      mission(id: $id) {
        id
        name
        description
        waypoints {
          id
          position {
            x
            y
            z
          }
          actions {
            type
            parameters
          }
        }
      }
    }
  `, { id });
  
  return data.mission;
}
```

#### Persistent WebSocket Connection

Implement a robust WebSocket connection for real-time data:

```typescript
// webSocketManager.ts
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectInterval = 1000; // Initial reconnect delay (ms)
  private maxReconnectInterval = 30000; // Max reconnect delay (ms)
  private topics = new Map<string, Set<(data: any) => void>>();
  
  constructor(private url: string) {}
  
  connect() {
    if (this.ws) {
      this.ws.close();
    }
    
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectInterval = 1000; // Reset reconnect delay
      
      // Resubscribe to topics
      if (this.topics.size > 0) {
        this.ws?.send(JSON.stringify({
          type: 'subscribe',
          topics: Array.from(this.topics.keys())
        }));
      }
    };
    
    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.topic && this.topics.has(message.topic)) {
          const handlers = this.topics.get(message.topic);
          handlers?.forEach(handler => handler(message.data));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      this.scheduleReconnect();
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.ws?.close();
    };
  }
  
  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
      // Exponential backoff
      this.reconnectInterval = Math.min(
        this.reconnectInterval * 1.5, 
        this.maxReconnectInterval
      );
    }, this.reconnectInterval);
  }
  
  subscribe<T>(topic: string, handler: (data: T) => void): () => void {
    if (!this.topics.has(topic)) {
      this.topics.set(topic, new Set());
      
      // Subscribe to topic if connected
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'subscribe',
          topics: [topic]
        }));
      }
    }
    
    this.topics.get(topic)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.topics.get(topic);
      
      if (handlers) {
        handlers.delete(handler);
        
        if (handlers.size === 0) {
          this.topics.delete(topic);
          
          // Unsubscribe from topic if connected
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
              type: 'unsubscribe',
              topics: [topic]
            }));
          }
        }
      }
    };
  }
  
  publish(topic: string, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'publish',
        topic,
        data
      }));
    } else {
      console.error('Cannot publish: WebSocket not connected');
    }
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.topics.clear();
  }
}
```

### 6. Asset Optimization

#### Image Optimization Pipeline

```javascript
// webpack.config.js - Image optimization
module.exports = {
  // ...
  module: {
    rules: [
      {
        test: /\.(png|jpg|jpeg|gif)$/i,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[hash].[ext]',
              outputPath: 'images',
            },
          },
          {
            loader: 'image-webpack-loader',
            options: {
              mozjpeg: {
                progressive: true,
                quality: 80,
              },
              optipng: {
                enabled: true,
              },
              pngquant: {
                quality: [0.65, 0.90],
                speed: 4,
              },
              gifsicle: {
                interlaced: false,
              },
              webp: {
                quality: 75,
              },
            },
          },
        ],
      },
    ],
  },
};
```

#### 3D Model Optimization with DRACO Compression

```typescript
// modelLoader.ts
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

export class OptimizedModelLoader {
  private gltfLoader: GLTFLoader;
  private loadingModels = new Map<string, Promise<THREE.Object3D>>();
  
  constructor(dracoDecoderPath: string = '/assets/draco/') {
    // Set up DRACO decoder
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(dracoDecoderPath);
    
    // Initialize GLTF loader with DRACO support
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(dracoLoader);
  }
  
  loadModel(url: string): Promise<THREE.Object3D> {
    // Check if already loading this model
    if (this.loadingModels.has(url)) {
      return this.loadingModels.get(url)!;
    }
    
    // Load the model
    const modelPromise = new Promise<THREE.Object3D>((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          // Success
          resolve(gltf.scene);
          this.loadingModels.delete(url);
        },
        (progress) => {
          // Progress
          console.log(`Loading model ${url}: ${Math.round(progress.loaded / progress.total * 100)}%`);
        },
        (error) => {
          // Error
          reject(error);
          this.loadingModels.delete(url);
        }
      );
    });
    
    this.loadingModels.set(url, modelPromise);
    return modelPromise;
  }
}
```

### 7. Performance Monitoring

#### Custom Performance Monitor Component

```tsx
// PerformanceMonitor.tsx
import React, { useEffect, useState } from 'react';

interface PerformanceMetrics {
  fps: number;
  memory: number; // MB
  renderTime: number; // ms
  jsHeapSize: number; // MB
  domNodes: number;
  threeJsObjects: number;
}

export function PerformanceMonitor({ scene }: { scene?: THREE.Scene }) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memory: 0,
    renderTime: 0,
    jsHeapSize: 0,
    domNodes: 0,
    threeJsObjects: 0
  });
  
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animFrameId: number;
    
    // Toggle visibility with ~ key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '`') {
        setIsVisible(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    const measure = () => {
      const now = performance.now();
      const renderTime = now - lastTime;
      frameCount++;
      
      // Update once per second
      if (now - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastTime));
        
        // Get memory usage if available
        const memory = (window.performance as any)?.memory?.usedJSHeapSize / (1024 * 1024) || 0;
        
        // Count DOM nodes
        const domNodes = document.querySelectorAll('*').length;
        
        // Count Babylon.js objects if scene is available
        const threeJsObjects = scene ? countThreeJsObjects(scene) : 0;
        
        setMetrics({
          fps,
          memory,
          renderTime: renderTime,
          jsHeapSize: memory,
          domNodes,
          threeJsObjects
        });
        
        frameCount = 0;
        lastTime = now;
      }
      
      animFrameId = requestAnimationFrame(measure);
    };
    
    // Start measuring
    measure();
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animFrameId);
    };
  }, [scene]);
  
  if (!isVisible || process.env.NODE_ENV === 'production') {
    return null;
  }
  
  return (
    <div className="performance-monitor">
      <div className="metrics-container">
        <div className="metric">
          <span className="label">FPS:</span>
          <span className={`value ${metrics.fps < 30 ? 'warning' : ''}`}>
            {metrics.fps}
          </span>
        </div>
        <div className="metric">
          <span className="label">Memory:</span>
          <span className={`value ${metrics.memory > 500 ? 'warning' : ''}`}>
            {metrics.memory.toFixed(1)} MB
          </span>
        </div>
        <div className="metric">
          <span className="label">Render:</span>
          <span className={`value ${metrics.renderTime > 16 ? 'warning' : ''}`}>
            {metrics.renderTime.toFixed(1)} ms
          </span>
        </div>
        <div className="metric">
          <span className="label">DOM:</span>
          <span className="value">{metrics.domNodes}</span>
        </div>
        <div className="metric">
          <span className="label">3D Objects:</span>
          <span className="value">{metrics.threeJsObjects}</span>
        </div>
      </div>
    </div>
  );
}

// Helper to count all objects in a Babylon.js scene
function countThreeJsObjects(scene: THREE.Scene): number {
  let count = 0;
  
  scene.traverse(() => {
    count++;
  });
  
  return count;
}
```

## Performance Checklist

### Initial Loading
- [ ] Use code splitting with React.lazy
- [ ] Optimize bundle size with tree shaking and proper imports
- [ ] Use preload for critical resources
- [ ] Implement lazy loading for images and non-critical resources
- [ ] Prioritize loading of critical CSS

### Rendering
- [ ] Implement virtualization for long lists
- [ ] Memoize expensive component renders
- [ ] Optimize Babylon.js scene with LOD and frustum culling
- [ ] Use Web Workers for complex calculations
- [ ] Monitor and optimize component re-render frequency

### State Management
- [ ] Use selective subscriptions to state
- [ ] Implement immutable update patterns
- [ ] Minimize state updates during animations
- [ ] Split contexts for better render isolation
- [ ] Use local state for UI-only concerns

### Network
- [ ] Implement request batching
- [ ] Use GraphQL for efficient data fetching
- [ ] Implement robust websocket reconnection
- [ ] Cache API responses appropriately
- [ ] Use compression for API payloads

### Assets
- [ ] Optimize and compress images
- [ ] Use DRACO compression for 3D models
- [ ] Implement dynamic asset loading based on device capabilities
- [ ] Use SVG for icons where appropriate
- [ ] Implement proper resource hints (preload, prefetch)

## Conclusion

Performance optimization is an ongoing process that should be integrated into the development workflow. By implementing the strategies outlined in this document, the OverWatch Mission Control frontend will deliver a responsive and efficient user experience, even when handling complex 3D visualizations and real-time data streams.

Regular performance monitoring and testing should be conducted to identify and address bottlenecks, ensuring the application maintains its performance targets as new features are added and the system evolves. 