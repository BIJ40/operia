

## Plan: Notification email à la création d'un ticket

### Principe

Quand un nouveau ticket est inséré dans `apogee_tickets`, un **database webhook** (trigger) appelle une edge function qui envoie un email via **Resend** aux adresses configurées.

### Architecture

```text
INSERT apogee_tickets
  → trigger pg_net (webhook)
    → Edge Function "notify-new-ticket"
      → Resend API → email(s)
```

### Étapes

1. **Vérifier que le secret `RESEND_API_KEY` existe** (déjà utilisé par `email-to-ticket` et `reply-ticket-email`, donc probablement en place).

2. **Créer une table `ticket_notification_recipients`** pour stocker les adresses email destinataires (configurable par les admins, sans hardcoder les adresses) :
   - `id`, `email`, `label` (optionnel), `is_active`, `created_at`
   - RLS : lecture/écriture N5+ uniquement

3. **Créer l'edge function `notify-new-ticket`** :
   - Reçoit le payload du ticket (id, subject, description, initiator, heat_priority, module...)
   - Récupère les destinataires actifs depuis `ticket_notification_recipients`
   - Envoie un email HTML formaté via Resend avec les infos clés du ticket
   - Expéditeur : `tickets@ticket.helpconfort.services` (cohérent avec le système existant)

4. **Créer un trigger SQL** sur `apogee_tickets` (AFTER INSERT) qui appelle la function via `pg_net` ou alternatively, on intercepte côté applicatif (dans le code React qui crée les tickets) pour invoquer la function.

   → Option recommandée : **appel depuis le code applicatif** après insertion réussie, car `pg_net` n'est pas toujours disponible et c'est plus simple à debugger.

5. **UI admin optionnelle** : un petit formulaire dans les settings pour gérer les adresses destinataires (ajouter/supprimer/activer).

### Détails techniques

- L'edge function utilise `verify_jwt = false` dans `config.toml` et valide le JWT en code
- Email HTML sobre : sujet du ticket, priorité, module, description tronquée, lien vers le ticket
- Les appels existants de création de ticket (Kanban, support, email-to-ticket) devront invoquer `notify-new-ticket` après insertion

### Fichiers à créer/modifier

- **Nouveau** : `supabase/functions/notify-new-ticket/index.ts`
- **Migration SQL** : table `ticket_notification_recipients` + seed initial
- **Modifier** : les hooks/composants qui créent des tickets pour ajouter l'appel à la notification
- **Modifier** : `supabase/config.toml` (ajouter la function)

