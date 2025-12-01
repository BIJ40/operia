-- Table des annonces prioritaires
CREATE TABLE public.priority_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_path TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  target_all BOOLEAN DEFAULT false,
  target_global_roles JSONB DEFAULT '[]',
  target_role_agences JSONB DEFAULT '[]',
  exclude_base_users BOOLEAN DEFAULT true
);

-- Table de suivi des lectures
CREATE TABLE public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES public.priority_announcements(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('read', 'later')),
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Enable RLS
ALTER TABLE public.priority_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- Trigger pour updated_at
CREATE TRIGGER update_priority_announcements_updated_at
  BEFORE UPDATE ON public.priority_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies pour priority_announcements
CREATE POLICY "Authenticated users can read active announcements"
ON public.priority_announcements
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "N3+ can insert announcements"
ON public.priority_announcements
FOR INSERT
WITH CHECK (has_min_global_role(auth.uid(), 3));

CREATE POLICY "N3+ can update announcements"
ON public.priority_announcements
FOR UPDATE
USING (has_min_global_role(auth.uid(), 3));

CREATE POLICY "N5+ can delete announcements"
ON public.priority_announcements
FOR DELETE
USING (has_min_global_role(auth.uid(), 5));

-- RLS Policies pour announcement_reads
CREATE POLICY "Users can read their own reads"
ON public.announcement_reads
FOR SELECT
USING (user_id = auth.uid() OR has_min_global_role(auth.uid(), 3));

CREATE POLICY "Users can insert their own reads"
ON public.announcement_reads
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reads"
ON public.announcement_reads
FOR UPDATE
USING (user_id = auth.uid());