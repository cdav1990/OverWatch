import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { DroneService } from './drone-service';
import { DroneState } from '../types';

export class SocketService {
  private io: SocketIOServer;
  private droneService: DroneService;

  constructor(server: HttpServer, droneService: DroneService) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    
    this.droneService = droneService;
    this.setupSocketHandlers();
    this.setupDroneEventHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('Client connected:', socket.id);
      
      // Send initial state to the client
      this.sendDroneState(socket);
      
      // Handle client commands
      socket.on('drone:command', (command: any) => {
        console.log('Received command from client:', command);
        // Forward commands to ROS
        this.handleClientCommand(command);
      });
      
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  private setupDroneEventHandlers(): void {
    // Forward drone state updates to all connected clients
    this.droneService.on('state', (state: DroneState) => {
      this.broadcastDroneState(state);
    });
    
    this.droneService.on('heartbeat', () => {
      this.io.emit('drone:heartbeat', { timestamp: new Date().toISOString() });
    });
  }

  private sendDroneState(socket: Socket): void {
    const state = this.droneService.getState();
    socket.emit('drone:state', state);
  }

  private broadcastDroneState(state: DroneState): void {
    this.io.emit('drone:state', state);
  }

  private handleClientCommand(command: any): void {
    // Convert client commands to ROS commands if needed
    // For now, just pass through
  }
} 