-- Add chat_context column to chatbot_queries to track which RAG family was used
ALTER TABLE public.chatbot_queries 
ADD COLUMN IF NOT EXISTS chat_context text DEFAULT 'apogee';