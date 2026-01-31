
# Plan : Activity Log Unifié pour Copilote IA

## 1. Contexte & Analyse

### 1.1 État actuel des logs (fragmenté)
| Table | Périmètre | Acteur | Limites |
|-------|-----------|--------|---------|
| `rh_audit_log` | RH uniquement | Interne (auth.users) | Limité à collaborators/documents |
| `apogee_ticket_history` | Tickets uniquement | Interne | Pas de contexte agence |
| `apporteur_access_logs` | Portail Apporteurs | Externe (apporteur_users) | Séparé du système principal |
| `user_connection_logs` | Sessions | Interne | Connexions uniquement |

### 1.2 Objectif
Créer une **source de vérité unique** pour toutes les actions métier, permettant :
- Audit transversal multi-module
- Timeline d'activité par entité/acteur
- Base de données pour le futur **Copilote IA**
- Détection d'anomalies et analytics comportementaux

---

## 2. Architecture de la solution

### 2.1 Modèle de données unifié

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        activity_log                                  │
├─────────────────────────────────────────────────────────────────────┤
│ id              UUID PK                                              │
│ agency_id       UUID FK → apogee_agencies (NULL si plateforme)       │
│ actor_type      ENUM: 'user' | 'apporteur' | 'system' | 'ai'        │
│ actor_id        UUID (user_id, apporteur_user_id, ou NULL si system) │
│ action          TEXT (verbe: CREATE, UPDATE, DELETE, VIEW, LOGIN...) │
│ module          TEXT (rh, parc, tickets, apporteurs, statia...)      │
│ entity_type     TEXT (collaborator, vehicle, ticket, document...)    │
│ entity_id       UUID (ID de l'entité concernée)                      │
│ entity_label    TEXT (libellé lisible pour affichage rapide)         │
│ old_values      JSONB (état avant modification)                      │
│ new_values      JSONB (état après modification)                      │
│ metadata        JSONB (contexte: IP, user_agent, trigger source...)  │
│ created_at      TIMESTAMPTZ                                          │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Enum `activity_actor_type`
```sql
CREATE TYPE activity_actor_type AS ENUM (
  'user',       -- Utilisateur interne (auth.users)
  'apporteur',  -- Manager apporteur (apporteur_managers)
  'system',     -- Action automatique (trigger, cron)
  'ai'          -- Action IA (Helpi, Copilote futur)
);
```

### 2.3 Index stratégiques
```sql
-- Recherche par acteur
CREATE INDEX idx_activity_log_actor ON activity_log(actor_type, actor_id);

-- Timeline par entité
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);

-- Filtrage par module/agence
CREATE INDEX idx_activity_log_module_agency ON activity_log(module, agency_id);

-- Recherche temporelle
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
```

---

## 3. Politique RLS

```sql
-- N5+ voit tout
CREATE POLICY "activity_log_select_admin" ON activity_log
  FOR SELECT TO authenticated
  USING (has_min_global_role(auth.uid(), 5));

-- N2+ voit son agence
CREATE POLICY "activity_log_select_agency" ON activity_log
  FOR SELECT TO authenticated
  USING (
    agency_id = get_user_agency_id(auth.uid())
    AND has_min_global_role(auth.uid(), 2)
  );

-- Insert via Security Definer uniquement
CREATE POLICY "activity_log_insert" ON activity_log
  FOR INSERT TO authenticated
  WITH CHECK (false); -- Bloqué, passer par RPC
```

---

## 4. Fonction d'insertion sécurisée

```sql
CREATE OR REPLACE FUNCTION log_activity(
  p_action TEXT,
  p_module TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_entity_label TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_actor_type activity_actor_type DEFAULT 'user',
  p_actor_id UUID DEFAULT NULL,
  p_agency_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_agency_id UUID;
  v_log_id UUID;
BEGIN
  -- Déterminer l'acteur (user par défaut = auth.uid())
  v_actor_id := COALESCE(p_actor_id, auth.uid());
  
  -- Déterminer l'agence
  v_agency_id := COALESCE(p_agency_id, get_user_agency_id(auth.uid()));
  
  INSERT INTO activity_log (
    agency_id, actor_type, actor_id, action, module,
    entity_type, entity_id, entity_label,
    old_values, new_values, metadata
  ) VALUES (
    v_agency_id, p_actor_type, v_actor_id, p_action, p_module,
    p_entity_type, p_entity_id, p_entity_label,
    p_old_values, p_new_values, p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;
```

---

## 5. Triggers automatiques

### 5.1 Trigger générique de tracking
```sql
CREATE OR REPLACE FUNCTION track_entity_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module TEXT;
  v_action TEXT;
  v_entity_label TEXT;
BEGIN
  -- Mapping table → module
  v_module := CASE TG_TABLE_NAME
    WHEN 'collaborators' THEN 'rh'
    WHEN 'employment_contracts' THEN 'rh'
    WHEN 'salary_history' THEN 'rh'
    WHEN 'document_requests' THEN 'rh'
    WHEN 'fleet_vehicles' THEN 'parc'
    WHEN 'epi_assignments' THEN 'parc'
    WHEN 'epi_incidents' THEN 'parc'
    WHEN 'apogee_tickets' THEN 'tickets'
    WHEN 'media_assets' THEN 'mediatheque'
    WHEN 'apporteurs' THEN 'apporteurs'
    WHEN 'apporteur_intervention_requests' THEN 'apporteurs'
    ELSE 'system'
  END;
  
  -- Action basée sur opération
  v_action := TG_OP;
  
  -- Générer label lisible
  v_entity_label := CASE TG_TABLE_NAME
    WHEN 'collaborators' THEN COALESCE(NEW.first_name || ' ' || NEW.last_name, OLD.first_name || ' ' || OLD.last_name)
    WHEN 'fleet_vehicles' THEN COALESCE(NEW.registration, OLD.registration)
    WHEN 'apogee_tickets' THEN COALESCE(NEW.element_concerne, OLD.element_concerne)
    ELSE NULL
  END;
  
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      'CREATE', v_module, TG_TABLE_NAME,
      NEW.id, v_entity_label,
      NULL, to_jsonb(NEW),
      jsonb_build_object('trigger', TG_NAME)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_activity(
      'UPDATE', v_module, TG_TABLE_NAME,
      NEW.id, v_entity_label,
      to_jsonb(OLD), to_jsonb(NEW),
      jsonb_build_object('trigger', TG_NAME)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_activity(
      'DELETE', v_module, TG_TABLE_NAME,
      OLD.id, v_entity_label,
      to_jsonb(OLD), NULL,
      jsonb_build_object('trigger', TG_NAME),
      'system', NULL
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;
```

### 5.2 Attachement aux tables critiques
```sql
-- RH
CREATE TRIGGER trg_activity_collaborators
  AFTER INSERT OR UPDATE OR DELETE ON collaborators
  FOR EACH ROW EXECUTE FUNCTION track_entity_changes();

CREATE TRIGGER trg_activity_employment_contracts
  AFTER INSERT OR UPDATE OR DELETE ON employment_contracts
  FOR EACH ROW EXECUTE FUNCTION track_entity_changes();

-- Parc
CREATE TRIGGER trg_activity_fleet_vehicles
  AFTER INSERT OR UPDATE OR DELETE ON fleet_vehicles
  FOR EACH ROW EXECUTE FUNCTION track_entity_changes();

CREATE TRIGGER trg_activity_epi_assignments
  AFTER INSERT OR UPDATE OR DELETE ON epi_assignments
  FOR EACH ROW EXECUTE FUNCTION track_entity_changes();

-- Tickets (désactivé si apogee_ticket_history suffit)
-- CREATE TRIGGER trg_activity_apogee_tickets ...

-- Apporteurs
CREATE TRIGGER trg_activity_apporteurs
  AFTER INSERT OR UPDATE OR DELETE ON apporteurs
  FOR EACH ROW EXECUTE FUNCTION track_entity_changes();
```

---

## 6. Hook TypeScript unifié

### 6.1 Fichier: `src/hooks/useActivityLog.ts`
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ActivityActorType = 'user' | 'apporteur' | 'system' | 'ai';

export interface ActivityLogEntry {
  id: string;
  agency_id: string | null;
  actor_type: ActivityActorType;
  actor_id: string | null;
  action: string;
  module: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface LogActivityParams {
  action: string;
  module: string;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export function useActivityLog(filters?: {
  module?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['activity-log', filters],
    queryFn: async () => {
      let query = supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 100);

      if (filters?.module) query = query.eq('module', filters.module);
      if (filters?.entityType) query = query.eq('entity_type', filters.entityType);
      if (filters?.entityId) query = query.eq('entity_id', filters.entityId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ActivityLogEntry[];
    },
  });
}

export function useLogActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: LogActivityParams) => {
      const { data, error } = await supabase.rpc('log_activity', {
        p_action: params.action,
        p_module: params.module,
        p_entity_type: params.entityType,
        p_entity_id: params.entityId || null,
        p_entity_label: params.entityLabel || null,
        p_old_values: params.oldValues || null,
        p_new_values: params.newValues || null,
        p_metadata: params.metadata || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-log'] });
    },
  });
}
```

---

## 7. Composant Timeline (UI)

### 7.1 Fichier: `src/components/activity/ActivityTimeline.tsx`
Composant réutilisable affichant la timeline d'activité pour :
- Un collaborateur spécifique
- Un véhicule
- Un ticket
- Une agence entière

---

## 8. Migration des logs existants (optionnel)

Script de migration pour copier les données historiques :
```sql
-- Migration rh_audit_log → activity_log
INSERT INTO activity_log (agency_id, actor_type, actor_id, action, module, entity_type, entity_id, old_values, new_values, metadata, created_at)
SELECT 
  agency_id,
  'user',
  user_id,
  action_type,
  'rh',
  entity_type,
  entity_id,
  old_values,
  new_values,
  metadata,
  created_at
FROM rh_audit_log;
```

---

## 9. Livrables

| # | Fichier/Ressource | Action |
|---|-------------------|--------|
| 1 | Migration SQL | Créer `activity_log` + enum + indexes + RLS |
| 2 | Fonction `log_activity` | Security Definer pour insertion |
| 3 | Trigger `track_entity_changes` | Automatisation sur tables critiques |
| 4 | `src/hooks/useActivityLog.ts` | Hook React Query |
| 5 | `src/components/activity/ActivityTimeline.tsx` | UI Timeline |
| 6 | `docs/MODULES_DOCUMENTATION.md` | Section Activity Log |

---

## 10. Bénéfices attendus

1. **Audit unifié** : Une seule requête pour voir toute l'activité d'une agence
2. **Debug facilité** : Traçabilité complète des actions utilisateur et système
3. **Base Copilote IA** : Données structurées pour analyse comportementale
4. **Conformité RGPD** : Log centralisé des accès aux données sensibles
5. **Évolutivité** : Nouveau module = juste ajouter un trigger
