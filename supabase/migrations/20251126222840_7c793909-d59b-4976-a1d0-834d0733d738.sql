-- Create user_widget_preferences table for dashboard customization
CREATE TABLE IF NOT EXISTS public.user_widget_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  widget_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  size TEXT NOT NULL DEFAULT 'medium' CHECK (size IN ('small', 'medium', 'large', 'xlarge')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, widget_key)
);

-- Enable RLS
ALTER TABLE public.user_widget_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own widget preferences
CREATE POLICY "Users can manage their own widget preferences"
  ON public.user_widget_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_user_widget_preferences_user_id ON public.user_widget_preferences(user_id);
CREATE INDEX idx_user_widget_preferences_display_order ON public.user_widget_preferences(user_id, display_order);