#!/bin/bash

# Kill any existing processes on exit
trap 'kill $(jobs -p) 2>/dev/null' EXIT

# Get the base directory where the script is located
BASE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Start the backend server
echo "Starting backend server..."
cd "$BASE_DIR/BackEnd" && npm run dev &
SERVER_PID=$!
echo "Server started (PID: $SERVER_PID)"

# Wait for server to initialize
sleep 2

# Start the client app
echo "Starting client app..."
cd "$BASE_DIR/FrontEnd" && npm run dev &
CLIENT_PID=$!
echo "Client started (PID: $CLIENT_PID)"

# Keep script running to maintain background processes
echo "Both server and client are running. Press Ctrl+C to stop both."
wait 