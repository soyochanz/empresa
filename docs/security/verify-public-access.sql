SET LOCAL ROLE anon;
DO $test$ BEGIN
 IF EXISTS(SELECT 1 FROM public.finance_transactions) OR EXISTS(SELECT 1 FROM public.contacts) OR EXISTS(SELECT 1 FROM public.comerciales_accounts) OR EXISTS(SELECT 1 FROM public.finance_invoices) THEN RAISE EXCEPTION 'Anonymous access still exposed'; END IF;
END $test$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $test$ BEGIN IF EXISTS(SELECT 1 FROM public.finance_transactions) OR EXISTS(SELECT 1 FROM public.contacts) THEN RAISE EXCEPTION 'Non-admin access still exposed'; END IF; END $test$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','711ab85b-db59-447c-93df-1951d24b133f',true);
SET LOCAL ROLE authenticated;
DO $test$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.finance_transactions) THEN RAISE EXCEPTION 'Admin access broken'; END IF; END $test$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','c2eef079-4ab8-4711-8641-4a5f0fd4a14e',true);
SET LOCAL ROLE authenticated;
DO $test$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.finance_transactions) THEN RAISE EXCEPTION 'Second admin access broken'; END IF; END $test$;
RESET ROLE;