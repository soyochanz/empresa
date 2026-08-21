-- Short URLs for new Stripe Checkout Sessions.
-- This migration intentionally does not read, rewrite, or backfill any
-- previously generated Stripe links.

CREATE TABLE IF NOT EXISTS public.stripe_short_links (
  slug TEXT PRIMARY KEY CHECK (slug ~ '^[a-f0-9]{8}$'),
  stripe_url TEXT NOT NULL CHECK (stripe_url ~ '^https://(checkout|buy)\.stripe\.com/'),
  stripe_checkout_session_id TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL,
  pending_tx_id TEXT,
  stripe_plan_id TEXT,
  concept TEXT,
  click_count BIGINT NOT NULL DEFAULT 0 CHECK (click_count >= 0),
  last_clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS stripe_short_links_client_id_idx
  ON public.stripe_short_links (client_id);

CREATE INDEX IF NOT EXISTS stripe_short_links_created_at_idx
  ON public.stripe_short_links (created_at DESC);

ALTER TABLE public.stripe_short_links ENABLE ROW LEVEL SECURITY;

-- No browser-facing RLS policies are created. Only the backend, authenticated
-- with SUPABASE_SERVICE_ROLE_KEY, can resolve or create these mappings.
REVOKE ALL ON TABLE public.stripe_short_links FROM anon, authenticated;

COMMENT ON TABLE public.stripe_short_links IS
  'Server-only mappings for compact Stripe checkout URLs created after this migration.';
