# Drone Control Server

This server provides communication between the web client, ROS, and MAVLink for drone control.

## Features

- WebSocket-based real-time communication with the web client
- ROS integration via roslib
- MAVLink drone control via the mavlink library
- Support for both TCP and UDP connections to MAVLink
- Development mode with a drone simulator for testing without hardware

## Prerequisites

- Node.js 16+
- npm or yarn
- For ROS integration: ROS with rosbridge_server running
- For MAVLink integration: A drone running PX4 or ArduPilot, or SITL simulator

## Installation

```bash
# Install dependencies
npm install
```

## Configuration

Create a `.env` file in the server root directory based on the provided `.env.example`:

```
# Server configuration
SERVER_PORT=3000

# ROS configuration
ROS_MASTER_URI=localhost
ROS_PORT=9090

# MAVLink configuration
MAVLINK_PORT=14550
MAVLINK_HOST=localhost
MAVLINK_PROTOCOL=udp  # udp or tcp
```

## Running the Server

### Development Mode

In development mode, a drone simulator is automatically enabled, which provides simulated MAVLink data.

```bash
npm run dev
```

### Production Mode

```bash
# Build TypeScript to JavaScript
npm run build

# Run the server
NODE_ENV=production npm start
```

## Testing

### MAVLink Simulator

To test the MAVLink functionality independently:

```bash
npx ts-node src/test-mavlink.ts
```

### ROS Testing

To test ROS communication, ensure you have rosbridge running:

```bash
# In a terminal with ROS environment set up
roslaunch rosbridge_server rosbridge_websocket.launch
```

## API Endpoints

- `GET /health` - Server health check
- `GET /api/drone/state` - Current drone state

### Development Endpoints (only in dev mode)

- `POST /api/dev/sim/arm` - Arm the simulated drone
- `POST /api/dev/sim/disarm` - Disarm the simulated drone
- `POST /api/dev/sim/mode` - Set the flight mode (body: `{ "mode": "AUTO" }`)

## WebSocket Events

The server uses Socket.IO for real-time communication:

### Client to Server

- `drone:command` - Send a command to the drone

### Server to Client

- `drone:state` - Drone state updates
- `drone:heartbeat` - Heartbeat signal from the drone

## Architecture

The server is organized in a modular way:

- `src/ros/` - ROS communication code
- `src/mavlink/` - MAVLink communication code
- `src/services/` - Higher-level services
- `src/utils/` - Utility functions and testing tools
- `src/types/` - TypeScript type definitions 