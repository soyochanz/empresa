-- Server-only web offer records. Apply to Althera's project, never Bites.
create table if not exists public.web_offer_requests (
 id uuid primary key default gen_random_uuid(), demo_token text not null unique,
 plan text not null check (plan in ('essential','business','professional')),
 name text not null, email text not null, phone text not null,
 business_name text not null, business_type text not null, maps_url text, brief text,
 colors jsonb not null default '[]', assets jsonb not null default '[]',
 status text not null default 'requested' check(status in ('requested','designing','review','changes','approved','active','past_due','canceled')),
 demo_url text, feedback text, consent_at timestamptz not null, consent_version text not null,
 approved_at timestamptz, approved_terms text,
 stripe_customer_id text, stripe_subscription_id text, checkout_session_id text,
 checkout_generation integer not null default 0, checkout_lock_until timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists web_offer_requests_email_idx on public.web_offer_requests(email);
create table if not exists public.web_offer_tickets (
 id uuid primary key default gen_random_uuid(), request_id uuid not null references public.web_offer_requests(id),
 email text not null, subject text not null, message text not null, reply text,
 status text not null default 'open' check(status in ('open','answered','closed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists web_offer_tickets_email_idx on public.web_offer_tickets(email);
alter table public.web_offer_requests enable row level security;
alter table public.web_offer_tickets enable row level security;
revoke all on public.web_offer_requests, public.web_offer_tickets from anon, authenticated;
grant all on public.web_offer_requests, public.web_offer_tickets to service_role;
-- All access through server-authenticated endpoints, no public RLS policies.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('web-offer-assets','web-offer-assets',false,1200000,array['image/png','image/jpeg','image/webp'])
on conflict(id) do nothing;
