Mission planning in this application is organized around several key components:

1. **Mission Context System**: 
   - Uses React Context for state management
   - Stores missions, waypoints, path segments, hardware configuration, and scene objects
   - Provides actions for creating, updating, and managing missions

2. **Mission Generators**:
   There are three main mission generators available:

   - **ManualGridGenerator**: Allows manual creation of grid/raster pattern missions with the following features:
     - Setting pattern dimensions (width, height)
     - Configuring camera orientation (yaw, pitch)
     - Adjusting overlap percentages
     - Setting altitude and speed
     - Specifying start position offsets
     - Generating preview paths

   - **Mission2DGenerator**: Creates 2D missions based on selected faces/areas with:
     - Altitude configuration
     - Overlap settings
     - AGL (Above Ground Level) reference options
     - Terrain following capabilities
     - Obstacle avoidance
     - Different coverage methods (image-centers, raster-lines)
     - Mission statistics preview (flight time, battery usage, images)

   - **Mission3DGenerator**: (Placeholder) Intended for 3D structure mapping with:
     - Min/max altitude settings
     - Multiple altitude layers
     - Structure distance configuration
     - Note: This generator is not fully implemented yet

3. **Path Types**:
   The system supports various path types defined in `PathType` enum:
   - STRAIGHT
   - BEZIER 
   - ORBIT
   - GRID
   - POLYGON
   - PERIMETER
   - CUSTOM

4. **Mission Planning Flow**:
   1. Select a mission area (using face selection tools)
   2. Configure mission parameters in the appropriate generator
   3. Generate the path segment
   4. The path is added to the current mission
   5. The system calculates statistics and visualizes the path

5. **Path Generation Logic**:
   - Grid patterns are created by calculating waypoints based on dimensions, camera properties, and overlap
   - 2D paths from faces use sophisticated algorithms considering the shape/orientation of the selected face
   - Face-based generators include additional features like obstacle avoidance, terrain following

6. **Extensibility**:
   - Custom generators can be added by creating new components in the Custom directory
   - The system uses a flexible component structure enabling easy addition of new mission types

7. **UI Organization**:
   - Mission generators are presented in accordions for easy access
   - Each generator has specialized UI controls relevant to its capabilities
   - Toggle buttons enable selection of mission areas/faces
   - Mission listing shows existing path segments


