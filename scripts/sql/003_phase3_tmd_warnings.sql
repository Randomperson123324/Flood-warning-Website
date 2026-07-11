CREATE TABLE IF NOT EXISTS public.tmd_warnings (
    issue_no TEXT PRIMARY KEY,
    tmd_warnings_content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.tmd_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.tmd_warnings FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.tmd_warnings FOR INSERT WITH CHECK (true);
