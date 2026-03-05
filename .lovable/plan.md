

## Plan: Deux boutons "Répondre" et "Répondre + Mail"

### Objectif
Remplacer le bouton unique "Envoyer" par deux boutons distincts dans la zone d'échange support :
- **Répondre** : sauvegarde le message en interne uniquement (base de données)
- **Répondre + Mail** : sauvegarde le message ET envoie un email au demandeur via `reply-ticket-email`

Le bouton "Répondre + Mail" n'apparaît que côté support (`isSupport=true`) et quand le ticket a une origine email (`created_from === 'email'`).

### Modifications

**1. `TicketSupportExchanges.tsx`**
- Ajouter une prop `ticketCreatedFrom?: string` et `ticketId` (déjà présent)
- Ajouter une fonction `handleSendWithEmail()` qui :
  1. Appelle `sendMessage()` (sauvegarde interne)
  2. Appelle `supabase.functions.invoke('reply-ticket-email', { body: { ticket_id, message } })`
  3. Affiche un toast succès/erreur pour l'envoi email
- Remplacer le bouton unique par deux boutons côte à côte :
  - `Répondre` (icône Send) → appelle `handleSend()` existant
  - `Répondre + Mail` (icône Mail) → appelle `handleSendWithEmail()`, visible uniquement si `isSupport && ticketCreatedFrom === 'email'`
- Raccourci clavier Enter → "Répondre" (interne seulement)

**2. Parents : `TicketInlinePanel.tsx` et `TicketDetailDrawer.tsx`**
- Passer la prop `ticketCreatedFrom={ticket.created_from}` au composant `TicketSupportExchanges`

**3. Parent : `ProjectTicketDetailPanel.tsx`**
- Ajouter `created_from` dans la query select
- Passer `ticketCreatedFrom={ticket.created_from}` (côté utilisateur, le bouton mail ne s'affichera pas car `isSupport=false`)

### UX
- Les deux boutons sont empilés verticalement à droite du textarea
- "Répondre" : bouton secondaire (variant outline)
- "Répondre + Mail" : bouton primary avec icône Mail, petit label en dessous "📧 + email"
- Pendant l'envoi email, un spinner spécifique sur le bouton mail

