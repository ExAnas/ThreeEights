-- Run once in Supabase Dashboard > SQL Editor.
create table if not exists public.user_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_app_state enable row level security;

drop policy if exists "Users can read own state" on public.user_app_state;
create policy "Users can read own state"
on public.user_app_state
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own state" on public.user_app_state;
create policy "Users can insert own state"
on public.user_app_state
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own state" on public.user_app_state;
create policy "Users can update own state"
on public.user_app_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update on table public.user_app_state to authenticated;
