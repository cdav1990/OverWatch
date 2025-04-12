#!/bin/bash

# Start the server in the background
echo "Starting server..."
npm run dev &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Test health endpoint
echo -e "\nTesting health endpoint:"
curl http://localhost:3000/health

# Test getting drone state
echo -e "\n\nTesting drone state endpoint:"
curl http://localhost:3000/api/drone/state

# Test simulator controls (development mode only)
echo -e "\n\nTesting simulator arming:"
curl -X POST http://localhost:3000/api/dev/sim/arm

sleep 1
echo -e "\n\nGetting updated drone state (should be armed):"
curl http://localhost:3000/api/drone/state

echo -e "\n\nSetting flight mode to AUTO:"
curl -X POST -H "Content-Type: application/json" -d '{"mode": "AUTO"}' http://localhost:3000/api/dev/sim/mode

sleep 1
echo -e "\n\nGetting updated drone state (should be in AUTO mode):"
curl http://localhost:3000/api/drone/state

echo -e "\n\nTesting simulator disarming:"
curl -X POST http://localhost:3000/api/dev/sim/disarm

sleep 1
echo -e "\n\nGetting final drone state (should be disarmed):"
curl http://localhost:3000/api/drone/state

# Kill the server
echo -e "\n\nTest complete. Stopping server..."
kill $SERVER_PID

echo -e "\nTest script completed." 