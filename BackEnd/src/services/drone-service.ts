import { EventEmitter } from 'events';
import { RosClient } from '../ros/ros-client';
import { MavlinkClient } from '../mavlink/mavlink-client';
import { DroneState } from '../types';

export class DroneService extends EventEmitter {
  private rosClient: RosClient;
  private mavlinkClient: MavlinkClient;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(rosClient: RosClient, mavlinkClient: MavlinkClient) {
    super();
    this.rosClient = rosClient;
    this.mavlinkClient = mavlinkClient;

    // Set up event listeners
    this.registerEventHandlers();
  }

  public async connect(): Promise<{ ros: boolean; mavlink: boolean }> {
    const rosConnected = await this.rosClient.connect();
    const mavlinkConnected = await this.mavlinkClient.connect();

    if (mavlinkConnected) {
      this.startHeartbeat();
    }

    // Publish ROS connection status
    if (rosConnected) {
      this.publishToRos('/drone/connection_status', 'std_msgs/String', {
        data: JSON.stringify({
          mavlink: mavlinkConnected ? 'connected' : 'disconnected',
          timestamp: new Date().toISOString()
        })
      });
    }

    return {
      ros: rosConnected,
      mavlink: mavlinkConnected
    };
  }

  public disconnect(): void {
    this.stopHeartbeat();
    this.rosClient.disconnect();
    this.mavlinkClient.disconnect();
  }

  public getState(): DroneState {
    return this.mavlinkClient.getState();
  }

  public publishDroneStateToRos(): void {
    if (!this.rosClient.isConnected()) {
      return;
    }

    const state = this.getState();
    this.publishToRos('/drone/state', 'std_msgs/String', {
      data: JSON.stringify(state)
    });
  }

  private registerEventHandlers(): void {
    // Handle MAVLink state changes
    this.mavlinkClient.on('state', (state: DroneState) => {
      this.emit('state', state);
      this.publishDroneStateToRos();
    });

    this.mavlinkClient.on('heartbeat', () => {
      this.emit('heartbeat');
    });

    // Set up ROS subscribers for commands
    this.setupRosSubscribers();
  }

  private setupRosSubscribers(): void {
    // Subscribe to command topics when ROS is connected
    this.rosClient.on('connected', () => {
      this.rosClient.subscribe<any>('/drone/command', 'std_msgs/String', (message) => {
        try {
          const command = JSON.parse(message.data);
          this.handleCommand(command);
        } catch (error) {
          console.error('Failed to parse command:', error);
        }
      });

      // Subscribe to other topics as needed
    });
  }

  private handleCommand(command: any): void {
    // Process commands received from ROS
    console.log('Received command:', command);

    // Handle different command types
    switch (command.type) {
      case 'ARM':
        // Implement arming logic
        console.log('ARM command received');
        break;
        
      case 'DISARM':
        // Implement disarming logic
        console.log('DISARM command received');
        break;
        
      case 'SET_MODE':
        // Implement mode change logic
        console.log(`SET_MODE command received: ${command.mode}`);
        break;
        
      default:
        console.log(`Unknown command type: ${command.type}`);
        break;
    }
  }

  private publishToRos(topic: string, messageType: string, message: any): void {
    if (this.rosClient.isConnected()) {
      this.rosClient.publish(topic, messageType, message);
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      return;
    }

    // Send heartbeat every second
    this.heartbeatInterval = setInterval(() => {
      if (this.mavlinkClient.isConnected()) {
        this.mavlinkClient.sendHeartbeat()
          .catch(err => {
            console.warn('Failed to send heartbeat:', err.message);
          });
      }
    }, 1000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
} 