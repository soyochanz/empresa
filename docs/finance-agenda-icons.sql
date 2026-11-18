CREATE TABLE IF NOT EXISTS public.finance_agenda_icons (
 group_key text PRIMARY KEY CHECK (length(group_key) BETWEEN 1 AND 250),
 icon text NOT NULL DEFAULT '' CHECK (length(icon)<=180000),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_agenda_icons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.finance_agenda_icons FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.finance_agenda_icons TO service_role;
