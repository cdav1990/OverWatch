import mavlink from 'mavlink';
import { EventEmitter } from 'events';
import { MavlinkConnectionConfig, DroneState } from '../types';
import dgram from 'dgram';
import net from 'net';

export class MavlinkClient extends EventEmitter {
  private config: MavlinkConnectionConfig;
  private mavlinkParser: any;
  private connection: dgram.Socket | net.Socket | null = null;
  private connected: boolean = false;
  private droneState: DroneState = {
    armed: false,
    mode: 'UNKNOWN',
    batteryVoltage: 0,
    batteryPercentage: 0,
    latitude: 0,
    longitude: 0,
    altitude: 0,
    heading: 0,
    groundSpeed: 0,
    verticalSpeed: 0
  };
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(config: MavlinkConnectionConfig) {
    super();
    this.config = config;
    this.mavlinkParser = new mavlink(1, 1); // Using MAVLink 1 protocol
  }

  public async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.initializeParser();

        if (this.config.isUdp) {
          this.connectUdp();
        } else {
          this.connectTcp();
        }

        setTimeout(() => {
          if (this.connected) {
            resolve(true);
          } else {
            console.error('MAVLink connection timeout');
            this.emit('error', new Error('Connection timeout'));
            resolve(false);
          }
        }, 5000);
      } catch (error) {
        console.error('Failed to connect to MAVLink:', error);
        this.emit('error', error);
        resolve(false);
      }
    });
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getState(): DroneState {
    return { ...this.droneState };
  }

  public disconnect(): void {
    if (this.connection) {
      if (this.config.isUdp) {
        (this.connection as dgram.Socket).close();
      } else {
        (this.connection as net.Socket).end();
      }
      this.connection = null;
      this.connected = false;
      
      if (this.reconnectTimer) {
        clearInterval(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    }
  }

  public async sendHeartbeat(): Promise<void> {
    if (!this.connected) {
      console.error('Cannot send heartbeat, not connected to MAVLink');
      return;
    }

    const heartbeat = {
      type: 6, // Type for GCS
      autopilot: 8, // Autopilot type: Generic
      base_mode: 192, // MAV_MODE_FLAG_SAFETY_ARMED | MAV_MODE_FLAG_CUSTOM_MODE_ENABLED
      custom_mode: 0,
      system_status: 4, // MAV_STATE_ACTIVE
      mavlink_version: 3
    };

    this.sendMessage('HEARTBEAT', heartbeat);
  }

  private initializeParser(): void {
    // Set up message handlers
    this.mavlinkParser.on('message', (message: any) => {
      // Handle received MAVLink messages
      this.processMessage(message);
    });

    this.mavlinkParser.on('ready', () => {
      console.log('MAVLink parser ready');
    });

    this.mavlinkParser.on('error', (error: Error) => {
      console.error('MAVLink parser error:', error);
      this.emit('error', error);
    });
  }

  private connectUdp(): void {
    const udpSocket = dgram.createSocket('udp4');
    this.connection = udpSocket;

    udpSocket.on('listening', () => {
      const address = udpSocket.address();
      console.log(`MAVLink UDP listening on ${address.address}:${address.port}`);
    });

    udpSocket.on('message', (message: Buffer) => {
      this.connected = true;
      this.emit('connected');
      this.mavlinkParser.parseBuffer(message);
    });

    udpSocket.on('error', (error: Error) => {
      console.error('MAVLink UDP error:', error);
      this.emit('error', error);
      this.connected = false;
      this.startReconnectTimer();
    });

    udpSocket.on('close', () => {
      console.log('MAVLink UDP connection closed');
      this.connected = false;
      this.emit('disconnected');
      this.startReconnectTimer();
    });

    // Bind to port
    const host = this.config.host || '0.0.0.0';
    udpSocket.bind(this.config.port, host);
  }

  private connectTcp(): void {
    const tcpSocket = new net.Socket();
    this.connection = tcpSocket;

    tcpSocket.on('connect', () => {
      console.log(`MAVLink TCP connected to ${this.config.host}:${this.config.port}`);
      this.connected = true;
      this.emit('connected');
    });

    tcpSocket.on('data', (data: Buffer) => {
      this.mavlinkParser.parseBuffer(data);
    });

    tcpSocket.on('error', (error: Error) => {
      console.error('MAVLink TCP error:', error);
      this.emit('error', error);
      this.connected = false;
      this.startReconnectTimer();
    });

    tcpSocket.on('close', () => {
      console.log('MAVLink TCP connection closed');
      this.connected = false;
      this.emit('disconnected');
      this.startReconnectTimer();
    });

    // Connect to host
    const host = this.config.host || 'localhost';
    tcpSocket.connect(this.config.port, host);
  }

  private processMessage(message: any): void {
    // Process different MAVLink message types
    switch (message.name) {
      case 'HEARTBEAT':
        this.emit('heartbeat', message);
        // Extract flight mode
        this.droneState.mode = this.decodeMode(message);
        this.droneState.armed = (message.base_mode & 128) !== 0; // Check if armed bit is set
        break;
        
      case 'GLOBAL_POSITION_INT':
        this.droneState.latitude = message.lat / 1e7;
        this.droneState.longitude = message.lon / 1e7;
        this.droneState.altitude = message.alt / 1000;
        this.droneState.heading = message.hdg / 100;
        this.emit('position', {
          lat: this.droneState.latitude,
          lon: this.droneState.longitude,
          alt: this.droneState.altitude,
          hdg: this.droneState.heading
        });
        break;
        
      case 'VFR_HUD':
        this.droneState.groundSpeed = message.groundspeed;
        this.droneState.verticalSpeed = message.climb;
        break;
        
      case 'SYS_STATUS':
        this.droneState.batteryVoltage = message.voltage_battery / 1000;
        this.droneState.batteryPercentage = message.battery_remaining;
        this.emit('battery', {
          voltage: this.droneState.batteryVoltage,
          percentage: this.droneState.batteryPercentage
        });
        break;
        
      default:
        // Unhandled message type
        break;
    }
    
    // Emit a state update
    this.emit('state', this.getState());
  }

  private decodeMode(heartbeat: any): string {
    // This is a simplified mode decoder - different autopilots have different mode mappings
    const customMode = heartbeat.custom_mode;
    
    // PX4 flight mode mapping (simplified)
    const PX4Modes: Record<number, string> = {
      0: 'MANUAL',
      1: 'ALTITUDE',
      2: 'POSITION',
      3: 'AUTO',
      4: 'ACRO',
      5: 'OFFBOARD',
      6: 'STABILIZED',
      7: 'RATTITUDE',
      8: 'SIMPLE'
    };
    
    // ArduPilot mode mapping would be different
    return PX4Modes[customMode] || 'UNKNOWN';
  }

  private sendMessage(messageType: string, data: any): void {
    if (!this.connection || !this.connected) {
      console.error(`Cannot send ${messageType}, not connected`);
      return;
    }

    try {
      const buffer = this.mavlinkParser.createMessage(messageType, data);
      
      if (this.config.isUdp) {
        const udpSocket = this.connection as dgram.Socket;
        udpSocket.send(buffer, this.config.port, this.config.host || 'localhost');
      } else {
        const tcpSocket = this.connection as net.Socket;
        tcpSocket.write(buffer);
      }
    } catch (error) {
      console.error(`Error sending ${messageType}:`, error);
      this.emit('error', error);
    }
  }

  private startReconnectTimer(): void {
    if (this.reconnectTimer) {
      return;
    }
    
    this.reconnectTimer = setInterval(() => {
      if (!this.connected) {
        console.log('Attempting to reconnect to MAVLink...');
        this.connect();
      }
    }, 5000); // Try to reconnect every 5 seconds
  }
} 