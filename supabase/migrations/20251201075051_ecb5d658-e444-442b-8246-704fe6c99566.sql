-- Add ticket_number column as INTEGER (not SERIAL to avoid auto-fill conflicts)
ALTER TABLE public.apogee_tickets 
ADD COLUMN ticket_number INTEGER;

-- Create sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS apogee_ticket_number_seq START WITH 1;

-- Populate existing tickets with sequential numbers based on creation date
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.apogee_tickets
)
UPDATE public.apogee_tickets t
SET ticket_number = n.rn
FROM numbered n
WHERE t.id = n.id;

-- Set sequence to continue from max
SELECT setval('apogee_ticket_number_seq', COALESCE((SELECT MAX(ticket_number) FROM apogee_tickets), 0) + 1);

-- Set default for new tickets
ALTER TABLE public.apogee_tickets 
ALTER COLUMN ticket_number SET DEFAULT nextval('apogee_ticket_number_seq');

-- Make it NOT NULL after populating
ALTER TABLE public.apogee_tickets 
ALTER COLUMN ticket_number SET NOT NULL;

-- Create unique index
CREATE UNIQUE INDEX idx_apogee_tickets_number ON public.apogee_tickets(ticket_number);