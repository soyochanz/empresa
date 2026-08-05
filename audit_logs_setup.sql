-- Registro de auditoría global para Althera.
-- Ejecutar una vez en el SQL Editor del proyecto Supabase de Althera.

create table if not exists public.audit_logs (
 id text primary key,
 actor_type text not null check (actor_type in ('user', 'system')),
 actor_id text,
 actor_name text not null,
 actor_email text,
 source text not null check (source in ('ui', 'navigation', 'auth', 'data', 'system')),
 action text not null,
 description text not null,
 entity_type text,
 entity_id text,
 screen text,
 severity text not null default 'info' check (severity in ('info', 'warning', 'error')),
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default timezone('utc'::text, now()),
 search_document tsvector generated always as (
  to_tsvector('simple',
   coalesce(action, '') || ' ' ||
   coalesce(description, '') || ' ' ||
   coalesce(actor_name, '') || ' ' ||
   coalesce(actor_email, '') || ' ' ||
   coalesce(screen, '') || ' ' ||
   coalesce(entity_type, '')
  )
 ) stored
);

alter table public.audit_logs enable row level security;

revoke all on table public.audit_logs from anon, authenticated;
grant insert on table public.audit_logs to anon, authenticated;
grant select on table public.audit_logs to authenticated;

drop policy if exists "Authenticated users can read audit logs" on public.audit_logs;
create policy "Authenticated users can read audit logs"
on public.audit_logs for select
to authenticated
using (true);

drop policy if exists "Internal clients can append safe audit logs" on public.audit_logs;
create policy "Internal clients can append safe audit logs"
on public.audit_logs for insert
to anon, authenticated
with check (
 actor_type in ('user', 'system')
 and source in ('ui', 'navigation', 'auth', 'data', 'system')
 and severity in ('info', 'warning', 'error')
 and char_length(actor_name) between 1 and 160
 and char_length(coalesce(actor_email, '')) <= 320
 and char_length(action) between 1 and 80
 and char_length(description) between 1 and 500
 and pg_column_size(metadata) <= 8192
 and (actor_type = 'system' or actor_email is not null)
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_type_created_idx on public.audit_logs (actor_type, created_at desc);
create index if not exists audit_logs_actor_email_created_idx on public.audit_logs (actor_email, created_at desc) where actor_email is not null;
create index if not exists audit_logs_source_created_idx on public.audit_logs (source, created_at desc);
create index if not exists audit_logs_search_idx on public.audit_logs using gin (search_document);

create or replace function public.capture_althera_data_change()
returns trigger
language plpgsql
as $$
declare
 record_json jsonb;
 record_id text;
 jwt_email text;
 resolved_actor_type text;
begin
 record_json := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
 record_id := record_json ->> 'id';
 jwt_email := auth.jwt() ->> 'email';
 resolved_actor_type := case when auth.uid() is null then 'system' else 'user' end;

 insert into public.audit_logs (
  id, actor_type, actor_id, actor_name, actor_email, source, action,
  description, entity_type, entity_id, screen, severity, metadata
 ) values (
  gen_random_uuid()::text,
  resolved_actor_type,
  auth.uid()::text,
  case when resolved_actor_type = 'user' then coalesce(jwt_email, 'Usuario autenticado') else 'Sistema de datos' end,
  jwt_email,
  'data',
  lower(tg_op),
  format('%s en %s', case tg_op when 'INSERT' then 'Creación' when 'UPDATE' then 'Actualización' else 'Eliminación' end, tg_table_name),
  tg_table_name,
  record_id,
  null,
  'info',
  jsonb_build_object('table', tg_table_name, 'operation', tg_op)
 );
 return case when tg_op = 'DELETE' then old else new end;
end;
$$;

grant execute on function public.capture_althera_data_change() to anon, authenticated;

do $$
declare
 table_name text;
begin
 foreach table_name in array array[
  'contacts', 'events', 'notes', 'activities', 'profiles', 'inquiries',
  'projects', 'finance_transactions', 'finance_invoices', 'contracts_althera',
  'cold_calling_leads', 'cold_calling_groups', 'comercial_leads',
  'comerciales_accounts', 'demo_sites', 'marketing_items', 'landing_partners'
 ] loop
  if to_regclass('public.' || table_name) is not null then
   execute format('drop trigger if exists althera_audit_change on public.%I', table_name);
   execute format(
    'create trigger althera_audit_change after insert or update or delete on public.%I for each row execute function public.capture_althera_data_change()',
    table_name
   );
  end if;
 end loop;
end;
$$;

comment on table public.audit_logs is 'Registro append-only de actividad de usuarios, sistema y cambios de datos de Althera.';
