-- Function to automatically clean up old announcements
CREATE OR REPLACE FUNCTION cleanup_old_announcements()
RETURNS void AS $$
BEGIN
  -- Delete announcements older than 30 days
  DELETE FROM announcements 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Log the cleanup (optional)
  RAISE NOTICE 'Cleaned up old announcements older than 30 days';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup daily (if pg_cron extension is available)
-- Note: This requires the pg_cron extension to be enabled in your Supabase project
-- You can enable it in Database > Extensions in your Supabase dashboard

-- Uncomment the following lines if you have pg_cron enabled:
-- SELECT cron.schedule('cleanup-announcements', '0 2 * * *', 'SELECT cleanup_old_announcements();');

-- Alternative: Manual cleanup query you can run periodically
-- DELETE FROM announcements WHERE created_at < NOW() - INTERVAL '30 days';
