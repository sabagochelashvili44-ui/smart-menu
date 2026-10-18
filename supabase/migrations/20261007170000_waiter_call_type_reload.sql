-- Ensure call_type exists and refresh PostgREST schema cache.

alter table public.waiter_calls
  add column if not exists call_type text not null default 'call_waiter';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'waiter_calls_call_type_check'
  ) then
    alter table public.waiter_calls
      add constraint waiter_calls_call_type_check
      check (
        call_type in (
          'call_waiter',
          'clean_table',
          'bill_card',
          'bill_cash'
        )
      );
  end if;
end;
$$;

notify pgrst, 'reload schema';
