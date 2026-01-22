-- Add flood_reports table for community flood reporting
CREATE TABLE IF NOT EXISTS flood_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  area_name TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'moderate', 'high', 'critical')),
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE flood_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for flood_reports
CREATE POLICY "Anyone can view flood reports" ON flood_reports FOR SELECT USING (true);
CREATE POLICY "Authenticated users can submit reports" ON flood_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_flood_reports_created_at ON flood_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flood_reports_area_name ON flood_reports(area_name);
