create table if not exists public.payment_forecast_exclusions (
 payment_key text primary key check (length(payment_key) between 1 and 300),
 excluded boolean not null default true,
 updated_at timestamptz not null default now(),
 updated_by uuid not null
);
alter table public.payment_forecast_exclusions enable row level security;
revoke all on public.payment_forecast_exclusions from public, anon, authenticated;
grant select, insert, update on public.payment_forecast_exclusions to service_role;
comment on table public.payment_forecast_exclusions is 'Admin-only forecast visibility. Never cancels Stripe or deletes financial history.';
