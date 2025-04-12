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

export interface HeartbeatMessage {
  timestamp: string;
} 