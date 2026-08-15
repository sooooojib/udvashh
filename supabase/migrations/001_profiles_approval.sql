-- ============================================================
-- Migration: Admin Approval / Whitelist Signup System
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Create the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text,
  full_name       text,
  is_approved     boolean NOT NULL DEFAULT false,
  approval_token  text UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Users can only read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Service role can read/write all (used by admin approve route)
CREATE POLICY "Service role full access"
  ON public.profiles FOR ALL
  USING (auth.role() = 'service_role');

-- 4. Function: auto-insert profile row with random approval token on new signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_approved, approval_token)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    false,
    encode(gen_random_bytes(32), 'hex')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 5. Trigger: fire after each new auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Backfill existing users as approved (so they don't lose access)
INSERT INTO public.profiles (id, email, full_name, is_approved, approval_token)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', '') AS full_name,
  true AS is_approved,
  NULL AS approval_token
FROM auth.users
ON CONFLICT (id) DO NOTHING;
