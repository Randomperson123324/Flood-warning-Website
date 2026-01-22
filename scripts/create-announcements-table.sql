-- Create the announcements table for cross-device communication
CREATE TABLE IF NOT EXISTS announcements (
  id BIGSERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('banner', 'popup')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, created_at);

-- Enable Row Level Security
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (adjust as needed)
CREATE POLICY "Allow all operations on announcements" ON announcements
  FOR ALL USING (true);
