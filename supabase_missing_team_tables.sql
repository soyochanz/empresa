-- Tablas faltantes detectadas en Supabase para sincronización de equipo.
-- Ejecutar en Supabase SQL Editor del proyecto Althera.

CREATE TABLE IF NOT EXISTS demo_sites (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 "businessType" TEXT,
 "publicUrl" TEXT NOT NULL,
 "adminUrl" TEXT,
 "imageUrl" TEXT,
 "supabaseUrl" TEXT,
 "supabaseAnonKey" TEXT,
 "stripePublishableKey" TEXT,
 "adminUser" TEXT,
 "adminPassword" TEXT,
 notes TEXT,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE demo_sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Access" ON demo_sites;
DROP POLICY IF EXISTS "Public Insert Access" ON demo_sites;
DROP POLICY IF EXISTS "Public Update Access" ON demo_sites;
DROP POLICY IF EXISTS "Public Delete Access" ON demo_sites;
CREATE POLICY "Public Read Access" ON demo_sites FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON demo_sites FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON demo_sites FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON demo_sites FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS marketing_items (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 status TEXT,
 channel TEXT,
 metric TEXT,
 notes TEXT,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE marketing_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Access" ON marketing_items;
DROP POLICY IF EXISTS "Public Insert Access" ON marketing_items;
DROP POLICY IF EXISTS "Public Update Access" ON marketing_items;
DROP POLICY IF EXISTS "Public Delete Access" ON marketing_items;
CREATE POLICY "Public Read Access" ON marketing_items FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON marketing_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON marketing_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON marketing_items FOR DELETE USING (true);
