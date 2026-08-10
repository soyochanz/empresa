-- Run once in the SQL Editor of the Althera Supabase project.
-- It materializes each due recurring concept as an immutable ledger movement.
-- The deterministic primary key makes retries, several browser tabs and Cron idempotent.

create extension if not exists pg_cron with schema pg_catalog;

create index if not exists finance_transactions_recurring_date_idx
 on public.finance_transactions ("isRecurring", date)
 where "isRecurring" is true;

-- This maintenance helper must never be callable through PostgREST.
do $$
begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
  execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
 end if;
end;
$$;

create or replace function public.finance_recurrence_date(
 p_source_date date,
 p_period text,
 p_occurrence_index integer
)
returns date
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
 v_period text := coalesce(lower(p_period), 'monthly');
 v_target_month date;
 v_target_year integer;
 v_day integer;
begin
 if p_occurrence_index < 0 then
  raise exception 'Occurrence index cannot be negative';
 end if;

 if v_period in ('weekly', 'semanal') then
  return p_source_date + (p_occurrence_index * 7);
 end if;

 if v_period in ('yearly', 'anual') then
  v_target_year := extract(year from p_source_date)::integer + p_occurrence_index;
  v_day := least(
   extract(day from p_source_date)::integer,
   extract(day from (
    make_date(v_target_year, extract(month from p_source_date)::integer, 1)
    + interval '1 month - 1 day'
   ))::integer
  );
  return make_date(v_target_year, extract(month from p_source_date)::integer, v_day);
 end if;

 v_target_month := (
  date_trunc('month', p_source_date)::date
  + make_interval(months => p_occurrence_index)
 )::date;
 v_day := least(
  extract(day from p_source_date)::integer,
  extract(day from (v_target_month + interval '1 month - 1 day'))::integer
 );
 return v_target_month + (v_day - 1);
end;
$$;

create or replace function public.materialize_due_finance_recurrences(
 p_through_date date default current_date
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
 v_inserted integer := 0;
begin
 with recursive due as (
  select
   template.id as source_id,
   template.user_id,
   template.type,
   template.category,
   template.amount,
   template.date::date as source_date,
   template.description,
   template."recurrencePeriod" as recurrence_period,
   0 as occurrence_index,
   template.date::date as scheduled_date
  from public.finance_transactions as template
  where template."isRecurring" is true
   and template.date ~ '^\d{4}-\d{2}-\d{2}'
   and template.date::date <= p_through_date

  union all

  select
   due.source_id,
   due.user_id,
   due.type,
   due.category,
   due.amount,
   due.source_date,
   due.description,
   due.recurrence_period,
   due.occurrence_index + 1,
   public.finance_recurrence_date(due.source_date, due.recurrence_period, due.occurrence_index + 1)
  from due
  where public.finance_recurrence_date(
   due.source_date,
   due.recurrence_period,
   due.occurrence_index + 1
  ) <= p_through_date
 ), prepared as (
  select
   due.source_id || '__rec__' || to_char(due.scheduled_date, 'YYYYMMDD') as id,
   due.user_id,
   due.type,
   due.category,
   abs(coalesce(
    case when due.occurrence_index = 0
     then nullif(substring(due.description from '\[FA:([0-9]+[.]?[0-9]*)\]'), '')::numeric
     else nullif(substring(due.description from '\[NA:([0-9]+[.]?[0-9]*)\]'), '')::numeric
    end,
    due.amount
   )) as amount,
   due.scheduled_date::text as date,
   coalesce(due.description, '')
    || case when due.type = 'income'
     then ' (Ingreso recurrente automático)'
     else ' (Gasto recurrente automático)'
    end
    || ' [RECUR_SOURCE:' || due.source_id || ']'
    || ' [RECUR_DATE:' || due.scheduled_date::text || ']' as description
  from due
 )
 insert into public.finance_transactions (
  id, user_id, type, category, amount, date, description,
  "isRecurring", "recurrencePeriod", status
 )
 select
  prepared.id,
  prepared.user_id,
  prepared.type,
  prepared.category,
  prepared.amount,
  prepared.date,
  prepared.description,
  false,
  null,
  'paid'
 from prepared
 where prepared.amount > 0
 on conflict (id) do nothing;

 get diagnostics v_inserted = row_count;
 return v_inserted;
end;
$$;

-- These are internal maintenance functions. They are not exposed through /rest/v1/rpc.
revoke all on function public.finance_recurrence_date(date, text, integer) from public, anon, authenticated;
revoke all on function public.materialize_due_finance_recurrences(date) from public, anon, authenticated;
grant execute on function public.finance_recurrence_date(date, text, integer) to service_role;
grant execute on function public.materialize_due_finance_recurrences(date) to service_role;

-- Backfill all due dates now, then keep the ledger current every day at 00:05 UTC.
select public.materialize_due_finance_recurrences(current_date);
select cron.schedule(
 'finance-materialize-recurrences',
 '5 0 * * *',
 'select public.materialize_due_finance_recurrences(current_date);'
);
