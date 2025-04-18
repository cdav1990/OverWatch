# ROS Coordinate Systems and Integration

## Overview

This document covers how to integrate ROS (Robot Operating System) coordinate systems with our OverWatch application. ROS uses different coordinate conventions than our established systems, requiring careful transformation when integrating drones, sensors, and other robotics components.

## ROS Coordinate Systems

ROS typically follows these coordinate conventions:

### Standard ROS Frame (REP 103)
- **X-axis**: Forward
- **Y-axis**: Left
- **Z-axis**: Up
- **Reference**: Right-handed coordinate system
- **Common application**: Mobile robots, ground vehicles

### ROS Aircraft Frame (NED - North-East-Down)
- **X-axis**: North/Forward
- **Y-axis**: East/Right
- **Z-axis**: Down
- **Reference**: Right-handed coordinate system
- **Common application**: Drones, aerial vehicles, especially those using PX4 or ArduPilot

### ROS TF2 Transforms
ROS uses a tree of coordinate frames connected by transforms. Each sensor, actuator, or reference point has its own frame, all connected through a transformation tree managed by TF2.

## Integration Strategies

### Strategy 1: Transform to Local ENU

Convert all ROS poses from their native frame to our application's Local ENU before using them:

```text
ROS Frame (X-forward, Y-left, Z-up) → Local ENU (X-east, Y-north, Z-up)
```

For standard ROS frames:
```typescript
function rosToLocalENU(rosPos: ROSPosition): LocalCoord {
  // Assuming drone is facing North
  return {
    x: rosPos.y,  // ROS Y (left) → ENU X (east)
    y: rosPos.x,  // ROS X (forward) → ENU Y (north)
    z: rosPos.z   // ROS Z (up) → ENU Z (up)
  };
}
```

For drones using NED:
```typescript
function nedToLocalENU(nedPos: NEDPosition): LocalCoord {
  return {
    x: nedPos.y,   // NED Y (east) → ENU X (east) 
    y: nedPos.x,   // NED X (north) → ENU Y (north)
    z: -nedPos.z   // NED Z (down) → ENU Z (up) [negated]
  };
}
```

### Strategy 2: Maintain ROS Frame in Babylon.js

Keep your Babylon.js scene in the same orientation as the ROS coordinate frame, applying an additional transformation when converting to/from Cesium ENU:

```typescript
// Approach when Babylon.js matches ROS frame (X-forward)
function enuToThreeJSForROS(enuCoord: LocalCoord): THREE.Vector3 {
  // ENU to ROS-aligned Babylon.js
  return new THREE.Vector3(
    enuCoord.y,   // ENU Y (north) → Babylon.js X (forward in ROS)
    -enuCoord.x,  // ENU X (east) → Babylon.js Y (left in ROS)
    enuCoord.z    // ENU Z (up) → Babylon.js Z (up in ROS)
  );
}
```

## Handling GPS and RTK Coordinates

When integrating GPS or RTK data from ROS:

1. **Unified Transformation Pipeline**:
   ```
   GPS/RTK (lat, lon, alt) → ECEF → Local ENU → Babylon.js
   ```

2. **Using RTK Base Station as Origin**:
   - If your drone uses an RTK base station, you can set the station's coordinates as your local origin
   - This provides very accurate positioning relative to that fixed point
   - Example setup:
   ```typescript
   // Set RTK base as origin for our local coordinate system
   const rtkBaseCoordinates = {
     latitude: rtkBase.lat,
     longitude: rtkBase.lon
   };
   
   // Configure this as our Cesium & local ENU origin
   mission.localOrigin = rtkBaseCoordinates;
   ```

3. **Handling Offset Between RTK Base and Mission Origin**:
   - If the RTK base cannot be set at your chosen mission origin:
   ```typescript
   function applyRTKOriginOffset(localCoord: LocalCoord): LocalCoord {
     // Apply the fixed offset between RTK origin and mission origin
     return {
       x: localCoord.x + rtkToMissionOffset.x,
       y: localCoord.y + rtkToMissionOffset.y,
       z: localCoord.z + rtkToMissionOffset.z
     };
   }
   ```

## ROS Integration Implementation

### 1. Set Up ROS Bridge

Use `rosbridge_suite` to connect ROS to the web application:

```typescript
// Connect to ROS
const ros = new ROSLIB.Ros({
  url: 'ws://localhost:9090'  // ROS Bridge WebSocket
});

// Subscribe to drone position
const poseSub = new ROSLIB.Topic({
  ros: ros,
  name: '/mavros/local_position/pose',  // Standard PX4 topic
  messageType: 'geometry_msgs/PoseStamped'
});

poseSub.subscribe((message) => {
  // Convert ROS pose to our ENU coordinate system
  const enuPosition = rosToLocalENU({
    x: message.pose.position.x,
    y: message.pose.position.y,
    z: message.pose.position.z
  });
  
  // Then convert to Babylon.js coordinates
  const threePosition = localCoordToThree(enuPosition);
  
  // Update drone position in scene
  updateDronePosition(threePosition);
});
```

### 2. Handling Quaternions and Rotations

ROS uses quaternions for orientation. Convert them for Babylon.js:

```typescript
function rosQuaternionToThreeJSRotation(rosQ: ROSQuaternion): THREE.Euler {
  // Create THREE quaternion
  const threeQuat = new THREE.Quaternion(rosQ.x, rosQ.y, rosQ.z, rosQ.w);
  
  // Apply coordinate system transformation
  // This step depends on your exact coordinate conversion
  
  // Convert to Euler angles
  const eulerRotation = new THREE.Euler();
  eulerRotation.setFromQuaternion(threeQuat, 'ZYX'); // Order matters
  
  return eulerRotation;
}
```

### 3. Sending Waypoints to ROS

When creating waypoints in Babylon.js and sending to ROS:

```typescript
function sendWaypointToROS(waypointThreeJS: THREE.Vector3): void {
  // Convert from Babylon.js to ENU
  const enuWaypoint = threeToLocalCoord(waypointThreeJS);
  
  // Convert from ENU to ROS frame (depends on your ROS setup)
  const rosWaypoint = localENUToROS(enuWaypoint);
  
  // Publish to ROS
  const waypointMsg = new ROSLIB.Message({
    // Format according to your ROS message type
    position: { 
      x: rosWaypoint.x, 
      y: rosWaypoint.y, 
      z: rosWaypoint.z 
    }
  });
  
  waypointPub.publish(waypointMsg);
}
```

## Special Considerations

### Frame of Reference for Sensors

Different sensors on a drone may have their own frames of reference:

- **Camera**: Often has a Z-forward, X-right, Y-down frame
- **LiDAR**: May have its own orientation depending on mounting
- **IMU**: Usually aligned with the body frame

Convert all these to a common frame (usually the body frame) before transforming to ENU:

```typescript
function cameraToBodyFrame(cameraPos: Position): Position {
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

When integrating LiDAR point clouds:

1. Each point is initially in the LiDAR sensor frame
2. Transform to drone body frame using TF2 data
3. Transform to Local ENU using drone's pose
4. Transform to Babylon.js coordinates for visualization

```typescript
function processLidarPoint(point: Point, lidarToBodyTransform: Transform, bodyPose: Pose): THREE.Vector3 {
  // Transform point from lidar frame to body frame
  const pointInBody = applyTransform(point, lidarToBodyTransform);
  
  // Transform from body frame to ENU
  const pointInENU = transformBodyToENU(pointInBody, bodyPose);
  
  // Transform from ENU to Babylon.js
  return localCoordToThree(pointInENU);
}
```

## Troubleshooting

### Common Integration Issues

1. **Incorrect orientation**: 
   - Verify that quaternion conventions between ROS and Babylon.js are correctly handled
   - ROS uses (x, y, z, w) quaternion order, same as Babylon.js

2. **Position drift**: 
   - Check that the Local ENU origin in your app matches the origin used by ROS
   - Validate that altitude references are consistent (above sea level vs. above ground)

3. **Frame misalignment**:
   - Ensure that all frame transformations in your ROS TF tree are being applied correctly
   - Verify that timestamps are properly synchronized between ROS messages

### Debugging Tools

- Use RViz in ROS to visualize coordinate frames and verify transformations
- Add debug visualization in Babylon.js that shows the expected vs. actual positions
- Implement logging of coordinate values at each transformation step

## Additional Resources

- [REP 103 - Standard Units and Coordinate Conventions](https://www.ros.org/reps/rep-0103.html)
- [ROS TF2 Documentation](http://wiki.ros.org/tf2)
- [PX4 Coordinate Frames](https://docs.px4.io/main/en/getting_started/px4_basic_concepts.html)
- [Babylon.js Coordinate System](https://threejs.org/docs/#api/en/core/Object3D.position) 