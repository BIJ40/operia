-- Add merged_into_ticket_id column to support_tickets
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS merged_into_ticket_id uuid REFERENCES public.support_tickets(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_merged_into 
ON public.support_tickets(merged_into_ticket_id) 
WHERE merged_into_ticket_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.support_tickets.merged_into_ticket_id IS 'Reference to the ticket this one was merged into';