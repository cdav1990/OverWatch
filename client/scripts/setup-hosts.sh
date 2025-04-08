#!/bin/bash

# Define the hostname to add
HOSTNAME="overwatch.local"
HOSTS_FILE="/etc/hosts"
HOSTS_ENTRY="127.0.0.1 ${HOSTNAME}"

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    echo "This script must be run as root or with sudo to modify ${HOSTS_FILE}"
    echo "Please run: sudo $0"
    exit 1
fi

# Check if the entry already exists
if grep -q "^127.0.0.1[[:space:]]*${HOSTNAME}$" "${HOSTS_FILE}"; then
    echo "${HOSTNAME} is already in ${HOSTS_FILE}"
else
    # Add the entry
    echo "${HOSTS_ENTRY}" >> "${HOSTS_FILE}"
    echo "Added ${HOSTNAME} to ${HOSTS_FILE}"
fi

echo ""
echo "Setup complete! You can now access the application at:"
echo "http://${HOSTNAME}:5173"
echo ""
echo "To start the application, run: npm run dev" 