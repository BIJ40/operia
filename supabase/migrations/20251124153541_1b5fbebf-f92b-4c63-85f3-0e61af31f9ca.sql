-- Table pour stocker les préférences de widgets utilisateur
CREATE TABLE IF NOT EXISTS public.user_widget_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  size TEXT NOT NULL DEFAULT 'medium', -- small, medium, large
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, widget_key)
);

-- Enable RLS
ALTER TABLE public.user_widget_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view their own widget preferences"
ON public.user_widget_preferences
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own widget preferences"
ON public.user_widget_preferences
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update their own widget preferences"
ON public.user_widget_preferences
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete their own widget preferences"
ON public.user_widget_preferences
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Table pour stocker l'historique de navigation
CREATE TABLE IF NOT EXISTS public.user_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  block_id TEXT NOT NULL,
  block_title TEXT NOT NULL,
  block_slug TEXT NOT NULL,
  category_slug TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'apogee',
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_history_user_id_visited_at 
ON public.user_history(user_id, visited_at DESC);

-- Enable RLS
ALTER TABLE public.user_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own history
CREATE POLICY "Users can view their own history"
ON public.user_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own history
CREATE POLICY "Users can insert their own history"
ON public.user_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own history
CREATE POLICY "Users can delete their own history"
ON public.user_history
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger pour update_at sur user_widget_preferences
CREATE TRIGGER update_user_widget_preferences_updated_at
BEFORE UPDATE ON public.user_widget_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();