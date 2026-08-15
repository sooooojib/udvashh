-- Create the 'videos' table in public schema
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  youtube_video_id text unique not null,
  playlist_id text,
  title text not null,
  description text,
  thumbnail_url text,
  position integer default 0,
  duration integer default 0, -- video duration in seconds
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table public.videos enable row level security;

-- Policy: Allow all authenticated users (or anyone if public) to read videos
create policy "Allow read access to all users"
  on public.videos
  for select
  using (true);

-- Policy: Allow service role (admin) full access to insert/update/delete
create policy "Allow service role full access"
  on public.videos
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
