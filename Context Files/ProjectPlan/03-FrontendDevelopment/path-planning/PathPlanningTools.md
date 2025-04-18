# Path Planning Tools in OverWatch

This document explains the algorithms and approaches used in OverWatch's mission planning tools. The system offers three primary path planning generators, each designed for different use cases and scenarios.

## Manual Grid Generator

The Manual Grid Generator creates a systematic raster scan pattern over a selected face or area. This tool is ideal for comprehensive coverage of rectangular or reasonably flat areas.

### How It Works

1. **Face Selection**: User selects a flat surface (typically a roof or other elevated platform, Face of a cube or polygon)
2. **Parameter Configuration**:
   - **Altitude Above Ground Level (AGL)**: Height above the selected surface
   - **Coverage Overlap**: Percentage of overlap between adjacent scan lines
   - **Lowest Point of Face**: Reference point for altitude calculations
   - **Coverage Method**: Algorithm used to determine scan pattern
     - Image Centers (Optimized Photogrammetry): Optimizes for image centers
     - Continuous Nadir: Maintains downward-facing camera throughout the flight

3. **Path Generation Process**:
   - The system calculates the bounds of the selected face
   - Determines optimal flight lines based on camera parameters (FOV, sensor size)
   - Applies the specified overlap percentage
   - Generates evenly spaced waypoints along parallel lines
   - Connects the lines into a continuous path using a "lawn mower" pattern

4. **Path Optimization**:
   - Minimizes the number of turns
   - Accounts for drone turning radius
   - Creates efficient entry and exit points

### Technical Implementation

The Manual Grid Generator calculates the optimal spacing between flight lines based on the camera's field of view and the specified overlap. It uses the drone's camera parameters to ensure proper ground sampling distance (GSD) at the specified altitude.

```
Line Spacing = (Camera Width × Flight Height × (1 - Overlap)) ÷ Focal Length
```

The pattern typically follows a back-and-forth approach to minimize unnecessary travel distance between scan lines.

## 2D Mission Generator

The 2D Mission Generator creates paths based on a 2D area selected on a horizontal plane. This tool is ideal for surveying large areas with varying elevation or creating custom flight patterns.

### How It Works

1. **Area Selection**: User selects a 2D area on the ground or projected onto a surface
2. **Parameter Configuration**:
   - **Altitude AGL**: Height above ground for the entire mission
   - **Coverage Overlap**: Percentage of overlap between adjacent scan lines
   - **Coverage Method**: Algorithm for coverage (similar to Manual Grid)
   - **Custom Path Width**: Option to specify width between flight lines

3. **Path Generation Process**:
   - System projects the selected 2D area onto the ground plane
   - Calculates optimal flight lines based on the area shape and camera parameters
   - For non-rectangular areas, the algorithm adapts the pattern to efficiently cover irregular shapes
   - Creates waypoints that follow terrain contours while maintaining consistent AGL

4. **Adaptive Features**:
   - Handles irregular shapes by adapting the grid pattern
   - Optimizes for area coverage efficiency
   - Can incorporate terrain-following logic to maintain consistent height above terrain

### Technical Implementation

The 2D Mission Generator uses computational geometry to handle irregular polygons. It performs polygon decomposition for complex shapes and determines the optimal direction for flight lines based on the principal axis of the shape.

For irregular polygons, the system calculates a minimum area bounding rectangle and then generates paths within this rectangle, later trimming paths that extend outside the actual area of interest.

## 3D Mission Generator

The 3D Mission Generator creates paths that follow the contours of 3D structures or terrain. This tool is ideal for inspecting buildings, infrastructure, or complex structures.

### How It Works

1. **Face Selection**: User selects specific faces on 3D models
2. **Parameter Configuration**:
   - **Standoff Distance**: Distance to maintain from the selected surface
   - **Flight Pattern**: Pattern of movement across the face (vertical, horizontal, spiral)
   - **Face Coverage**: Percentage of face to cover with the inspection path
   - **Path Density**: Density of inspection points/waypoints

3. **Path Generation Process**:
   - System analyzes the geometry of the selected face
   - Calculates face normal vectors to determine optimal camera orientation
   - Creates waypoints at the specified standoff distance from the face
   - Generates a path that maximizes visibility of the face while minimizing flight time

4. **Advanced Features**:
   - Calculates optimal gimbal angles at each waypoint
   - Handles complex geometries with angle constraints
   - Ensures proper camera coverage based on lens parameters
   - Creates smooth transitions between faces

### Technical Implementation

The 3D Mission Generator uses computational geometry and ray casting to determine optimal inspection points. For each selected face:

1. The system calculates the face's normal vector
2. Positions waypoints at the standoff distance along the normal
3. Adjusts gimbal angles to point perpendicular to the face
4. Optimizes the sequence of waypoints to minimize travel distance

For complex structures, the generator employs path optimization algorithms to minimize the total flight time while ensuring complete coverage.

## Common Features Across Generators

All path planning tools share several common features:

- **Takeoff and Landing**: Each mission includes a designated takeoff/landing point
- **Safety Parameters**: Minimum altitude, obstacle avoidance, and geofence constraints
- **Camera Parameters**: Integration with camera specifications for optimal image capture
- **Simulation**: Pre-flight simulation capabilities to verify mission parameters
- **Export Formats**: Ability to export to various formats for different flight controllers

## Best Practices

- **Manual Grid**: Best for flat rooftops or consistent-elevation areas
- **2D Mission**: Ideal for large areas with varied terrain
- **3D Mission**: Best for building inspections and structural surveys

Each generator is designed to optimize the balance between image quality, flight efficiency, and mission safety based on the specific use case and target environment. 