import * as ROSLIB from 'roslib';
import { EventEmitter } from 'events';
import { RosConnectionConfig } from '../types';

export class RosClient extends EventEmitter {
  private ros: ROSLIB.Ros | null = null;
  private connected: boolean = false;
  private config: RosConnectionConfig;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private subscribers: Map<string, ROSLIB.Topic> = new Map();

  constructor(config: RosConnectionConfig) {
    super();
    this.config = config;
    
    // Increase max event listeners to avoid warnings
    this.setMaxListeners(20);
  }

  public async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const url = `ws://${this.config.url}:${this.config.port}`;
        console.log(`Connecting to ROS at ${url}`);
        
        this.ros = new ROSLIB.Ros({ url });

        this.ros.on('connection', () => {
          this.connected = true;
          console.log('Connected to ROS');
          this.emit('connected');
          resolve(true);
          
          if (this.reconnectTimer) {
            clearInterval(this.reconnectTimer);
            this.reconnectTimer = null;
          }
        });

        this.ros.on('error', (error: any) => {
          console.error('ROS connection error:', error);
          
          // Log but don't rethrow the error
          if (!this.reconnectTimer) {
            this.startReconnectTimer();
          }
          resolve(false);
        });

        this.ros.on('close', () => {
          this.connected = false;
          console.log('ROS connection closed');
          this.emit('disconnected');
          if (!this.reconnectTimer) {
            this.startReconnectTimer();
          }
        });
      } catch (error) {
        console.error('Failed to connect to ROS:', error);
        if (!this.reconnectTimer) {
          this.startReconnectTimer();
        }
        resolve(false);
      }
    });
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public disconnect(): void {
    if (this.ros) {
      this.ros.close();
      this.ros = null;
      this.connected = false;
      
      // Clean up subscribers
      this.subscribers.forEach((topic) => {
        topic.unsubscribe();
      });
      this.subscribers.clear();
      
      if (this.reconnectTimer) {
        clearInterval(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    }
  }

  public subscribe<T extends object>(topicName: string, messageType: string, callback: (message: T) => void): void {
    if (!this.ros || !this.connected) {
      console.error('Cannot subscribe, not connected to ROS');
      return;
    }

    const topic = new ROSLIB.Topic({
      ros: this.ros,
      name: topicName,
      messageType: messageType
    });

    topic.subscribe((message: ROSLIB.Message) => {
      // Cast the ROSLIB.Message to T
      callback(message as unknown as T);
    });

    this.subscribers.set(topicName, topic);
    console.log(`Subscribed to ROS topic: ${topicName}`);
  }

  public publish<T extends object>(topicName: string, messageType: string, message: T): void {
    if (!this.ros || !this.connected) {
      console.error('Cannot publish, not connected to ROS');
      return;
    }

    const topic = new ROSLIB.Topic({
      ros: this.ros,
      name: topicName,
      messageType: messageType
    });

    const rosMessage = new ROSLIB.Message(message);
    topic.publish(rosMessage);
    console.log(`Published to ROS topic: ${topicName}`);
  }

  private startReconnectTimer(): void {
    this.reconnectTimer = setInterval(() => {
      if (!this.connected) {
        console.log('Attempting to reconnect to ROS...');
        this.connect();
      }
    }, 5000); // Try to reconnect every 5 seconds
  }
} 