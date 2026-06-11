# Habit Tracker

A mobile-friendly habit tracker that replaces a manual Excel sheet. Sign in,
check off your daily habits, jot quick reflection notes, and review weekly
completion dashboards (with an archive of past weeks).

## Features

- **Sign in** with email/password (Supabase Auth) so your data syncs across
  your phone, iPad, and computer.
- **Today tab** – check off today's habits and tap the note icon to add a
  quick reflection.
- **Week tab** – a full week grid (habit x day) for checking off any day,
  managing your habit list (habits can change week to week), and a
  **"View weekly dashboard"** button at the top.
- **Dashboard** – overall and per-habit completion rates for the week, plus
  all reflection notes grouped by habit.
- **Archive tab** – browse dashboards for every past week.

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In the SQL Editor, run the contents of [`supabase/schema.sql`](supabase/schema.sql).
   This creates the `weeks`, `habits`, and `habit_logs` tables with row-level
   security so each user can only see their own data.
3. Under **Authentication > Providers**, email/password sign-up is enabled by
   default. You can disable "Confirm email" in Auth settings if you'd like to
   sign in immediately after signing up.
4. From **Project Settings > API**, copy your Project URL and `anon` public key.

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase values:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run locally

```
npm install
npm run dev
```

### 4. Use it on your phone/iPad

Deploy the built app (e.g. to Vercel or Netlify) and open it in Safari/Chrome
on your device. Use "Add to Home Screen" to install it as a standalone app.
