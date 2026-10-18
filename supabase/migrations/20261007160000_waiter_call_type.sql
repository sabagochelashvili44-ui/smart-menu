-- Guest table requests: waiter, clean table, bill by card, bill by cash.

alter table public.waiter_calls
  add column if not exists call_type text not null default 'call_waiter';

update public.waiter_calls
  set call_type = 'call_waiter'
  where call_type is null or btrim(call_type) = '';

alter table public.waiter_calls
  drop constraint if exists waiter_calls_call_type_check;

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
