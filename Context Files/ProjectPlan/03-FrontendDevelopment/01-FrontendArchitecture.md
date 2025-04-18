# Frontend Architecture

## Overview

The OverWatch Mission Control frontend is built as a modern, performance-focused React application that enables sophisticated drone mission planning, visualization, and control. This document outlines the architectural approach, technology decisions, and code organization patterns.

## Technology Stack

| Component | Technology | Version | Purpose | Rationale |
|-----------|------------|---------|---------|----------|
| Core Framework | React | 18.x | UI rendering and component management | Modern features like Concurrent Mode, wide adoption |
| Type Safety | TypeScript | 5.x | Static typing | Improved developer experience, code quality |
| Build Tools | Vite | 4.x | Development and production builds | Fast HMR, ES modules, optimized production builds |
| UI Components | Material UI | 5.x | Component library | Comprehensive component set, customizable themes |
| State Management | Zustand | 4.x | UI state management | Lightweight, hooks-based API with minimal boilerplate |
| API Data | TanStack Query | 4.x | Data fetching, caching | Optimized for server state, background updates |
| 3D Global View | Cesium | 1.x | Geographic visualization | Industry standard for global mapping and GIS |
| 3D Local View | Babylon.js | 0.150.x | 3D scene rendering | Mature 3D library, flexible rendering options |
| Performance | Web Workers | Browser API | Offload 3D rendering | Prevents UI thread blocking, improves stability |
| ROS Communication | roslibjs | 1.3.x | WebSocket ROS client | Official JavaScript client for ROS |

## Directory Structure

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
│   ├── Dashboard.tsx        # Main dashboard view
│   ├── GeoPage.tsx          # Geographic mission planning
│   ├── MissionPage.tsx      # Mission planning and visualization
│   └── TelemetryPage.tsx    # Telemetry visualization
├── services/                # API and service integrations
│   ├── api/                 # REST API clients
│   ├── ros/                 # ROS communication
│   └── workers/             # Web Worker definitions
├── store/                   # Zustand store definitions
│   ├── missionStore.ts      # Mission data store
│   ├── visualizationStore.ts # Visualization state store
│   └── hardwareStore.ts     # Hardware control store
├── types/                   # TypeScript type definitions
├── utils/                   # Utility functions
│   ├── coordinates/         # Coordinate transformation utilities
│   ├── formatting/          # Data formatting utilities
│   └── validation/          # Input validation utilities
├── workers/                 # Web Worker implementations
│   ├── threeJsWorker.ts     # Babylon.js rendering worker
│   ├── terrainWorker.ts     # Terrain processing worker
│   └── dataProcessingWorker.ts # Data processing worker
└── App.tsx                  # Main application component
```

## Core Architecture Principles

### 1. Component-Based Architecture

The application follows a component-based architecture with React, organizing UI elements into reusable, composable components. Components are categorized by their function and domain, with clear separation of concerns.

#### Component Hierarchy Example

```
<App>
  <Layout>
    <Navbar />
    <Sidebar />
    <PageContent>
      <MissionPage>
        <MissionToolbar />
        <Main3DScene />
        <MissionControls />
      </MissionPage>
    </PageContent>
  </Layout>
</App>
```

### 2. Multi-Threaded Rendering Architecture

To ensure smooth UI performance while handling complex 3D rendering, a Web Worker-based architecture is implemented:

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

This approach offloads computationally intensive tasks to separate threads, keeping the main UI thread responsive.

### 3. State Management Approach

The application employs a hybrid state management approach:

1. **Zustand**: For global UI state with minimal boilerplate
   ```typescript
   // Example store
   import create from 'zustand';
   
   interface MissionState {
     missions: Mission[];
     currentMission: Mission | null;
     setCurrentMission: (mission: Mission | null) => void;
     addMission: (mission: Mission) => void;
   }
   
   export const useMissionStore = create<MissionState>((set) => ({
     missions: [],
     currentMission: null,
     setCurrentMission: (mission) => set({ currentMission: mission }),
     addMission: (mission) => set((state) => ({ 
       missions: [...state.missions, mission] 
     })),
   }));
   ```

2. **TanStack Query**: For server state with caching and background updates
   ```typescript
   // Example query
   const { data, isLoading, error } = useQuery({
     queryKey: ['missions', missionId],
     queryFn: () => api.fetchMission(missionId),
     staleTime: 60 * 1000, // 1 minute
   });
   ```

3. **React Context**: For component tree state sharing
   ```typescript
   // Example context provider
   export const MissionContext = createContext<MissionContextType | null>(null);
   
   export const MissionProvider: React.FC = ({ children }) => {
     // State management
     const [state, dispatch] = useReducer(missionReducer, initialState);
     
     return (
       <MissionContext.Provider value={{ state, dispatch }}>
         {children}
       </MissionContext.Provider>
     );
   };
   ```

4. **Local Component State**: For UI-specific component state
   ```typescript
   const [isModalOpen, setIsModalOpen] = useState(false);
   ```

### 4. API and Service Architecture

The frontend communicates with backend services through a structured API layer:

```
┌───────────────────┐     ┌────────────────────┐     ┌─────────────────┐
│                   │     │                    │     │                 │
│  Frontend (React) │◄───►│ Backend (FastAPI)  │◄───►│ ROS/Hardware    │
│                   │     │                    │     │                 │
└───────────────────┘     └────────────────────┘     └─────────────────┘
```

- **REST API**: For standard CRUD operations
- **WebSockets**: For real-time data (telemetry, status updates)
- **ROS Bridge**: For direct communication with ROS topics and services

## Key Design Patterns

### 1. Container/Presentational Pattern

Components are separated into container components (manage state and data flow) and presentational components (display UI based on props).

```typescript
// Container component
const MissionPlannerContainer: React.FC = () => {
  const { data, isLoading } = useMissions();
  const { createMission } = useMissionActions();
  
  return (
    <MissionPlanner
      missions={data || []}
      isLoading={isLoading}
      onCreateMission={createMission}
    />
  );
};

// Presentational component
interface MissionPlannerProps {
  missions: Mission[];
  isLoading: boolean;
  onCreateMission: () => void;
}

const MissionPlanner: React.FC<MissionPlannerProps> = ({ 
  missions, 
  isLoading,
  onCreateMission
}) => {
  // Render UI based on props
};
```

### 2. Custom Hooks Pattern

Business logic is extracted into reusable custom hooks:

```typescript
function useCoordinateTransform() {
  // Transformation logic
  const globalToLocal = (globalCoord) => { /* ... */ };
  const localToGlobal = (localCoord) => { /* ... */ };
  const threeJsToLocal = (threeJsCoord) => { /* ... */ };
  
  return { globalToLocal, localToGlobal, threeJsToLocal };
}
```

### 3. Context + Reducer Pattern

For complex state management:

```typescript
// Reducer function
function missionReducer(state, action) {
  switch (action.type) {
    case 'SET_MISSION':
      return { ...state, currentMission: action.payload };
    case 'ADD_WAYPOINT':
      return { 
        ...state, 
        waypoints: [...state.waypoints, action.payload] 
      };
    // More cases...
    default:
      return state;
  }
}
```

## Performance Considerations

### 1. Code Splitting

Code is split based on routes and large features to reduce initial bundle size:

```typescript
const MissionPage = React.lazy(() => import('./pages/MissionPage'));
const TelemetryPage = React.lazy(() => import('./pages/TelemetryPage'));

// In router
{
  path: '/mission/:id',
  element: (
    <Suspense fallback={<LoadingIndicator />}>
      <MissionPage />
    </Suspense>
  )
}
```

### 2. Web Worker Offloading

Computationally intensive tasks are offloaded to Web Workers:

```typescript
// Main thread
import { wrap } from 'comlink';

const worker = new Worker(new URL('./workers/threeJsWorker.ts', import.meta.url));
const threeJsWorker = wrap<ThreeJsWorkerAPI>(worker);

// Use the worker
await threeJsWorker.initScene(sceneConfig);
await threeJsWorker.updateScene(sceneUpdates);
```

### 3. Memoization

Components and expensive calculations are memoized to prevent unnecessary re-renders:

```typescript
const MemoizedComponent = React.memo(({ prop1, prop2 }) => {
  // Component implementation
});

// For calculations
const expensiveResult = useMemo(() => {
  return expensiveCalculation(dependency1, dependency2);
}, [dependency1, dependency2]);
```

## Deployment Strategy

The frontend build process is optimized for production with environment-specific configurations:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Development │────►│ Staging     │────►│ Production  │
└─────────────┘     └─────────────┘     └─────────────┘
```

Each environment has specific configuration values set through environment variables:

```
# .env.development
VITE_API_URL=http://localhost:3001
VITE_ROS_BRIDGE_URL=ws://localhost:9090
VITE_MOCK_HARDWARE=true

# .env.production
VITE_API_URL=https://api.overwatch.com
VITE_ROS_BRIDGE_URL=wss://rosbridge.overwatch.com
VITE_MOCK_HARDWARE=false
```

## Conclusion

The frontend architecture is designed to balance modern development practices with the unique requirements of a real-time drone control system. By separating concerns, optimizing for performance, and establishing clear patterns, the codebase remains maintainable while delivering a responsive user experience. 