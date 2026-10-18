-- Shift bulletin board notes, visible to all restaurant staff.

create or replace function public.is_restaurant_member(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin()
    or (
      public.jwt_email() <> ''
      and (
        exists (
          select 1
          from public.restaurants r
          where r.id = p_restaurant_id
            and lower(trim(coalesce(r.manager_email, ''))) = public.jwt_email()
        )
        or exists (
          select 1
          from public.restaurant_staff s
          where s.restaurant_id = p_restaurant_id
            and lower(trim(s.email)) = public.jwt_email()
        )
      )
    );
$$;

create or replace function public.is_restaurant_manager_or_owner(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_restaurant_owner(p_restaurant_id)
    or (
      public.jwt_email() <> ''
      and exists (
        select 1
        from public.restaurant_staff s
        where s.restaurant_id = p_restaurant_id
          and lower(trim(s.email)) = public.jwt_email()
          and s.role in ('owner', 'manager')
      )
    );
$$;

grant execute on function public.is_restaurant_member(uuid)
  to anon, authenticated, service_role;
grant execute on function public.is_restaurant_manager_or_owner(uuid)
  to anon, authenticated, service_role;

create table if not exists public.shift_notes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null
    references public.restaurants (id)
    on update cascade
    on delete cascade,
  title text not null default '',
  body text not null default '',
  author_email text not null default '',
  author_role text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint shift_notes_body_check
    check (char_length(btrim(body)) > 0)
);

create index if not exists shift_notes_restaurant_created_idx
  on public.shift_notes (restaurant_id, created_at desc);

alter table public.shift_notes enable row level security;
alter table public.shift_notes replica identity full;

drop policy if exists shift_notes_select_members on public.shift_notes;
create policy shift_notes_select_members
  on public.shift_notes
  for select
  to authenticated
  using (public.is_restaurant_member(restaurant_id));

drop policy if exists shift_notes_insert_managers on public.shift_notes;
create policy shift_notes_insert_managers
  on public.shift_notes
  for insert
  to authenticated
  with check (public.is_restaurant_manager_or_owner(restaurant_id));

drop policy if exists shift_notes_update_managers on public.shift_notes;
create policy shift_notes_update_managers
  on public.shift_notes
  for update
  to authenticated
  using (public.is_restaurant_manager_or_owner(restaurant_id))
  with check (public.is_restaurant_manager_or_owner(restaurant_id));

drop policy if exists shift_notes_delete_managers on public.shift_notes;
create policy shift_notes_delete_managers
  on public.shift_notes
  for delete
  to authenticated
  using (public.is_restaurant_manager_or_owner(restaurant_id));

do $$
begin
  alter publication supabase_realtime add table public.shift_notes;
exception
  when duplicate_object then
    null;
end;
$$;

notify pgrst, 'reload schema';
