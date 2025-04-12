const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const systemRoutes = require('./routes/systemRoutes');
const systemMonitorService = require('./services/systemMonitorService');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Setup CORS for API routes
app.use(cors());
app.use(express.json());

// Setup Socket.IO for real-time data
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Apply API Routes
app.use('/api/system', systemRoutes);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    connections: {
      ros: true,  // This would normally be dynamically determined
      mavlink: true
    }
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Send system health updates every second to connected clients
  const healthInterval = setInterval(async () => {
    try {
      const healthData = await systemMonitorService.getSystemHealth();
      socket.emit('system:health', healthData);
    } catch (error) {
      console.error('Error sending health update via socket:', error);
    }
  }, 1000);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    clearInterval(healthInterval);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server }; 