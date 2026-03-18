-- Fix: resync ticket_number sequence to current max value
SELECT setval('apogee_ticket_number_seq', (SELECT MAX(ticket_number) FROM apogee_tickets));