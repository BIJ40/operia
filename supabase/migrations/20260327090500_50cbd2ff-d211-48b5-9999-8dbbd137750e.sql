-- Add username column to profiles for N1 pseudo-based login
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;

-- Unique constraint on username (only non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (username) WHERE username IS NOT NULL;

-- Index for fast lookup on login
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (username) WHERE username IS NOT NULL;