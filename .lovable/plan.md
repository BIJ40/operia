

# Implementation PWA - Application installable sur telephone

## Objectif
Rendre HC Services installable comme une app native sur ton telephone, accessible depuis l'ecran d'accueil.

---

## Etape 1 : Corriger le manifest PWA

**Fichier:** `public/manifest.webmanifest`

| Propriete | Avant | Apres |
|-----------|-------|-------|
| name | "OPERIA Technicien" | "HC Services" |
| short_name | "Technicien" | "HC Services" |
| description | "Application mobile technicien..." | "HelpConfort Services - Gestion complete" |
| start_url | "/t" | "/" |
| scope | "/t" | "/" |

---

## Etape 2 : Hook usePWA

**Fichier:** `src/hooks/usePWA.ts`

Fonctionnalites:
- Detecte si l'app peut etre installee (evenement `beforeinstallprompt`)
- Expose une fonction `promptInstall()` pour declencher l'installation
- Detecte si l'app est deja installee (mode standalone)
- Detecte iOS pour afficher les instructions manuelles

```text
API du hook:
- canInstall: boolean
- isInstalled: boolean
- isIOS: boolean
- promptInstall: () => Promise<void>
```

---

## Etape 3 : Composant PWAInstallPrompt

**Fichier:** `src/components/pwa/PWAInstallPrompt.tsx`

Banniere discrete en bas de l'ecran sur mobile:
- Android: bouton "Installer l'app" (declenche le prompt natif)
- iOS: instructions "Appuie sur Partager puis Sur l'ecran d'accueil"
- Bouton pour fermer (memorise en localStorage pour ne pas reapparaitre)

---

## Etape 4 : Integrer dans App.tsx

Ajouter le composant `PWAInstallPrompt` dans le layout principal pour qu'il apparaisse sur toutes les pages.

---

## Etape 5 (Optionnel) : Notifications Push

Si tu veux les notifications push, il faudra:
1. Generer des cles VAPID (secret a ajouter)
2. Creer la table `push_subscriptions` en base
3. Creer l'edge function `send-push`
4. Creer le hook `usePushNotifications`

**Note:** Les notifications push sur iOS necessitent que l'app soit installee sur l'ecran d'accueil ET iOS 16.4+.

---

## Resume des fichiers

| Fichier | Action |
|---------|--------|
| `public/manifest.webmanifest` | Modifier |
| `src/hooks/usePWA.ts` | Creer |
| `src/components/pwa/PWAInstallPrompt.tsx` | Creer |
| `src/App.tsx` | Modifier (ajouter PWAInstallPrompt) |

---

## Comment utiliser apres implementation

**Android (Chrome):**
1. Ouvrir https://helpconfort-services.lovable.app
2. Banniere "Installer l'app" apparait en bas
3. Cliquer "Installer" > l'app s'ajoute a l'ecran d'accueil

**iPhone (Safari):**
1. Ouvrir https://helpconfort-services.lovable.app en Safari
2. Banniere avec instructions apparait
3. Appuyer Partager > "Sur l'ecran d'accueil" > Ajouter

