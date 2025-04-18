# Coordinate System Architecture

## Overview

The OverWatch Mission Control system uses multiple coordinate systems to represent positions in different contexts. This document explains these coordinate systems, their purposes, and the transformations between them. Understanding these coordinate systems is essential for accurate positioning in both geographic planning and 3D visualization.

## Coordinate Systems Used

The application uses three primary coordinate systems, plus an additional system for ROS integration:

```
┌───────────────────────┐     ┌───────────────────────┐     ┌───────────────────────┐
│                       │     │                       │     │                       │
│  Global WGS84         │────►│  Local ENU            │────►│  Babylon.js Scene       │
│  (Lat/Lon/Alt)        │     │  (East/North/Up)      │     │  (X/Y/Z)              │
│                       │     │                       │     │                       │
└───────────────────────┘     └───────────────────────┘     └───────────────────────┘
                               ▲
                               │
                               ▼
                        ┌───────────────────────┐
                        │                       │
                        │  ROS Coordinate       │
                        │  Systems              │
                        │                       │
                        └───────────────────────┘
```

### 1. Global WGS84 (Latitude/Longitude/Altitude)

**Purpose**: Used for geographic positioning on Earth's surface.

**Properties**:
- Coordinates: Latitude, Longitude, Altitude
- Units: Decimal degrees for latitude/longitude, meters for altitude
- Reference frame: World Geodetic System 1984 (WGS84)
- Used by: GPS devices, Cesium globe, geographic mapping services

**Example**:
```
{
  latitude: 37.7749,
  longitude: -122.4194,
  altitude: 120  // meters above sea level
}
```

### 2. Local ENU (East-North-Up)

**Purpose**: Provides a locally flat coordinate system for mission planning, where positioning is relative to a chosen origin point.

**Properties**:
- Coordinates: x (East), y (North), z (Up)
- Units: Meters
- Origin: A selected reference point (typically mission takeoff point)
- Reference frame: Tangent plane to the Earth at the origin point
- Used by: Mission planning, flight path calculations, local measurements

**Example**:
```
{
  x: 150,  // 150 meters east of reference point
  y: 75,   // 75 meters north of reference point
  z: 30    // 30 meters above reference point
}
```

### 3. Babylon.js Scene Coordinates

**Purpose**: Used for 3D visualization in the Babylon.js scene, following Babylon.js conventions.

**Properties**:
- Coordinates: x, y, z
- Units: Meters
- Origin: Same as Local ENU origin
- Axes:
  - x: East direction (same as ENU x)
  - y: Up direction (mapped from ENU z)
  - z: Negative North direction (mapped from negative ENU y)
- Used by: 3D visualization components, animation, user interaction

**Example**:
```
{
  x: 150,   // 150 meters east (same as ENU x)
  y: 30,    // 30 meters up (from ENU z)
  z: -75    // 75 meters south (negative of ENU y)
}
```

### 4. ROS Coordinate Systems

ROS uses multiple coordinate conventions that need to be integrated with our system:

**a. Standard ROS Frame (REP 103)**:
- x: Forward
- y: Left
- z: Up
- Reference: Right-handed coordinate system

**b. ROS Aircraft Frame (NED - North-East-Down)**:
- x: North/Forward
- y: East/Right
- z: Down
- Reference: Right-handed coordinate system
- Common usage: Drones, aerial vehicles, especially those using PX4 or ArduPilot

## Coordinate System Transformations

### Global WGS84 ↔ Local ENU

When selecting an area of interest in the Cesium globe, we establish a local origin point. This point becomes (0,0,0) in the local ENU coordinate system.

**Implementation**:

```typescript
// Global WGS84 → Local ENU
function globalToLocal(
  point: { latitude: number, longitude: number, altitude: number }, 
  origin: { latitude: number, longitude: number, altitude: number }
): { x: number, y: number, z: number } {
  // Create transform matrix using the origin
  const transformMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
    Cesium.Cartesian3.fromDegrees(
      origin.longitude, 
      origin.latitude, 
      origin.altitude
    )
  );
  
  // Convert the target point to Earth-centered, Earth-fixed coordinates
  const pointCartesian = Cesium.Cartesian3.fromDegrees(
    point.longitude,
    point.latitude,
    point.altitude
  );
  
  // Calculate the inverse transform to convert ECEF to local ENU
  const inverseTransform = Cesium.Matrix4.inverse(
    transformMatrix, 
    new Cesium.Matrix4()
  );
  
  // Apply the transform to get local ENU coordinates
  const localCartesian = Cesium.Matrix4.multiplyByPoint(
    inverseTransform,
    pointCartesian,
    new Cesium.Cartesian3()
  );
  
  return {
    x: localCartesian.x,  // East
    y: localCartesian.y,  // North
    z: localCartesian.z   // Up
  };
}

// Local ENU → Global WGS84
function localToGlobal(
  localPoint: { x: number, y: number, z: number },
  origin: { latitude: number, longitude: number, altitude: number }
): { latitude: number, longitude: number, altitude: number } {
  // Create transform matrix using the origin
  const transformMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
    Cesium.Cartesian3.fromDegrees(
      origin.longitude, 
      origin.latitude, 
      origin.altitude
    )
  );
  
  // Create a Cartesian from local coordinates
  const localCartesian = new Cesium.Cartesian3(
    localPoint.x,
    localPoint.y,
    localPoint.z
  );
  
  // Apply the transform to get ECEF coordinates
  const pointCartesian = Cesium.Matrix4.multiplyByPoint(
    transformMatrix,
    localCartesian,
    new Cesium.Cartesian3()
  );
  
  // Convert ECEF to latitude, longitude, height
  const cartographic = Cesium.Cartographic.fromCartesian(pointCartesian);
  
  return {
    latitude: Cesium.Math.toDegrees(cartographic.latitude),
    longitude: Cesium.Math.toDegrees(cartographic.longitude),
    altitude: cartographic.height
  };
}
```

### Local ENU ↔ Babylon.js Scene

To maintain compatibility with Babylon.js conventions (where Y is typically the up axis), we perform another transformation when rendering in the 3D scene:

**Implementation**:

```typescript
// Local ENU → Babylon.js
function localToThreeJS(enuCoord: { x: number, y: number, z: number }): THREE.Vector3 {
  return new THREE.Vector3(
    enuCoord.x,    // East → x (same)
    enuCoord.z,    // Up → y
    -enuCoord.y    // North → -z
  );
}

// Babylon.js → Local ENU
function threeJSToLocal(threeCoord: THREE.Vector3): { x: number, y: number, z: number } {
  return {
    x: threeCoord.x,    // x → East (same)
    y: -threeCoord.z,   // -z → North
    z: threeCoord.y     // y → Up
  };
}
```

### Local ENU ↔ ROS Coordinate Systems

Depending on which ROS coordinate convention is used, different transformations are required:

**For Standard ROS Frame (REP 103)**:

```typescript
// ROS Standard → Local ENU (assuming drone facing North)
function rosStandardToENU(rosCoord: { x: number, y: number, z: number }): { x: number, y: number, z: number } {
  return {
    x: -rosCoord.y,  // ROS y (left) → ENU x (east) with negation for right vs. left
    y: rosCoord.x,   // ROS x (forward) → ENU y (north)
    z: rosCoord.z    // ROS z (up) → ENU z (up)
  };
}

// Local ENU → ROS Standard (assuming drone facing North)
function enuToRosStandard(enuCoord: { x: number, y: number, z: number }): { x: number, y: number, z: number } {
  return {
    x: enuCoord.y,   // ENU y (north) → ROS x (forward)
    y: -enuCoord.x,  // ENU x (east) → ROS y (left) with negation
    z: enuCoord.z    // ENU z (up) → ROS z (up)
  };
}
```

**For ROS Aircraft Frame (NED)**:

```typescript
// ROS NED → Local ENU
function nedToENU(nedCoord: { x: number, y: number, z: number }): { x: number, y: number, z: number } {
  return {
    x: nedCoord.y,    // NED y (east) → ENU x (east)
    y: nedCoord.x,    // NED x (north) → ENU y (north)
    z: -nedCoord.z    // NED z (down) → ENU z (up) with negation
  };
}

// Local ENU → ROS NED
function enuToNED(enuCoord: { x: number, y: number, z: number }): { x: number, y: number, z: number } {
  return {
    x: enuCoord.y,    // ENU y (north) → NED x (north)
    y: enuCoord.x,    // ENU x (east) → NED y (east)
    z: -enuCoord.z    // ENU z (up) → NED z (down) with negation
  };
}
```

## Takeoff-Centric Coordinate System

For field operations, we often use a "takeoff-centric" approach, where the drone's takeoff location is defined as the (0,0,0) origin point of the local coordinate system.

### Benefits:

1. **Intuitive Field Navigation**
   - Directions become relative to a known physical point
   - Eliminates confusion with abstract coordinate values
   - Reduces cognitive load during complex operations

2. **Consistent Reference Framework**
   - Everyone refers to the same physical point (the takeoff location)
   - Simplifies cross-team communication
   - Provides consistency across multiple missions in the same area

### Implementation:

```typescript
// When creating a new mission:
function initializeTakeoffCentricSystem(takeoffGlobalCoordinates) {
  // Store the global coordinates of the takeoff point
  mission.takeoffGlobalPosition = takeoffGlobalCoordinates;
  
  // Set as origin for local coordinate system
  mission.localOrigin = takeoffGlobalCoordinates;
  
  // Initialize the takeoff point at (0,0,0) in local coordinates
  mission.takeoffPoint = { x: 0, y: 0, z: 0 };
}

// When repositioning objects relative to takeoff point
function repositionSceneObjects(takeoffPoint) {
  const objects = getAllSceneObjects();
  
  objects.forEach(object => {
    // Calculate new position relative to takeoff
    const newPosition = {
      x: object.position.x - takeoffPoint.x,
      y: object.position.y - takeoffPoint.y,
      z: object.position.z - takeoffPoint.z
    };
    
    // Update the object position
    updateObjectPosition(object.id, newPosition);
  });
}
```

## Usage In Mission Planning

The coordinate system transformations are central to the mission planning workflow:

1. **Geographic Area Selection** (GeoPage)
   - User selects a point in global WGS84 coordinates
   - These coordinates are stored as the mission's `localOrigin`

2. **Mission Setup**
   - System transforms the selected point to local ENU coordinates
   - Initializes the takeoff point at this position (typically at ENU coordinates 0,0,0)

3. **Mission Planning** (3D View)
   - Local ENU coordinates are transformed to Babylon.js coordinates for visualization
   - User interacts with the 3D scene in Babylon.js coordinates
   - Interactions are transformed back to local ENU for storage

4. **Hardware Integration**
   - Mission commands are transformed from ENU to the appropriate ROS coordinate system
   - Telemetry from ROS is transformed to ENU and then to Babylon.js for visualization

## Working with Coordinate Transformations

### Best Practices

1. **Always Use Transformation Functions**
   - Never manually swap coordinates or apply rotations
   - Use the helper functions for all transformations

2. **Handle Rotations Properly**
   - In ENU: 
     - Heading: degrees clockwise from North (0° = North, 90° = East)
     - Pitch: degrees up from horizontal plane (positive = up)
     - Roll: degrees of roll (positive = right wing down)
   - Transform rotations between coordinate systems accordingly

3. **Document Coordinate System Usage**
   - Clearly indicate which coordinate system is used in each context
   - Document all transformations between systems

4. **Validate Transformations**
   - Implement round-trip validation (transform to and from, check for consistency)
   - Test edge cases (poles, international date line)

### Common Pitfalls

1. **Incorrect Axis Mapping**
   - Mixing up which axis corresponds to which direction in different systems
   - Solution: Use clearly named coordinate transformation functions

2. **Sign Errors**
   - Forgetting to negate certain axes during transformations
   - Solution: Comprehensive testing with known reference points

3. **Origin Confusion**
   - Using the wrong origin point for transformations
   - Solution: Clearly track and validate the origin point for each mission

4. **Implicit Assumptions**
   - Assuming a particular axis convention without checking
   - Solution: Make coordinate systems explicit in function signatures and documentation

## Visualization Tools

The application includes tools to visualize the different coordinate systems:

1. **Coordinate Axes Display**
   - Shows the three coordinate axes (X, Y, Z) in the appropriate colors
   - Updates orientation based on the current view

2. **Grid Overlay**
   - Displays a grid on the horizontal plane
   - Grid squares typically represent 10m x 10m

3. **Origin Marker**
   - Highlights the origin point in the visualization
   - Shows global coordinates of the origin point

## Integration with External Systems

When integrating with external systems like ROS, additional care must be taken:

### ROS Frame Transformations

1. **TF2 Integration**
   - ROS uses TF2 for managing transformations between different coordinate frames
   - Subscribe to TF2 topics to get latest transforms

2. **Sensor Frames**
   - Different sensors may have their own frames of reference
   - Transform all sensor data to a common frame before using

3. **Drone Body Frame**
   - The drone's body frame must be properly oriented in the ENU system
   - Example conversion for a camera mounted on a drone:
     ```typescript
     function cameraToBodyFrame(cameraPos) {
       // This depends on your camera mounting and orientation
       // Example for a forward-facing camera
       return {
         x: cameraPos.z,   // Camera Z → Body X
         y: -cameraPos.x,  // Camera X → Body Y (negated)
         z: -cameraPos.y   // Camera Y → Body Z (negated)
       };
     }
     ```

### LiDAR Point Cloud Integration

When working with LiDAR point clouds:

```typescript
function processLidarPoint(point, lidarToBodyTransform, bodyPose) {
  // Transform point from lidar frame to body frame
  const pointInBody = applyTransform(point, lidarToBodyTransform);
  
  // Transform from body frame to ENU
  const pointInENU = transformBodyToENU(pointInBody, bodyPose);
  
  // Transform from ENU to Babylon.js
  return localToThreeJS(pointInENU);
}
```

## Coordinate System Reference

### Global WGS84

- Origin: Earth's center
- X-axis: Intersection of the equator and the IERS Reference Meridian
- Z-axis: IERS Reference Pole
- Y-axis: Completes the right-handed coordinate system

### Local ENU

- Origin: Selected reference point
- X-axis: East direction
- Y-axis: North direction
- Z-axis: Up direction (perpendicular to Earth's surface)

### Babylon.js Scene

- Origin: Same as Local ENU origin
- X-axis: East direction (same as ENU X)
- Y-axis: Up direction (mapped from ENU Z)
- Z-axis: Negative North direction (mapped from negative ENU Y)

### ROS Standard (REP 103)

- Origin: Robot center
- X-axis: Forward
- Y-axis: Left
- Z-axis: Up

### ROS Aircraft/NED

- Origin: Aircraft center
- X-axis: North/Forward
- Y-axis: East/Right
- Z-axis: Down

## Conclusion

A proper understanding and implementation of coordinate systems and their transformations is essential for the correct positioning and visualization of objects in the OverWatch Mission Control system. By consistently using the appropriate coordinate transformations, the application maintains accurate spatial relationships between the global geographic context and the local mission environment. 