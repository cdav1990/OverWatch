import dotenv from 'dotenv';
import { ServerConfig } from './types';

// Load environment variables
dotenv.config();

const config: ServerConfig = {
  port: parseInt(process.env.SERVER_PORT || '3000', 10),
  ros: {
    url: process.env.ROS_MASTER_URI || 'localhost',
    port: parseInt(process.env.ROS_PORT || '9090', 10), // Default for rosbridge
  },
  mavlink: {
    port: parseInt(process.env.MAVLINK_PORT || '14550', 10), // Default for SITL
    host: process.env.MAVLINK_HOST || 'localhost',
    isUdp: process.env.MAVLINK_PROTOCOL === 'udp',
  }
};

export default config; 