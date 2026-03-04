

## Plan : Email → Ticket via Resend Inbound

### Contrainte clé
**Schema freeze actif** — pas de nouvelles tables. On réutilise intégralement l'infrastructure existante : `apogee_tickets`, `apogee_ticket_comments`, `apogee_ticket_support_exchanges`, `apogee_ticket_attachments`, et le statut kanban `USER` (DEMANDE USER) qui existe déjà.

### Ce qui existe déjà
- Kanban statut `USER` = "DEMANDE USER" (display_order: -1)
- `created_from` accepte : `MANUAL`, `IMPORT_*`, `support`
- `reported_by` : type `ReportedBy` avec valeurs fixes (JEROME, FLORIAN, etc.)
- `OrigineBadge` : affiche un badge coloré par origine
- `apogee_ticket_support_exchanges` : messagerie bidirectionnelle sur les tickets
- `apogee_ticket_attachments` : pièces jointes sur tickets
- Secret `RESEND_API_KEY` : déjà configuré

### Modifications nécessaires

#### 1. Secret à ajouter
- `RESEND_WEBHOOK_SECRET` — signing secret du webhook Resend pour vérifier l'authenticité des requêtes

#### 2. Migration DB (ALTER TYPE, pas de nouvelle table)
- Ajouter `'email'` au type/check constraint de `created_from` dans `apogee_tickets` (actuellement le champ est `text`, donc aucune migration nécessaire si pas de check constraint — à vérifier)
- Pas de nouvelles tables

#### 3. Edge Function `email-to-ticket`
Fichier : `supabase/functions/email-to-ticket/index.ts`
Config : `verify_jwt = false` (webhook public, protégé par signature Resend)

Logique :
1. **Vérifier la signature** Resend via headers `svix-id`, `svix-timestamp`, `svix-signature` + `RESEND_WEBHOOK_SECRET`
2. **Parser le payload** : `from`, `subject`, `text`, `html`, `attachments`
3. **Détecter un ticket existant** : chercher `[TKT-{number}]` dans le `subject` → si trouvé, ajouter un message dans `apogee_ticket_support_exchanges`
4. **Sinon, créer un nouveau ticket** dans `apogee_tickets` avec :
   - `element_concerne` = subject
   - `description` = text body (sanitized)
   - `kanban_status` = `'USER'`
   - `created_from` = `'email'`
   - `reported_by` = `'AUTRE'` (ou mapping email→nom si l'expéditeur est connu dans `profiles`)
   - `heat_priority` = 6 (par défaut)
5. **Ajouter le premier message** dans `apogee_ticket_support_exchanges` avec le contenu du mail
6. **Pièces jointes** : si le payload contient des attachments, les uploader dans le bucket `apogee-ticket-attachments` et créer les entrées dans `apogee_ticket_attachments`
7. **Répondre 200** à Resend

#### 4. Modifications frontend

**Types** (`src/apogee-tickets/types.ts`) :
- Ajouter `'email'` à `CreatedFrom`

**OrigineBadge** (`src/apogee-tickets/components/OrigineBadge.tsx`) :
- Ajouter une entrée `MAIL` dans `ORIGINE_CONFIG` avec icône Mail et couleur dédiée (teal/cyan)

**TicketDetailDrawer** :
- Ajouter un cas `created_from === 'email'` dans l'affichage Origine avec badge 📧 Email + `requester_email` visible

**TicketKanban** :
- Ajouter badge `📧 Email` pour les tickets `created_from === 'email'` (même pattern que le badge `📩 Support` existant)

**TicketTableFilters** :
- Ajouter `'MAIL'` dans `REPORTED_BY_OPTIONS` pour permettre le filtrage par origine email

#### 5. Réponse agent (bidirectionnel)

Quand un agent répond via les `apogee_ticket_support_exchanges` existants, ajouter un bouton/logique pour envoyer l'email de réponse via Resend :
- Subject: `Re: [TKT-{ticket_number}] {element_concerne}`
- To: `requester_email` (stocké dans la description ou un champ metadata)
- From: `noreply@helpconfort.services` (ou le domaine ticket configuré)

Cela nécessitera soit une Edge Function `reply-ticket-email` séparée, soit une extension de la logique d'échanges existante.

### Résumé des livrables

| Livrable | Type |
|---|---|
| Secret `RESEND_WEBHOOK_SECRET` | Secret à ajouter |
| Edge Function `email-to-ticket` | Nouveau fichier |
| Edge Function `reply-ticket-email` | Nouveau fichier (réponse agent) |
| `config.toml` : 2 nouvelles fonctions | Config |
| `types.ts` : `CreatedFrom` + `'email'` | Modif frontend |
| `OrigineBadge.tsx` : entrée MAIL | Modif frontend |
| `TicketDetailDrawer.tsx` : cas email | Modif frontend |
| `TicketKanban.tsx` : badge email | Modif frontend |
| `TicketTableFilters.tsx` : filtre MAIL | Modif frontend |

### Pas de migration DB
Le champ `created_from` est de type `text` sans contrainte stricte côté DB — on peut directement y écrire `'email'`. Le champ `reported_by` est aussi `text`. Le `requester_email` sera stocké dans le champ `description` (préfixé) ou dans `notes_internes`.

