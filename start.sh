#!/bin/bash

# Kill any existing processes on exit
trap 'kill $(jobs -p) 2>/dev/null' EXIT

# Start the backend server
echo "Starting backend server..."
cd server && npm run dev &
SERVER_PID=$!
echo "Server started (PID: $SERVER_PID)"

# Wait for server to initialize
sleep 2

# Start the client app
echo "Starting client app..."
cd client && npm run dev &
CLIENT_PID=$!
echo "Client started (PID: $CLIENT_PID)"

# Keep script running to maintain background processes
echo "Both server and client are running. Press Ctrl+C to stop both."
wait 