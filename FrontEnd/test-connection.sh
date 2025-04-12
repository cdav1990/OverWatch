#!/bin/bash

# Start the server if it's not already running
echo "Starting server..."
cd ../server && npm run dev &
SERVER_PID=$!
cd ../client

# Wait for server to start
sleep 5

# Start the client in development mode
echo "Starting client..."
npm run dev &
CLIENT_PID=$!

# Wait for client to start
sleep 5

echo -e "\nTesting connection..."
echo "1. Open the client in your browser at http://localhost:5173"
echo "2. Check the console for 'Socket connected:' message"
echo "3. The telemetry component should show 'Connected' with mock data"

echo -e "\nPress Enter to stop both server and client"
read

echo "Stopping client and server..."
kill $CLIENT_PID
kill $SERVER_PID

echo "Test complete." 