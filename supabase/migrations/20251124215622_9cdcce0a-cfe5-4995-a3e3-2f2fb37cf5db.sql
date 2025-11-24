-- Table pour stocker toutes les questions posées à Mme MICHU
CREATE TABLE public.chatbot_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_pseudo TEXT,
  question TEXT NOT NULL,
  answer TEXT,
  is_incomplete BOOLEAN DEFAULT false,
  context_found TEXT, -- Chunks trouvés par le RAG
  similarity_scores JSONB, -- Scores de similarité
  status TEXT DEFAULT 'pending', -- pending, reviewed, resolved
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_chatbot_queries_user_id ON public.chatbot_queries(user_id);
CREATE INDEX idx_chatbot_queries_status ON public.chatbot_queries(status);
CREATE INDEX idx_chatbot_queries_is_incomplete ON public.chatbot_queries(is_incomplete);
CREATE INDEX idx_chatbot_queries_created_at ON public.chatbot_queries(created_at DESC);

-- RLS policies
ALTER TABLE public.chatbot_queries ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres questions
CREATE POLICY "Users can view their own queries"
ON public.chatbot_queries
FOR SELECT
USING (auth.uid() = user_id);

-- Les utilisateurs peuvent insérer leurs propres questions
CREATE POLICY "Users can insert their own queries"
ON public.chatbot_queries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all queries"
ON public.chatbot_queries
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Les admins peuvent tout modifier
CREATE POLICY "Admins can update all queries"
ON public.chatbot_queries
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger pour mettre à jour reviewed_at
CREATE OR REPLACE FUNCTION update_chatbot_query_reviewed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'reviewed' OR NEW.status = 'resolved' THEN
    NEW.reviewed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reviewed_at
BEFORE UPDATE ON public.chatbot_queries
FOR EACH ROW
EXECUTE FUNCTION update_chatbot_query_reviewed_at();

-- Activer le realtime pour les notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.chatbot_queries;