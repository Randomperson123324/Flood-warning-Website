#!/bin/bash

# Install Python dependencies for Raspberry Pi 5
echo "Installing Python dependencies for Raspberry Pi 5..."

# Update package list
sudo apt update

# Install pip if not already installed
sudo apt install -y python3-pip

# Install gpiozero (comes pre-installed on Raspberry Pi OS but ensure latest)
sudo apt install -y python3-gpiozero

# Install required Python packages
pip3 install supabase gpiozero

echo ""
echo "Dependencies installed successfully!"
echo ""
echo "Before running the script, update these values in raspberry-pi-sensor.py:"
echo "  - SUPABASE_URL: Your Supabase project URL"
echo "  - SUPABASE_KEY: Your Supabase anon key"
echo "  - TANK_HEIGHT_CM: Your tank height in centimeters"
echo "  - SENSOR_HEIGHT_FROM_BOTTOM: Sensor height from tank bottom"
echo ""
echo "Run the sensor script with: python3 raspberry-pi-sensor.py"
