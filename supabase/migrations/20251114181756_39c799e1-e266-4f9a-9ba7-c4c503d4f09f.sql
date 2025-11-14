-- Créer la table apporteur_blocks (clone de blocks)
CREATE TABLE public.apporteur_blocks (
  id text NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT ''::text,
  icon text,
  color_preset text NOT NULL DEFAULT 'white'::text,
  "order" integer NOT NULL DEFAULT 0,
  slug text NOT NULL,
  parent_id text,
  attachments jsonb DEFAULT '[]'::jsonb,
  hide_from_sidebar boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.apporteur_blocks ENABLE ROW LEVEL SECURITY;

-- Create policies (identiques à blocks)
CREATE POLICY "Anyone can view apporteur blocks" 
ON public.apporteur_blocks 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can insert apporteur blocks" 
ON public.apporteur_blocks 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update apporteur blocks" 
ON public.apporteur_blocks 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete apporteur blocks" 
ON public.apporteur_blocks 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_apporteur_blocks_updated_at
BEFORE UPDATE ON public.apporteur_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_blocks_updated_at();