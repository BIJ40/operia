-- Ajouter les colonnes manquantes pour notifications complètes
ALTER TABLE public.rh_notifications 
  ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Migrer les données existantes si collaborator_id existe
UPDATE public.rh_notifications n
SET recipient_id = (
  SELECT c.user_id FROM collaborators c WHERE c.id = n.collaborator_id
)
WHERE recipient_id IS NULL AND collaborator_id IS NOT NULL;

-- Créer index sur recipient_id
CREATE INDEX IF NOT EXISTS idx_rh_notifications_recipient ON public.rh_notifications(recipient_id, is_read);

-- Fonction pour compter notifications non lues
CREATE OR REPLACE FUNCTION public.get_unread_rh_notifications_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::INTEGER, 0)
  FROM rh_notifications
  WHERE (recipient_id = auth.uid() OR collaborator_id IN (SELECT id FROM collaborators WHERE user_id = auth.uid()))
  AND is_read = false;
$$;

-- Fonction pour marquer notifications comme lues
CREATE OR REPLACE FUNCTION public.mark_rh_notifications_read(p_notification_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE rh_notifications
  SET is_read = true, read_at = now()
  WHERE id = ANY(p_notification_ids)
  AND (recipient_id = auth.uid() OR collaborator_id IN (SELECT id FROM collaborators WHERE user_id = auth.uid()))
  AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Trigger pour créer notifications sur changement de demande
DROP TRIGGER IF EXISTS tr_notify_document_request ON public.document_requests;

CREATE OR REPLACE FUNCTION public.notify_on_document_request_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_collaborator RECORD;
  v_rh_users RECORD;
BEGIN
  -- Récupérer infos collaborateur
  SELECT c.*, p.id as profile_id
  INTO v_collaborator
  FROM collaborators c
  LEFT JOIN profiles p ON p.id = c.user_id
  WHERE c.id = NEW.collaborator_id;

  -- Si nouvelle demande créée → notifier les RH
  IF TG_OP = 'INSERT' THEN
    FOR v_rh_users IN
      SELECT DISTINCT p.id
      FROM profiles p
      WHERE p.agency_id = NEW.agency_id
      AND (
        has_min_global_role(p.id, 2)
        OR has_agency_rh_role(p.id, NEW.agency_id)
      )
      AND p.id != COALESCE(v_collaborator.profile_id, '00000000-0000-0000-0000-000000000000'::uuid)
    LOOP
      INSERT INTO rh_notifications (
        agency_id, collaborator_id, recipient_id, sender_id, notification_type,
        related_request_id, title, message
      ) VALUES (
        NEW.agency_id,
        NEW.collaborator_id,
        v_rh_users.id,
        v_collaborator.profile_id,
        'REQUEST_CREATED',
        NEW.id,
        'Nouvelle demande de document',
        COALESCE(v_collaborator.first_name, '') || ' ' || COALESCE(v_collaborator.last_name, '') || ' a demandé : ' || NEW.request_type
      );
    END LOOP;
  END IF;

  -- Si statut changé → notifier le salarié
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND v_collaborator.profile_id IS NOT NULL THEN
    IF NEW.status = 'IN_PROGRESS' THEN
      INSERT INTO rh_notifications (
        agency_id, collaborator_id, recipient_id, sender_id, notification_type,
        related_request_id, title, message
      ) VALUES (
        NEW.agency_id,
        NEW.collaborator_id,
        v_collaborator.profile_id,
        NEW.processed_by,
        'REQUEST_IN_PROGRESS',
        NEW.id,
        'Demande en cours de traitement',
        'Votre demande "' || NEW.request_type || '" est en cours de traitement'
      );
    ELSIF NEW.status = 'COMPLETED' THEN
      INSERT INTO rh_notifications (
        agency_id, collaborator_id, recipient_id, sender_id, notification_type,
        related_request_id, related_document_id, title, message
      ) VALUES (
        NEW.agency_id,
        NEW.collaborator_id,
        v_collaborator.profile_id,
        NEW.processed_by,
        'REQUEST_COMPLETED',
        NEW.id,
        NEW.response_document_id,
        'Demande traitée',
        'Votre demande "' || NEW.request_type || '" a été traitée'
      );
    ELSIF NEW.status = 'REJECTED' THEN
      INSERT INTO rh_notifications (
        agency_id, collaborator_id, recipient_id, sender_id, notification_type,
        related_request_id, title, message
      ) VALUES (
        NEW.agency_id,
        NEW.collaborator_id,
        v_collaborator.profile_id,
        NEW.processed_by,
        'REQUEST_REJECTED',
        NEW.id,
        'Demande refusée',
        'Votre demande "' || NEW.request_type || '" a été refusée' || 
        CASE WHEN NEW.response_note IS NOT NULL THEN ': ' || NEW.response_note ELSE '' END
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_notify_document_request
  AFTER INSERT OR UPDATE ON public.document_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_document_request_change();