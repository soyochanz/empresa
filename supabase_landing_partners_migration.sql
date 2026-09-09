-- Run once in the Supabase SQL Editor for the Althera project.
BEGIN;
-- Empresas mostradas en el carrusel de la landing
CREATE TABLE IF NOT EXISTS landing_partners (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 logo_url TEXT NOT NULL,
 website TEXT,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE landing_partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Access" ON landing_partners;
DROP POLICY IF EXISTS "Public Insert Access" ON landing_partners;
DROP POLICY IF EXISTS "Public Update Access" ON landing_partners;
DROP POLICY IF EXISTS "Public Delete Access" ON landing_partners;
CREATE POLICY "Public Read Access" ON landing_partners FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON landing_partners FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON landing_partners FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON landing_partners FOR DELETE USING (true);



GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_partners TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
