# AUDIT MODULE GESTION DE PROJET (APOGÉE TICKETS)
> Date: 2025-12-18 | Version: 0.8.1

## 1. PÉRIMÈTRE

### Description
Système de gestion de projet interne type Kanban pour le suivi des développements, bugs et évolutions. Intègre les remontées du module Support.

### Routes
- `/projects` - Index projets
- `/projects/kanban` - Vue Kanban
- `/projects/kanban/:id` - Détail ticket
- `/projects/import` - Import tickets

### Tables Supabase
```
apogee_tickets              - Tickets principaux
apogee_ticket_statuses      - Statuts Kanban
apogee_ticket_transitions   - Transitions autorisées
apogee_ticket_comments      - Commentaires
apogee_ticket_attachments   - Pièces jointes
apogee_ticket_history       - Historique modifications
apogee_ticket_user_roles    - Rôles utilisateurs (dev/tester/franchiseur)
apogee_ticket_views         - Vues utilisateurs
apogee_ticket_tags          - Tags
apogee_modules              - Modules Apogée
apogee_priorities           - Priorités
apogee_owner_sides          - PEC (HelpConfort/Apogée)
```

## 2. ARCHITECTURE

### Fichiers principaux
```
src/components/projects/
├── ProjectsIndex.tsx          # Index
├── KanbanBoard.tsx            # Vue Kanban
├── TicketCard.tsx             # Carte ticket
├── TicketDetailDialog.tsx     # Détail ticket
├── TicketComments.tsx         # Commentaires
└── TicketImport.tsx           # Import Excel

src/hooks/
├── use-apogee-tickets.ts      # CRUD tickets
├── use-ticket-transitions.ts  # Workflow statuts
└── use-ticket-permissions.ts  # Permissions granulaires
```

## 3. WORKFLOW KANBAN

### Statuts
```
BACKLOG → TODO → IN_PROGRESS → REVIEW → TESTING → DONE
                      ↓
                   BLOCKED
```

### Transitions par rôle
```typescript
// Developer
- Peut déplacer vers: IN_PROGRESS, REVIEW, BLOCKED
- Peut éditer: h_min, h_max, owner_side

// Tester
- Peut déplacer vers: TESTING, DONE, TODO (rejet)

// Franchiseur
- Peut déplacer vers: BACKLOG, TODO, DONE
- Peut qualifier tickets
```

## 4. OPTIONS MODULE

### apogee_tickets.options
```typescript
{
  kanban: boolean   // Vue board + création
  manage: boolean   // Édition champs
  import: boolean   // Import bulk
}
```

### Activation
- Module individuel uniquement (jamais dans plans)
- minRole: base_user (N0+)

## 5. PROBLÈMES IDENTIFIÉS

### P0 - Critiques
- ❌ Aucun problème critique

### P1 - Importants
- ⚠️ Drag & drop parfois lent sur gros boards

### P2 - Améliorations
- 📝 Filtres avancés (tags, module, priorité)
- 📝 Vue liste alternative
- 📝 Statistiques vélocité

## 6. SÉCURITÉ

### RLS Policies
```sql
-- Lecture: utilisateurs avec module
SELECT: has_module_access('apogee_tickets')

-- Création: option kanban
INSERT: has_module_option('apogee_tickets', 'kanban')

-- Modification: option manage OU rôle developer
UPDATE: 
  has_module_option('apogee_tickets', 'manage')
  OR has_ticket_role('developer')
```

### Rôles tickets
```sql
-- apogee_ticket_user_roles
ticket_role: 'developer' | 'tester' | 'franchiseur'
```

## 7. INTÉGRATION SUPPORT

### Transformation ticket support → projet
```typescript
// Champs mappés
apogee_ticket.source_support_ticket_id = support_ticket.id
apogee_ticket.support_initiator_user_id = support_ticket.user_id
apogee_ticket.element_concerne = support_ticket.subject
apogee_ticket.description = support_ticket.description
apogee_ticket.kanban_status = 'BACKLOG'
```

### Traçabilité
- Lien bidirectionnel conservé
- Historique visible des deux côtés

## 8. IMPORT EXCEL

### Format attendu
```
| Titre | Description | Module | Priorité | Estimation |
```

### Validation
- Colonnes requises présentes
- Modules valides
- Priorités valides
- Pas de doublons (external_key)

## 9. TESTS RECOMMANDÉS

```typescript
// Workflow
1. Créer ticket BACKLOG
2. Déplacer vers TODO
3. Assigner developer
4. Déplacer vers IN_PROGRESS
5. Vérifier transitions autorisées

// Permissions
1. User sans option manage
2. Essayer éditer champs
3. Vérifier refus

// Import
1. Préparer Excel valide
2. Importer
3. Vérifier tickets créés
```

## 10. ÉVOLUTIONS PRÉVUES

1. Filtres avancés persistants
2. Vue liste avec tri/recherche
3. Statistiques vélocité équipe
4. Burndown chart
5. Intégration notifications
