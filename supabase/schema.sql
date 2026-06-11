-- Habit Tracker schema
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query)

create extension if not exists "pgcrypto";

-- One row per week the user is tracking. start_date is always a Monday.
create table if not exists weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  start_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, start_date)
);

-- The list of habits tracked during a given week. Habits can change week to week.
create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_id uuid not null references weeks(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- One row per habit per day: whether it was completed and any reflection note.
create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  log_date date not null,
  completed boolean not null default false,
  note text,
  updated_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

create index if not exists habits_week_id_idx on habits(week_id);
create index if not exists habit_logs_habit_id_idx on habit_logs(habit_id);
create index if not exists habit_logs_log_date_idx on habit_logs(log_date);

-- Row Level Security: every user can only see and modify their own data.
alter table weeks enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;

create policy "Users manage their own weeks"
  on weeks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own habits"
  on habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own habit logs"
  on habit_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
