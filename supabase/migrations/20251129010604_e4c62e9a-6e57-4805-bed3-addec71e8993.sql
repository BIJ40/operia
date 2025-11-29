-- Table pour stocker les signatures de planning hebdomadaire
CREATE TABLE public.planning_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tech_id INTEGER NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_by_user_id UUID REFERENCES auth.users(id),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_tech_week UNIQUE (tech_id, week_start)
);

-- Enable RLS
ALTER TABLE public.planning_signatures ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own signatures"
ON public.planning_signatures FOR SELECT
USING (auth.uid() = signed_by_user_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'support'::app_role));

CREATE POLICY "Users can insert signatures"
ON public.planning_signatures FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own signatures"
ON public.planning_signatures FOR UPDATE
USING (auth.uid() = signed_by_user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_planning_signatures_updated_at
BEFORE UPDATE ON public.planning_signatures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();