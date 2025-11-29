-- Add heat_priority column to apogee_tickets
ALTER TABLE public.apogee_tickets 
ADD COLUMN IF NOT EXISTS heat_priority integer DEFAULT NULL;

-- Add check constraint for valid range
ALTER TABLE public.apogee_tickets 
ADD CONSTRAINT heat_priority_range CHECK (heat_priority >= 0 AND heat_priority <= 12);

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_apogee_tickets_heat_priority ON public.apogee_tickets(heat_priority);