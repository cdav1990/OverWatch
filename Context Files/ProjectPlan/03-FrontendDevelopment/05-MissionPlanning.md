# Mission Planning System

## Overview

The OverWatch Mission Control system provides sophisticated mission planning capabilities for drone operations. This document details the mission planning workflow, available mission generators, and path planning algorithms used in the application.

## Mission Planning Workflow

The mission planning process follows a structured workflow:

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│                │     │                │     │                │     │                │
│ Geographic     │────►│ Mission        │────►│ Path           │────►│ Simulation &   │
│ Area Selection │     │ Creation       │     │ Generation     │     │ Validation     │
│                │     │                │     │                │     │                │
└────────────────┘     └────────────────┘     └────────────────┘     └────────────────┘
```

### 1. Geographic Area Selection (GeoPage)

This initial phase allows users to select a geographic area for mission planning:

**Available Selection Methods**:
- **Draw Box**: Create a rectangular area
- **Set Point**: Select a precise point on the map
- **Draw Area**: Create a custom polygon area

**Selection Process for Point Method**:
1. Navigate to the GeoPage
2. Click the "Set Point" button
3. Click a location on the map
4. A dialog appears showing the coordinates and allowing mission naming
5. Click "Create Mission & Plan" to proceed

**Behind the Scenes**:
- The selected geographic coordinates (latitude/longitude) are captured
- These coordinates become the mission's central reference point
- The point serves as the local origin (0,0,0) in the local coordinate system

### 2. Mission Creation and Setup

When a mission is created from the GeoPage:

1. A new mission is created with a unique ID
2. The selected point or area is stored as the mission's `localOrigin`
3. Geographic coordinates are converted to local coordinates for 3D visualization
4. Takeoff point is initialized:
   - For point selection: at the selected point location
   - For area selection: at the center or a designated corner of the area
5. Ground Control Points (GCPs) are initialized:
   - GCP-A: Positioned at the takeoff point
   - GCP-B: Positioned east of GCP-A along the x-axis
   - GCP-C: Positioned north of GCP-A along the y-axis

### 3. Detailed Mission Planning (MissionPage)

After creation, the user is taken to the Mission Planning page where:

1. The 3D view loads with the drone positioned at the takeoff location
2. GCPs are visible in their initialized positions
3. The user can perform detailed mission planning activities:
   - Adjust the takeoff point if needed
   - Move GCPs by holding Shift + Double-clicking
   - Select an appropriate mission generator
   - Configure mission parameters
   - Generate and refine flight paths
   - Set camera actions and mission parameters

### 4. Simulation and Validation

Before finalizing:

1. Run mission simulation to visualize drone movements
2. Verify flight paths and camera coverage
3. Check mission parameters and validate against constraints
4. Make adjustments as needed

## Mission Context System

The mission planning system is built around a central state management architecture:

1. **Mission Context**:
   - Uses React Context for global state management
   - Manages missions, waypoints, path segments, and scene objects
   - Provides actions for creating, updating, and deleting mission elements

2. **State Structure**:
   ```typescript
   interface MissionState {
     missions: Mission[];
     currentMission: Mission | null;
     waypoints: Waypoint[];
     pathSegments: PathSegment[];
     selectedObjects: SelectedObject[];
     localOrigin: LatLng | null;
     // Other state properties
   }
   ```

3. **Actions**:
   - `SET_SELECTED_POINT`: Set a selected point on the map
   - `CREATE_MISSION`: Create a new mission
   - `ADD_WAYPOINT`: Add a waypoint to the mission
   - `ADD_PATH_SEGMENT`: Add a path segment to the mission
   - `UPDATE_MISSION`: Update mission properties
   - And many more for comprehensive mission management

## Path Planning Tools

OverWatch features three primary mission generators, each designed for different use cases:

### 1. Manual Grid Generator

The Manual Grid Generator creates systematic raster scan patterns over a selected area or face.

**Key Features**:
- Setting pattern dimensions (width, height)
- Configuring camera orientation (yaw, pitch)
- Adjusting overlap percentages
- Setting altitude and speed
- Specifying start position offsets

**How It Works**:
1. User selects a flat surface (typically a roof or elevated platform)
2. User configures parameters:
   - Altitude Above Ground Level (AGL)
   - Coverage Overlap (%)
   - Coverage Method (Image Centers or Continuous Nadir)
3. System calculates optimal flight lines based on:
   - Selected area bounds
   - Camera parameters (FOV, sensor size)
   - Specified overlap
4. Flight lines are generated in a "lawn mower" pattern
5. Path is optimized to minimize turns and create efficient entry/exit points

**Technical Implementation**:
```typescript
// Calculating optimal line spacing
const lineSpacing = (cameraWidth * flightHeight * (1 - overlap)) / focalLength;

// Generate waypoints in a grid pattern
function generateGridWaypoints(bounds, lineSpacing, altitude) {
  const waypoints = [];
  const width = bounds.max.x - bounds.min.x;
  const length = bounds.max.y - bounds.min.y;
  
  // Calculate number of lines
  const numLines = Math.ceil(width / lineSpacing) + 1;
  
  // Generate back-and-forth pattern
  for (let i = 0; i < numLines; i++) {
    const x = bounds.min.x + i * lineSpacing;
    
    // Alternate direction for each line
    if (i % 2 === 0) {
      waypoints.push({ x, y: bounds.min.y, z: altitude });
      waypoints.push({ x, y: bounds.max.y, z: altitude });
    } else {
      waypoints.push({ x, y: bounds.max.y, z: altitude });
      waypoints.push({ x, y: bounds.min.y, z: altitude });
    }
  }
  
  return waypoints;
}
```

**Best Used For**:
- Comprehensive coverage of flat surfaces
- Photogrammetry data collection
- Systematic inspection patterns

### 2. 2D Mission Generator

The 2D Mission Generator creates paths based on a 2D area projected onto a surface.

**Key Features**:
- Altitude configuration with ground reference options
- Overlap settings for image capture
- Terrain following capabilities
- Obstacle avoidance parameters
- Different coverage methods (image-centers, raster-lines)
- Mission statistics preview (flight time, battery usage, images)

**How It Works**:
1. User selects a 2D area on the ground or projected onto a surface
2. User configures parameters:
   - Altitude AGL
   - Coverage overlap
   - Coverage method
3. System processes the area:
   - Projects the selected area onto the ground plane
   - Calculates optimal flight lines based on area shape
   - For irregular shapes, adapts the pattern for efficient coverage
   - Creates waypoints that can follow terrain while maintaining consistent AGL

**Technical Implementation**:
```typescript
// For irregular polygons
function generatePathForIrregularPolygon(polygon, lineSpacing, altitude) {
  // Find the minimum area bounding rectangle
  const boundingRect = findMinAreaBoundingRectangle(polygon);
  
  // Determine optimal direction for flight lines
  const mainAxis = getPrincipalAxis(boundingRect);
  
  // Generate lines within the bounding rectangle
  const allLines = generateParallelLines(boundingRect, mainAxis, lineSpacing);
  
  // Clip lines to only include segments within the polygon
  const clippedLines = clipLinesToPolygon(allLines, polygon);
  
  // Convert lines to waypoints with altitude
  const waypoints = convertLinesToWaypoints(clippedLines, altitude);
  
  // Optimize the path order
  return optimizePathOrder(waypoints);
}
```

**Best Used For**:
- Large area surveys
- Terrain following operations
- Irregular shape coverage
- Comprehensive ground surveys

### 3. 3D Mission Generator

The 3D Mission Generator creates paths that follow the contours of 3D structures.

**Key Features**:
- Standoff distance configuration
- Multi-faceted structure inspection
- Face selection tools
- Custom flight pattern options (vertical, horizontal, spiral)
- Adjustable density and coverage settings

**How It Works**:
1. User selects specific faces on 3D models
2. User configures parameters:
   - Standoff Distance: Distance to maintain from the selected surface
   - Flight Pattern: Movement pattern across the face
   - Coverage Density: Spacing between inspection points
3. System processes the 3D geometry:
   - Analyzes the geometry of selected faces
   - Calculates face normal vectors for optimal camera positioning
   - Creates waypoints at specified standoff distances
   - Generates paths that maximize coverage while minimizing flight time

**Technical Implementation**:
```typescript
function generate3DInspectionPath(faces, standoffDistance, coverageDensity) {
  const waypoints = [];
  
  // Process each selected face
  faces.forEach(face => {
    // Calculate face normal vector
    const normalVector = calculateFaceNormal(face);
    
    // Generate inspection points based on face geometry
    const facePoints = generateFaceInspectionPoints(
      face, 
      normalVector, 
      standoffDistance, 
      coverageDensity
    );
    
    // Add to waypoint collection
    waypoints.push(...facePoints);
  });
  
  // Optimize path to minimize travel distance
  return optimizePath(waypoints);
}

function generateFaceInspectionPoints(face, normal, standoff, density) {
  // Create a grid of points on the face
  const faceGrid = createFaceGrid(face, density);
  
  // Position points at standoff distance along face normal
  return faceGrid.map(point => ({
    x: point.x + normal.x * standoff,
    y: point.y + normal.y * standoff,
    z: point.z + normal.z * standoff,
    // Include camera orientation (pointing at face)
    camera: {
      lookAt: { x: point.x, y: point.y, z: point.z },
      // Additional camera parameters
    }
  }));
}
```

**Best Used For**:
- Building and structure inspection
- Complex 3D surface coverage
- Detailed facade examination
- Infrastructure inspection

## Path Types and Generation Logic

The system supports various path types defined in a `PathType` enum:

```typescript
enum PathType {
  STRAIGHT,    // Direct line between points
  BEZIER,      // Curved path using bezier curves
  ORBIT,       // Circular path around a point of interest
  GRID,        // Systematic grid/raster pattern
  POLYGON,     // Path following a polygon perimeter
  PERIMETER,   // Path around the perimeter of an area
  CUSTOM       // User-defined custom path
}
```

### Path Generation Logic

Different path types use specialized generation algorithms:

1. **Grid Paths**:
   - Calculate spacing based on camera FOV and overlap requirements
   - Optimize for complete coverage with minimal turns
   - Account for drone turning radius and constraints

2. **Orbit Paths**:
   - Center point selection
   - Radius and altitude configuration
   - Camera gimbal control to maintain target focus

3. **Polygon/Perimeter Paths**:
   - Edge detection and simplification
   - Offset calculation for standoff distance
   - Corner handling with smooth transitions

4. **Bezier Paths**:
   - Control point calculation for smooth curves
   - Curvature optimization for drone flight dynamics
   - Waypoint density adjustment based on curve complexity

## Mission Planning UI Components

The mission planning interface provides specialized UI components:

### Generator Controls

Each mission generator has dedicated UI controls with appropriate parameter inputs:

```
┌─────────────────────────────────────────────┐
│ Manual Grid Generator                       │
├─────────────────────────────────────────────┤
│ Altitude: [       ] m                       │
│ Speed:    [       ] m/s                     │
│ Overlap:  [       ] %                       │
│                                             │
│ Horizontal:                                 │
│ Vertical:                                   │
│                                             │
│ [Preview Grid]    [Generate Path]           │
└─────────────────────────────────────────────┘
```

### Mission Parameters

Beyond path generation, comprehensive mission parameters can be configured:

```
┌─────────────────────────────────────────────┐
│ Mission Parameters                          │
├─────────────────────────────────────────────┤
│ Start Action:  [Takeoff]                    │
│ End Action:    [Return to Home]             │
│                                             │
│ Camera Mode:   [Photo]  [Video]             │
│ Trigger:       [Every Waypoint]             │
│                                             │
│ Failsafe:      [Return to Home]             │
│ Battery Limit: [20] %                       │
└─────────────────────────────────────────────┘
```

### Mission Statistics

Real-time mission statistics provide feedback during planning:

```
┌─────────────────────────────────────────────┐
│ Mission Statistics                          │
├─────────────────────────────────────────────┤
│ Distance:     2.4 km                        │
│ Duration:     14 min                        │
│ Waypoints:    87                            │
│ Images:       152                           │
│ Battery:      45%                           │
└─────────────────────────────────────────────┘
```

## Camera Control Integration

Mission planning includes camera control configuration:

### PX4 Camera Integration

The system integrates with standard PX4 camera controls:

1. **Gimbal Pitch Control**:
   ```typescript
   // MAV_CMD_DO_MOUNT_CONTROL
   const gimbalCommand = {
     type: 'COMMAND_LONG',
     command: 'MAV_CMD_DO_MOUNT_CONTROL',
     param1: pitch,   // Pitch in degrees (-90 to 0 typically)
     param2: 0,       // Roll (not changing)
     param3: 0,       // Yaw (not changing)
     param7: 2,       // MAV_MOUNT_MODE_MAVLINK_TARGETING
     target_system: 1,
     target_component: 1
   };
   ```

2. **Camera Mode Setting**:
   ```typescript
   // MAV_CMD_SET_CAMERA_MODE
   const setCameraModeCommand = {
     type: 'COMMAND_LONG',
     command: 'MAV_CMD_SET_CAMERA_MODE',
     param1: 0,                      // Reserved
     param2: mode === 'photo' ? 0 : 1, // 0=photo mode, 1=video mode
     target_system: 1,
     target_component: 1
   };
   ```

3. **Trigger Photo Capture**:
   ```typescript
   // MAV_CMD_DO_DIGICAM_CONTROL
   const triggerPhotoCommand = {
     type: 'COMMAND_LONG',
     command: 'MAV_CMD_DO_DIGICAM_CONTROL',
     param1: 0,  // Reserved
     param2: 0,  // Reserved
     param3: 0,  // Reserved
     param4: 0,  // Reserved
     param5: 1,  // 1 to trigger camera
     param6: 0,  // Reserved
     param7: 0,  // Reserved
     target_system: 1,
     target_component: 1
   };
   ```

### Camera Actions in Mission Planning

Camera actions can be integrated into the mission plan:

1. **Point-Based Actions**:
   - Capture photo at specific waypoints
   - Change camera settings at designated points

2. **Path-Based Actions**:
   - Trigger camera at regular intervals (time or distance)
   - Maintain specific gimbal orientation during segments
   - Automatically adjust gimbal based on terrain

3. **Area-Based Actions**:
   - Configure optimal image overlap for photogrammetry
   - Calculate image footprints for complete coverage
   - Automate camera angles for structure documentation

## Best Practices for Mission Planning

1. **Site Preparation**:
   - Select a clear, observable takeoff point
   - Mark Ground Control Points for reference
   - Document coordinates of key reference points

2. **Mission Structure**:
   - Plan missions with battery constraints in mind
   - Include safety margins for altitude and distance
   - Design efficient paths that minimize travel time

3. **Camera Settings**:
   - Configure appropriate overlap for intended use
   - Balance image quality with storage/processing requirements
   - Test camera trigger reliability in various conditions

4. **Advanced Planning**:
   - Use terrain data for accurate ground following
   - Account for obstacles in the flight path
   - Plan for changing light conditions if mission is lengthy

## Troubleshooting

### Common Issues

| Issue | Possible Causes | Solutions |
|-------|----------------|-----------|
| Missing takeoff point | Improper initialization | Reselect point in GeoPage or set manually |
| Path generation fails | Invalid area/parameters | Check area selection, adjust parameters |
| Camera trigger issues | Incorrect configuration | Verify camera commands, test manually |
| Path too complex | Too many waypoints | Reduce path density, simplify areas |
| Path efficiency | Suboptimal generation | Try different generator, adjust parameters |

## Conclusion

The mission planning system in OverWatch Mission Control provides sophisticated tools for creating efficient, accurate, and purpose-specific drone flight plans. By following the structured workflow and leveraging the specialized mission generators, operators can create optimized paths for various inspection and survey applications while ensuring safety and data quality. 