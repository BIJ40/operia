# AUDIT MODULE SUPPORT
> Date: 2025-12-18 | Version: 0.8.1

## 1. PÉRIMÈTRE

### Description
Système de ticketing bidirectionnel permettant aux utilisateurs de créer des demandes d'assistance et aux agents support de les traiter. Intègre la transformation vers le module Gestion de Projet.

### Routes
- `/support` - Index support
- `/support/helpcenter` - Centre d'aide
- `/support/mes-demandes` - Mes demandes (utilisateur)
- `/admin/support` - Console support (agents)
- `/admin/support/tickets` - Liste tickets
- `/admin/support/tickets/:id` - Détail ticket

### Tables Supabase
```
support_tickets          - Tickets principaux
support_messages         - Messages conversation
support_attachments      - Pièces jointes
support_notifications    - Notifications temps réel
support_categories       - Catégories tickets
```

## 2. ARCHITECTURE

### Fichiers principaux
```
src/components/support/
├── SupportIndex.tsx           # Page index
├── MesDemandesPage.tsx        # Liste demandes utilisateur
├── AdminSupportIndex.tsx      # Console admin
├── AdminSupportTickets.tsx    # Liste tickets admin
├── TicketDetailPage.tsx       # Détail ticket
├── TicketConversation.tsx     # Messages
└── CreateTicketDialog.tsx     # Création ticket

src/hooks/
├── use-support-tickets.ts     # CRUD tickets
├── use-support-notifications.ts # Notifications realtime
└── use-admin-tickets.ts       # Gestion admin
```

### Rôles Support
```
support_role: 'none' | 'agent' | 'admin'
- none: Utilisateur standard (peut créer tickets)
- agent: Peut traiter tickets (SA1/SA2/SA3)
- admin: Accès complet console
```

## 3. WORKFLOW TICKETS

### États
```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
         ↓
      WAITING_USER
```

### Transformation vers Projet
1. Agent clique "Développement"
2. Ticket auto-fermé (status='closed')
3. Message automatique envoyé à l'utilisateur
4. Nouveau `apogee_ticket` créé en BACKLOG
5. Lien conservé via `source_support_ticket_id`

## 4. PROBLÈMES IDENTIFIÉS

### P0 - Critiques
- ❌ Aucun problème critique

### P1 - Importants
- ⚠️ Synchronisation realtime parfois lente
- ⚠️ Badge notification peut persister après fermeture

### P2 - Améliorations
- 📝 Temps de réponse SLA non implémenté
- 📝 Templates de réponse à ajouter

## 5. SÉCURITÉ

### RLS Policies
```sql
-- Utilisateurs voient leurs propres tickets
SELECT: user_id = auth.uid()

-- Agents voient tous les tickets
SELECT: has_support_agent_access()

-- Création par tous les authentifiés
INSERT: auth.uid() IS NOT NULL
```

### Points d'attention
- ✅ Pièces jointes protégées par RLS
- ✅ Messages visibles uniquement par parties concernées
- ✅ Console restreinte aux agents

## 6. REALTIME

### Subscriptions actives
```typescript
// support_tickets - tous événements
supabase.channel('support_tickets')
  .on('postgres_changes', { event: '*', table: 'support_tickets' })

// support_notifications - INSERT
supabase.channel('support_notifications')
  .on('postgres_changes', { event: 'INSERT', table: 'support_notifications' })
```

### Problème connu
- Badge notification peut ne pas se rafraîchir instantanément
- Solution: Forcer invalidation après actions

## 7. TESTS RECOMMANDÉS

```typescript
// Workflow complet
1. Créer ticket → vérifier notification agent
2. Agent répond → vérifier notification user
3. Fermer ticket → vérifier badge disparaît
4. Transformer en projet → vérifier lien

// Permissions
- N1 ne peut pas accéder console
- Agent SA1 peut traiter
- Admin peut tout faire
```

## 8. ÉVOLUTIONS PRÉVUES

1. SLA avec alertes dépassement
2. Templates de réponse
3. Statistiques temps résolution
4. Catégorisation automatique IA
