-- Table de configuration des notifications
CREATE TABLE IF NOT EXISTS public.app_notification_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  sms_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default row
INSERT INTO public.app_notification_settings (id, sms_enabled, email_enabled)
VALUES ('default', true, true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.app_notification_settings ENABLE ROW LEVEL SECURITY;

-- Only platform_admin+ can read/update
CREATE POLICY "Admin can read notification settings"
  ON public.app_notification_settings
  FOR SELECT
  USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Admin can update notification settings"
  ON public.app_notification_settings
  FOR UPDATE
  USING (has_min_global_role(auth.uid(), 5));

-- Trigger for updated_at
CREATE TRIGGER update_app_notification_settings_updated_at
  BEFORE UPDATE ON public.app_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();