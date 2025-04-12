export interface DroneState {
  armed: boolean;
  mode: string;
  batteryVoltage: number;
  batteryPercentage: number;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  groundSpeed: number;
  verticalSpeed: number;
}

export interface RosConnectionConfig {
  url: string;
  port: number;
}

export interface MavlinkConnectionConfig {
  port: number;
  baudRate?: number;
  host?: string;
  isUdp?: boolean;
}

export interface ServerConfig {
  port: number;
  ros: RosConnectionConfig;
  mavlink: MavlinkConnectionConfig;
} 