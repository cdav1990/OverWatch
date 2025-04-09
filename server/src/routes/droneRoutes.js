const express = require('express');
const router = express.Router();

// Mock drone state data for development
let mockDroneState = {
  armed: false,
  mode: 'STABILIZE',
  batteryVoltage: 12.2,
  batteryPercentage: 75,
  latitude: 37.7749,
  longitude: -122.4194,
  altitude: 50,
  heading: 45,
  groundSpeed: 0,
  verticalSpeed: 0
};

/**
 * GET /api/drone/state
 * Returns the current drone state
 */
router.get('/state', (req, res) => {
  res.json(mockDroneState);
});

/**
 * POST /api/drone/arm
 * Arms the drone (dev mode only)
 */
router.post('/arm', (req, res) => {
  mockDroneState.armed = true;
  res.json({ success: true, message: 'Drone armed' });
});

/**
 * POST /api/drone/disarm
 * Disarms the drone (dev mode only)
 */
router.post('/disarm', (req, res) => {
  mockDroneState.armed = false;
  res.json({ success: true, message: 'Drone disarmed' });
});

/**
 * POST /api/drone/mode
 * Sets the drone flight mode (dev mode only)
 */
router.post('/mode', (req, res) => {
  const { mode } = req.body;
  
  if (!mode) {
    return res.status(400).json({ success: false, message: 'Mode not specified' });
  }
  
  mockDroneState.mode = mode;
  res.json({ success: true, message: `Mode set to ${mode}` });
});

module.exports = router; 