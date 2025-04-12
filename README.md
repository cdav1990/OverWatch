# Overwatch - Advanced Drone Mission Planning, Simulation, & Ground Control Platform

Overwatch is a comprehensive, enterprise-grade platform for drone operations, built with React, Three.js, and Cesium. It provides sophisticated tools for 3D mission planning, realistic simulation, and real-time ground control.

## Core Capabilities

### 1. 3D Mission Planning
- **Geographic Context**: Plan missions directly on a high-fidelity Cesium globe (`GeoPage`) or in a localized 3D environment.
- **Takeoff-Centric Workflow**: Utilize precisely surveyed drone takeoff locations as the intuitive origin (0,0,0) for field operations, simplifying navigation and communication ([Takeoff Origin Guide](FrontEnd/docs/takeoff-origin-guide.md)).
- **Coordinate Systems**: Robust handling of multiple coordinate systems (Global WGS84, Local ENU, Three.js Scene) with clear transformation logic ([Coordinate Systems Guide](FrontEnd/docs/coordinate-systems.md)).
- **Precise Initialization**: Start missions by setting a specific geographic point, automatically initializing takeoff and Ground Control Point (GCP) locations ([Mission Planning Workflow](FrontEnd/docs/MissionPlanningWorkflow.md), [User Guide](FrontEnd/docs/UserGuide-MissionPlanning.md)).
- **Waypoint & Path Creation**: Define complex flight paths with various segment types.
- **GCP Management**: Add, visualize, and interactively adjust Ground Control Points.
- **3D Scene Builder**:
    - Add geometric shapes (boxes, etc.) with customizable properties.
    - Import diverse 3D model formats (GLB, GLTF) and geospatial data (GeoJSON, KML).
    - Draw and define polygon areas within the 3D scene.
    - Export scenes for external use.
- **Hardware Configuration**:
    - Select and configure camera and lens models.
    - Real-time calculation and visualization of sensor parameters (FOV, GSD, DOF).

### 2. Mission Simulation
- **Realistic Flight Dynamics**: Simulate planned flight paths with accurate drone movement.
- **Sensor Preview**: Visualize the drone's camera frustum and sensor footprint during simulation.
- **Environment Interaction**: Preview how the drone interacts with the terrain and imported 3D models.
- **Pre-flight Validation**: Verify mission coverage, obstacle clearance, and timing before actual deployment.

### 3. Ground Control (Integration Ready)
- **Real-time Drone Visualization**: Display live drone position and orientation within the 3D environment.
- **Telemetry Monitoring**: Designed for integration with telemetry data streams (e.g., via ROS).
- **ROS Integration**: Includes guidance for connecting to ROS-enabled drones, handling coordinate frame transformations (including NED), and managing sensor data ([ROS Coordinates Guide](FrontEnd/docs/ros-coordinates.md)).
- **Command Interface (Planned)**: Architecture supports sending commands (e.g., waypoints, RTL) to the drone during live operations.

## Key Features
- **Interactive 3D Environment**: Leverages Three.js and React Three Fiber for a dynamic and responsive user experience.
- **High-Fidelity Globe**: Utilizes Cesium for accurate global terrain and imagery display.
- **Performance Optimizations**: Employs lazy loading, code splitting, GPU detection, and a dynamic Level of Detail (LOD) system for smooth performance across various hardware.
- **Interactive Objects**: Edit object properties (position, color, size) via intuitive interactions (double-click, Shift+double-click drag).

## Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/GeckoRobotics/OverWatch.git
cd Overwatch
```

2. Install dependencies:
```bash
# Client dependencies
cd FrontEnd
npm install

# Server dependencies (if needed)
cd ../server
npm install
```

3. Start the development server:
```bash
# Start client (optimized fast startup)
cd FrontEnd
npm run dev

# Or use the full startup if Cesium assets need updating
npm run dev:full
```

### Startup Options

- **Fast Startup (Recommended)**: `npm run dev` - Uses cached Cesium assets for faster startup (10 seconds+).
- **Full Startup**: `npm run dev:full` - Verifies and updates Cesium assets if needed (slower startup).

## Usage Guide

Refer to the specific user guides and technical documentation for detailed workflows:

- **Initial Mission Setup**: [User Guide - Mission Planning](FrontEnd/docs/UserGuide-MissionPlanning.md)
- **Technical Workflow**: [Mission Planning Workflow](FrontEnd/docs/MissionPlanningWorkflow.md)
- **Using Takeoff Points**: [Takeoff-Centric Coordinate System Guide](FrontEnd/docs/takeoff-origin-guide.md)

### Building a 3D Scene
1. Navigate to the "Build Scene" tab.
2. Use the "Objects" tab to add primitives or the "Import" tab for models/data.
3. Interact with objects in the 3D view (double-click to edit, Shift+double-click to resize/move GCPs).

### Positioning the Drone
1. Double-click the drone model to open positioning controls.
2. Precisely position the drone using coordinates.
3. Configure camera/sensor settings.

### Creating Flight Paths
1. Switch to the "Flight" tab.
2. Add and connect waypoints on the terrain or 3D objects.
3. Configure waypoint properties and path segments.

### Simulating the Mission
1. Click the "Simulate" button.
2. Observe the drone's flight path and sensor coverage.
3. Adjust the plan as needed.

## Project Structure

- `FrontEnd/` - React frontend application
  - `src/` - Source code
  - `docs/` - Technical documentation and user guides
- `BackEnd/` - Backend server

## Technologies Used

- React.js, TypeScript
- Three.js, React Three Fiber, Drei
- CesiumJS
- Material UI
- Zustand (or relevant state management)
- Vite (or relevant bundler)
- Socket.IO (for real-time communication)
- ROS (via rosbridge_suite for integration)

## Documentation Deep Dive

For more detailed information, explore the documentation directory (`FrontEnd/docs/`):

- [Coordinate Systems Guide](FrontEnd/docs/coordinate-systems.md)
- [Mission Planning Workflow](FrontEnd/docs/MissionPlanningWorkflow.md)
- [ROS Coordinate Systems and Integration](FrontEnd/docs/ros-coordinates.md)
- [Takeoff-Centric Coordinate System Guide](FrontEnd/docs/takeoff-origin-guide.md)
- [User Guide - Mission Planning](FrontEnd/docs/UserGuide-MissionPlanning.md)
- *Coming Soon: Ground Control Workflow*
- *Coming Soon: Simulation Workflow*

## License

This project is proprietary and confidential.

## Contact

For questions or support, please contact the repository owner.

# Level of Detail (LOD) System

The application now includes a dynamic Level of Detail (LOD) system that significantly improves performance when rendering complex 3D scenes. This system automatically adjusts the detail level of 3D models based on their distance from the camera and the capabilities of the user's GPU.

## Key Features

- **Automatic GPU Detection**: Automatically detects the user's GPU capabilities and adjusts detail levels accordingly.
- **Dynamic Performance Monitoring**: Monitors frame rates in real-time and adjusts LOD thresholds to maintain smooth performance.
- **Three Detail Levels**: Supports HIGH, MEDIUM, and LOW detail levels for each model.
- **Material Optimization**: Automatically simplifies materials for distant objects.
- **Geometry Simplification**: Reduces geometry complexity for models far from the camera.
- **Shadow Optimization**: Only renders shadows for high-detail models.

## Usage

To use the LOD system with your 3D models:

```jsx
import { ModelWithLOD, ModelQuality } from './components/Local3DViewer';

// Example usage
const MyComponent = () => {
  const shipModel = {
    id: 'cargo-ship',
    name: 'Cargo Ship',
    resourcePaths: {
      [ModelQuality.HIGH]: '/models/ships/cargo_ship_high.glb',
      [ModelQuality.MEDIUM]: '/models/ships/cargo_ship_medium.glb',
      [ModelQuality.LOW]: '/models/ships/cargo_ship_low.glb',
    },
    distanceThresholds: [0, 150, 500]
  };

  return (
    <ModelWithLOD 
      resource={shipModel} 
      position={[0, 0, 0]} 
      rotation={[0, 0, 0]} 
    />
  );
};
```

## Creating LOD Models

For best performance, prepare three versions of each 3D model:

1. **HIGH**: Full detail model with all textures and complex materials
2. **MEDIUM**: Reduced polygon count (50-70% of original) with simplified textures
3. **LOW**: Minimal polygon count (10-30% of original) with basic materials

## Performance Impact

The LOD system can improve frame rates by 200-300% in scenes with multiple complex 3D models.

## Documentation

For more detailed information about specific workflows and features, please refer to these documentation files:

- [Mission Planning Workflow](FrontEnd/docs/MissionPlanningWorkflow.md) - Technical overview of the mission planning workflow
- [Mission Planning User Guide](FrontEnd/docs/UserGuide-MissionPlanning.md) - Step-by-step guide for users

These guides provide detailed information about how to use the geographic point selection feature to create missions with properly positioned drones and GCPs.

# Simulation Workflow Guide

## Overview

This document details the simulation workflow within the Overwatch platform. Simulation allows users to preview and validate drone missions in the 3D environment before actual flight, ensuring safety, efficiency, and desired outcomes.

## Purpose of Simulation

- **Validate Flight Paths**: Ensure waypoints and paths are correctly defined and achievable.
- **Check Sensor Coverage**: Preview the area captured by the drone\'s sensors (e.g., camera) along the path.
- **Identify Obstacle Conflicts**: Detect potential collisions with terrain or imported 3D models.
- **Estimate Mission Time**: Get an approximation of the flight duration.
- **Review Camera Angles**: Check camera orientation and field of view at key points.
- **Train Operators**: Familiarize users with mission execution in a safe environment.

## Initiating a Simulation

1.  **Complete Mission Plan**: Ensure you have defined:
    *   A takeoff point.
    *   At least one flight path with waypoints.
    *   Configured drone hardware (camera, sensors).
    *   Imported any relevant 3D models or terrain data.
2.  **Navigate to Simulation Controls**: Locate the simulation controls, typically within the main mission planning interface or a dedicated \"Simulate\" tab/panel.
3.  **Click \"Simulate\"**: Press the primary simulation button (e.g., \"Simulate Mission\", \"Run Simulation\").

## Simulation Process

1.  **Initialization**: The drone model is placed at the defined takeoff point (local 0,0,0 if using the takeoff-centric system).
2.  **Path Execution**: The drone model begins moving along the first defined flight path, following the waypoints in sequence.
    *   Movement speed may be based on configured drone parameters or a default simulation speed.
    *   Altitude changes and turns are executed according to the path definition.
3.  **Sensor Visualization**: The drone\'s camera frustum (or other sensor footprints) is visualized in real-time, showing the ground coverage.
4.  **Environment Interaction**: The simulation renders the drone\'s movement relative to the 3D terrain and any imported models.
5.  **Completion**: The simulation concludes when the drone reaches the end of the last defined flight path, or potentially executes a simulated landing or return-to-launch (RTL) maneuver if configured.

## Simulation Controls

During the simulation, users typically have access to controls such as:

- **Play/Pause**: Start, temporarily stop, and resume the simulation.
- **Stop/Reset**: End the simulation and return the drone to the takeoff position.
- **Speed Control**: Adjust the playback speed (e.g., 1x, 2x, 0.5x) for faster review or slower analysis.
- **Timeline Scrubber**: (Optional) Drag a slider to jump to specific points in the mission timeline.
- **Camera Views**: Switch between different camera perspectives:
    *   **Follow Cam**: Camera tracks the drone\'s movement.
    *   **Pilot View**: See the scene from the drone\'s perspective (simulated FPV).
    *   **Free Camera**: Manually navigate the scene while the simulation runs.

## Reviewing Simulation Results

After or during the simulation, focus on:

- **Path Accuracy**: Does the drone follow the intended path smoothly?
- **Altitude Profile**: Are altitude changes correct and safe relative to terrain/obstacles?
- **Sensor Coverage**: Is the target area adequately covered by the sensor footprint?
- **Obstacle Clearance**: Does the drone maintain safe distances from all obstacles?
- **Camera Views**: Are the camera angles appropriate for the mission objectives (e.g., inspection, mapping)?
- **Timing**: Does the estimated duration fit operational constraints?

## Refining the Mission Plan

Based on simulation results, return to the mission planning steps (\"Build Scene\", \"Flight\" tabs) to:

- Adjust waypoint positions or altitudes.
- Modify flight path segments or speeds.
- Reconfigure sensor settings (e.g., gimbal angle, camera parameters).
- Add or remove waypoints.
- Change the takeoff location.

Re-run the simulation after making adjustments until the desired outcome is achieved.

## Technical Considerations

- **Simulation Fidelity**: The simulation uses simplified physics for performance. It\'s a representation, not a perfect physics replication (unless integrated with a high-fidelity physics engine).
- **Performance**: Complex scenes or very long flight paths might impact simulation smoothness. The LOD system helps mitigate this.
- **Data Source**: Simulation relies on the accuracy of the input data (terrain models, obstacle models, drone parameters).

## Best Practices

- **Simulate Frequently**: Run simulations after significant changes to the mission plan.
- **Check Edge Cases**: Pay attention to takeoff, landing, sharp turns, and flight near obstacles.
- **Use Realistic Parameters**: Configure drone speed and camera settings close to real-world values.
- **Involve Stakeholders**: Use simulation recordings or live views to communicate the plan to the team or clients. 