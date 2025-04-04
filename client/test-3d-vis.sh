#!/bin/bash

# Test script for 3D visualization system (Cesium + Three.js)

echo "Starting 3D visualization test..."

# Run Cesium asset copy script first
echo "Copying Cesium assets..."
node scripts/copy-cesium-assets.cjs

# Check if server is already running, start if not
if ! curl -s http://localhost:3000/health > /dev/null; then
  echo "Starting server in background..."
  (cd ../server && npm run dev) &
  SERVER_PID=$!
  echo "Server started with PID $SERVER_PID"
  
  # Give the server time to start
  echo "Waiting for server to start..."
  sleep 5
else
  echo "Server already running"
fi

# Start the client dev server
echo "Starting client dev server..."
npm run dev

# When client is stopped, kill the server if we started it
if [ ! -z "$SERVER_PID" ]; then
  echo "Stopping server..."
  kill $SERVER_PID
fi

echo "Test complete." 