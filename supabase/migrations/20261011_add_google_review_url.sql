alter table public.restaurants
  add column if not exists google_review_url text;

alter table public.waiter_calls
  drop constraint if exists waiter_calls_call_type_check;

alter table public.waiter_calls
  add constraint waiter_calls_call_type_check
  check (
    call_type in (
      'call_waiter',
      'clean_table',
      'bill_card',
      'bill_cash',
      'low_rating'
    )
  );

notify pgrst, 'reload schema';
