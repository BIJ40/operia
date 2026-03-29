# Conventions & Règles Projet OPERIA

> **Date** : 29 mars 2026

---

## 1. Nommage

### Fichiers

| Type | Convention | Exemple |
|------|-----------|---------|
| Composant React | PascalCase | `AgencyDashboard.tsx` |
| Hook | camelCase + `use` | `useAgencyKpis.ts` |
| Service | camelCase + `Service` | `customMetricsService.ts` |
| Type / Interface | PascalCase | `ModuleDefinition.ts` |
| Route | kebab-case + `.routes` | `admin.routes.tsx` |
| Edge Function | kebab-case (dossier) | `create-user/` |
| Table DB | snake_case | `agency_financial_months` |
| Constante | UPPER_SNAKE_CASE | `BYPASS_ROLES` |

### Modules (clés hiérarchiques)

```
{section}.{module}              → pilotage.agence
{section}.{module}.{option}     → pilotage.statistiques.general
```

### Rôles

```
global_role : base_user, franchisee_user, franchisee_admin, franchisor_user, franchisor_admin, platform_admin, superadmin
role_agence : administratif, commercial, technicien
```

---

## 2. NO_POPUP_POLICY

**Aucun popup ou modal non sollicité.**

- Pas de pop-ups au chargement de page
- Pas de modals de bienvenue automatiques
- Les dialogs sont déclenchés uniquement par une action utilisateur explicite
- Feedback via `sonner` (toasts) uniquement

---

## 3. Logger structuré

### Niveaux

| Niveau | Usage |
|--------|-------|
| `debug` | Développement uniquement |
| `info` | Événements normaux |
| `warn` | Situations anormales non bloquantes |
| `error` | Erreurs à investiguer |

### Contexte

Chaque log doit inclure le contexte pertinent :
```typescript
logger.info('Module activé', { userId, moduleKey, agencyId });
```

### Sentry

- Erreurs → automatiquement envoyées à Sentry
- Breadcrumbs → navigation, clics, requêtes réseau
- User context → ID utilisateur, rôle, agence

---

## 4. Règles de création de feature

1. **Guard d'abord** : définir le module/rôle requis avant le code
2. **Types TypeScript** : jamais de `any`, toujours typer
3. **React Query** : toujours pour les données serveur
4. **Composants shadcn** : utiliser les composants UI existants
5. **Tests** : obligatoires pour les engines/calculs
6. **Documentation** : mettre à jour le catalogue modules si nouveau module

---

## 5. Gestion des migrations DB

1. Créer via l'outil de migration Lovable
2. Tester en preview
3. Ne jamais modifier une migration existante
4. Ne jamais faire `ALTER DATABASE postgres`
5. RLS obligatoire sur chaque nouvelle table

---

## 6. Compatibilité legacy (COMPAT_MAP)

Le `COMPAT_MAP` dans `shared-constants.ts` maintient la correspondance entre anciennes et nouvelles clés de modules :

```typescript
export const SHARED_MODULE_COMPAT_MAP = {
  help_academy: 'support.guides',
  pilotage_agence: 'pilotage.agence',
  support: 'support.aide_en_ligne',
  apogee_tickets: 'ticketing',
  messaging: 'support.aide_en_ligne',
};
```

> Ce mapping sera supprimé après la migration V2 complète.
