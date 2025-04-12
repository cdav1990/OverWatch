# Coordinate Systems Guide

## Overview

This document explains the coordinate systems used in the OverWatch application and how coordinates are transformed between different systems. Understanding these concepts is crucial for accurate positioning in both the Cesium globe view and the Three.js local 3D view.

## Coordinate Systems in Use

Our application uses three primary coordinate systems:

1. **Global WGS84 (Latitude/Longitude)**
   - Used by GPS devices, Cesium globe, and most geospatial APIs
   - Represents positions on the Earth's surface
   - Units: Decimal degrees for lat/lon, meters for altitude

2. **Local ENU (East-North-Up)**
   - Used for mission planning in local space
   - Origin is set at a chosen reference point
   - Units: Meters
   - Axes:
     - X: East direction
     - Y: North direction
     - Z: Up direction (perpendicular to Earth's surface)

3. **Three.js Scene Coordinates**
   - Used for 3D visualization in Three.js
   - Origin is the same as Local ENU origin
   - Units: Meters
   - Axes:
     - X: East direction (same as ENU X)
     - Y: Up direction (mapped from ENU Z)
     - Z: Negative North direction (mapped from negative ENU Y)

## Coordinate System Transformations

### Global (WGS84) ↔ Local ENU

When you select an area of interest in the Cesium globe, we establish a local origin point. This point becomes (0,0,0) in our local ENU coordinate system. All other positions are then calculated relative to this origin.

**Transformation Process:**
1. Select a reference latitude/longitude (origin) in Cesium
2. Create a transformation matrix using Cesium's `eastNorthUpToFixedFrame()`
3. For each global position, transform it to local ENU coordinates using this matrix

### Local ENU ↔ Three.js Scene

To maintain compatibility with Three.js conventions (where Y is typically the up axis), we perform another transformation when rendering in the 3D scene.

**Transformation Process:**
```
ENU (x,y,z) → Three.js (x',y',z')
x' = x        (East → East)
y' = z        (Up → Y-up in Three.js)
z' = -y       (North → -Z in Three.js)
```

This ensures a right-handed coordinate system while adapting to Three.js conventions.

## Code Example: Coordinate Conversions

Here are the key functions used for coordinate transformations:

```typescript
// Global WGS84 → Local ENU
function globalToLocal(point: LatLng, origin: LatLng, altitude: number = 0): LocalCoord {
  const transformMatrix = createLocalToGlobalTransformMatrix(origin);
  const pointCartesian = Cesium.Cartesian3.fromDegrees(
    point.longitude, point.latitude, altitude
  );
  const inverseTransform = Cesium.Matrix4.inverse(transformMatrix, new Cesium.Matrix4());
  const localCartesian = Cesium.Matrix4.multiplyByPoint(
    inverseTransform, pointCartesian, new Cesium.Cartesian3()
  );
  
  return {
    x: localCartesian.x,  // East
    y: localCartesian.y,  // North
    z: localCartesian.z   // Up
  };
}

// Local ENU → Three.js
function localCoordToThree(coord: LocalCoord): THREE.Vector3 {
  return new THREE.Vector3(
    coord.x,         // East → x
    coord.z,         // Up → y
    -coord.y         // North → -z
  );
}
```

## Visualization Diagram

```
Global WGS84 (Lat/Lon)     Local ENU            Three.js
     |                         |                     |
     |                         |                     |
     v                         v                     v
  [Origin] -----------> [0,0,0] ENU ----------> [0,0,0] Three.js
                         X = East                X = East
                         Y = North               Y = Up
                         Z = Up                  Z = -North
```

## Best Practices

### Setting the Local Origin

- Choose a central point in your area of interest as the local origin
- Typically, this is done when creating a new mission in the Geo page
- The origin is stored in the Mission object as `localOrigin`

### Working with Three.js Objects

- Always use the coordinate transformation functions when placing objects in Three.js
- Don't manually swap coordinates or apply rotations - use the helper functions
- Example:
  ```typescript
  // Placing a drone model at a local coordinate
  const droneLocalCoord = { x: 10, y: 20, z: 30 }; // ENU
  const droneThreePos = localCoordToThree(droneLocalCoord);
  droneModel.position.copy(droneThreePos);
  ```

### Converting User Input

When a user interacts with the Three.js scene (e.g., clicks to place a waypoint):
1. Capture the Three.js coordinates from the click event
2. Convert to local ENU using `threeToLocalCoord()`
3. If needed, convert to global using `localToGlobal()`
4. Store the appropriate coordinate type in your data model

### Handling Rotations

- In ENU: 
  - Heading: degrees clockwise from North (0° = North, 90° = East)
  - Pitch: degrees up from horizontal plane (positive = up)
  - Roll: degrees of roll (positive = right wing down)

- In Three.js:
  - Rotations need corresponding transformations
  - Use Three.js Euler angles in the correct order

## Troubleshooting

### Common Issues

1. **Objects appear offset from expected position**:
   - Check if the local origin is correctly set
   - Verify coordinate transformations are being applied consistently

2. **Objects have incorrect orientation**:
   - Ensure rotations are properly transformed between coordinate systems

3. **Altitude/height issues**:
   - Remember that ENU Z is height, but Three.js uses Y for height

### Debugging Tools

- Use `THREE.AxesHelper` to visualize the Three.js coordinate axes
- Enable the grid in your scene for spatial reference
- Add debug output of coordinate values at key transformation points

## Additional Resources

- [Cesium Transforms Documentation](https://cesium.com/docs/cesiumjs-ref-doc/Transforms.html)
- [Three.js Coordinate System](https://threejs.org/docs/#api/en/core/Object3D.position)
- [WGS84 Reference](https://en.wikipedia.org/wiki/World_Geodetic_System) 