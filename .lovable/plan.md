
# Plan : Impersonation d'utilisateur réel (Voir en tant que Hugo Bulthé)

## Objectif
Permettre aux administrateurs (N5+) de voir l'application exactement comme un utilisateur spécifique, en chargeant ses vraies données (rôle, modules, agence, permissions).

---

## Contexte actuel

### Système d'impersonation existant
- **ImpersonationContext** : Permet de simuler des rôles fictifs (dirigeant, technicien, etc.)
- **ImpersonationDialog** : Interface de configuration des rôles à simuler
- **ImpersonationBanner** : Bandeau affiché pendant la simulation
- **Problème** : Ce système simule des rôles génériques, pas un utilisateur réel avec ses vraies données

### Données Hugo Bulthé (e43de17a-ce1d-4238-aeaa-4b57f4b822e2)
- **global_role** : `base_user`
- **role_agence** : `externe`
- **Agence** : Aucune
- **Modules activés** :
  - `support` : agent=true, user=true
  - `apogee_tickets` : kanban, create, import, manage
  - `ticketing` : kanban, create, manage
  - `aide` : agent=true, user=true

---

## Solution proposée

### 1. Étendre ImpersonationContext

Ajouter un nouveau mode "impersonation utilisateur réel" qui :
- Charge le profil complet d'un utilisateur depuis la DB
- Remplace temporairement les données d'authentification (rôle, modules, agence)
- Affiche un bandeau distinct "Mode visualisation utilisateur"

### 2. Créer RealUserImpersonationDialog

Nouveau composant permettant de :
- Rechercher un utilisateur par email ou nom
- Sélectionner depuis une liste déroulante
- Charger ses données réelles
- Démarrer l'impersonation

### 3. Intégrer dans l'interface Admin

Ajouter un bouton "Voir en tant que..." dans :
- Le menu utilisateur (pour N5+)
- La page de gestion des utilisateurs (clic sur un utilisateur)

---

## Fichiers à modifier/créer

### 1. Étendre le contexte
**src/contexts/ImpersonationContext.tsx**
- Ajouter `impersonatedUser` (profil utilisateur réel complet)
- Ajouter `startRealUserImpersonation(userId: string)`
- Ajouter `isRealUserImpersonation: boolean`

### 2. Créer le dialog de sélection d'utilisateur
**src/components/RealUserImpersonationDialog.tsx**
- Recherche utilisateur par email/nom
- Affichage des infos (rôle, agence, modules)
- Bouton "Voir en tant que..."

### 3. Étendre le bandeau
**src/components/ImpersonationBanner.tsx**
- Mode distinct pour l'impersonation d'utilisateur réel
- Afficher le nom de l'utilisateur impersonné

### 4. Modifier AuthContext pour utiliser les données impersonnées
**src/contexts/AuthContext.tsx**
- Vérifier si impersonation active
- Retourner les données impersonnées au lieu des vraies

### 5. Ajouter le bouton dans l'interface
**src/pages/UnifiedWorkspace.tsx** ou menu utilisateur
- Bouton "Voir en tant que..." (N5+ uniquement)

---

## Architecture technique

```text
┌─────────────────────────────────────────────────────────────┐
│  AuthContext (modifié)                                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Si ImpersonationContext.isRealUserImpersonation:      │  │
│  │   → Retourner impersonatedUser.globalRole             │  │
│  │   → Retourner impersonatedUser.enabledModules         │  │
│  │   → Retourner impersonatedUser.agence                 │  │
│  │ Sinon:                                                │  │
│  │   → Comportement normal                               │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│  ImpersonationContext (étendu)                              │
│  - impersonatedUser: RealUserProfile | null                 │
│  - isRealUserImpersonation: boolean                         │
│  - startRealUserImpersonation(userId) → charge profil DB    │
│  - stopImpersonation() → reset tout                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Interface de sélection

```text
┌─────────────────────────────────────────────────────────────┐
│  👤 Voir en tant qu'utilisateur                             │
│                                                             │
│  Rechercher un utilisateur :                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 🔍 hugo@dynoco.fr                                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Hugo Bulthé                                           │  │
│  │ hugo@dynoco.fr                                        │  │
│  │ Rôle : base_user (externe)                            │  │
│  │ Agence : Aucune                                       │  │
│  │ Modules : support, ticketing, aide                    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  [Annuler]                          [Voir en tant que Hugo] │
└─────────────────────────────────────────────────────────────┘
```

---

## Sécurité

- **Restriction N5+** : Seuls les platform_admin et superadmin peuvent utiliser cette fonctionnalité
- **Audit log** : Logger chaque impersonation (qui, quand, quel utilisateur)
- **Read-only** : L'impersonation ne permet pas de modifier les données au nom de l'utilisateur
- **Session temporaire** : L'impersonation ne persiste pas après refresh

---

## Ordre d'implémentation

1. **Étendre ImpersonationContext** avec le support utilisateur réel
2. **Créer RealUserImpersonationDialog** avec recherche et sélection
3. **Modifier AuthContext** pour utiliser les données impersonnées
4. **Étendre ImpersonationBanner** pour le mode utilisateur réel
5. **Ajouter le bouton** dans l'interface admin
6. **Tester** avec Hugo Bulthé et vérifier que la vue est identique
