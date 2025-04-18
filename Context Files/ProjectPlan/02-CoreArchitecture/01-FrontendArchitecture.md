# Frontend Architecture

## Overview

The OverWatch Mission Control frontend is built on React 18 with TypeScript, utilizing a modular component-based architecture. This document outlines the architectural approach for the frontend, with special focus on the decoupled Babylon.js rendering using Web Workers.

## Architectural Principles

1. **Separation of Concerns**: Clear separation between UI components, business logic, and data management
2. **Component Composition**: Building complex interfaces from smaller, reusable components
3. **State Isolation**: Keeping state at appropriate levels with clear ownership
4. **Performance First**: Designing for real-time data and complex visualizations
5. **Resilience**: Isolating risky operations (3D rendering) to maintain application stability

## Application Structure

```
src/
├── assets/                  # Static assets (images, fonts, etc.)
├── components/              # Reusable UI components
│   ├── common/              # Common UI elements (buttons, cards, etc.)
│   ├── layout/              # Layout components (header, sidebar, etc.)
│   ├── mission/             # Mission-specific components
│   ├── visualization/       # Visualization components
│   └── hardware/            # Hardware control components
├── contexts/                # React contexts for global state
├── hooks/                   # Custom React hooks
├── pages/                   # Page components (routes)
│   ├── Dashboard/
│   ├── GeoView/
│   ├── MissionPlanning/
│   ├── MissionExecution/
│   └── Settings/
├── services/                # API and service integrations
│   ├── api/                 # REST API clients
│   ├── ros/                 # ROS communication
│   └── workers/             # Web Worker definitions
├── store/                   # Zustand store definitions
├── types/                   # TypeScript type definitions
├── utils/                   # Utility functions
│   ├── coordinates/         # Coordinate transformation utilities
│   ├── geometry/            # Geometry calculations
│   └── formatting/          # Data formatting utilities
├── workers/                 # Web Worker implementations
│   ├── threejs-worker.ts    # Babylon.js rendering worker
│   └── data-processor.ts    # Data processing worker
└── App.tsx                  # Main application component
```

## Component Hierarchy

The component hierarchy follows a logical organization based on features and functionality:

```
App
├── AuthProvider
│   └── AppLayout
│       ├── Header
│       ├── Sidebar
│       └── PageContainer
│           ├── Dashboard
│           ├── GeoView
│           │   ├── CesiumContainer
│           │   └── MissionTools
│           ├── MissionPlanning
│           │   ├── MissionSelector
│           │   ├── PlanningTools
│           │   └── Local3DView (Web Worker)
│           ├── MissionExecution
│           │   ├── ExecutionControls
│           │   ├── Telemetry
│           │   └── Local3DView (Web Worker)
│           └── Settings
```

## State Management

The application uses a hybrid state management approach:

### 1. Zustand for Global UI State

Zustand provides lightweight, hook-based state management for global UI state:

```typescript
// store/missionUIStore.ts
import create from 'zustand';

interface MissionUIState {
  activeTool: 'select' | 'draw' | 'measure' | null;
  selectedMissionId: string | null;
  viewMode: '2d' | '3d';
  setActiveTool: (tool: 'select' | 'draw' | 'measure' | null) => void;
  setSelectedMission: (id: string | null) => void;
  setViewMode: (mode: '2d' | '3d') => void;
}

export const useMissionUIStore = create<MissionUIState>((set) => ({
  activeTool: null,
  selectedMissionId: null,
  viewMode: '3d',
  setActiveTool: (tool) => set({ activeTool: tool }),
  setSelectedMission: (id) => set({ selectedMissionId: id }),
  setViewMode: (mode) => set({ viewMode: mode })
}));
```

### 2. TanStack Query for API Data

TanStack Query manages server state with built-in caching, refetching, and staleness handling:

```typescript
// hooks/useCurrentMission.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMission, updateMission } from '../services/api/missions';

export function useCurrentMission(missionId: string | null) {
  const queryClient = useQueryClient();
  
  const missionQuery = useQuery({
    queryKey: ['mission', missionId],
    queryFn: () => fetchMission(missionId!),
    enabled: !!missionId
  });
  
  const updateMissionMutation = useMutation({
    mutationFn: updateMission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mission', missionId] });
    }
  });
  
  return {
    mission: missionQuery.data,
    isLoading: missionQuery.isLoading,
    error: missionQuery.error,
    updateMission: updateMissionMutation.mutate
  };
}
```

### 3. React Context for Shared Component State

React Context provides state sharing for component trees:

```typescript
// contexts/HardwareContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { HardwareSettings } from '../types/hardware';

interface HardwareContextType {
  settings: HardwareSettings;
  updateGimbalPitch: (pitch: number) => void;
  updateCameraMode: (mode: 'photo' | 'video') => void;
  triggerCapture: () => void;
}

const HardwareContext = createContext<HardwareContextType | undefined>(undefined);

export const HardwareProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [settings, setSettings] = useState<HardwareSettings>({
    gimbalPitch: -45,
    cameraMode: 'photo',
    isRecording: false
  });
  
  const updateGimbalPitch = (pitch: number) => {
    setSettings(prev => ({ ...prev, gimbalPitch: pitch }));
  };
  
  const updateCameraMode = (mode: 'photo' | 'video') => {
    setSettings(prev => ({ ...prev, cameraMode: mode }));
  };
  
  const triggerCapture = () => {
    // Implement camera trigger logic
  };
  
  return (
    <HardwareContext.Provider value={{ 
      settings, 
      updateGimbalPitch, 
      updateCameraMode, 
      triggerCapture 
    }}>
      {children}
    </HardwareContext.Provider>
  );
};

export const useHardware = () => {
  const context = useContext(HardwareContext);
  if (context === undefined) {
    throw new Error('useHardware must be used within a HardwareProvider');
  }
  return context;
};
```

### 4. Local Component State

Individual components maintain their own local state for UI-specific concerns:

```typescript
// components/mission/MissionPropertiesPanel.tsx
import React, { useState } from 'react';

export const MissionPropertiesPanel: React.FC<{mission: Mission}> = ({ mission }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div>
      <button onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? 'Collapse' : 'Expand'} Properties
      </button>
      {isExpanded && (
        <div className="properties-content">
          {/* Properties content */}
        </div>
      )}
    </div>
  );
};
```

## Babylon.js Web Worker Architecture

The 3D visualization is decoupled from the main UI thread using Web Workers, allowing for better performance, stability, and development experience.

### Architecture Overview

```
┌─────────────────────────────┐      ┌─────────────────────────────┐
│   Main Thread               │      │   Worker Thread             │
│                             │      │                             │
│ ┌─────────────────────────┐ │      │ ┌─────────────────────────┐ │
│ │ React UI Components     │ │      │ │ Babylon.js Scene          │ │
│ │                         │ │      │ │                         │ │
│ │ - UI Controls           │ │      │ │ - Scene Management      │ │
│ │ - Camera Controls       │ │◄────►│ │ - Rendering Loop        │ │
│ │ - User Interactions     │ │      │ │ - Geometry Processing   │ │
│ │ - Scene Config Controls │ │      │ │ - Materials & Textures  │ │
│ └─────────────────────────┘ │      │ └─────────────────────────┘ │
│                             │      │                             │
└─────────────────────────────┘      └─────────────────────────────┘
```

### Implementation Details

#### 1. Worker Setup

```typescript
// workers/threejs-worker.ts
import * as THREE from 'three';

// Create scene, camera, renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 10000);
let renderer: THREE.WebGLRenderer | null = null;
let canvas: OffscreenCanvas | null = null;
let animationFrameId: number | null = null;
let sceneObjects: Record<string, THREE.Object3D> = {};

// Handle messages from main thread
self.onmessage = (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'INIT':
      // Initialize renderer with offscreen canvas
      canvas = data.canvas;
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setSize(data.width, data.height);
      camera.aspect = data.width / data.height;
      camera.updateProjectionMatrix();
      
      // Start animation loop
      startAnimationLoop();
      break;
      
    case 'RESIZE':
      if (renderer && camera) {
        renderer.setSize(data.width, data.height);
        camera.aspect = data.width / data.height;
        camera.updateProjectionMatrix();
      }
      break;
      
    case 'ADD_OBJECT':
      addObject(data);
      break;
      
    case 'UPDATE_OBJECT':
      updateObject(data);
      break;
      
    case 'REMOVE_OBJECT':
      removeObject(data.id);
      break;
      
    case 'UPDATE_CAMERA':
      updateCamera(data);
      break;
      
    case 'STOP':
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      break;
  }
};

function startAnimationLoop() {
  const animate = () => {
    animationFrameId = requestAnimationFrame(animate);
    
    // Call any animation update functions
    
    // Render the scene
    if (renderer) {
      renderer.render(scene, camera);
    }
  };
  
  animate();
}

function addObject(data: any) {
  // Create and add objects based on data type
  // This would handle different object types
  let object: THREE.Object3D | null = null;
  
  // Example: Create a mesh for a drone
  if (data.type === 'drone') {
    const geometry = new THREE.BoxGeometry(data.size.x, data.size.y, data.size.z);
    const material = new THREE.MeshPhongMaterial({ color: data.color });
    object = new THREE.Mesh(geometry, material);
  }
  
  if (object) {
    object.position.set(data.position.x, data.position.y, data.position.z);
    object.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
    scene.add(object);
    sceneObjects[data.id] = object;
  }
}

function updateObject(data: any) {
  const object = sceneObjects[data.id];
  if (object) {
    if (data.position) {
      object.position.set(data.position.x, data.position.y, data.position.z);
    }
    if (data.rotation) {
      object.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
    }
    // Handle other property updates
  }
}

function removeObject(id: string) {
  const object = sceneObjects[id];
  if (object) {
    scene.remove(object);
    delete sceneObjects[id];
  }
}

function updateCamera(data: any) {
  if (data.position) {
    camera.position.set(data.position.x, data.position.y, data.position.z);
  }
  if (data.lookAt) {
    camera.lookAt(new THREE.Vector3(data.lookAt.x, data.lookAt.y, data.lookAt.z));
  }
  // Handle other camera property updates
}
```

#### 2. Main Thread Component

```typescript
// components/visualization/Local3DView.tsx
import React, { useRef, useEffect, useState } from 'react';
import { useMissionUIStore } from '../../store/missionUIStore';
import { useCurrentMission } from '../../hooks/useCurrentMission';
import { useRealTimeData } from '../../hooks/useRealTimeData';

export const Local3DView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  
  const { selectedMissionId } = useMissionUIStore();
  const { mission } = useCurrentMission(selectedMissionId);
  const { dronePosition, droneRotation } = useRealTimeData();
  
  // Initialize worker and canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Create worker
    workerRef.current = new Worker(new URL('../../workers/threejs-worker.ts', import.meta.url), {
      type: 'module'
    });
    
    // Transfer canvas control to worker
    const offscreen = canvasRef.current.transferControlToOffscreen();
    
    // Initialize worker with canvas
    workerRef.current.postMessage({
      type: 'INIT',
      data: {
        canvas: offscreen,
        width: canvasRef.current.clientWidth,
        height: canvasRef.current.clientHeight
      }
    }, [offscreen]);
    
    setIsWorkerReady(true);
    
    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'STOP' });
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);
  
  // Handle resize
  useEffect(() => {
    if (!canvasRef.current || !workerRef.current || !isWorkerReady) return;
    
    const handleResize = () => {
      if (!canvasRef.current || !workerRef.current) return;
      
      workerRef.current.postMessage({
        type: 'RESIZE',
        data: {
          width: canvasRef.current.clientWidth,
          height: canvasRef.current.clientHeight
        }
      });
    };
    
    window.addEventListener('resize', handleResize);
    
    // Initial size
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isWorkerReady]);
  
  // Add mission objects to scene when mission changes
  useEffect(() => {
    if (!workerRef.current || !isWorkerReady || !mission) return;
    
    // Clear previous mission objects
    // Add new mission objects
    
    mission.waypoints.forEach(waypoint => {
      workerRef.current?.postMessage({
        type: 'ADD_OBJECT',
        data: {
          id: `waypoint-${waypoint.id}`,
          type: 'waypoint',
          position: {
            x: waypoint.position.x,
            y: waypoint.position.y,
            z: waypoint.position.z
          },
          color: 0x00ff00,
          size: { x: 1, y: 1, z: 1 }
        }
      });
    });
    
    // Add other mission elements (paths, areas, etc.)
    
  }, [mission, isWorkerReady]);
  
  // Update drone position in real-time
  useEffect(() => {
    if (!workerRef.current || !isWorkerReady || !dronePosition) return;
    
    workerRef.current.postMessage({
      type: 'UPDATE_OBJECT',
      data: {
        id: 'drone',
        position: dronePosition,
        rotation: droneRotation
      }
    });
  }, [dronePosition, droneRotation, isWorkerReady]);
  
  // Handle user interactions
  const handleCanvasClick = (e: React.MouseEvent) => {
    // Convert click to scene coordinates
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Send to worker for raycasting
    workerRef.current?.postMessage({
      type: 'RAYCAST',
      data: { x, y }
    });
  };
  
  return (
    <div className="local-3d-view">
      <canvas 
        ref={canvasRef} 
        onClick={handleCanvasClick}
        style={{ width: '100%', height: '100%' }} 
      />
      {/* Overlay UI elements */}
      <div className="controls-overlay">
        {/* Camera controls, view options, etc. */}
      </div>
    </div>
  );
};
```

## ROS Communication

The frontend communicates with the ROS ecosystem through the `roslibjs` library:

```typescript
// services/ros/rosConnection.ts
import ROSLIB from 'roslib';
import { create } from 'zustand';

interface RosState {
  isConnected: boolean;
  ros: ROSLIB.Ros | null;
  connect: (url: string) => Promise<void>;
  disconnect: () => void;
}

export const useRosStore = create<RosState>((set, get) => ({
  isConnected: false,
  ros: null,
  
  connect: async (url: string) => {
    // Disconnect existing connection if any
    if (get().ros) {
      get().disconnect();
    }
    
    const ros = new ROSLIB.Ros({});
    
    try {
      await new Promise<void>((resolve, reject) => {
        ros.on('connection', () => {
          set({ isConnected: true, ros });
          resolve();
        });
        
        ros.on('error', (error) => {
          reject(error);
        });
        
        ros.on('close', () => {
          set({ isConnected: false });
        });
        
        ros.connect(url);
      });
    } catch (error) {
      console.error('ROS connection error:', error);
      throw error;
    }
  },
  
  disconnect: () => {
    const { ros } = get();
    if (ros) {
      ros.close();
      set({ isConnected: false, ros: null });
    }
  }
}));

// Example usage for subscribing to a topic
export function subscribeToDronePose(callback: (pose: any) => void) {
  const { ros, isConnected } = useRosStore.getState();
  
  if (!ros || !isConnected) {
    throw new Error('ROS is not connected');
  }
  
  const topic = new ROSLIB.Topic({
    ros: ros,
    name: '/mavros/local_position/pose',
    messageType: 'geometry_msgs/PoseStamped'
  });
  
  topic.subscribe(callback);
  
  return () => {
    topic.unsubscribe();
  };
}

// Example usage for publishing a command
export function publishDroneCommand(command: any) {
  const { ros, isConnected } = useRosStore.getState();
  
  if (!ros || !isConnected) {
    throw new Error('ROS is not connected');
  }
  
  const topic = new ROSLIB.Topic({
    ros: ros,
    name: '/mavros/command/command',
    messageType: 'mavros_msgs/Command'
  });
  
  const message = new ROSLIB.Message(command);
  topic.publish(message);
}

// Example usage for calling a ROS service
export async function callRosService(serviceName: string, request: any) {
  const { ros, isConnected } = useRosStore.getState();
  
  if (!ros || !isConnected) {
    throw new Error('ROS is not connected');
  }
  
  const service = new ROSLIB.Service({
    ros: ros,
    name: serviceName,
    serviceType: 'std_srvs/Trigger' // Adjust based on service type
  });
  
  return new Promise((resolve, reject) => {
    service.callService(new ROSLIB.ServiceRequest(request), (result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}
```

## Coordinate System Transformations

The application needs to handle multiple coordinate systems:

```typescript
// utils/coordinates/coordinateTransformations.ts
import * as THREE from 'three';

// Convert GPS coordinates to local ENU coordinates
export function gpsToLocal(
  lat: number, 
  lon: number, 
  alt: number, 
  originLat: number, 
  originLon: number, 
  originAlt: number
): { x: number, y: number, z: number } {
  // Implementation of GPS to ENU conversion
  // This would use a geodesy library or implement the math directly
  
  return { x: 0, y: 0, z: 0 }; // Placeholder
}

// Convert local ENU coordinates to Babylon.js coordinates
export function localToThreeJs(local: { x: number, y: number, z: number }): THREE.Vector3 {
  // ENU to Babylon.js coordinate system:
  // ENU: x = East, y = North, z = Up
  // Babylon.js: x = East, y = Up, z = -North
  return new THREE.Vector3(
    local.x,
    local.z,  // Up in ENU becomes Y in Babylon.js
    -local.y  // North in ENU becomes negative Z in Babylon.js
  );
}

// Convert ROS pose to local ENU coordinates
export function rosPoseToLocal(pose: any): { position: any, orientation: any } {
  // Convert ROS pose (geometry_msgs/Pose) to local ENU
  // ROS typically uses either ENU or NED, depending on the system
  
  return {
    position: {
      x: pose.position.x,
      y: pose.position.y,
      z: pose.position.z
    },
    orientation: {
      x: pose.orientation.x,
      y: pose.orientation.y,
      z: pose.orientation.z,
      w: pose.orientation.w
    }
  };
}

// Convert local ENU to ROS pose
export function localToRosPose(local: any): any {
  // Convert local ENU to ROS pose (geometry_msgs/Pose)
  
  return {
    position: {
      x: local.position.x,
      y: local.position.y,
      z: local.position.z
    },
    orientation: {
      x: local.orientation.x,
      y: local.orientation.y,
      z: local.orientation.z,
      w: local.orientation.w
    }
  };
}
```

## Responsive Design

The application uses a responsive design approach to support different screen sizes and devices:

```typescript
// hooks/useResponsive.ts
import { useState, useEffect } from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export function useResponsive() {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  const breakpoint: Breakpoint =
    windowSize.width < 600 ? 'xs' :
    windowSize.width < 960 ? 'sm' :
    windowSize.width < 1280 ? 'md' :
    windowSize.width < 1920 ? 'lg' : 'xl';
  
  const isMobile = breakpoint === 'xs' || breakpoint === 'sm';
  
  return {
    width: windowSize.width,
    height: windowSize.height,
    breakpoint,
    isMobile
  };
}
```

## Performance Optimization

Several optimization techniques are employed to ensure smooth performance:

1. **Code Splitting**: Using dynamic imports for route-based code splitting
2. **Memoization**: Using React.memo, useMemo, and useCallback to prevent unnecessary renders
3. **Web Workers**: Offloading heavy computation and rendering to Web Workers
4. **Virtualization**: Using virtualized lists for large data sets
5. **Efficient Rendering**: Optimizing Babylon.js rendering with proper object disposal

## Testing Strategy

The frontend testing strategy includes:

1. **Unit Tests**: For utility functions, hooks, and isolated components
2. **Component Tests**: For UI components using React Testing Library
3. **Integration Tests**: For connected components and workflows
4. **E2E Tests**: For critical user journeys

## Accessibility

The application follows WCAG 2.1 AA standards for accessibility:

1. **Keyboard Navigation**: All functionality is accessible via keyboard
2. **Screen Reader Support**: Proper ARIA attributes and semantic HTML
3. **Color Contrast**: Meeting minimum contrast ratios
4. **Focus Management**: Clear focus indicators and proper focus trapping

## Conclusion

This frontend architecture is designed to provide a robust, performant, and maintainable foundation for the OverWatch Mission Control application. The decoupled Babylon.js Web Worker approach ensures stability and performance, while the modular component structure and clear state management approach facilitate maintenance and extension. 