-- Friends & Wagers schema
-- Run this in Supabase SQL Editor AFTER the main schema.sql

-- Public profiles so users can be found by email
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on profiles for select
  using (auth.role() = 'authenticated');

create policy "Users manage their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Friend requests (one row per directed pair; accepted = mutual friendship)
create table if not exists friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending', -- pending | accepted | declined
  created_at timestamptz not null default now(),
  unique (sender_id, receiver_id),
  check (sender_id <> receiver_id)
);

alter table friend_requests enable row level security;

create policy "Users manage their own friend requests"
  on friend_requests for all
  using (auth.uid() = sender_id or auth.uid() = receiver_id)
  with check (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Wagers between two friends for a given week
create table if not exists wagers (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references auth.users(id) on delete cascade,
  challenged_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  challenger_target_pct integer not null check (challenger_target_pct between 0 and 100),
  challenged_target_pct integer,
  stake text not null,
  status text not null default 'pending', -- pending | active | completed | declined | cancelled
  created_at timestamptz not null default now(),
  check (challenger_id <> challenged_id)
);

alter table wagers enable row level security;

create policy "Users manage their own wagers"
  on wagers for all
  using (auth.uid() = challenger_id or auth.uid() = challenged_id)
  with check (auth.uid() = challenger_id or auth.uid() = challenged_id);

-- Allow friends to read each other's weeks, habits, and habit_logs
create policy "Friends can view weeks"
  on weeks for select
  using (
    exists (
      select 1 from friend_requests
      where status = 'accepted'
        and (
          (sender_id = auth.uid() and receiver_id = weeks.user_id) or
          (receiver_id = auth.uid() and sender_id = weeks.user_id)
        )
    )
  );

create policy "Friends can view habits"
  on habits for select
  using (
    exists (
      select 1 from friend_requests
      where status = 'accepted'
        and (
          (sender_id = auth.uid() and receiver_id = habits.user_id) or
          (receiver_id = auth.uid() and sender_id = habits.user_id)
        )
    )
  );

create policy "Friends can view habit logs"
  on habit_logs for select
  using (
    exists (
      select 1 from friend_requests
      where status = 'accepted'
        and (
          (sender_id = auth.uid() and receiver_id = habit_logs.user_id) or
          (receiver_id = auth.uid() and sender_id = habit_logs.user_id)
        )
    )
  );
