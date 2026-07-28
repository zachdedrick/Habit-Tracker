-- Weekly bonuses: extra completions that don't belong to a specific day
-- but count toward the weekly total completion rate.

create table if not exists public.weekly_bonuses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  week_id    uuid not null references public.weeks(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

alter table public.weekly_bonuses enable row level security;

create policy "Users manage own weekly bonuses"
  on public.weekly_bonuses
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
