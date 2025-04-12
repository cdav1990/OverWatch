# PX4 Camera Control Integration Guide

This document explains how to integrate the enhanced DronePositionControlPanel with real PX4 camera systems.

## Overview

The DronePositionControlPanel has been extended to support standard PX4 camera controls:
- Gimbal pitch control
- Camera mode switching (photo/video)
- Camera triggering
- Video recording start/stop

## MAVLink Commands for Camera Control

PX4 uses MAVLink protocol for camera control. Here are the main commands used:

### 1. Gimbal Control (Pitch)

To control the gimbal pitch angle:

```javascript
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

### 2. Camera Mode Setting

To switch between photo and video mode:

```javascript
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

### 3. Trigger Photo Capture

To trigger a photo capture:

```javascript
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

### 4. Start/Stop Video Recording

To start or stop video recording:

```javascript
// MAV_CMD_VIDEO_START_CAPTURE or MAV_CMD_VIDEO_STOP_CAPTURE
const videoControlCommand = {
  type: 'COMMAND_LONG',
  command: isStarting ? 'MAV_CMD_VIDEO_START_CAPTURE' : 'MAV_CMD_VIDEO_STOP_CAPTURE',
  param1: isStarting ? 1 : 0,  // Stream ID or 0 to stop
  param2: 0,  // Frequency (0 for highest quality)
  target_system: 1,
  target_component: 1
};
```

## Integration Example

Here's a complete example showing how to connect the panel to a PX4 MAVLink interface:

```jsx
import React, { useState, useEffect } from 'react';
import DronePositionControlPanel from '../DronePositionControlPanel/DronePositionControlPanel';
import { usePX4Connection } from '../path/to/px4-connection-hook';

const DroneControlPanel = () => {
  // State for drone position and camera
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [dronePosition, setDronePosition] = useState({ x: 0, y: 0, z: 10 });
  const [cameraFollows, setCameraFollows] = useState(true);
  const [gimbalPitch, setGimbalPitch] = useState(-45);
  const [cameraMode, setCameraMode] = useState('photo');
  const [isRecording, setIsRecording] = useState(false);
  
  // Get the MAVLink connection
  const { sendMavlinkMessage, mavlinkState } = usePX4Connection();
  
  // Synchronize with the drone's actual state
  useEffect(() => {
    if (mavlinkState?.gimbalPitch !== undefined) {
      setGimbalPitch(mavlinkState.gimbalPitch);
    }
    if (mavlinkState?.cameraMode !== undefined) {
      setCameraMode(mavlinkState.cameraMode);
    }
    if (mavlinkState?.isRecording !== undefined) {
      setIsRecording(mavlinkState.isRecording);
    }
  }, [mavlinkState]);
  
  // Handler for gimbal pitch changes
  const handleGimbalPitchChange = (pitch) => {
    setGimbalPitch(pitch);
    
    sendMavlinkMessage({
      type: 'COMMAND_LONG',
      command: 'MAV_CMD_DO_MOUNT_CONTROL',
      param1: pitch,
      param2: 0,
      param3: 0,
      param7: 2,
      target_system: 1,
      target_component: 1
    });
  };
  
  // Handler for camera mode changes
  const handleCameraModeChange = (mode) => {
    setCameraMode(mode);
    
    sendMavlinkMessage({
      type: 'COMMAND_LONG',
      command: 'MAV_CMD_SET_CAMERA_MODE',
      param1: 0,
      param2: mode === 'photo' ? 0 : 1,
      target_system: 1,
      target_component: 1
    });
  };
  
  // Handler for camera trigger
  const handleTriggerCamera = () => {
    sendMavlinkMessage({
      type: 'COMMAND_LONG',
      command: 'MAV_CMD_DO_DIGICAM_CONTROL',
      param1: 0,
      param2: 0,
      param3: 0,
      param4: 0,
      param5: 1,
      param6: 0,
      param7: 0,
      target_system: 1,
      target_component: 1
    });
  };
  
  // Handler for video recording
  const handleToggleRecording = () => {
    const newRecordingState = !isRecording;
    setIsRecording(newRecordingState);
    
    sendMavlinkMessage({
      type: 'COMMAND_LONG',
      command: newRecordingState ? 'MAV_CMD_VIDEO_START_CAPTURE' : 'MAV_CMD_VIDEO_STOP_CAPTURE',
      param1: newRecordingState ? 1 : 0,
      param2: 0,
      target_system: 1,
      target_component: 1
    });
  };
  
  return (
    <>
      <button onClick={() => setIsPanelOpen(true)}>
        Open Drone Controls
      </button>
      
      {isPanelOpen && (
        <DronePositionControlPanel
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          initialPosition={dronePosition}
          onPositionChange={setDronePosition}
          initialCameraFollow={cameraFollows}
          onCameraFollowChange={setCameraFollows}
          gimbalPitch={gimbalPitch}
          onGimbalPitchChange={handleGimbalPitchChange}
          cameraMode={cameraMode}
          onCameraModeChange={handleCameraModeChange}
          isRecording={isRecording}
          onTriggerCamera={handleTriggerCamera}
          onToggleRecording={handleToggleRecording}
        />
      )}
    </>
  );
};

export default DroneControlPanel;
```

## Handling Different Camera Models

PX4 supports various camera systems, each with potentially different capabilities. When integrating:

1. **Check Camera Capabilities**: Some cameras only support photo mode, others support both photo and video
2. **Check Gimbal Range**: Different gimbals have different pitch ranges (typically -90° to 0° or -120° to +45°)
3. **Handle Camera Feedback**: Subscribe to MAVLink messages from the camera to update UI state

## Common PX4 Camera Systems

| Camera System | Photo | Video | Gimbal Control | Notes |
|---------------|-------|-------|---------------|-------|
| Sony QX1     | Yes   | No    | Yes           | Common with older PX4 setups |
| GoPro        | Yes   | Yes   | Depends       | Via GoPro MAVLink bridge |
| Phase One    | Yes   | No    | Yes           | High-resolution mapping |
| Yuneec E90   | Yes   | Yes   | Yes           | Full 3-axis gimbal |

## Troubleshooting

1. **No Camera Response**: Ensure the camera component ID is correct (usually 100)
2. **Gimbal Not Moving**: Check parameter MNT_MODE_IN is set to MAVLINK
3. **Commands Not Sent**: Verify MAVLink connection is established
4. **Camera Not Triggering**: Some cameras require specific timing between commands

## Resources

- [PX4 Camera Trigger Documentation](https://docs.px4.io/main/en/peripherals/camera.html)
- [MAVLink Camera Protocol](https://mavlink.io/en/services/camera.html)
- [PX4 MAVLink Interface](https://docs.px4.io/main/en/middleware/mavlink.html) 