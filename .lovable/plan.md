

# Plan PWA : Utilisation facile sur telephone + Notifications Push

## Objectif
Rendre l'application installable et utilisable comme une app native sur ton telephone, avec la possibilite d'envoyer des notifications push.

---

## Partie 1 : Corriger la configuration PWA actuelle

### 1.1 Mettre a jour le manifest pour toute l'app
Le manifest actuel est limite au module `/t` (technicien). On doit l'etendre a `/`.

```text
Fichier: public/manifest.webmanifest

Modifications:
- start_url: "/" (au lieu de "/t")
- scope: "/" (au lieu de "/t") 
- name: "HC Services" (nom complet)
- short_name: "HC Services" (icone home screen)
```

### 1.2 Creer un hook useRegisterSW
Hook pour gerer l'enregistrement du service worker et les mises a jour.

```text
Fichier: src/hooks/usePWA.ts

Fonctionnalites:
- Detecter si l'app peut etre installee
- Afficher un bouton "Installer" au bon moment
- Gerer les mises a jour (prompt "Nouvelle version disponible")
- Exposer l'etat: needRefresh, offlineReady, canInstall
```

### 1.3 Creer une banniere d'installation PWA
Composant UI pour guider l'installation sur mobile.

```text
Fichier: src/components/pwa/PWAInstallPrompt.tsx

Comportement:
- Sur Android Chrome: bouton natif "Installer"
- Sur iOS Safari: instructions "Partager > Sur l'ecran d'accueil"
- Memorise si l'utilisateur a refuse (localStorage)
```

---

## Partie 2 : Notifications Push (Web Push API)

### Architecture Push Notifications

```text
+-------------------+      +-----------------+      +------------------+
|   Navigateur      |      |   Supabase      |      |   Edge Function  |
|   (Service Worker)|<-----|   push_subs     |<-----|   send-push      |
+-------------------+      +-----------------+      +------------------+
         |                         |                        |
         v                         v                        v
   Notification               Stocke tokens           Appelle Web Push API
   s'affiche                  VAPID endpoint          (vapid-webpush)
```

### 2.1 Generer les cles VAPID
Necessaires pour l'authentification des notifications push.

```text
Action: Generer une paire de cles VAPID (publique/privee)
Stockage: 
- VAPID_PUBLIC_KEY: dans le code frontend
- VAPID_PRIVATE_KEY: en secret Supabase
```

### 2.2 Creer la table push_subscriptions

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour lookup rapide par user
CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);
```

### 2.3 Hook usePushNotifications

```text
Fichier: src/hooks/usePushNotifications.ts

API:
- requestPermission(): demande la permission
- subscribe(): enregistre le device dans Supabase
- unsubscribe(): supprime l'abonnement
- isSupported: boolean (navigateur compatible?)
- isSubscribed: boolean
- permission: 'granted' | 'denied' | 'default'
```

### 2.4 Edge function send-push

```text
Fichier: supabase/functions/send-push/index.ts

Endpoint: POST /functions/v1/send-push
Body: { userId, title, body, url?, data? }

Logique:
1. Recupere toutes les subscriptions de l'user
2. Envoie via web-push library
3. Supprime les subscriptions invalides (410 Gone)
```

### 2.5 Modifier le Service Worker
Ajouter la gestion des push events.

```text
Le service worker genere par vite-plugin-pwa sera etendu pour:
- Ecouter l'event 'push'
- Afficher la notification systeme
- Gerer le clic (ouvrir l'URL)
```

---

## Partie 3 : UI/UX pour les notifications

### 3.1 Page de gestion des notifications
Dans le profil utilisateur, permettre de:
- Activer/desactiver les notifications push
- Voir les appareils enregistres
- Tester l'envoi d'une notification

### 3.2 Integration avec les notifications existantes
Modifier les edge functions existantes pour aussi envoyer des push:
- `notify-support-ticket`: push en plus de email/SMS
- `notify-escalation`: push pour les escalades
- Notifications RH: push pour les nouvelles demandes

---

## Resume des fichiers

| Fichier | Action |
|---------|--------|
| `public/manifest.webmanifest` | Modifier (scope /) |
| `src/hooks/usePWA.ts` | Creer |
| `src/hooks/usePushNotifications.ts` | Creer |
| `src/components/pwa/PWAInstallPrompt.tsx` | Creer |
| `src/components/pwa/PushNotificationManager.tsx` | Creer |
| `supabase/functions/send-push/index.ts` | Creer |
| Migration SQL (push_subscriptions) | Creer |

---

## Comment installer sur ton telephone

Une fois implemente:

**Android (Chrome):**
1. Ouvrir https://helpconfort-services.lovable.app
2. Tu verras une banniere "Installer l'application" ou menu ⋮ > Installer
3. L'app apparait sur ton ecran d'accueil

**iPhone (Safari):**
1. Ouvrir https://helpconfort-services.lovable.app en Safari
2. Appuyer sur le bouton Partager (carre avec fleche)
3. Choisir "Sur l'ecran d'accueil"
4. Confirmer "Ajouter"

