import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import config from './config';
import { RosClient } from './ros/ros-client';
import { MavlinkClient } from './mavlink/mavlink-client';
import { DroneService } from './services/drone-service';
import { SocketService } from './services/socket-service';
import { MavlinkSimulator } from './utils/test-utils';

// Determine if we're in development mode
const isDev = process.env.NODE_ENV !== 'production';

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize clients
const rosClient = new RosClient(config.ros);
const mavlinkClient = new MavlinkClient(config.mavlink);

// Set up simulator for development
let simulator: MavlinkSimulator | null = null;
if (isDev) {
  simulator = new MavlinkSimulator(mavlinkClient);
  console.log('Development mode: MAVLink simulator enabled');
}

// Initialize drone service
const droneService = new DroneService(rosClient, mavlinkClient);

// Initialize socket service
const socketService = new SocketService(server, droneService);

// Basic health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    connections: {
      ros: rosClient.isConnected(),
      mavlink: mavlinkClient.isConnected()
    }
  });
});

// Get current drone state
app.get('/api/drone/state', (req: Request, res: Response) => {
  res.status(200).json(droneService.getState());
});

// Test endpoint to control simulator
if (isDev) {
  app.post('/api/dev/sim/arm', (req: Request, res: Response) => {
    if (simulator) {
      simulator.setArmed(true);
      res.status(200).json({ success: true, message: 'Simulator armed' });
    } else {
      res.status(500).json({ success: false, message: 'Simulator not available' });
    }
  });

  app.post('/api/dev/sim/disarm', (req: Request, res: Response) => {
    if (simulator) {
      simulator.setArmed(false);
      res.status(200).json({ success: true, message: 'Simulator disarmed' });
    } else {
      res.status(500).json({ success: false, message: 'Simulator not available' });
    }
  });

  app.post('/api/dev/sim/mode', (req: Request, res: Response) => {
    if (simulator && req.body.mode) {
      simulator.setMode(req.body.mode);
      res.status(200).json({ success: true, message: `Mode set to ${req.body.mode}` });
    } else {
      res.status(400).json({ success: false, message: 'Simulator not available or mode not specified' });
    }
  });
}

// Setup error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // Don't exit in development mode
  if (!isDev) {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  // Don't exit in development mode
  if (!isDev) {
    process.exit(1);
  }
});

// Connect to ROS and MAVLink on server start
const startServer = async () => {
  try {
    const connections = await droneService.connect();
    console.log('Connection status:', connections);

    // Start simulator in development mode
    if (isDev && simulator) {
      simulator.start();
    }

    server.listen(config.port, () => {
      console.log(`Server running on port ${config.port} in ${isDev ? 'development' : 'production'} mode`);
      console.log(`Server is connected to: ROS=${connections.ros}, MAVLink=${connections.mavlink}`);
      
      if (isDev && !connections.ros) {
        console.log('Note: ROS connection failed but continuing in development mode');
        console.log('To test ROS functionality, please start rosbridge_server');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    if (!isDev) {
      process.exit(1);
    } else {
      console.log('Error encountered but continuing in development mode');
    }
  }
};

// Handle graceful shutdown
const shutdown = () => {
  console.log('Shutting down server...');
  
  // Stop simulator if running
  if (isDev && simulator) {
    simulator.stop();
  }
  
  droneService.disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the server
startServer();

// For testing purposes - log a message when connections are established
rosClient.on('connected', () => {
  console.log('ROS client connected');
  
  // Test subscription
  rosClient.subscribe('/test/hello', 'std_msgs/String', (message: any) => {
    console.log('Received message from ROS:', message);
  });
  
  // Test publication
  rosClient.publish('/test/hello_back', 'std_msgs/String', {
    data: 'Hello from Node.js!'
  });
});

mavlinkClient.on('connected', () => {
  console.log('MAVLink client connected');
});

mavlinkClient.on('heartbeat', (msg: any) => {
  console.log('Received heartbeat from drone');
}); 