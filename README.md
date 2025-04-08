# Overwatch - Advanced Drone Mission Planning Platform

Overwatch is a comprehensive drone mission planning platform built with React and Three.js. The application allows for sophisticated 3D scene creation, hardware selection, and mission planning for drone operations.

## Features

### 3D Scene Builder
- **Create 3D Objects**: Add boxes and other 3D objects with customizable dimensions, colors, and positions
- **Import 3D Models**: Support for GLB, GLTF, and other 3D model formats
- **Interactive Terrain**: Real-time interactive environment that displays GCPs and mission waypoints
- **Interactive Objects**: Edit object properties (position, color, etc.) via double-click. Resize box objects by holding Shift + Double-click and dragging the handles. Drag GCPs by holding Shift + Double-click.
- **Polygon Drawing**: Draw and create polygon areas in the 3D scene
- **Scene Export**: Export your scene as GLB, GLTF, or GeoJSON

### Drone Visualization
- **Detailed Drone Model**: Real-time 3D visualization of drone position and orientation
- **Camera Frustum**: Visual representation of the drone's camera field of view
- **Position Control**: Manual positioning controls for precise placement
- **Flight Simulation**: Simulate flight paths with realistic drone movement

### Mission Planning
- **Waypoint Creation**: Set precise waypoints for flight paths
- **GCP Management**: Add and visualize Ground Control Points
- **Path Segments**: Create and edit flight path segments with different types (linear, Bezier curves)
- **Real-time Feedback**: Immediate visual feedback of all mission elements

### Hardware Selection
- **Camera Configuration**: Select and configure different camera models
- **Lens Options**: Various lens options with focal length and aperture settings
- **Sensor Calculations**: Real-time calculations for field of view, ground resolution, and depth of field
- **Live Preview**: See how hardware changes affect your mission planning

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
cd client
npm install

# Server dependencies (if needed)
cd ../server
npm install
```

3. Start the development server:
```bash
# Start client (optimized fast startup)
cd client
npm run dev

# Or use the full startup if Cesium assets need updating
npm run dev:full
```

### Startup Options

- **Fast Startup (Recommended)**: `npm run dev` - Uses cached Cesium assets for faster startup (10 seconds+)
- **Full Startup**: `npm run dev:full` - Verifies and updates Cesium assets if needed (slower startup)

### Performance Optimizations

Overwatch includes several optimizations to improve startup time and runtime performance:

1. **Lazy Loading & Code Splitting**
   - Components load only when needed
   - ThreeJS and heavy libraries are split into smaller chunks

2. **Three.js Performance Optimizations**
   - Deferred rendering with adaptive frame rates
   - Instanced meshes for repeated objects
   - Geometry batching to reduce draw calls
   - Texture optimization and caching
   - Level of Detail (LOD) management

3. **Build Optimizations**
   - Advanced bundler configuration for optimal loading
   - Conditional asset loading
   - Smart caching of static assets

These optimizations ensure the application performs well on a variety of hardware, from high-end workstations to more modest systems.

## Usage Guide

### Building a 3D Scene
1. Navigate to the "Build Scene" tab in the mission planning workflow
2. Use the "Objects" tab to add boxes or other objects:
   - Enter dimensions (width, height, length)
   - Choose a color
   - Click "Add Object" to place in the scene
3. Objects will appear in the 3D view and can be managed in the list below
4. Import 3D models using the "Import" tab:
   - Supported formats: GLB, GLTF, GeoJSON, KML
   - Upload files via the file selector
5. Export your scene using the "Export" tab if needed

### Positioning the Drone
1. Double-click on the drone model in the 3D view to open positioning controls
2. Use the coordinate inputs to precisely position the drone
3. Enable "Camera Follow" to keep the view centered on the drone
4. Adjust camera settings (focal length, aperture) to see how they affect the field of view

### Interacting with the 3D Scene
- **Edit Object Properties**: Double-click a scene object (e.g., a Box) or a GCP marker in the 3D view to open its edit modal.
- **Resize Box Objects**: Hold **Shift** while double-clicking a box object to activate resize handles. Drag the handles to resize, then press **Escape** to confirm the new dimensions.
- **Move GCPs**: Hold **Shift** while double-clicking a GCP marker to enter drag mode. Move the mouse to the desired location on the ground plane, then press **Escape** to set the new position.

### Creating Flight Paths
1. Switch to the "Flight" tab in the workflow
2. Add waypoints by clicking on the terrain
3. Connect waypoints to create flight paths
4. Adjust waypoint properties as needed
5. Simulate the flight to preview the mission

## Project Structure

- `client/` - React frontend application
  - `src/components/` - React components
  - `src/context/` - Context providers and state management
  - `src/utils/` - Utility functions including sensor calculations
  - `src/pages/` - Main application pages
  - `src/layouts/` - Layout components
- `server/` - Backend server (if applicable)

## Technologies Used

- React.js - Frontend framework
- Three.js - 3D visualization
- React Three Fiber - React bindings for Three.js
- Material UI - UI component library
- TypeScript - Type-safe JavaScript
- Socket.IO - Real-time communication

## License

This project is proprietary and confidential.

## Contact

For questions or support, please contact the repository owner. 