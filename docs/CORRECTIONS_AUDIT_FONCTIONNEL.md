# Corrections Audit Fonctionnel - V0.4.2

**Date**: 2025-12-02  
**Statut**: ✅ Migrations DB appliquées | 🚧 Intégration code en cours

---

## Vue d'ensemble

L'audit fonctionnel a identifié **6 points critiques** nécessitant corrections avant production:

1. ✅ **Terminologie Apogée-Tickets** → **"Gestion de Projet"** partout
2. ✅ **Unification priorités** → **Heat (0-12)** adopté universellement
3. ✅ **Statuts Apogée** → **kanban_status unique** + is_qualified
4. 🚧 **Routes Support** → **/support** hub + **/support/mes-demandes**
5. ⏳ **Filtres Pilotage** → Contexte global synchronisé
6. ⏳ **Pages Category** → Consolidation Apogée/Apporteurs/HelpConfort

---

## Point 1: Terminologie "Gestion de Projet" ✅

**Décision**: Uniformiser **"Gestion de Projet"** partout (UI, routes, navigation, docs)

### Changements appliqués:
- Routes: `/projects/*` (kanban, list, create)
- Navigation sidebar: "Gestion de Projet"
- Titres pages: "Gestion de Projet - Kanban/Liste/Créer"
- Documentation: terminologie unifiée

**Fichiers modifiés**: `App.tsx`, `navigation.ts`, `dashboardTiles.ts`, page components

---

## Point 2: Unification priorités Heat (0-12) ✅

**Décision**: Adopter le système **heat (0-12)** universellement

### Migrations DB appliquées:
```sql
-- Ajout heat_priority sur support_tickets
ALTER TABLE support_tickets ADD COLUMN heat_priority INTEGER DEFAULT 6;

-- Migration anciennes valeurs
UPDATE support_tickets SET heat_priority = CASE 
  WHEN priority = 'bloquant' THEN 12
  WHEN priority = 'urgent' THEN 9
  ...
END;

-- Mise à jour trigger SLA
CREATE OR REPLACE FUNCTION calculate_ticket_due_at_v2() ...
```

### Utilitaires créés:
- `src/utils/heatPriority.ts`: Config complète heat 0-12
- `src/components/support/HeatPriorityBadge.tsx`: Affichage uniforme
- `src/components/support/HeatPrioritySelector.tsx`: Sélecteur dropdown

### Fichiers à modifier (en cours):
- ✅ `src/hooks/use-user-tickets.ts`: createTicket avec heatPriority
- ✅ `src/hooks/use-admin-support.ts`: Interface SupportTicket avec heat_priority
- ⏳ `src/components/admin/support/TicketDetails.tsx`: UI heat_priority
- ⏳ `src/components/admin/support/TicketFilters.tsx`: Filtres heat
- ⏳ `src/components/support/CreateTicketDialog.tsx`: Sélecteur heat
- ⏳ `src/services/supportService.ts`: Filtrage heat

---

## Point 3: Statuts Apogée unifiés ✅

**Décision**: Statut unique **kanban_status** + booléen **is_qualified**

### Migration DB appliquée:
```sql
-- Suppression colonnes héritées
ALTER TABLE apogee_tickets 
DROP COLUMN qualif_status,
DROP COLUMN apogee_status_raw,
DROP COLUMN hc_status_raw;
```

### Fichiers modifiés:
- ✅ `src/apogee-tickets/types.ts`: Types nettoyés
- ✅ `src/apogee-tickets/components/TicketDetailDrawer.tsx`: UI simplifiée
- ⏳ Tous les composants Kanban/List: utilisation kanban_status uniquement

---

## Point 4: Routes Support consolidées 🚧

**Décision**: 
- **/support** = hub central (FAQ, chat, création)
- **/support/mes-demandes** = suivi personnel
- Suppression **/helpcenter** (redirections)

### Changements appliqués:
- ✅ `App.tsx`: Redirections /helpcenter → /support
- ⏳ Création page `/support` hub
- ⏳ Renommage `/mes-demandes` → `/support/mes-demandes`
- ⏳ Navigation tiles mises à jour

---

## Point 5: Filtres Pilotage synchronisés ⏳

**Décision**: Contexte global `PilotageFiltersContext`

### À créer:
- `src/contexts/PilotageFiltersContext.tsx`
- Intégration pages: MesIndicateurs, ActionsMener, Diffusion

---

## Point 6: Pages Category consolidées ⏳

**Décision**: `CategoryPage.tsx` unifié pour Apogée/Apporteurs/HelpConfort

### À faire:
- Consolidation logique commune
- Props différenciées par scope
- Réduction duplication -50%

---

## Temps estimé restant

| Tâche | Temps |
|-------|-------|
| Intégration code heat priority | 2h |
| Routes Support consolidées | 1h |
| Filtres Pilotage contexte | 1.5h |
| Pages Category consolidation | 2h |
| Tests & validation | 1.5h |
| **TOTAL** | **8h** |

---

## Validation finale

- [ ] Tous les composants utilisent heat priority
- [ ] Routes support consolidées fonctionnelles
- [ ] Filtres Pilotage synchronisés
- [ ] Category pages unifiées
- [ ] Tests manuels complets
- [ ] Documentation mise à jour

---

**Prochaine étape**: Finaliser intégration code heat priority dans composants Support/Apogée
