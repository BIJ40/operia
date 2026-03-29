# Architecture Notifications OPERIA

> **Date** : 29 mars 2026

---

## 1. Vue d'ensemble

Le système de notifications unifié centralise les alertes de tous les domaines via une architecture multi-canal (in-app, push, email).

---

## 2. Table `unified_notifications`

```sql
CREATE TABLE unified_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  category TEXT NOT NULL,         -- 'ticketing', 'apporteurs', 'rh', 'system'
  title TEXT NOT NULL,
  body TEXT,
  action_url TEXT,                -- Lien vers l'élément concerné
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);
```

---

## 3. Catégories

| Catégorie | Sources | Exemples |
|-----------|---------|---------|
| `ticketing` | Nouveau ticket, changement statut, commentaire | "Ticket #123 passé en 'En cours'" |
| `apporteurs` | Nouvelle demande, nouveau dossier | "Nouvelle demande d'apporteur" |
| `rh` | Document expiré, alerte EPI | "Certificat médical expire dans 30j" |
| `system` | Sync Apogée, maintenance | "Synchronisation terminée" |

---

## 4. Canaux

| Canal | Technologie | Configuration |
|-------|------------|--------------|
| **In-app** | Supabase Realtime (WebSocket) | Toujours actif |
| **Push** | Service Worker + `send-push` Edge Function | Opt-in par utilisateur |
| **Email** | Resend via Edge Functions | Configurable par catégorie |

---

## 5. Préférences utilisateur

Table `notification_preferences` :

| Colonne | Type | Description |
|---------|------|-------------|
| `user_id` | UUID | Utilisateur |
| `category` | TEXT | Catégorie de notification |
| `in_app` | BOOLEAN | Recevoir en in-app |
| `push` | BOOLEAN | Recevoir en push |
| `email` | BOOLEAN | Recevoir par email |

---

## 6. Injection des notifications

### Par triggers DB

```sql
-- Exemple : notification sur nouveau ticket
CREATE TRIGGER notify_new_ticket
AFTER INSERT ON apogee_tickets
FOR EACH ROW
EXECUTE FUNCTION create_ticket_notification();
```

### Par Edge Functions

```typescript
// Dans une Edge Function métier
await supabaseAdmin.from('unified_notifications').insert({
  user_id: targetUserId,
  category: 'apporteurs',
  title: 'Nouvelle demande',
  body: `Demande de ${apporteurName}`,
  action_url: `/apporteurs/demandes/${requestId}`
});
```

---

## 7. Frontend

### Centre de notifications

- Icône cloche dans le header avec badge compteur
- Panel déroulant avec liste des notifications
- Marquer comme lu (individuel ou tout)
- Filtrage par catégorie

### Temps réel

```typescript
// Écoute Realtime
supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'unified_notifications',
    filter: `user_id=eq.${userId}`
  }, handleNewNotification)
  .subscribe();
```
