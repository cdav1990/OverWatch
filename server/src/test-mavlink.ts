/**
 * Test script for MAVLink messaging
 * Run with: npx ts-node src/test-mavlink.ts
 */

import { MavlinkClient } from './mavlink/mavlink-client';
import { MavlinkSimulator } from './utils/test-utils';

const main = async () => {
  console.log('Starting MAVLink test...');
  
  // Create MAVLink client
  const mavlinkClient = new MavlinkClient({
    port: 14550,
    host: 'localhost',
    isUdp: true
  });
  
  // Set up listeners
  mavlinkClient.on('connected', () => {
    console.log('MAVLink connected');
  });
  
  mavlinkClient.on('state', (state) => {
    console.log('Drone state updated:', state);
  });
  
  mavlinkClient.on('heartbeat', (msg) => {
    console.log('Heartbeat received:', msg);
  });
  
  mavlinkClient.on('position', (pos) => {
    console.log('Position update:', pos);
  });
  
  mavlinkClient.on('battery', (battery) => {
    console.log('Battery update:', battery);
  });
  
  // Create simulator
  const simulator = new MavlinkSimulator(mavlinkClient);
  
  // Connect to MAVLink (this actually just sets up the simulator)
  await mavlinkClient.connect();
  
  // Start the simulator
  simulator.start();
  
  // Arm the drone after 5 seconds
  setTimeout(() => {
    console.log('Arming drone...');
    simulator.setArmed(true);
  }, 5000);
  
  // Change mode after 10 seconds
  setTimeout(() => {
    console.log('Changing mode to AUTO...');
    simulator.setMode('AUTO');
  }, 10000);
  
  // Run for 30 seconds then exit
  setTimeout(() => {
    console.log('Test complete. Shutting down...');
    simulator.stop();
    process.exit(0);
  }, 30000);
};

// Start the test
main().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
}); 