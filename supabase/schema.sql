-- Run this in your Supabase SQL Editor
-- https://supabase.com/dashboard/project/wagugpdejkjbmazkkcdf/sql/new

create table if not exists public.watch_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  video_id uuid references public.videos(id) on delete cascade not null,
  watched boolean default false,
  watched_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, video_id)
);

alter table public.watch_progress enable row level security;

-- Users can only see their own progress
create policy "Users can view own watch progress"
  on public.watch_progress for select
  using (auth.uid() = user_id);

-- Users can insert/update their own progress
create policy "Users can upsert own watch progress"
  on public.watch_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
