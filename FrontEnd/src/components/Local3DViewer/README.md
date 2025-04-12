# Local3DViewer Component

This directory contains a modular implementation of the 3D viewer component used for mission visualization. The code has been refactored from a monolithic 2300+ line file into a well-organized structure of smaller, focused components.

## Directory Structure

```
FrontEnd/src/components/Local3DViewer/
├── index.ts                          # Re-exports Local3DViewer
├── Local3DViewer.tsx                 # Main container component
├── MissionScene.tsx                  # Main 3D scene component 
├── README.md                         # This documentation file
│
├── markers/                          # Mission elements visualization
│   ├── WaypointMarker.tsx            # Waypoint visualization
│   ├── PathLine.tsx                  # Path visualization
│   ├── GCPMarker.tsx                 # Ground Control Points marker
│
├── objects/                          # Scene objects
│   ├── SceneObjectRenderer.tsx       # Scene object renderer (factory)
│   ├── BoxObject.tsx                 # Box-specific rendering
│
├── drone/                            # Drone visualization
│   ├── DroneModel.tsx                # Drone model visualization
│   ├── CameraFrustum.tsx             # Camera frustum visualization
│
├── indicators/                       # Visual indicators
│   ├── HighlightFaceIndicator.tsx    # Face highlight indicator
│
├── controls/                         # Scene control elements
│
├── modals/                           # Modal dialogs
│   ├── SceneObjectEditModal.tsx      # Scene object editing modal
│
├── utils/                            # Utility functions
│   ├── threeHelpers.ts               # Three.js utility functions
```

## Key Components

### Local3DViewer.tsx
The main container component that renders the 3D canvas and manages UI state.

### MissionScene.tsx
Handles the 3D scene, including the ground, grid, mission elements, and scene objects.

### Markers
Components for visualizing mission elements like waypoints, paths, and ground control points.

### Objects
Components for rendering scene objects like buildings and areas.

### Drone
Components for visualizing the drone and its camera frustum.

### Utils
Utility functions for conversion between local coordinates and Three.js, as well as 3D math helpers.

## Error Handling

The codebase includes several error handling mechanisms:

1. ErrorBoundary component to handle Three.js rendering errors
2. Fallback placeholders for missing data
3. Error guards in memoized calculations
4. Component null checks to avoid rendering issues

## Performance Optimizations

1. Pixel ratio limiting to improve rendering performance
2. Suspense for asynchronous loading
3. Memoization of frequently-used values
4. Use of useRef for non-reactive references
5. Proper React.FC typing for components
6. Simplified render methods to avoid unnecessary calculations

## Importing Components

### Basic Import

The main component can be imported directly from the package:

```tsx
import Local3DViewer from '../../components/Local3DViewer';
```

### Named Imports

You can also import specific sub-components if needed:

```tsx
import { DroneModel, CameraFrustum } from '../../components/Local3DViewer';
```

### Module Aliasing (Recommended)

For cleaner imports, consider setting up path aliases in your tsconfig.json:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}
```

Then you can import components like this:

```tsx
import Local3DViewer from '@components/Local3DViewer';
import { DroneModel } from '@components/Local3DViewer';
```

## Usage Example

```tsx
import Local3DViewer from '@components/Local3DViewer';

const MyComponent = () => {
  return (
    <div style={{ height: '100vh' }}>
      <Local3DViewer 
        height="100%" 
        liveDronePosition={{ x: 0, y: 0, z: 5 }} 
        liveDroneRotation={{ heading: 45, pitch: 0, roll: 0 }}
      />
    </div>
  );
};
``` 