-- First-party website analytics: privacy-conscious event ledger.
CREATE TABLE IF NOT EXISTS website_analytics_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  visitor_id UUID NOT NULL,
  session_id UUID NOT NULL,
  event_name TEXT NOT NULL CHECK (event_name IN ('page_view', 'contact_intent', 'portal_open')),
  path TEXT NOT NULL DEFAULT '/',
  referrer_host TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT NOT NULL DEFAULT 'desktop',
  country_code TEXT
);

CREATE INDEX IF NOT EXISTS website_analytics_events_created_at_idx ON website_analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS website_analytics_events_event_created_idx ON website_analytics_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS website_analytics_events_source_created_idx ON website_analytics_events (utm_source, referrer_host, created_at DESC);

ALTER TABLE website_analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Analytics events insert only" ON website_analytics_events FOR INSERT WITH CHECK (true);
