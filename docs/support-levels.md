# Système de niveaux Support (SA0, SA1, SA2, SA3)

## Vue d'ensemble

Le module Support utilise un système hiérarchique de niveaux d'agents pour structurer l'escalade et la répartition des tickets. Ce document définit le modèle conceptuel et les règles d'implémentation.

---

## Niveaux Support

### SA0 - Aucun niveau (conceptuel uniquement)

- **Définition** : État par défaut d'un utilisateur NON-agent
- **Représentation base de données** : `enabled_modules.support.options.level = null`
- **Caractéristiques** :
  - Peut créer des tickets support (tout utilisateur connecté)
  - Ne peut PAS accéder à la console support
  - Ne peut PAS se voir attribuer de tickets
  - Ne peut PAS escalader de tickets
- **Règle critique** : `level = 0` n'existe PAS en base de données (rejeté explicitement)

### SA1 - Support de base

- **Niveau** : 1
- **Badge** : 🔵 SA1 - Support de base
- **Caractéristiques** :
  - Accès à la console support (/support/console)
  - Peut se voir attribuer des tickets de niveau 1
  - Peut escalader vers SA2 si compétences insuffisantes
  - Traite les demandes courantes, questions fréquentes
- **Profil type** : Assistant(e) support, support de premier niveau

### SA2 - Support technique

- **Niveau** : 2
- **Badge** : 🟠 SA2 - Support technique
- **Caractéristiques** :
  - Accès à la console support
  - Peut se voir attribuer des tickets de niveau 1 et 2
  - Peut escalader vers SA3 si problème complexe
  - Peut prendre en charge les escalades SA1
  - Traite les problèmes techniques, bugs, configurations
- **Profil type** : Technicien support, support technique confirmé

### SA3 - Support expert

- **Niveau** : 3
- **Badge** : 🔴 SA3 - Support expert
- **Caractéristiques** :
  - Accès à la console support
  - Peut se voir attribuer tous les types de tickets
  - Niveau d'escalade maximal (pas d'escalade supérieure)
  - Prend en charge les escalades SA1 et SA2
  - Traite les problèmes critiques, architecturaux, cas complexes
- **Profil type** : Expert support, ingénieur support senior, responsable support

---

## Cas d'usage : Agent Support Externe

### Définition

Un **Agent Support Externe** est un utilisateur avec :
- `global_role = base_user` (N0)
- `enabled_modules.support.options.agent = true`
- `support_level = 1, 2 ou 3` (SA1/SA2/SA3)

Ce pattern est **parfaitement valide** et sert à donner accès à la console support à des personnes externes à la franchise.

### Exemple concret : Hugo Bulthé

Hugo est le développeur d'Apogée (externe à la franchise). Il n'a aucun rôle franchisé ou franchiseur, mais il doit pouvoir traiter les tickets support de niveau expert.

**Configuration :**
```json
{
  "global_role": "base_user",
  "enabled_modules": {
    "support": {
      "enabled": true,
      "options": {
        "agent": true,
        "level": 3
      }
    }
  }
}
```

### Pourquoi c'est valide ?

1. **Séparation des responsabilités** : Le `global_role` définit l'accès aux modules métier (Pilotage, Franchiseur, Admin). Un agent externe n'a pas besoin d'accéder à ces modules.

2. **L'option `agent` active l'accès console** : Le code calcule :
   ```typescript
   canAccessSupportConsoleUI = hasSupportAgentRole || isAdmin
   ```
   L'option `agent=true` suffit, **indépendamment du rôle global**.

3. **Le niveau SA contrôle les capacités** : SA1/SA2/SA3 détermine quels tickets l'agent peut traiter et recevoir en escalade.

### Ce qu'un Agent Externe peut faire

- ✅ Accéder à la console support (`/support/console`)
- ✅ Voir et traiter les tickets selon son niveau SA
- ✅ Recevoir des escalades selon son niveau
- ✅ Accéder au chat live support
- ✅ Créer des tickets support (comme tout utilisateur)

### Ce qu'un Agent Externe ne peut PAS faire

- ❌ Accéder à Help Academy (sauf si module activé séparément)
- ❌ Accéder au Pilotage Agence
- ❌ Accéder à l'Espace Franchiseur
- ❌ Accéder à l'Administration
- ❌ Gérer des utilisateurs

### Création d'un Agent Externe

Pour créer ce type d'utilisateur :
1. **Global role** : `base_user` (N0)
2. Activer `enabled_modules.support.enabled = true`
3. Activer `enabled_modules.support.options.agent = true`
4. Définir `support_level = 1, 2 ou 3`

---

## Règles d'attribution et validation

### Règle 1 : Agent support requis

**Un niveau support ne peut être attribué QUE si `enabled_modules.support.options.agent = true`**

```typescript
// ✅ VALIDE
{
  support: {
    enabled: true,
    options: {
      agent: true,
      level: 1 // SA1
    }
  }
}

// ❌ INVALIDE - Rejeté avec erreur
{
  support: {
    enabled: true,
    options: {
      agent: false,
      level: 1 // Impossible : agent=false avec level>0
    }
  }
}
```

**Message d'erreur** : "Impossible de définir un niveau support sans activer le statut d'agent support"

### Règle 2 : Level = 0 interdit

**`level = 0` n'a pas de sens conceptuel et est explicitement rejeté**

Le niveau 0 représenterait un "agent sans niveau", ce qui est une incohérence. Un utilisateur est soit :
- Non-agent (agent=false, level=null)
- Agent avec niveau (agent=true, level=1/2/3)

```typescript
// ❌ INVALIDE - Rejeté avec erreur C2
{
  support: {
    enabled: true,
    options: {
      agent: true,
      level: 0 // Interdit explicitement
    }
  }
}
```

**Message d'erreur** : "Le niveau SA0 n'existe pas. Utilisez level=null ou désactivez le statut agent."

### Règle 3 : Désactivation du statut agent

**Si `agent` passe à `false`, le `level` est automatiquement réinitialisé à `null`**

```typescript
// Transition automatique
// Avant
{ agent: true, level: 2 }

// Après désactivation
{ agent: false, level: null } // Level supprimé automatiquement
```

---

## Implémentation technique

### Structure de données

```typescript
interface EnabledModules {
  support?: {
    enabled: boolean;
    options?: {
      agent?: boolean;  // Statut agent support
      admin?: boolean;  // Statut admin support (peut gérer agents)
      level?: number | null; // Niveau SA1/2/3 (ou null si non-agent)
    };
  };
}
```

### Validations (use-user-management.ts)

```typescript
// Garde-fou C2 : Rejet explicite de level=0
if (data.support_level === 0) {
  throw new Error('Le niveau SA0 n\'existe pas. Utilisez level=null ou désactivez le statut agent.');
}

// Validation: level>0 nécessite agent=true
if (data.support_level > 0 && !isAgent) {
  throw new Error('Impossible de définir un niveau support sans activer le statut d\'agent support');
}

// Auto-reset: agent=false force level=null
const finalLevel = isAgent ? data.support_level : null;
```

### Affichage des niveaux

**Composant** : `SupportLevelBadge.tsx`

```typescript
const getSupportLevelLabel = (level: number) => {
  switch (level) {
    case 1: return 'SA1';
    case 2: return 'SA2';
    case 3: return 'SA3';
    default: return `SA${level}`;
  }
};

const getSupportLevelFullLabel = (level: number) => {
  switch (level) {
    case 1: return 'Support de base';
    case 2: return 'Support technique';
    case 3: return 'Support expert';
    default: return '';
  }
};
```

### Vérification d'accès console

**AuthContext** expose :

```typescript
const canAccessSupportConsoleUI = useMemo(() => {
  const supportModule = enabledModules?.support;
  if (!supportModule || typeof supportModule !== 'object') return false;
  
  const isAgent = supportModule.options?.agent === true;
  const isAdmin = globalRole === 'platform_admin' || globalRole === 'superadmin';
  
  return isAgent || isAdmin;
}, [enabledModules, globalRole]);
```

**Utilisation** :

```typescript
// ✅ Centralisation - utiliser partout
const { canAccessSupportConsoleUI } = useAuth();

if (canAccessSupportConsoleUI) {
  // Accès console support
}

// ❌ Éviter recalculs locaux redondants
```

---

## Escalade de tickets

### Flux d'escalade

```
Ticket créé → SA1
     ↓ (si trop complexe)
    SA2
     ↓ (si problème critique)
    SA3 (niveau max, pas d'escalade supérieure)
```

### Règles d'escalade

- **SA1** peut escalader vers SA2 ou SA3
- **SA2** peut escalader vers SA3
- **SA3** ne peut plus escalader (niveau maximal)
- L'escalade envoie une notification au niveau supérieur
- Le ticket garde son historique d'escalade

---

## Scénarios de test recommandés

### Test 1 : Utilisateur lambda

```
- agent = false
- level = null
- ✅ Peut créer un ticket (/support/mes-demandes)
- ❌ Ne peut PAS accéder à /support/console
```

### Test 2 : Agent SA1

```
- agent = true
- level = 1
- ✅ Accès console support
- ✅ Peut se voir attribuer des tickets
- ✅ Peut escalader vers SA2/SA3
```

### Test 3 : Agent SA3

```
- agent = true
- level = 3
- ✅ Accès console support
- ✅ Reçoit les escalades SA1 et SA2
- ⚠️ Ne peut plus escalader (niveau max)
```

### Test 4 : Désactivation agent

```
Avant: agent=true, level=2
Action: Désactiver agent (agent=false)
Après: agent=false, level=null (auto-reset)
Résultat: ❌ Perte d'accès console support
```

### Test 5 : Tentative level=0 (garde-fou C2)

```
Action: Enregistrer agent=true, level=0
Résultat: ❌ Erreur "Le niveau SA0 n'existe pas..."
```

---

## Nettoyage données legacy (si nécessaire)

Si la base contient des incohérences historiques :

```sql
-- Cas 1: agent=false mais level>0 (incohérent)
UPDATE profiles
SET enabled_modules = jsonb_set(
  enabled_modules,
  '{support,options,level}',
  'null'::jsonb
)
WHERE 
  (enabled_modules->'support'->'options'->>'agent')::boolean = false
  AND (enabled_modules->'support'->'options'->>'level')::int > 0;

-- Cas 2: agent=true mais level=NULL (à compléter manuellement)
SELECT id, first_name, last_name, email
FROM profiles
WHERE 
  (enabled_modules->'support'->'options'->>'agent')::boolean = true
  AND enabled_modules->'support'->'options'->>'level' IS NULL;
```

---

## Résumé exécutif

| Concept | Agent | Level | Accès console | Peut escalader |
|---------|-------|-------|---------------|----------------|
| **SA0** (utilisateur) | false | null | ❌ Non | ❌ Non |
| **SA1** (base) | true | 1 | ✅ Oui | ✅ Vers SA2/SA3 |
| **SA2** (technique) | true | 2 | ✅ Oui | ✅ Vers SA3 |
| **SA3** (expert) | true | 3 | ✅ Oui | ❌ Niveau max |

**Règles de cohérence** :
- ✅ `agent=false` → `level=null` (état par défaut)
- ✅ `agent=true` → `level=1/2/3` (choix admin)
- ❌ `level=0` → **rejeté explicitement** (incohérence conceptuelle)
- ❌ `agent=false + level>0` → **rejeté par validation**

---

**Document maintenu par** : Architecture projet GLOBAL / Apogée  
**Dernière mise à jour** : 26 Janvier 2026  
**Version** : 1.2
