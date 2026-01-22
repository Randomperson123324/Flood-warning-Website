-- Create the water_readings table
CREATE TABLE IF NOT EXISTS water_readings (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  level DECIMAL(6,2) NOT NULL CHECK (level >= 0 AND level <= 500), -- Changed to allow up to 500cm
  temperature DECIMAL(4,1),
  sensor_id VARCHAR(50) NOT NULL DEFAULT 'raspberry_pi_1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index on timestamp for faster queries
CREATE INDEX IF NOT EXISTS idx_water_readings_timestamp ON water_readings(timestamp);

-- Create an index on sensor_id for filtering
CREATE INDEX IF NOT EXISTS idx_water_readings_sensor_id ON water_readings(sensor_id);

-- Enable Row Level Security (optional, for additional security)
ALTER TABLE water_readings ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (adjust as needed)
CREATE POLICY "Allow all operations on water_readings" ON water_readings
  FOR ALL USING (true);
