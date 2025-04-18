# ROS Integration Architecture

## Overview

The OverWatch Mission Control system integrates with the Robot Operating System (ROS) to enable real-time communication with drones and other hardware. This document explains how the frontend connects to ROS, handles different coordinate systems, and implements hardware control functions including camera operations.

## ROS Bridge Architecture

The integration between the React frontend and ROS uses a WebSocket-based approach via rosbridge_suite:

```
┌───────────────────────┐     ┌───────────────────────┐     ┌───────────────────────┐
│                       │     │                       │     │                       │
│  React Frontend       │◄───►│  ROS Bridge           │◄───►│  ROS Ecosystem        │
│  (Browser)            │     │  (WebSocket Server)   │     │  (Nodes & Topics)     │
│                       │     │                       │     │                       │
└───────────────────────┘     └───────────────────────┘     └───────────────────────┘
```

### Key Components

1. **ROS Bridge Server**: 
   - Runs on the backend server
   - Provides WebSocket interface to ROS
   - Translates between JSON and ROS messages

2. **roslibjs Client**:
   - JavaScript library for ROS communication
   - Establishes WebSocket connection
   - Manages topics, services, and actions

3. **Message Transformers**:
   - Convert between ROS and application data formats
   - Handle coordinate system transformations
   - Process telemetry and command data

## WebSocket Communication Implementation

### Connection Establishment

```typescript
import ROSLIB from 'roslib';

class ROSConnection {
  private ros: ROSLIB.Ros;
  private topics: Map<string, ROSLIB.Topic>;
  private messageCallbacks: Map<string, (message: any) => void>;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  
  constructor(url: string) {
    this.ros = new ROSLIB.Ros({ url });
    this.topics = new Map();
    this.messageCallbacks = new Map();
    
    this.setupConnectionHandlers();
  }
  
  private setupConnectionHandlers() {
    this.ros.on('connection', () => {
      console.log('Connected to websocket server.');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Resubscribe to topics after reconnection
      this.resubscribeToTopics();
    });
    
    this.ros.on('error', (error) => {
      console.error('Error connecting to websocket server: ', error);
      this.isConnected = false;
    });
    
    this.ros.on('close', () => {
      console.log('Connection to websocket server closed.');
      this.isConnected = false;
      
      // Attempt to reconnect
      this.attemptReconnect();
    });
  }
  
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached.');
      return;
    }
    
    this.reconnectAttempts++;
    
    // Exponential backoff
    const delay = Math.pow(2, this.reconnectAttempts) * 1000;
    
    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts})...`);
      this.ros.connect(this.ros.url);
    }, delay);
  }
  
  private resubscribeToTopics() {
    this.topics.forEach((topic, topicName) => {
      topic.subscribe((message: any) => {
        // Process message
        this.messageCallbacks.get(topicName)?.(message);
      });
    });
  }
  
  // Public methods for topic subscription
  subscribeTopic(
    topicName: string, 
    messageType: string, 
    callback: (message: any) => void
  ) {
    const topic = new ROSLIB.Topic({
      ros: this.ros,
      name: topicName,
      messageType: messageType
    });
    
    this.topics.set(topicName, topic);
    this.messageCallbacks.set(topicName, callback);
    
    if (this.isConnected) {
      topic.subscribe(callback);
    }
    
    return () => {
      topic.unsubscribe();
      this.topics.delete(topicName);
      this.messageCallbacks.delete(topicName);
    };
  }
  
  // Service call implementation
  callService(
    serviceName: string,
    serviceType: string,
    request: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const service = new ROSLIB.Service({
        ros: this.ros,
        name: serviceName,
        serviceType: serviceType
      });
      
      service.callService(
        new ROSLIB.ServiceRequest(request),
        (result) => resolve(result),
        (error) => reject(error)
      );
    });
  }
  
  // Publishing messages to topics
  publishMessage(
    topicName: string, 
    messageType: string, 
    message: any
  ) {
    let topic = this.topics.get(topicName);
    
    if (!topic) {
      topic = new ROSLIB.Topic({
        ros: this.ros,
        name: topicName,
        messageType: messageType
      });
      
      this.topics.set(topicName, topic);
    }
    
    topic.publish(new ROSLIB.Message(message));
  }
}
```

### React Integration with Custom Hook

```typescript
import { useEffect, useRef, useState } from 'react';
import ROSConnection from '../services/ros/ROSConnection';

export function useROSConnection(url: string) {
  const rosConnection = useRef<ROSConnection | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('connecting');
  
  useEffect(() => {
    // Create ROS connection instance
    rosConnection.current = new ROSConnection(url);
    
    // Set up connection status listener
    const connectionListener = (status: 'connected' | 'disconnected' | 'error') => {
      setConnectionStatus(status);
    };
    
    rosConnection.current.on('status', connectionListener);
    
    // Cleanup on unmount
    return () => {
      if (rosConnection.current) {
        rosConnection.current.off('status', connectionListener);
        rosConnection.current.close();
      }
    };
  }, [url]);
  
  return {
    connectionStatus,
    subscribeTopic: (topicName: string, messageType: string, callback: (message: any) => void) => 
      rosConnection.current?.subscribeTopic(topicName, messageType, callback),
    callService: (serviceName: string, serviceType: string, request: any) => 
      rosConnection.current?.callService(serviceName, serviceType, request),
    publishMessage: (topicName: string, messageType: string, message: any) => 
      rosConnection.current?.publishMessage(topicName, messageType, message)
  };
}
```

## Coordinate System Integration

When working with ROS, we need to manage the differences between coordinate systems:

### ROS Coordinate Systems

ROS uses different coordinate conventions than our application:

1. **Standard ROS Frame (REP 103)**
   - X-axis: Forward
   - Y-axis: Left
   - Z-axis: Up
   - Reference: Right-handed coordinate system
   - Common application: Mobile robots, ground vehicles

2. **ROS Aircraft Frame (NED - North-East-Down)**
   - X-axis: North/Forward
   - Y-axis: East/Right
   - Z-axis: Down
   - Reference: Right-handed coordinate system
   - Common application: Drones, aerial vehicles, especially those using PX4 or ArduPilot

### Coordinate Transformations

To correctly display and control drones, we implement coordinate transformations between our application's ENU (East-North-Up) system and ROS coordinate frames:

```typescript
// ROS Standard Frame (REP 103) to Local ENU
function rosStandardToENU(rosCoord: { x: number, y: number, z: number }): { x: number, y: number, z: number } {
  // Assuming drone is facing North
  return {
    x: -rosCoord.y,  // ROS Y (left) → ENU X (east) with negation
    y: rosCoord.x,   // ROS X (forward) → ENU Y (north)
    z: rosCoord.z    // ROS Z (up) → ENU Z (up)
  };
}

// Local ENU to ROS Standard Frame (REP 103)
function enuToRosStandard(enuCoord: { x: number, y: number, z: number }): { x: number, y: number, z: number } {
  // Assuming drone is facing North
  return {
    x: enuCoord.y,   // ENU Y (north) → ROS X (forward)
    y: -enuCoord.x,  // ENU X (east) → ROS Y (left) with negation
    z: enuCoord.z    // ENU Z (up) → ROS Z (up)
  };
}

// ROS Aircraft Frame (NED) to Local ENU
function nedToENU(nedCoord: { x: number, y: number, z: number }): { x: number, y: number, z: number } {
  return {
    x: nedCoord.y,    // NED Y (east) → ENU X (east)
    y: nedCoord.x,    // NED X (north) → ENU Y (north)
    z: -nedCoord.z    // NED Z (down) → ENU Z (up) with negation
  };
}

// Local ENU to ROS Aircraft Frame (NED)
function enuToNED(enuCoord: { x: number, y: number, z: number }): { x: number, y: number, z: number } {
  return {
    x: enuCoord.y,    // ENU Y (north) → NED X (north)
    y: enuCoord.x,    // ENU X (east) → NED Y (east)
    z: -enuCoord.z    // ENU Z (up) → NED Z (down) with negation
  };
}
```

### Quaternion Handling

ROS typically uses quaternions for orientation, which we must convert for Babylon.js:

```typescript
import * as THREE from 'three';

// Convert ROS quaternion to Babylon.js Euler angles
function rosQuaternionToThreeJSRotation(rosQ: { x: number, y: number, z: number, w: number }): THREE.Euler {
  // Create THREE quaternion
  const threeQuat = new THREE.Quaternion(rosQ.x, rosQ.y, rosQ.z, rosQ.w);
  
  // Apply coordinate system transformation
  // This step depends on which ROS frame is being used (REP 103 or NED)
  
  // Convert to Euler angles
  const eulerRotation = new THREE.Euler();
  eulerRotation.setFromQuaternion(threeQuat, 'ZYX'); // Order matters!
  
  return eulerRotation;
}

// Convert Babylon.js Euler to ROS quaternion
function threeJSRotationToRosQuaternion(euler: THREE.Euler): { x: number, y: number, z: number, w: number } {
  // Create quaternion from Euler angles
  const quaternion = new THREE.Quaternion();
  quaternion.setFromEuler(euler);
  
  // Apply coordinate system transformation
  // This step depends on which ROS frame is being used (REP 103 or NED)
  
  return {
    x: quaternion.x,
    y: quaternion.y,
    z: quaternion.z,
    w: quaternion.w
  };
}
```

## Telemetry Integration

Telemetry data from ROS is processed, transformed, and used to update the application state:

```typescript
function useDroneTelemetry(rosConnection) {
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [orientation, setOrientation] = useState({ roll: 0, pitch: 0, yaw: 0 });
  const [velocity, setVelocity] = useState({ x: 0, y: 0, z: 0 });
  const [batteryLevel, setBatteryLevel] = useState(100);
  
  useEffect(() => {
    // Subscribe to position updates
    const unsubscribePosition = rosConnection.subscribeTopic(
      '/mavros/local_position/pose',
      'geometry_msgs/PoseStamped',
      (message) => {
        const rosPosition = message.pose.position;
        
        // Transform from ROS coordinate system to ENU
        // Assuming this is using NED frame from PX4
        const enuPosition = nedToENU({
          x: rosPosition.x,
          y: rosPosition.y,
          z: rosPosition.z
        });
        
        setPosition(enuPosition);
        
        // Handle orientation quaternion
        const rosOrientation = message.pose.orientation;
        const eulerAngles = rosQuaternionToThreeJSRotation(rosOrientation);
        
        setOrientation({
          roll: eulerAngles.x * (180/Math.PI),  // Convert to degrees
          pitch: eulerAngles.y * (180/Math.PI),
          yaw: eulerAngles.z * (180/Math.PI)
        });
      }
    );
    
    // Subscribe to velocity updates
    const unsubscribeVelocity = rosConnection.subscribeTopic(
      '/mavros/local_position/velocity_local',
      'geometry_msgs/TwistStamped',
      (message) => {
        const rosVelocity = message.twist.linear;
        
        // Transform from ROS coordinate system to ENU
        const enuVelocity = nedToENU({
          x: rosVelocity.x,
          y: rosVelocity.y,
          z: rosVelocity.z
        });
        
        setVelocity(enuVelocity);
      }
    );
    
    // Subscribe to battery updates
    const unsubscribeBattery = rosConnection.subscribeTopic(
      '/mavros/battery',
      'sensor_msgs/BatteryState',
      (message) => {
        setBatteryLevel(message.percentage * 100);
      }
    );
    
    return () => {
      unsubscribePosition();
      unsubscribeVelocity();
      unsubscribeBattery();
    };
  }, [rosConnection]);
  
  return {
    position,
    orientation,
    velocity,
    batteryLevel
  };
}
```

## Hardware Control Implementation

### Drone Position Control

The application implements drone position control commands through ROS:

```typescript
function useDroneControl(rosConnection) {
  // Send position setpoint to drone
  const setDronePosition = async (position: { x: number, y: number, z: number }) => {
    // Convert from ENU to ROS coordinate system (assuming PX4 NED)
    const nedPosition = enuToNED(position);
    
    // Create setpoint message in the correct format
    const setpointMessage = {
      header: {
        frame_id: 'map',
        stamp: { sec: 0, nanosec: 0 }  // Will be filled by ROS
      },
      coordinate_frame: 1,  // MAV_FRAME_LOCAL_NED
      type_mask: 3576,      // Position control only (ignore velocity, acceleration, yaw)
      position: nedPosition,
      velocity: { x: 0, y: 0, z: 0 },
      acceleration_or_force: { x: 0, y: 0, z: 0 },
      yaw: 0,
      yaw_rate: 0
    };
    
    // Publish the setpoint
    rosConnection.publishMessage(
      '/mavros/setpoint_raw/local',
      'mavros_msgs/PositionTarget',
      setpointMessage
    );
  };
  
  // Set drone orientation
  const setDroneOrientation = async (orientation: { roll: number, pitch: number, yaw: number }) => {
    // Convert Euler angles to quaternion
    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(new THREE.Euler(
      orientation.roll * (Math.PI/180),  // Convert to radians
      orientation.pitch * (Math.PI/180),
      orientation.yaw * (Math.PI/180),
      'ZYX'
    ));
    
    // Create attitude setpoint message
    const attitudeMessage = {
      header: {
        frame_id: 'map',
        stamp: { sec: 0, nanosec: 0 }
      },
      orientation: {
        x: quaternion.x,
        y: quaternion.y,
        z: quaternion.z,
        w: quaternion.w
      },
      thrust: 0.5  // Normalized thrust (0-1)
    };
    
    // Publish the attitude setpoint
    rosConnection.publishMessage(
      '/mavros/setpoint_attitude/attitude',
      'mavros_msgs/AttitudeTarget',
      attitudeMessage
    );
  };
  
  return {
    setDronePosition,
    setDroneOrientation
  };
}
```

### Camera Control

The application integrates with PX4 camera systems through MAVLink commands:

```typescript
function useCameraControl(rosConnection) {
  // Set gimbal pitch
  const setGimbalPitch = async (pitch: number) => {
    // Ensure pitch is within valid range
    const validPitch = Math.max(-90, Math.min(0, pitch));
    
    // Create MAVLink command for gimbal control
    const gimbalCommand = {
      broadcast: false,
      command: 205,  // MAV_CMD_DO_MOUNT_CONTROL
      confirmation: 0,
      param1: validPitch,  // Pitch in degrees (-90 to 0 typically)
      param2: 0,           // Roll (not changing)
      param3: 0,           // Yaw (not changing)
      param4: 0,           // Reserved
      param5: 0,           // Reserved
      param6: 0,           // Reserved
      param7: 2,           // MAV_MOUNT_MODE_MAVLINK_TARGETING
      target_system: 1,
      target_component: 1
    };
    
    // Send command through ROS
    await rosConnection.callService(
      '/mavros/cmd/command',
      'mavros_msgs/CommandLong',
      gimbalCommand
    );
  };
  
  // Set camera mode (photo/video)
  const setCameraMode = async (mode: 'photo' | 'video') => {
    const setCameraModeCommand = {
      broadcast: false,
      command: 530,  // MAV_CMD_SET_CAMERA_MODE
      confirmation: 0,
      param1: 0,                      // Reserved
      param2: mode === 'photo' ? 0 : 1, // 0=photo mode, 1=video mode
      param3: 0,                      // Reserved
      param4: 0,                      // Reserved
      param5: 0,                      // Reserved
      param6: 0,                      // Reserved
      param7: 0,                      // Reserved
      target_system: 1,
      target_component: 1
    };
    
    // Send command through ROS
    await rosConnection.callService(
      '/mavros/cmd/command',
      'mavros_msgs/CommandLong',
      setCameraModeCommand
    );
  };
  
  // Trigger photo capture
  const triggerPhoto = async () => {
    const triggerPhotoCommand = {
      broadcast: false,
      command: 203,  // MAV_CMD_DO_DIGICAM_CONTROL
      confirmation: 0,
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
    
    // Send command through ROS
    await rosConnection.callService(
      '/mavros/cmd/command',
      'mavros_msgs/CommandLong',
      triggerPhotoCommand
    );
  };
  
  // Start/stop video recording
  const toggleVideoRecording = async (isStarting: boolean) => {
    const videoControlCommand = {
      broadcast: false,
      command: isStarting ? 2500 : 2501,  // MAV_CMD_VIDEO_START_CAPTURE or MAV_CMD_VIDEO_STOP_CAPTURE
      confirmation: 0,
      param1: isStarting ? 0 : 0,  // Stream ID or 0 to stop all
      param2: 0,                   // Status frequency (0 for highest quality)
      param3: 0,                   // Reserved
      param4: 0,                   // Reserved
      param5: 0,                   // Reserved
      param6: 0,                   // Reserved
      param7: 0,                   // Reserved
      target_system: 1,
      target_component: 1
    };
    
    // Send command through ROS
    await rosConnection.callService(
      '/mavros/cmd/command',
      'mavros_msgs/CommandLong',
      videoControlCommand
    );
  };
  
  return {
    setGimbalPitch,
    setCameraMode,
    triggerPhoto,
    toggleVideoRecording
  };
}
```

### UI Integration for Camera Control

The drone position and camera control features are integrated into a user interface component:

```typescript
import { useState } from 'react';

const DronePositionControlPanel = ({
  isOpen,
  onClose,
  initialPosition,
  onPositionChange,
  initialCameraFollow,
  onCameraFollowChange,
  gimbalPitch,
  onGimbalPitchChange,
  cameraMode,
  onCameraModeChange,
  isRecording,
  onTriggerCamera,
  onToggleRecording
}) => {
  // Local state
  const [position, setPosition] = useState(initialPosition);
  const [cameraFollow, setCameraFollow] = useState(initialCameraFollow);
  
  // Handle position change
  const handlePositionChange = (axis, value) => {
    const newPosition = { ...position, [axis]: parseFloat(value) };
    setPosition(newPosition);
    onPositionChange(newPosition);
  };
  
  // Handle camera follow toggle
  const handleCameraFollowChange = (value) => {
    setCameraFollow(value);
    onCameraFollowChange(value);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="drone-control-panel">
      <div className="panel-header">
        <h3>Drone Position Control</h3>
        <button onClick={onClose}>Close</button>
      </div>
      
      <div className="position-controls">
        <div className="position-input">
          <label>X (East):</label>
          <input
            type="number"
            value={position.x}
            onChange={(e) => handlePositionChange('x', e.target.value)}
            step="1"
          />
        </div>
        
        <div className="position-input">
          <label>Y (North):</label>
          <input
            type="number"
            value={position.y}
            onChange={(e) => handlePositionChange('y', e.target.value)}
            step="1"
          />
        </div>
        
        <div className="position-input">
          <label>Z (Altitude):</label>
          <input
            type="number"
            value={position.z}
            onChange={(e) => handlePositionChange('z', e.target.value)}
            step="1"
          />
        </div>
      </div>
      
      <div className="camera-follow">
        <label>
          <input
            type="checkbox"
            checked={cameraFollow}
            onChange={(e) => handleCameraFollowChange(e.target.checked)}
          />
          Camera Follow
        </label>
      </div>
      
      <div className="camera-controls">
        <h4>Camera Controls</h4>
        
        <div className="gimbal-control">
          <label>Gimbal Pitch: {gimbalPitch}°</label>
          <input
            type="range"
            value={gimbalPitch}
            onChange={(e) => onGimbalPitchChange(parseInt(e.target.value))}
            min="-90"
            max="0"
            step="5"
          />
        </div>
        
        <div className="camera-mode">
          <label>Camera Mode:</label>
          <div className="mode-buttons">
            <button
              className={cameraMode === 'photo' ? 'active' : ''}
              onClick={() => onCameraModeChange('photo')}
            >
              Photo
            </button>
            <button
              className={cameraMode === 'video' ? 'active' : ''}
              onClick={() => onCameraModeChange('video')}
            >
              Video
            </button>
          </div>
        </div>
        
        <div className="camera-actions">
          {cameraMode === 'photo' ? (
            <button onClick={onTriggerCamera}>
              Trigger Photo
            </button>
          ) : (
            <button 
              className={isRecording ? 'recording' : ''}
              onClick={() => onToggleRecording(!isRecording)}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
```

## Special Cases and Hardware Integration

### 1. TF2 Integration for Sensor Frames

ROS uses TF2 for tracking the transformations between different frames. We integrate with TF2 to properly position sensor data:

```typescript
function useTF2Transforms(rosConnection) {
  const [transforms, setTransforms] = useState({});
  
  useEffect(() => {
    // Subscribe to TF2 messages
    const unsubscribeTF = rosConnection.subscribeTopic(
      '/tf',
      'tf2_msgs/TFMessage',
      (message) => {
        // Process transforms
        const newTransforms = { ...transforms };
        
        message.transforms.forEach((transform) => {
          const key = `${transform.header.frame_id}_to_${transform.child_frame_id}`;
          
          newTransforms[key] = {
            translation: transform.transform.translation,
            rotation: transform.transform.rotation,
            timestamp: transform.header.stamp
          };
        });
        
        setTransforms(newTransforms);
      }
    );
    
    return () => {
      unsubscribeTF();
    };
  }, [rosConnection]);
  
  // Apply transforms to sensor data
  const applyTransform = (point, fromFrame, toFrame) => {
    // Find the required transforms to go from fromFrame to toFrame
    // This is a simplified version - a complete implementation would walk the transform tree
    const key = `${toFrame}_to_${fromFrame}`;
    const transform = transforms[key];
    
    if (!transform) {
      console.warn(`Transform from ${fromFrame} to ${toFrame} not found`);
      return point;
    }
    
    // Apply the transformation
    // This is simplified - a complete version would do proper 3D transformation
    const transformedPoint = {
      x: point.x + transform.translation.x,
      y: point.y + transform.translation.y,
      z: point.z + transform.translation.z
    };
    
    return transformedPoint;
  };
  
  return {
    transforms,
    applyTransform
  };
}
```

### 2. LiDAR Integration

For LiDAR data integration, we need special handling for point clouds:

```typescript
function useLidarData(rosConnection, tf2Transforms) {
  const [pointCloud, setPointCloud] = useState([]);
  
  useEffect(() => {
    // Subscribe to LiDAR point cloud
    const unsubscribeLidar = rosConnection.subscribeTopic(
      '/lidar/points',
      'sensor_msgs/PointCloud2',
      (message) => {
        // Process point cloud data
        // This is a simplified implementation - actual PointCloud2 parsing is more complex
        const parsedPoints = parsePointCloud2(message);
        
        // Transform points from LiDAR frame to the local ENU frame
        const transformedPoints = parsedPoints.map(point => {
          // Apply TF2 transform from LiDAR frame to body frame
          const pointInBodyFrame = tf2Transforms.applyTransform(
            point, 
            'lidar_frame', 
            'base_link'
          );
          
          // Apply transform from body frame to ENU
          const pointInENU = nedToENU(pointInBodyFrame);
          
          return pointInENU;
        });
        
        setPointCloud(transformedPoints);
      }
    );
    
    return () => {
      unsubscribeLidar();
    };
  }, [rosConnection, tf2Transforms]);
  
  return pointCloud;
}

// Helper function to parse PointCloud2 message
// This is a simplified implementation - real implementation would handle binary data
function parsePointCloud2(message) {
  // In a real implementation, this would decode the binary point data
  // from the message.data buffer based on the field definitions
  
  // For this example, we'll return mock data
  return Array(100).fill(0).map(() => ({
    x: Math.random() * 10 - 5,
    y: Math.random() * 10 - 5,
    z: Math.random() * 2
  }));
}
```

### 3. Camera Feed Integration

For camera integration, we handle video streams using ROS image transport:

```typescript
function useCameraFeed(rosConnection) {
  const [imageData, setImageData] = useState(null);
  
  useEffect(() => {
    // Subscribe to compressed image topic
    const unsubscribeImage = rosConnection.subscribeTopic(
      '/camera/image/compressed',
      'sensor_msgs/CompressedImage',
      (message) => {
        // message.data contains the compressed image as a base64 string
        const imageUrl = `data:image/jpeg;base64,${message.data}`;
        setImageData(imageUrl);
      }
    );
    
    return () => {
      unsubscribeImage();
    };
  }, [rosConnection]);
  
  return imageData;
}

// React component to display the camera feed
const CameraFeedDisplay = ({ rosConnection }) => {
  const imageData = useCameraFeed(rosConnection);
  
  return (
    <div className="camera-feed">
      <h3>Camera Feed</h3>
      {imageData ? (
        <img src={imageData} alt="Drone Camera Feed" />
      ) : (
        <div className="loading-feed">Loading camera feed...</div>
      )}
    </div>
  );
};
```

## Common Integration Challenges and Solutions

| Challenge | Solution |
|-----------|----------|
| **WebSocket Connection Reliability** | Implement robust reconnection logic with exponential backoff; handle connection state transitions |
| **Coordinate System Confusion** | Use clearly named transformation functions; validate with visual debugging tools |
| **High-Frequency Data Handling** | Throttle updates; use efficient state management; batch updates when possible |
| **Latency Issues** | Implement client-side prediction; optimize message serialization; handle clock synchronization |
| **Large Point Cloud Processing** | Implement decimation; use Web Workers for processing; optimize rendering with instancing |
| **Camera Command Timing** | Implement command queuing; handle acknowledgment; add retry logic for failed commands |
| **TF2 Tree Complexity** | Cache transform chains; implement transform interpolation; handle missing transforms gracefully |
| **Frame Rate Inconsistency** | Implement time-based animations; decouple rendering from data updates; use request animation frame |

## Testing and Debugging

### 1. ROS Mock Server for Development

For development without actual hardware:

```typescript
class ROSMockServer {
  private topics: Map<string, any[]> = new Map();
  private subscribers: Map<string, ((message: any) => void)[]> = new Map();
  private publishIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  constructor() {
    // Initialize mock topics and data
    this.initializeMockData();
  }
  
  private initializeMockData() {
    // Set up mock drone position updates
    const dronePositions = this.generateDronePositionData();
    this.topics.set('/mavros/local_position/pose', dronePositions);
    
    // Start publishing mock data
    this.startPublishing('/mavros/local_position/pose', 100); // 10Hz
    
    // Add other mock topics as needed
  }
  
  private generateDronePositionData() {
    // Generate sample flight path
    return Array(300).fill(0).map((_, i) => {
      const angle = (i / 300) * Math.PI * 2;
      const radius = 50;
      
      return {
        header: {
          stamp: { sec: Math.floor(Date.now() / 1000), nanosec: 0 },
          frame_id: 'map'
        },
        pose: {
          position: {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            z: 30 + Math.sin(angle * 2) * 10
          },
          orientation: {
            x: 0,
            y: 0,
            z: Math.sin(angle / 2),
            w: Math.cos(angle / 2)
          }
        }
      };
    });
  }
  
  private startPublishing(topic: string, interval: number) {
    let index = 0;
    const data = this.topics.get(topic) || [];
    
    const intervalId = setInterval(() => {
      const subscribers = this.subscribers.get(topic) || [];
      if (subscribers.length === 0) return;
      
      const message = data[index];
      subscribers.forEach(callback => callback(message));
      
      index = (index + 1) % data.length;
    }, interval);
    
    this.publishIntervals.set(topic, intervalId);
  }
  
  // Mock version of the subscribe method
  subscribeTopic(
    topic: string,
    messageType: string,
    callback: (message: any) => void
  ) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }
    
    const subscribers = this.subscribers.get(topic)!;
    subscribers.push(callback);
    
    return () => {
      const index = subscribers.indexOf(callback);
      if (index !== -1) {
        subscribers.splice(index, 1);
      }
    };
  }
  
  // Mock version of the publish method
  publishMessage(
    topic: string,
    messageType: string,
    message: any
  ) {
    console.log(`Mock publish to ${topic}:`, message);
    // For certain topics, simulate a response
    if (topic === '/mavros/setpoint_raw/local') {
      // Update the drone position in the mock data
      // This would simulate the drone responding to commands
    }
  }
  
  // Mock version of service calls
  callService(
    service: string,
    serviceType: string,
    request: any
  ): Promise<any> {
    console.log(`Mock service call to ${service}:`, request);
    return Promise.resolve({ success: true });
  }
  
  cleanup() {
    // Stop all publishing intervals
    this.publishIntervals.forEach(interval => clearInterval(interval));
    this.publishIntervals.clear();
    this.subscribers.clear();
  }
}
```

### 2. Debugging Tools

For debugging ROS communications:

```typescript
// Add logging middleware to ROS communication
function withROSLogging(rosConnection) {
  const originalSubscribe = rosConnection.subscribeTopic;
  const originalPublish = rosConnection.publishMessage;
  const originalCallService = rosConnection.callService;
  
  // Override subscribe method with logging
  rosConnection.subscribeTopic = (topic, messageType, callback) => {
    console.log(`Subscribing to ${topic} (${messageType})`);
    
    // Wrap the callback to log incoming messages
    const wrappedCallback = (message) => {
      console.log(`Received message from ${topic}:`, message);
      callback(message);
    };
    
    return originalSubscribe.call(rosConnection, topic, messageType, wrappedCallback);
  };
  
  // Override publish method with logging
  rosConnection.publishMessage = (topic, messageType, message) => {
    console.log(`Publishing to ${topic} (${messageType}):`, message);
    return originalPublish.call(rosConnection, topic, messageType, message);
  };
  
  // Override service call method with logging
  rosConnection.callService = (service, serviceType, request) => {
    console.log(`Calling service ${service} (${serviceType}):`, request);
    
    return originalCallService.call(rosConnection, service, serviceType, request)
      .then(response => {
        console.log(`Service ${service} response:`, response);
        return response;
      })
      .catch(error => {
        console.error(`Service ${service} error:`, error);
        throw error;
      });
  };
  
  return rosConnection;
}

// Usage
const rosConnection = withROSLogging(new ROSConnection('ws://localhost:9090'));
```

## Conclusion

The ROS integration architecture in OverWatch Mission Control provides a robust interface between the React frontend and the ROS ecosystem. By implementing proper coordinate transformations, reliable WebSocket communication, and comprehensive hardware control capabilities, the system facilitates seamless interaction with drones and sensors in real-time. 