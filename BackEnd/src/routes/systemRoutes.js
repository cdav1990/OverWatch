const express = require('express');
const router = express.Router();
const systemMonitorService = require('../services/systemMonitorService');

/**
 * GET /api/system/health
 * Returns the current system health metrics
 */
router.get('/health', async (req, res) => {
  try {
    const healthData = await systemMonitorService.getSystemHealth();
    res.json(healthData);
  } catch (error) {
    console.error('Error serving system health data:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve system health data',
      message: error.message 
    });
  }
});

module.exports = router; 