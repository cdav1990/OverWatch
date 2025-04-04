declare module 'mavlink' {
  import { EventEmitter } from 'events';
  
  class MAVLink extends EventEmitter {
    constructor(system: number, component: number);
    parseBuffer(buffer: Buffer): void;
    createMessage(messageType: string, data: any): Buffer;
  }
  
  export = MAVLink;
} 