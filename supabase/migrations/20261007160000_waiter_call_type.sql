-- Guest table requests: waiter, clean table, bill by card, bill by cash.

do $$
declare
  v_call_waiter constant text := 'call_waiter';
  v_clean_table constant text := 'clean_table';
  v_bill_card constant text := 'bill_card';
  v_bill_cash constant text := 'bill_cash';
begin
  alter table public.waiter_calls
    add column if not exists call_type text not null default 'call_waiter';

  update public.waiter_calls
    set call_type = v_call_waiter
    where call_type is null or btrim(call_type) = '';

  alter table public.waiter_calls
    drop constraint if exists waiter_calls_call_type_check;

  execute format(
    'alter table public.waiter_calls add constraint waiter_calls_call_type_check check (call_type in (%L, %L, %L, %L))',
    v_call_waiter,
    v_clean_table,
    v_bill_card,
    v_bill_cash
  );
end $$;
