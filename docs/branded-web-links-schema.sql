-- Independent preview links created by administrators, not sales requests.
create table if not exists public.branded_web_links (
 id uuid primary key default gen_random_uuid(),
 token text not null unique,
 name text not null,
 url text not null,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.branded_web_links enable row level security;
revoke all on public.branded_web_links from anon, authenticated;
grant all on public.branded_web_links to service_role;
