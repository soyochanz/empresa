-- Containment: no customer rows or Stripe objects are modified.
-- Apply inside a transaction. Keep service_role access unchanged.
-- The two UUIDs were verified against confirmed auth.users in Althera.
DO $containment$
DECLARE t record; op text;
admin_check constant text := $$((select auth.uid()) in ('c2eef079-4ab8-4711-8641-4a5f0fd4a14e'::uuid,'711ab85b-db59-447c-93df-1951d24b133f'::uuid))$$;
predicate text;
BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p') LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t.relname);
  FOREACH op IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
   predicate := admin_check;
   -- These two catalogs are intentionally rendered on public pages.
   IF op='SELECT' AND t.relname IN ('demo_sites','landing_partners') THEN predicate := 'true'; END IF;
   -- Public contact form can only submit, never read back inquiries.
   IF op='INSERT' AND t.relname='inquiries' THEN
    predicate := admin_check || $$ OR (coalesce(archived,false)=false AND length(name) BETWEEN 1 AND 200 AND length(email) BETWEEN 3 AND 320 AND length(message) BETWEEN 1 AND 10000)$$;
   END IF;
   EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I','security_boundary_'||lower(op),t.relname);
   EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR %s TO anon, authenticated %s',
    'security_boundary_'||lower(op),t.relname,op,
    CASE WHEN op='INSERT' THEN 'WITH CHECK ('||predicate||')'
     WHEN op='UPDATE' THEN 'USING ('||predicate||') WITH CHECK ('||predicate||')'
     ELSE 'USING ('||predicate||')' END);
  END LOOP;
 END LOOP;
END;
$containment$;
-- Do not allow commercial RPCs to bypass the table boundaries.
ALTER FUNCTION public.set_commercial_presence(text,text,text,text) SECURITY INVOKER;
ALTER FUNCTION public.heartbeat_commercial_presence(text) SECURITY INVOKER;
ALTER FUNCTION public.log_commercial_activity(text,text,text,text,text,text,text,jsonb) SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
