begin;
alter table public.calendar_push_subscriptions add column if not exists calendar_enabled boolean not null default true;
alter table public.calendar_push_subscriptions add column if not exists payments_enabled boolean not null default false;
alter table public.calendar_push_subscriptions add column if not exists payments_since timestamptz;
create table if not exists public.payment_push_deliveries (
 id bigint generated always as identity primary key,
 notification_key text not null,
 endpoint text not null references public.calendar_push_subscriptions(endpoint) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 payload jsonb not null, created_at timestamptz not null default now(),
 sent_at timestamptz, locked_until timestamptz, attempts integer not null default 0,
 unique(notification_key,endpoint)
);
alter table public.payment_push_deliveries enable row level security;
revoke all on public.payment_push_deliveries from public,anon,authenticated;
grant all on public.payment_push_deliveries to service_role;
grant usage,select on sequence public.payment_push_deliveries_id_seq to service_role;
create index if not exists payment_push_pending on public.payment_push_deliveries(created_at) where sent_at is null;
create or replace function public.claim_payment_push_deliveries()
returns setof public.payment_push_deliveries language sql security invoker set search_path='' as $$
 update public.payment_push_deliveries d set locked_until=now()+interval '2 minutes',attempts=d.attempts+1
 where d.id in (select id from public.payment_push_deliveries where sent_at is null and (locked_until is null or locked_until<now()) and created_at>now()-interval '7 days' order by created_at limit 20 for update skip locked) returning d.*;
$$;
revoke all on function public.claim_payment_push_deliveries() from public,anon,authenticated;
grant execute on function public.claim_payment_push_deliveries() to service_role;
-- The same authenticated worker also sends the morning digest at the configured hour.
select cron.schedule('althera-calendar-morning','* * * * *',$job$
 select net.http_post(url := 'https://althera.onrender.com/api/calendar-push/dispatch',headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||cron_secret),body := '{}'::jsonb,timeout_milliseconds := 120000) from public.calendar_push_config where exists(select 1 from public.calendar_push_subscriptions);
$job$);
select cron.schedule('althera-payment-push-cleanup','30 3 * * *',$job$ delete from public.payment_push_deliveries where created_at<now()-interval '30 days'; $job$);
commit;
