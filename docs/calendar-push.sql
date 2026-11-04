-- Althera only. Service-role endpoints enforce the existing admin allowlist.
create table if not exists public.calendar_push_config (
 id boolean primary key default true check(id), public_key text not null, private_key text not null, cron_secret text not null
);
create table if not exists public.calendar_push_subscriptions (
 endpoint text primary key, user_id uuid not null references auth.users(id) on delete cascade,
 subscription jsonb not null, timezone text not null, reminder_time text not null,
 updated_at timestamptz not null default now()
);
create table if not exists public.calendar_push_deliveries (
 endpoint text not null references public.calendar_push_subscriptions(endpoint) on delete cascade,
 day date not null, created_at timestamptz not null default now(), primary key(endpoint,day)
);
alter table public.calendar_push_config enable row level security;
alter table public.calendar_push_subscriptions enable row level security;
alter table public.calendar_push_deliveries enable row level security;
revoke all on public.calendar_push_config,public.calendar_push_subscriptions,public.calendar_push_deliveries from public,anon,authenticated;
grant all on public.calendar_push_config,public.calendar_push_subscriptions,public.calendar_push_deliveries to service_role;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
-- Calls the existing backend even when it is asleep; no browser needs to be open.
select cron.schedule('althera-calendar-morning','*/5 * * * *',$job$
 select net.http_post(
 url := 'https://althera.onrender.com/api/calendar-push/dispatch',
 headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||cron_secret),
 body := '{}'::jsonb, timeout_milliseconds := 120000
 ) from public.calendar_push_config where exists(select 1 from public.calendar_push_subscriptions);
$job$);
select cron.schedule('althera-calendar-cleanup','20 3 * * *',$job$
 delete from public.calendar_push_deliveries where day < current_date - 30;
$job$);
