-- Step 1: Insert new status rows
INSERT INTO public.apogee_ticket_statuses (id, label, color, display_order, is_final)
SELECT 'IA_RESOLU', 'IA Résolu', color, display_order, is_final
FROM public.apogee_ticket_statuses WHERE id = 'SUPPORT_RESOLU'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.apogee_ticket_statuses (id, label, color, display_order, is_final)
SELECT 'IA_NON_RESOLU', 'IA Non résolu', color, display_order, is_final
FROM public.apogee_ticket_statuses WHERE id = 'IA_ESCALADE'
ON CONFLICT (id) DO NOTHING;

-- Step 2: Update all FK references to point to new IDs
UPDATE public.apogee_tickets SET kanban_status = 'IA_RESOLU' WHERE kanban_status = 'SUPPORT_RESOLU';
UPDATE public.apogee_tickets SET kanban_status = 'IA_NON_RESOLU' WHERE kanban_status = 'IA_ESCALADE';

UPDATE public.apogee_ticket_transitions SET from_status = 'IA_RESOLU' WHERE from_status = 'SUPPORT_RESOLU';
UPDATE public.apogee_ticket_transitions SET to_status = 'IA_RESOLU' WHERE to_status = 'SUPPORT_RESOLU';
UPDATE public.apogee_ticket_transitions SET from_status = 'IA_NON_RESOLU' WHERE from_status = 'IA_ESCALADE';
UPDATE public.apogee_ticket_transitions SET to_status = 'IA_NON_RESOLU' WHERE to_status = 'IA_ESCALADE';

-- Step 3: Update history references
UPDATE public.apogee_ticket_history SET old_value = 'IA_RESOLU' WHERE action_type = 'status_change' AND old_value = 'SUPPORT_RESOLU';
UPDATE public.apogee_ticket_history SET new_value = 'IA_RESOLU' WHERE action_type = 'status_change' AND new_value = 'SUPPORT_RESOLU';
UPDATE public.apogee_ticket_history SET old_value = 'IA_NON_RESOLU' WHERE action_type = 'status_change' AND old_value = 'IA_ESCALADE';
UPDATE public.apogee_ticket_history SET new_value = 'IA_NON_RESOLU' WHERE action_type = 'status_change' AND new_value = 'IA_ESCALADE';

-- Step 4: Delete old status rows
DELETE FROM public.apogee_ticket_statuses WHERE id = 'SUPPORT_RESOLU';
DELETE FROM public.apogee_ticket_statuses WHERE id = 'IA_ESCALADE';