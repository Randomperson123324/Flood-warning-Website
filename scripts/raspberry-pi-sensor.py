#!/usr/bin/env python3
"""
Raspberry Pi 5 Water Level Sensor Script
Measures water level in open water (river, canal, drain, etc.)
Compatible with Raspberry Pi 5 using gpiozero library
"""

import time
from datetime import datetime
from gpiozero import DistanceSensor
from supabase import create_client, Client

# GPIO pins for ultrasonic sensor (BCM numbering)
# TRIG = GPIO 18, ECHO = GPIO 24
TRIG_PIN = 18
ECHO_PIN = 24

# Supabase configuration - Replace with your actual values
SUPABASE_URL = "your_supabase_url_here"
SUPABASE_KEY = "your_supabase_anon_key_here"

# Sensor configuration
# Height of the sensor from the ground/bottom (in cm)
# Example: If sensor is mounted 150cm above the ground, set this to 150
SENSOR_HEIGHT_CM = 150

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize ultrasonic sensor using gpiozero (compatible with Pi 5)
# max_distance is in meters (4m = 400cm range for deeper measurements)
sensor = DistanceSensor(echo=ECHO_PIN, trigger=TRIG_PIN, max_distance=4)

def measure_distance():
    """Measure distance from sensor to water surface"""
    # gpiozero returns distance in meters, convert to cm
    distance_m = sensor.distance
    distance_cm = distance_m * 100
    return distance_cm

def calculate_water_level(distance_to_water_cm):
    """
    Calculate water level (height from ground/bottom)
    
    Sensor is mounted at SENSOR_HEIGHT_CM above ground
    Distance measured is from sensor to water surface
    Water level = Sensor height - Distance to water
    """
    water_level_cm = SENSOR_HEIGHT_CM - distance_to_water_cm
    
    # Ensure water level is not negative (sensor error or no water)
    water_level_cm = max(0, water_level_cm)
    
    return water_level_cm

def send_to_supabase(water_level_cm):
    """Send water level data to Supabase"""
    try:
        data = {
            "level": round(water_level_cm, 2),
            "sensor_id": "raspberry_pi_1",
            "timestamp": datetime.now().isoformat()
        }
        
        result = supabase.table("water_readings").insert(data).execute()
        print(f"Data sent successfully: {data}")
        return True
        
    except Exception as e:
        print(f"Error sending data to Supabase: {e}")
        return False

def main():
    """Main loop"""
    print("Raspberry Pi 5 Water Level Monitoring Started...")
    print(f"Using GPIO pins: TRIG={TRIG_PIN}, ECHO={ECHO_PIN}")
    print(f"Sensor height from ground: {SENSOR_HEIGHT_CM} cm")
    print("-" * 50)
    
    try:
        while True:
            # Take multiple readings and average them for accuracy
            distances = []
            for _ in range(5):
                distance = measure_distance()
                if distance > 0:  # Only include valid readings
                    distances.append(distance)
                time.sleep(0.1)
            
            if distances:
                # Calculate average distance to water surface
                avg_distance = sum(distances) / len(distances)
                
                # Calculate water level (height from ground)
                water_level = calculate_water_level(avg_distance)
                
                # Print readings
                print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}]")
                print(f"  Distance to water: {avg_distance:.2f} cm")
                print(f"  Water level: {water_level:.2f} cm")
                
                # Send to Supabase
                send_to_supabase(water_level)
            else:
                print("No valid readings obtained")
            
            # Wait before next reading (30 seconds)
            time.sleep(30)
            
    except KeyboardInterrupt:
        print("\nMonitoring stopped by user")
    except Exception as e:
        print(f"Error in main loop: {e}")
    finally:
        sensor.close()
        print("Sensor cleanup complete")

if __name__ == "__main__":
    main()
