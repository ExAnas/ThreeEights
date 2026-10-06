-- Run once in Supabase Dashboard > SQL Editor.
create table if not exists public.user_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_app_state enable row level security;
alter table public.user_app_state replica identity full;

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

-- Saves only when the incoming state is at least as new as the cloud state.
-- This prevents an older device from overwriting a newer cycle.
create or replace function public.save_user_app_state(next_state jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.user_app_state (user_id, state, updated_at)
  values (auth.uid(), next_state, now())
  on conflict (user_id) do update
    set state = excluded.state,
        updated_at = now()
  where coalesce((public.user_app_state.state->>'updatedAt')::bigint, 0)
      <= coalesce((excluded.state->>'updatedAt')::bigint, 0);
$$;

grant execute on function public.save_user_app_state(jsonb) to authenticated;

-- Enable realtime updates for this table. Safe to run more than once.
do $$
begin
  alter publication supabase_realtime add table public.user_app_state;
exception
  when duplicate_object then null;
end
$$;
