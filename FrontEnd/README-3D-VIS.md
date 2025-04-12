# Overwatch 3D Visualization System

This system provides a comprehensive 3D visualization solution for drone mission planning and execution, using Cesium for global reference and Three.js for local environment visualization.

## Features

### Global View (Cesium)
- Interactive globe for global mission planning
- Region selection for mission areas
- Global waypoint visualization
- Uses Cesium's terrain and imagery providers
- Supports all standard globe controls (pan, zoom, tilt, etc.)

### Local 3D View (Three.js)
- Detailed 3D visualization of the mission area
- Waypoint creation and editing
- Path planning with different path types
- Drone simulation
- Interactive camera controls
- Ground Control Point (GCP) visualization
- Support for importing LiDAR and 3D models

## Technical Implementation

The 3D visualization system is built on:

1. **Cesium** - For global geographical visualization
   - Managed through Resium (React wrapper for Cesium)
   - Handles geographical transformations and terrain
   - Provides satellite imagery

2. **Three.js** - For local 3D environment visualization
   - Used via React Three Fiber and Drei helpers
   - Provides high-performance 3D rendering
   - Handles interactive editing and model visualization

3. **Coordinate Systems** 
   - Global: WGS84 latitude/longitude/altitude
   - Local: East-North-Up (ENU) coordinate system
   - Utilities for transformation between coordinate systems

## Usage

### Mission Planning Workflow

1. Start by selecting a region on the global view
2. Create a mission based on the selected area
3. Switch to local 3D view for detailed mission planning
4. Add waypoints and define paths
5. Import LiDAR or 3D models if available
6. Simulate the mission
7. Export for execution on the drone

### Development

This visualization system uses a custom React context for state management (`MissionContext`), which handles:

- Mission data model
- Waypoint and path management
- Coordinate transformations
- Simulation state

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Set your Cesium ion token (optional):
   Create a `.env.local` file with:
   ```
   VITE_CESIUM_TOKEN=your-cesium-ion-token
   ```

3. Run the application:
   ```
   npm run dev
   ```

4. Or use the test script:
   ```
   ./test-3d-vis.sh
   ```

## Architecture

The visualization system follows a component-based architecture:

- `MissionPlanner` - Main container component
- `CesiumGlobe` - Global view component
- `Local3DViewer` - Local 3D view component
- `MissionContext` - State management
- Utility components for waypoints, paths, and models

## Extending the System

### Adding New Model Types

1. Add the new model type to `MissionModel` interface
2. Create a React component for the new model
3. Add rendering logic to the `MissionScene` component

### Custom Path Types

1. Add the new path type to `PathType` enum
2. Implement curve generation in the `PathLine` component
3. Add UI controls for the new path type 