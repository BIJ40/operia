-- Ajouter les foreign keys avec CASCADE DELETE pour nettoyer automatiquement les données utilisateur

-- Table profiles : CASCADE depuis auth.users
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Table user_roles : CASCADE depuis auth.users
ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Table favorites : CASCADE depuis auth.users
ALTER TABLE public.favorites
DROP CONSTRAINT IF EXISTS favorites_user_id_fkey;

ALTER TABLE public.favorites
ADD CONSTRAINT favorites_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Table user_history : CASCADE depuis auth.users
ALTER TABLE public.user_history
DROP CONSTRAINT IF EXISTS user_history_user_id_fkey;

ALTER TABLE public.user_history
ADD CONSTRAINT user_history_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Table user_widget_preferences : CASCADE depuis auth.users
ALTER TABLE public.user_widget_preferences
DROP CONSTRAINT IF EXISTS user_widget_preferences_user_id_fkey;

ALTER TABLE public.user_widget_preferences
ADD CONSTRAINT user_widget_preferences_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

COMMENT ON CONSTRAINT profiles_id_fkey ON public.profiles IS 'Cascade delete profile when user is deleted';
COMMENT ON CONSTRAINT user_roles_user_id_fkey ON public.user_roles IS 'Cascade delete roles when user is deleted';
COMMENT ON CONSTRAINT favorites_user_id_fkey ON public.favorites IS 'Cascade delete favorites when user is deleted';
COMMENT ON CONSTRAINT user_history_user_id_fkey ON public.user_history IS 'Cascade delete history when user is deleted';
COMMENT ON CONSTRAINT user_widget_preferences_user_id_fkey ON public.user_widget_preferences IS 'Cascade delete widget prefs when user is deleted';