import { io, Socket } from 'socket.io-client';
import { DroneState, HeartbeatMessage } from '../types/drone';

// Define the server URL
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private reconnectTimer: number | null = null;

  // Connect to the WebSocket server
  connect(): void {
    if (this.socket) {
      return; // Already connected
    }

    // Create socket connection
    this.socket = io(SOCKET_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
    });

    // Setup connection event handlers
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  // Disconnect from the WebSocket server
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // Check if socket is connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Subscribe to drone state updates
  onDroneState(callback: (state: DroneState) => void): void {
    this.socket?.on('drone:state', callback);
  }

  // Subscribe to heartbeat updates
  onHeartbeat(callback: (heartbeat: HeartbeatMessage) => void): void {
    this.socket?.on('drone:heartbeat', callback);
  }

  // Unsubscribe from drone state updates
  offDroneState(callback: (state: DroneState) => void): void {
    this.socket?.off('drone:state', callback);
  }

  // Unsubscribe from heartbeat updates
  offHeartbeat(callback: (heartbeat: HeartbeatMessage) => void): void {
    this.socket?.off('drone:heartbeat', callback);
  }

  // Send a command to the drone
  sendCommand(command: any): void {
    if (this.socket?.connected) {
      this.socket.emit('drone:command', command);
    } else {
      console.error('Cannot send command: Socket not connected');
    }
  }
}

// Create a singleton instance
const socketService = new SocketService();

export default socketService; 