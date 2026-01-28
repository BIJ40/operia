-- Phase 1: Suppression des tables legacy
-- Support V2 tables
DROP TABLE IF EXISTS public.support_ticket_actions CASCADE;
DROP TABLE IF EXISTS public.support_attachments CASCADE;
DROP TABLE IF EXISTS public.support_ticket_messages CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;

-- Payslip table
DROP TABLE IF EXISTS public.payslip_data CASCADE;