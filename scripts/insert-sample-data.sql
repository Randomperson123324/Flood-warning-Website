-- Insert some sample data for testing (in centimeters)
INSERT INTO water_readings (level, temperature, sensor_id) VALUES
  (25.5, 23.2, 'raspberry_pi_1'),
  (28.2, 23.1, 'raspberry_pi_1'),
  (31.1, 23.3, 'raspberry_pi_1'),
  (35.0, 23.4, 'raspberry_pi_1'),
  (42.2, 23.5, 'raspberry_pi_1');

-- Insert readings with timestamps spread over the last 24 hours (in cm)
INSERT INTO water_readings (timestamp, level, temperature, sensor_id) VALUES
  (NOW() - INTERVAL '23 hours', 15.1, 22.8, 'raspberry_pi_1'),
  (NOW() - INTERVAL '22 hours', 18.2, 22.9, 'raspberry_pi_1'),
  (NOW() - INTERVAL '21 hours', 22.1, 23.0, 'raspberry_pi_1'),
  (NOW() - INTERVAL '20 hours', 26.3, 23.1, 'raspberry_pi_1'),
  (NOW() - INTERVAL '19 hours', 30.2, 23.2, 'raspberry_pi_1'),
  (NOW() - INTERVAL '18 hours', 34.1, 23.3, 'raspberry_pi_1'),
  (NOW() - INTERVAL '17 hours', 38.0, 23.4, 'raspberry_pi_1'),
  (NOW() - INTERVAL '16 hours', 41.9, 23.5, 'raspberry_pi_1'),
  (NOW() - INTERVAL '15 hours', 45.8, 23.6, 'raspberry_pi_1'),
  (NOW() - INTERVAL '14 hours', 48.7, 23.7, 'raspberry_pi_1');
