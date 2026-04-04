-- Rate limit function: checks if user can send a message (1 message per second)
CREATE OR REPLACE FUNCTION check_message_rate_limit(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  last_message_time TIMESTAMP WITH TIME ZONE;
  rate_limit_seconds INTEGER := 1;
BEGIN
  -- Get the timestamp of the user's most recent message
  SELECT created_at INTO last_message_time
  FROM messages
  WHERE user_id = user_uuid
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no previous message, allow the insert
  IF last_message_time IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if enough time has passed since last message
  IF (NOW() - last_message_time) >= (rate_limit_seconds || ' seconds')::INTERVAL THEN
    RETURN TRUE;
  END IF;

  -- Rate limit exceeded
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing insert policies for messages table that we want to replace
DROP POLICY IF EXISTS "Users can insert own messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON messages;

-- Create new insert policy with rate limiting
CREATE POLICY "Authenticated users can insert messages with rate limit"
ON messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND check_message_rate_limit(auth.uid())
);

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_message_rate_limit(UUID) TO authenticated;
