import { MavlinkClient } from '../mavlink/mavlink-client';
import { EventEmitter } from 'events';

/**
 * Utility class to simulate MAVLink messages for testing
 * This is useful when developing without a real drone connection
 */
export class MavlinkSimulator {
  private mavlinkClient: MavlinkClient;
  private simulationTimer: NodeJS.Timeout | null = null;
  private armed = false;
  private mode = 'POSITION';
  private lat = 37.7749;  // San Francisco default position
  private lon = -122.4194;
  private alt = 100; // meters
  private heading = 0; // degrees
  private isRunning = false;

  constructor(mavlinkClient: MavlinkClient) {
    this.mavlinkClient = mavlinkClient;
    
    // Override the connect method for testing
    const originalConnect = this.mavlinkClient.connect.bind(this.mavlinkClient);
    this.mavlinkClient.connect = async (): Promise<boolean> => {
      // We still want to emit events even if we don't actually connect to anything
      setTimeout(() => {
        (this.mavlinkClient as any).connected = true;
        (this.mavlinkClient as EventEmitter).emit('connected');
      }, 500);
      
      return true;
    };
  }

  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.simulationTimer = setInterval(() => {
      this.sendSimulatedMessages();
    }, 1000);
    
    console.log('MAVLink simulator started');
  }

  public stop(): void {
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
    
    this.isRunning = false;
    console.log('MAVLink simulator stopped');
  }

  public setArmed(armed: boolean): void {
    this.armed = armed;
  }

  public setMode(mode: string): void {
    this.mode = mode;
  }

  public setPosition(lat: number, lon: number, alt: number): void {
    this.lat = lat;
    this.lon = lon;
    this.alt = alt;
  }

  private sendSimulatedMessages(): void {
    // Simulate small movements
    this.lat += (Math.random() - 0.5) * 0.0001;
    this.lon += (Math.random() - 0.5) * 0.0001;
    this.alt += (Math.random() - 0.5) * 0.5;
    this.heading = (this.heading + 1) % 360;

    // Send heartbeat message
    (this.mavlinkClient as EventEmitter).emit('message', {
      name: 'HEARTBEAT',
      base_mode: this.armed ? 192 : 64, // Armed or disarmed flag
      custom_mode: this.getModeNumber(),
      system_status: 4, // MAV_STATE_ACTIVE
      mavlink_version: 3
    });

    // Send position message
    (this.mavlinkClient as EventEmitter).emit('message', {
      name: 'GLOBAL_POSITION_INT',
      lat: this.lat * 1e7,
      lon: this.lon * 1e7,
      alt: this.alt * 1000,
      hdg: this.heading * 100,
      time_boot_ms: Date.now()
    });

    // Send battery and status messages
    (this.mavlinkClient as EventEmitter).emit('message', {
      name: 'SYS_STATUS',
      voltage_battery: 12000, // 12V
      battery_remaining: 75
    });

    // Send VFR HUD data
    (this.mavlinkClient as EventEmitter).emit('message', {
      name: 'VFR_HUD',
      groundspeed: 5 + Math.random() * 2,
      climb: (Math.random() - 0.5) * 0.5
    });

    // Emit the heartbeat message directly to observers
    (this.mavlinkClient as EventEmitter).emit('heartbeat', {
      base_mode: this.armed ? 192 : 64,
      custom_mode: this.getModeNumber()
    });
  }

  private getModeNumber(): number {
    // Simplified PX4 mode mapping
    const modeMap: Record<string, number> = {
      'MANUAL': 0,
      'ALTITUDE': 1,
      'POSITION': 2,
      'AUTO': 3,
      'ACRO': 4,
      'OFFBOARD': 5,
      'STABILIZED': 6,
      'RATTITUDE': 7,
      'SIMPLE': 8
    };

    return modeMap[this.mode] || 2; // Default to POSITION mode
  }
} 