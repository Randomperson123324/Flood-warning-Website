-- Delete old sample data first (optional)
-- DELETE FROM water_readings WHERE sensor_id = 'raspberry_pi_1';

-- Insert fresh sample data with recent timestamps (past 7 days)
INSERT INTO water_readings (timestamp, level, temperature, sensor_id) VALUES
  -- Today's data (every 2 hours)
  (NOW() - INTERVAL '2 hours', 42.2, 23.5, 'raspberry_pi_1'),
  (NOW() - INTERVAL '4 hours', 38.1, 23.4, 'raspberry_pi_1'),
  (NOW() - INTERVAL '6 hours', 35.0, 23.3, 'raspberry_pi_1'),
  (NOW() - INTERVAL '8 hours', 31.1, 23.2, 'raspberry_pi_1'),
  (NOW() - INTERVAL '10 hours', 28.2, 23.1, 'raspberry_pi_1'),
  (NOW() - INTERVAL '12 hours', 25.5, 23.0, 'raspberry_pi_1'),

  -- Yesterday's data
  (NOW() - INTERVAL '1 day 2 hours', 45.8, 23.6, 'raspberry_pi_1'),
  (NOW() - INTERVAL '1 day 6 hours', 41.9, 23.5, 'raspberry_pi_1'),
  (NOW() - INTERVAL '1 day 12 hours', 38.0, 23.4, 'raspberry_pi_1'),
  (NOW() - INTERVAL '1 day 18 hours', 34.1, 23.3, 'raspberry_pi_1'),

  -- 2 days ago
  (NOW() - INTERVAL '2 days 4 hours', 48.7, 23.7, 'raspberry_pi_1'),
  (NOW() - INTERVAL '2 days 8 hours', 44.2, 23.6, 'raspberry_pi_1'),
  (NOW() - INTERVAL '2 days 16 hours', 40.5, 23.5, 'raspberry_pi_1'),

  -- 3 days ago
  (NOW() - INTERVAL '3 days 6 hours', 52.1, 23.8, 'raspberry_pi_1'),
  (NOW() - INTERVAL '3 days 12 hours', 47.3, 23.7, 'raspberry_pi_1'),
  (NOW() - INTERVAL '3 days 20 hours', 43.8, 23.6, 'raspberry_pi_1'),

  -- 4 days ago
  (NOW() - INTERVAL '4 days 8 hours', 39.2, 23.4, 'raspberry_pi_1'),
  (NOW() - INTERVAL '4 days 14 hours', 35.7, 23.3, 'raspberry_pi_1'),

  -- 5 days ago
  (NOW() - INTERVAL '5 days 10 hours', 33.1, 23.2, 'raspberry_pi_1'),
  (NOW() - INTERVAL '5 days 18 hours', 29.8, 23.1, 'raspberry_pi_1'),

  -- 6 days ago
  (NOW() - INTERVAL '6 days 12 hours', 26.5, 22.9, 'raspberry_pi_1'),
  (NOW() - INTERVAL '6 days 20 hours', 23.2, 22.8, 'raspberry_pi_1');

-- Verify the data was inserted
SELECT 
  DATE(timestamp) as date,
  COUNT(*) as readings_count,
  ROUND(AVG(level), 1) as avg_level
FROM water_readings 
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
