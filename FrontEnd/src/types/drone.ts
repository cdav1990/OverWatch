export interface DroneState {
  armed: boolean;
  mode: string;
  batteryVoltage: number;
  batteryPercentage: number;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number; // Represents the drone's orientation in radians (0 to 2π), where 0 is north, π/2 is east, π is south, and 3π/2 is west.
  groundSpeed: number;
  verticalSpeed: number;
}

export interface HeartbeatMessage {
  timestamp: string;
} 