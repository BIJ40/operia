-- Fix RLS for support_tickets to allow users to create their own tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own tickets" ON public.support_tickets;

CREATE POLICY "Users can insert their own tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (auth.uid() = user_id);