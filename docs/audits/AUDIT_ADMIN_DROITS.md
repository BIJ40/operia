# AUDIT MODULE CONSOLE DROITS & ACCÈS
> Date: 2025-12-18 | Version: 0.8.1

## 1. PÉRIMÈTRE

### Description
Console d'administration centralisée pour la gestion des utilisateurs, permissions, souscriptions et audit. Point unique de contrôle des accès plateforme.

### Routes
- `/admin` - Index administration
- `/admin/users` - Gestion utilisateurs
- `/admin/users/:id` - Détail utilisateur
- `/admin/subscriptions` - Souscriptions agences
- `/admin/plans` - Configuration plans
- `/admin/audit` - Historique permissions

### Tables Supabase
```
profiles                    - Utilisateurs
user_modules               - Modules individuels
agency_subscription        - Souscriptions agences
agency_module_overrides    - Overrides agence
plan_tiers                 - Plans (STARTER, PRO)
plan_tier_modules          - Modules par plan
permission_audit           - Historique modifications
```

## 2. ARCHITECTURE

### Fichiers principaux
```
src/components/admin/
├── AdminIndex.tsx              # Index admin
├── UsersManagement.tsx         # Liste utilisateurs
├── UserDetailPage.tsx          # Détail utilisateur
├── UserModulesTab.tsx          # Modules utilisateur
├── SubscriptionsTab.tsx        # Souscriptions
├── PlansEditorTab.tsx          # Configuration plans
└── PermissionAuditTab.tsx      # Audit

src/lib/
├── permissionsEngine.ts        # Moteur permissions
└── roleMatrix.ts               # Matrice rôles
```

## 3. HIÉRARCHIE N-LEVELS

### Rôles
```typescript
type GlobalRole = 
  | 'base_user'        // N0 - Extérieur
  | 'franchisee_user'  // N1 - Technicien
  | 'franchisee_admin' // N2 - Dirigeant agence
  | 'franchisor_user'  // N3 - Animateur
  | 'franchisor_admin' // N4 - Directeur réseau
  | 'platform_admin'   // N5 - Admin plateforme
  | 'superadmin'       // N6 - Superadmin
```

### Règles création
```
N2 → peut créer N1 (son agence)
N3 → peut créer N1, N2 (agences assignées)
N4 → peut créer N1, N2, N3 (toutes agences)
N5/N6 → peut créer tous niveaux
N0 → créable uniquement par N5/N6
```

## 4. FORMULE ACCÈS MODULE

### Priorité (haute → basse)
```
1. Global Role (minRole du module)
2. User Module Override (user_modules)
3. Agency Module Override (agency_module_overrides)
4. Agency Plan (plan_tier_modules)
```

### Calcul
```typescript
function hasModuleAccess(userId, moduleKey): boolean {
  const module = MODULES[moduleKey]
  
  // 1. Vérifier rôle minimum
  if (!hasMinRole(user.global_role, module.minRole)) {
    return false
  }
  
  // 2. Override utilisateur
  const userOverride = user_modules.find(m => m.module_key === moduleKey)
  if (userOverride !== undefined) {
    return userOverride.enabled
  }
  
  // 3. Override agence
  const agencyOverride = agency_module_overrides.find(...)
  if (agencyOverride !== undefined) {
    return agencyOverride.forced_enabled
  }
  
  // 4. Plan agence
  return plan_tier_modules.includes(moduleKey)
}
```

## 5. PROBLÈMES IDENTIFIÉS

### P0 - Critiques
- ❌ Aucun problème critique

### P1 - Importants
- ⚠️ Synchronisation invalidateAllUserQueries parfois lente

### P2 - Améliorations
- 📝 Bulk edit utilisateurs
- 📝 Export liste utilisateurs
- 📝 Templates permissions

## 6. SÉCURITÉ

### RLS Policies
```sql
-- Profiles: visibilité selon rôle
SELECT: 
  id = auth.uid()  -- Soi-même
  OR has_min_global_role('franchisee_admin')  -- N2+ voit son agence
  OR has_min_global_role('franchisor_user')   -- N3+ voit réseau

-- Modification: selon hiérarchie
UPDATE:
  can_manage_user(auth.uid(), target_user_id)
```

### Audit
```typescript
// Chaque modification loggée
interface PermissionAudit {
  user_id: string
  target_user_id: string
  action: 'create' | 'update' | 'delete'
  changes: Json
  created_at: timestamp
}
```

## 7. PLANS & MODULES

### Plans disponibles
```typescript
// STARTER (gratuit avec pilotage_agence)
- help_academy (apogee only)
- support (user only)
- pilotage_agence (vue_ensemble only)

// PRO
- Tout STARTER +
- rh
- parc
- reseau_franchiseur
- Toutes options modules
```

### Modules individuels-only
```typescript
// Jamais dans les plans, activation individuelle
- apogee_tickets
- support.options.agent
- help_academy.options.edition
```

## 8. TESTS RECOMMANDÉS

```typescript
// Hiérarchie
1. N2 essaie créer N3 → refusé
2. N4 crée N3 → OK
3. N3 crée N2 dans agence assignée → OK

// Modules
1. Activer module pour utilisateur
2. Vérifier accès immédiat
3. Désactiver module
4. Vérifier accès retiré

// Audit
1. Modifier permissions
2. Vérifier log audit créé
3. Vérifier détails corrects
```

## 9. ÉVOLUTIONS PRÉVUES

1. Bulk edit utilisateurs
2. Export CSV utilisateurs
3. Templates permissions par rôle type
4. Alertes utilisateurs inactifs
5. Dashboard admin avec métriques
