# AUDIT PERMISSIONS & NAVIGATION – V2.0

**Date**: 2025-12-01  
**Périmètre**: Cohérence GLOBAL_ROLES (N0-N6), édition profils utilisateurs, navigation conditionnelle  
**Méthodologie**: Analyse croisée roleMatrix.ts, AuthContext.tsx, App.tsx routes, Landing.tsx tiles, UnifiedSidebar.tsx, UserDialogs.tsx, UserAccordionItem.tsx

---

## 🎯 RÉSUMÉ EXÉCUTIF

### Findings par sévérité
- **🔴 CRITIQUE** : 2 findings
- **🟠 ÉLEVÉ** : 4 findings  
- **🟡 MOYEN** : 6 findings
- **🟢 FAIBLE** : 0 findings

### Principaux problèmes identifiés
1. **Support Console Bypass** : ROLE_MATRIX définit console support N5+ mais activation possible via `enabled_modules.support.options.agent` pour N1-N4
2. **Module MinRole non vérifié** : Admin peut activer modules pour utilisateurs sans vérifier le `minRole` requis du module
3. **EditUserDialog incomplet** : Dialog d'édition basique ne permet PAS de modifier `global_role` ni `enabled_modules` (uniquement via accordion)
4. **Route Guards incohérents** : `/support/console` protégée par N1+ au lieu de vérification du flag support console

---

## 3.1 AUDIT GLOBAL_ROLES N0→N6

### F-PERM-1 🔴 CRITIQUE – Support Console Bypass via Module Options

**Fichiers concernés**:
- `src/config/roleMatrix.ts` (lignes 30, 363)
- `src/contexts/AuthContext.tsx` (lignes 116-123)

**Problème**:
```typescript
// roleMatrix.ts - ROLE_MATRIX définit:
platform_admin: { canAccessSupportConsole: true }  // N5
superadmin: { canAccessSupportConsole: true }      // N6
// Tous autres rôles N0-N4: false

// AuthContext.tsx - Calcul réel de canAccessSupportConsole:
const isSupportAgent = useMemo(() => {
  return hasModuleOptionFn(accessContext, 'support', 'agent') || isAdmin;
}, [accessContext, isAdmin]);

const canAccessSupportConsole = isSupportAgent;
```

**Impact**: Un utilisateur N2 (franchisee_admin) comme Florian (saint-omer) peut avoir accès à la console support si un admin active `enabled_modules.support.options.agent: true` dans son profil. Cela BYPASS la matrice de rôles qui réserve cette capacité aux N5+.

**Preuve DB**:
```
florian.dhaillecourt@helpconfort.com - franchisee_admin (N2)
enabled_modules.support: { enabled: true, options: { agent: true }}
→ isSupportAgent = true → Console Support accessible
```

**Recommandation**:
- **Option A** (Architecture actuelle): Accepter que console support soit une **capacité modulaire** assignable à N1-N6 via `enabled_modules`, et corriger ROLE_MATRIX pour refléter cela (`canAccessSupportConsole: false` pour tous sauf override module)
- **Option B** (Renforcement): Interdire activation de `support.agent` pour les rôles N0-N4, vérifier `minRole: 'platform_admin'` dans MODULE_DEFINITIONS pour support.agent

---

### F-PERM-2 🟠 ÉLEVÉ – Module apogee_tickets invisible en navigation

**Fichiers concernés**:
- `src/config/dashboardTiles.ts` (ligne 143-153)
- `src/components/layout/UnifiedSidebar.tsx` (ligne 234-242)

**Problème**:
La tile "Gestion de Projet" (projects) a `requiresModule: 'apogee_tickets'` et n'apparaît dans Landing que si module activé. Mais:
1. Le groupe n'a **aucun `accessKey`** dans UnifiedSidebar navGroups
2. Les utilisateurs N2 (franchisee_admin) avec module activé ne découvrent jamais cette section car:
   - Tile filtrée si module désactivé ✅
   - Mais sidebar toujours affichée même si module désactivé ❌

**Impact**: Utilisateur avec `apogee_tickets.enabled = true` voit la section dans sidebar mais pas en tiles, ou inversement selon contexte.

**Recommandation**:
Ajouter vérification module dans sidebar:
```typescript
// UnifiedSidebar.tsx
const navGroups: NavGroup[] = [
  // ...
  {
    label: 'Gestion de Projet',
    labelKey: 'projects',
    indexUrl: ROUTES.projects.index,
    items: [...],
    requiresModule: 'apogee_tickets', // AJOUTER
  },
];

// Filtrer groups avec module check
const filteredGroups = navGroups.filter(group => {
  if (group.requiresModule && !hasModule(group.requiresModule)) return false;
  // ... rest
});
```

---

### F-PERM-3 🟡 MOYEN – Route /support/console mal protégée

**Fichier concerné**: `src/App.tsx` (ligne 217)

**Problème**:
```tsx
<Route path="/support/console" element={
  <MainLayout>
    <RoleGuard minRole="franchisee_user"> {/* N1+ */}
      <AdminSupportTickets />
    </RoleGuard>
  </MainLayout>
} />
```

La route est protégée par `franchisee_user` (N1+) mais la console support devrait être accessible uniquement aux utilisateurs avec `canAccessSupportConsole = true` (soit N5+, soit ceux avec `enabled_modules.support.options.agent`).

**Impact**: Théoriquement, un N1 sans le flag agent pourrait accéder à la route si le RoleGuard ne vérifie que le niveau. En pratique, la page vérifie probablement les permissions, mais la protection de route est incorrecte.

**Recommandation**:
```tsx
// Créer un SupportConsoleGuard custom
<Route path="/support/console" element={
  <MainLayout>
    <SupportConsoleGuard>
      <AdminSupportTickets />
    </SupportConsoleGuard>
  </MainLayout>
} />

// Ou utiliser double guard
<Route path="/support/console" element={
  <MainLayout>
    <RoleGuard minRole="franchisee_user">
      <ModuleGuard moduleKey="support" requiresOption="agent">
        <AdminSupportTickets />
      </ModuleGuard>
    </RoleGuard>
  </MainLayout>
} />
```

---

### F-PERM-4 🟡 MOYEN – base_user (N0) voit tiles Support

**Fichiers concernés**:
- `src/config/roleMatrix.ts` (ligne 297)
- `src/pages/Landing.tsx` (ligne 20-37)

**Problème**:
```typescript
// ROLE_MATRIX
base_user: {
  canAccessHelpAcademy: false,
  canAccessPilotageAgence: false,
  canAccessSupport: true, // ⚠️ N0 peut créer tickets
  canAccessSupportConsole: false,
  canAccessFranchiseur: false,
  canAccessAdmin: false,
}
```

Un utilisateur N0 (base_user) peut voir et accéder à la section Support (Mes Demandes), créer des tickets, mais n'a accès à AUCUNE autre section.

**Impact**: Si N0 = visiteur externe ou compte temporaire, donner accès au support peut générer du bruit. Si N0 = compte légitime, c'est cohérent.

**Question stratégique**: Est-ce que N0 DOIT pouvoir créer des tickets support ?

**Recommandation**:
Si N0 = compte externe sans besoin support, mettre `canAccessSupport: false` pour N0 et réserver Support à N1+.

---

## 3.2 AUDIT ÉDITION PROFILS UTILISATEURS

### F-EDIT-1 🔴 CRITIQUE – EditUserDialog ne modifie PAS global_role ni enabled_modules

**Fichier concerné**: `src/components/admin/users/UserDialogs.tsx` (lignes 151-257)

**Problème**:
Le dialog `EditUserDialog` permet uniquement de modifier:
- `first_name` / `last_name` (lignes 192-198)
- `email` (ligne 203, avec bouton séparé)
- `agence` (ligne 211)
- `role_agence` (ligne 225, mais disabled - voir F-EDIT-3)
- Réinitialiser mot de passe (ligne 240)

**Ce qui MANQUE** : Modification du `global_role` et `enabled_modules`.

Ces champs critiques sont modifiables **uniquement** via l'accordion `UserAccordionItem` (lignes 224-239 pour role, 242-291 pour modules), pas via le dialog d'édition rapide.

**Impact**:
- **Incohérence UX** : Deux interfaces pour éditer le même utilisateur avec capacités différentes
- **Risque de confusion** : Admin pense modifier un utilisateur via dialog mais ne peut pas changer son rôle
- **Workflow fragmenté** : Doit ouvrir accordion pour roles/modules, dialog pour infos basiques

**Recommandation**:
**Option A** (Unification): Fusionner EditUserDialog et UserAccordionItem en une seule interface complète  
**Option B** (Clarification): Renommer EditUserDialog → "Modifier informations basiques" et garder accordion pour "Permissions avancées"

---

### F-EDIT-2 🟠 ÉLEVÉ – Agence modifiable sans vérification scope

**Fichier concerné**: `src/components/admin/users/UserDialogs.tsx` (lignes 209-222)

**Problème**:
```tsx
<Select value={formData.agence || "none"} onValueChange={(v) => setFormData(prev => ({ ...prev, agence: v === "none" ? "" : v }))}>
  <SelectContent className="bg-background z-50">
    <SelectItem value="none">Aucune agence</SelectItem>
    {agencies.filter(a => a.slug && a.slug.trim() !== "").map(a => 
      <SelectItem key={a.id} value={a.slug}>{a.label}</SelectItem>
    )}
  </SelectContent>
</Select>
```

Le dropdown affiche **toutes** les agences disponibles sans vérifier si l'admin peut gérer ces agences selon `manageScope` (ownAgency / assignedAgencies / allAgencies).

**Scénario d'attaque**:
- Admin N2 (franchisee_admin) agence Blois `manageScope: 'ownAgency'`
- Peut modifier un utilisateur de son agence
- Change l'agence de cet utilisateur vers "Pau" (hors scope)
- RLS backend devrait bloquer, mais le **frontend ne devrait même pas proposer Pau** dans la liste

**Recommandation**:
Filtrer les agences selon `userManagementCaps.manageScope` dans EditUserDialog:
```tsx
const availableAgencies = useMemo(() => {
  const caps = getUserManagementCapabilities(currentUserRole);
  if (caps.manageScope === 'allAgencies') return agencies;
  if (caps.manageScope === 'ownAgency') return agencies.filter(a => a.slug === currentUserAgency);
  if (caps.manageScope === 'assignedAgencies') return agencies.filter(a => assignedAgencies?.includes(a.slug));
  return [];
}, [agencies, currentUserRole, currentUserAgency, assignedAgencies]);
```

---

### F-EDIT-3 🟡 MOYEN – role_agence toujours disabled dans EditUserDialog

**Fichier concerné**: `src/components/admin/users/UserDialogs.tsx` (ligne 225, 233)

**Problème**:
```tsx
<Select value={formData.roleAgence} onValueChange={(v) => setFormData(prev => ({ ...prev, roleAgence: v }))} 
  disabled={!canEditRoleAgence}>
  ...
</Select>
{!canEditRoleAgence && (
  <p className="text-xs text-muted-foreground">Seul Admin et N+1 peuvent modifier ce champ</p>
)}
```

Le champ `role_agence` (Poste occupé) est désactivé si `!canEditRoleAgence`, mais ce prop n'est **jamais passé** depuis `AdminUsersUnified.tsx` (ligne 236 appelle EditUserDialog sans `canEditRoleAgence`).

**Impact**: Le champ est **TOUJOURS** disabled pour tous les admins, quelle que soit leur autorité. Message d'aide affiché en permanence.

**Recommandation**:
Dans `AdminUsersUnified.tsx`, passer le flag:
```tsx
<EditUserDialog
  // ...
  canEditRoleAgence={currentUserLevel >= GLOBAL_ROLES.franchisor_user || isSuperAdmin}
  // ...
/>
```

---

### F-EDIT-4 🟠 ÉLEVÉ – Module activation sans vérification minRole

**Fichier concerné**: `src/components/admin/users/UserAccordionItem.tsx` (lignes 256-260)

**Problème**:
```tsx
<Switch
  checked={isEnabled}
  onCheckedChange={(checked) => onModuleToggle(moduleDef.key, checked)}
  disabled={!canEdit}
/>
```

Le switch permet d'activer n'importe quel module si `canEdit = true` (basé sur `canManageUser`). Mais il n'y a **AUCUNE vérification** de `moduleDef.minRole`.

**Scénario problématique**:
- Admin N5 édite utilisateur N1 (franchisee_user)
- Active le module `reseau_franchiseur` (minRole: franchisor_user = N3)
- L'utilisateur N1 a maintenant `enabled_modules.reseau_franchiseur.enabled = true`
- Mais `canAccessModule(franchisee_user, 'reseau_franchiseur')` retourne **false** car niveau insuffisant
- Le module est activé en DB mais l'utilisateur ne peut PAS l'utiliser (incohérence)

**Recommandation**:
Vérifier `minRole` avant activation:
```tsx
const canActivateModule = (moduleKey: ModuleKey, targetRole: GlobalRole | null): boolean => {
  const moduleDef = MODULE_DEFINITIONS.find(m => m.key === moduleKey);
  if (!moduleDef || !targetRole) return false;
  return GLOBAL_ROLES[targetRole] >= GLOBAL_ROLES[moduleDef.minRole];
};

// Dans UserAccordionItem
<Switch
  checked={isEnabled}
  onCheckedChange={(checked) => {
    if (checked && !canActivateModule(moduleDef.key, effectiveRole)) {
      toast.error(`Module ${moduleDef.label} nécessite le rôle ${moduleDef.minRole}+`);
      return;
    }
    onModuleToggle(moduleDef.key, checked);
  }}
  disabled={!canEdit}
/>
```

---

### F-EDIT-5 🟡 MOYEN – canEditRoleAgence non implémenté

**Impact**: Duplication partielle de F-EDIT-3. Le flag existe dans EditUserDialog mais n'est jamais passé.

**Recommandation**: Voir F-EDIT-3.

---

## 3.3 AUDIT NAVIGATION CONDITIONNELLE

### F-NAV-1 🟠 ÉLEVÉ – Tile CONSOLE_SUPPORT filtre incohérent

**Fichiers concernés**:
- `src/config/dashboardTiles.ts` (ligne 132-141)
- `src/pages/Landing.tsx` (ligne 35)
- `src/config/roleMatrix.ts` (ligne 492-502)

**Problème**:
```typescript
// dashboardTiles.ts
{
  id: 'CONSOLE_SUPPORT',
  requiresSupport: true, // ⚠️ Flag custom
  // ...
}

// Landing.tsx - Filtre avec canAccessTile
return canAccessTile(globalRole, tile.id, { agence, canAccessSupportConsole });

// roleMatrix.ts - canAccessTile()
switch (tileId) {
  case 'CONSOLE_SUPPORT':
    return options?.canAccessSupportConsole ?? caps.canAccessSupportConsole;
}
```

La tile utilise `requiresSupport: true` mais le filtre ignore ce flag et utilise `canAccessSupportConsole` passé en paramètre. Le flag `requiresSupport` n'est **JAMAIS utilisé** dans le code.

**Impact**: Incohérence entre déclaration (requiresSupport) et utilisation réelle (canAccessSupportConsole). Code mort.

**Recommandation**:
Supprimer `requiresSupport` de DashboardTile type et utiliser uniquement `canAccessSupportConsole` de roleMatrix.

---

### F-NAV-2 🟡 MOYEN – Route /support/console mal protégée

**Fichier concerné**: `src/App.tsx` (ligne 217)

**Problème**:
```tsx
<Route path="/support/console" element={
  <MainLayout>
    <RoleGuard minRole="franchisee_user"> {/* ⚠️ N1+ au lieu de vérif flag */}
      <AdminSupportTickets />
    </RoleGuard>
  </MainLayout>
} />
```

Protection basée sur `minRole="franchisee_user"` (N1+) mais devrait vérifier `canAccessSupportConsole` dynamique.

**Impact**: Un N1 SANS le flag agent pourrait théoriquement bypasser si RoleGuard ne vérifie que le niveau (actuellement bloqué en pratique car page vérifie permissions).

**Recommandation**:
Créer un `SupportConsoleGuard`:
```tsx
// src/components/auth/SupportConsoleGuard.tsx
export function SupportConsoleGuard({ children }: { children: ReactNode }) {
  const { canAccessSupportConsole, isAuthLoading } = useAuth();
  
  if (isAuthLoading) return <Loader />;
  if (!canAccessSupportConsole) return <Navigate to="/" />;
  
  return <>{children}</>;
}

// App.tsx
<Route path="/support/console" element={
  <MainLayout>
    <SupportConsoleGuard>
      <AdminSupportTickets />
    </SupportConsoleGuard>
  </MainLayout>
} />
```

---

### F-NAV-3 🟡 MOYEN – Groupe projects sans accessKey ni module check

**Fichier concerné**: `src/components/layout/UnifiedSidebar.tsx` (lignes 234-242)

**Problème**:
```typescript
{
  label: 'Gestion de Projet',
  labelKey: 'projects',
  indexUrl: ROUTES.projects.index,
  items: [
    { title: 'Kanban', url: ROUTES.projects.kanban, icon: Kanban },
    { title: 'Tickets incomplets', url: ROUTES.projects.incomplete, icon: ListTodo },
  ],
  // ⚠️ Pas d'accessKey ni requiresModule
},
```

Le groupe "Gestion de Projet" n'a **aucune restriction** dans navGroups. Il apparaît dans la sidebar pour TOUS les utilisateurs, même sans le module `apogee_tickets`.

**Impact**: Utilisateurs voient "Gestion de Projet" dans sidebar → cliquent → ModuleGuard bloque → AccessDenied. Mauvaise UX.

**Recommandation**:
Ajouter vérification module:
```typescript
{
  label: 'Gestion de Projet',
  labelKey: 'projects',
  indexUrl: ROUTES.projects.index,
  items: [...],
  requiresModule: 'apogee_tickets', // AJOUTER
},

// Filtrer dans filteredGroups
const filteredGroups = navGroups.filter(group => {
  if (group.requiresModule && !hasModule(group.requiresModule)) return false;
  if (group.accessKey && !caps[group.accessKey]) return false;
  return true;
});
```

---

### F-NAV-4 🟡 MOYEN – Dashboard tiles requiresModule vs requiresFranchisor incohérence

**Fichiers concernés**:
- `src/config/dashboardTiles.ts` (lignes 19-23, 143-153, 189-197)
- `src/pages/Landing.tsx` (ligne 28-36)

**Problème**:
Plusieurs flags existent pour restreindre tiles:
- `requiresAdmin`: vérifié dans Landing (ligne 28 `isAdmin`)
- `requiresSupport`: NON vérifié (voir F-NAV-1)
- `requiresFranchisor`: NON vérifié dans Landing
- `requiresModule`: vérifié dans Landing (ligne 29 `isModuleEnabled`)

**Impact**: `requiresFranchisor` est ignoré dans le filtre de Landing.tsx. Les tiles franchiseur apparaissent si `canAccessTileGroup('franchiseur')` retourne true SANS vérifier le flag `requiresFranchisor`.

**Recommandation**:
Uniformiser les filtres:
```tsx
// Landing.tsx - Dans visibleTiles filter
if (tile.requiresFranchisor) {
  const isFranchisor = globalRole && GLOBAL_ROLES[globalRole] >= GLOBAL_ROLES.franchisor_user;
  if (!isFranchisor) return false;
}
```

---

### F-NAV-5 🟡 MOYEN – Sidebar item minRole non vérifié pour sub-items

**Fichier concerné**: `src/components/layout/UnifiedSidebar.tsx` (ligne 250-253)

**Problème**:
```tsx
{
  title: 'Animateurs', 
  url: ROUTES.reseau.animateurs, 
  icon: Users, 
  minRole: 'franchisor_admin' // N4+
},
{
  title: 'Redevances', 
  url: ROUTES.reseau.redevances, 
  icon: Coins, 
  minRole: 'franchisor_admin' // N4+
},
```

Ces items ont `minRole: 'franchisor_admin'` et sont filtrés par `getFilteredItems()` (ligne 283). Mais les items SANS minRole dans le même groupe sont visibles pour tous les N3+.

**Impact**: Un Animateur N3 voit:
- ✅ Dashboard Réseau
- ✅ Agences
- ❌ Animateurs (masqué)
- ✅ Statistiques
- ❌ Redevances (masqué)

C'est **cohérent** si intentionnel. Mais le groupe est affiché avec seulement 3/5 items visibles.

**Recommandation**: Si acceptable, documenter ce comportement. Sinon, afficher un placeholder "Accès restreint" pour items masqués.

---

### F-NAV-6 🟡 MOYEN – Tiles admin visibles selon requiresAdmin mais routes selon minRole

**Fichiers concernés**:
- `src/config/dashboardTiles.ts` (lignes 186-230)
- `src/App.tsx` (lignes 254-285)

**Problème**:
Tiles admin ont `requiresAdmin: true` (vérifié dans Landing via `isAdmin`), mais les routes correspondantes ont des `minRole` variés:
- `/admin` → `minRole="platform_admin"` (N5)
- `/admin/users` → `minRole="franchisor_user"` (N3)
- `/admin/support-tickets` → `minRole="franchisor_user"` (N3)
- `/admin/announcements` → `minRole="franchisor_user"` (N3)

**Impact**: 
- Les tiles admin n'apparaissent QUE pour N5+ (`requiresAdmin` vérifié via `isAdmin`)
- Mais les routes `/admin/users`, `/admin/announcements` sont accessibles aux N3+
- Un utilisateur N3 (franchisor_user) NE VOIT PAS les tiles admin sur Landing, mais peut accéder directement via URL `/admin/users`

**Question stratégique**: Est-ce que les N3-N4 doivent voir une section Admin réduite sur Landing avec seulement "Utilisateurs" et "Annonces" ?

**Recommandation**:
**Option A** (Restriction): Réserver `/admin/*` aux N5+ uniquement, rediriger N3-N4 vers `/hc-reseau/utilisateurs`  
**Option B** (Visibilité partielle): Créer une section "Gestion" sur Landing visible N3+ avec tiles spécifiques (Utilisateurs, Annonces)

---

## 3.4 AUTRES INCOHÉRENCES DÉTECTÉES

### F-MISC-1 🟡 MOYEN – Documents tile scopeSlug incorrect

**Fichier concerné**: `src/config/dashboardTiles.ts` (ligne 54)

**Problème**:
```typescript
{
  id: 'BASE_DOCUMENTAIRE',
  title: 'Base Documentaire',
  scopeSlug: 'helpconfort', // ⚠️ Devrait être 'base_documentaire'
  route: ROUTES.academy.documents,
}
```

Le `scopeSlug` pointe vers 'helpconfort' (guide HelpConfort) alors que la tile correspond au module option `help_academy.base_documentaire`.

**Impact**: Filtre de tile potentiellement incorrect si permissions help_academy.helpconfort ≠ help_academy.base_documentaire.

**Recommandation**: Corriger en `scopeSlug: 'base_documentaire'`.

---

### F-MISC-2 🟡 MOYEN – RH_TECH et MON_EQUIPE scopeSlug=mes_indicateurs

**Fichier concerné**: `src/config/dashboardTiles.ts` (lignes 96, 106)

**Problème**:
```typescript
{
  id: 'RH_TECH',
  scopeSlug: 'mes_indicateurs', // ⚠️ Pas de scope dédié
}
{
  id: 'MON_EQUIPE',
  scopeSlug: 'mes_indicateurs', // ⚠️ Pas de scope dédié
}
```

Ces deux tiles utilisent `scopeSlug: 'mes_indicateurs'` au lieu de scopes dédiés ('actions_a_mener' ou scope propre).

**Impact**: Si un utilisateur a `pilotage_agence.indicateurs = false` mais `pilotage_agence.actions_a_mener = true`, il ne verra PAS ces tiles alors qu'elles ne sont pas des indicateurs.

**Recommandation**: Utiliser un scopeSlug plus générique ('pilotage_agence') ou créer des scopes dédiés.

---

## 4. PLAN DE REMÉDIATION

### 🔴 PRIORITÉ 1 – Critiques (Sécurité / Cohérence majeure)

#### P1.1 – Résoudre Support Console Bypass (F-PERM-1)
**Décision requise**: Stratégie architecturale
- **Option A**: Console support = capacité modulaire N1-N6 → Corriger ROLE_MATRIX
- **Option B**: Console support = rôle N5+ strict → Bloquer activation pour N1-N4

**Effort**: 2h (Option A) ou 4h (Option B avec validation)

#### P1.2 – Unifier EditUserDialog et UserAccordionItem (F-EDIT-1)
**Action**: Fusionner les deux interfaces OU clarifier séparation (infos basiques vs permissions)

**Effort**: 6h (refonte complète) ou 2h (clarification UX)

---

### 🟠 PRIORITÉ 2 – Élevés (Incohérences fonctionnelles)

#### P2.1 – Filtrer agences selon manageScope dans EditUserDialog (F-EDIT-2)
**Action**: Filtrer dropdown agences selon capabilities de l'admin

**Effort**: 2h

#### P2.2 – Vérifier minRole avant activation module (F-EDIT-4)
**Action**: Ajouter validation `canActivateModule()` dans UserAccordionItem

**Effort**: 3h (validation + messages erreur + tests)

#### P2.3 – Ajouter requiresModule check dans sidebar (F-PERM-2, F-NAV-3)
**Action**: Filtrer navGroups avec vérification module

**Effort**: 2h

#### P2.4 – Corriger tile CONSOLE_SUPPORT filter (F-NAV-1)
**Action**: Supprimer flag `requiresSupport` inutilisé, unifier via canAccessSupportConsole

**Effort**: 1h

---

### 🟡 PRIORITÉ 3 – Moyens (Améliorations UX / Cohérence mineure)

#### P3.1 – Corriger route /support/console protection (F-PERM-3, F-NAV-2)
**Action**: Créer SupportConsoleGuard custom

**Effort**: 2h

#### P3.2 – Passer canEditRoleAgence dans EditUserDialog (F-EDIT-3)
**Action**: Ajouter prop depuis AdminUsersUnified

**Effort**: 30min

#### P3.3 – Décider accès Support pour N0 (F-PERM-4)
**Action**: Clarifier si base_user doit accéder au support

**Effort**: 1h (discussion + correction roleMatrix)

#### P3.4 – Corriger scopeSlug tiles (F-MISC-1, F-MISC-2)
**Action**: Unifier les scopeSlug avec les vrais module options

**Effort**: 1h

#### P3.5 – Clarifier visibilité admin tiles pour N3-N4 (F-NAV-6)
**Action**: Décider si N3-N4 voient section Admin réduite

**Effort**: 2h

---

## 5. SYNTHÈSE DES RISQUES SÉCURITÉ

### Risques Critiques Identifiés

1. **Élévation de privilèges Support** (F-PERM-1)  
   → Un admin malveillant peut donner console support à N2 en activant module option

2. **Module activation sans contrainte niveau** (F-EDIT-4)  
   → Admin peut activer modules nécessitant N3+ pour utilisateurs N1

3. **Modification agence hors scope** (F-EDIT-2)  
   → Admin N2 pourrait changer agence utilisateur vers agence non gérée (bloqué RLS backend mais pas frontend)

### Protection en place
- ✅ RLS policies has_min_global_role() validées
- ✅ RoleGuard sur toutes les routes sensibles
- ✅ canManageUser vérifie rôle + agence
- ⚠️ Frontend ne valide pas minRole des modules
- ⚠️ Support console bypassable via module options

---

## 6. RECOMMANDATIONS ARCHITECTURALES

### 6.1 Centraliser les Guards

Créer des guards spécialisés plutôt que des conditions éparpillées:
```tsx
<SupportConsoleGuard> // Vérifie canAccessSupportConsole
<ModuleOptionGuard moduleKey="support" optionKey="agent"> // Alternative
<AdminSectionGuard section="users"> // Pour routes admin N3+
```

### 6.2 Unifier les filtres de tiles

Supprimer les flags custom (`requiresSupport`, `requiresFranchisor`) et utiliser UNIQUEMENT:
- `minRole` (vérifié via roleMatrix)
- `requiresModule` (vérifié via enabledModules)
- `requiresAdmin` (vérifié via isAdmin)

### 6.3 Valider module minRole côté frontend

Ajouter validation lors de l'activation de module:
```typescript
if (!canAccessModule(targetUserRole, moduleKey)) {
  toast.error(`Ce module nécessite le rôle ${moduleDef.minRole}+`);
  return;
}
```

### 6.4 Documentation matrice de décision

Créer une table de vérité claire:

| Rôle | Help Academy | Pilotage | Support User | Support Console | Franchiseur | Admin |
|------|--------------|----------|--------------|-----------------|-------------|-------|
| N0   | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| N1   | ✅ | ❌ | ✅ | ⚠️ module | ❌ | ❌ |
| N2   | ✅ | ✅* | ✅ | ⚠️ module | ❌ | ❌ |
| N3   | ✅ | ✅* | ✅ | ⚠️ module | ✅ | ⚠️ partiel |
| N4   | ✅ | ✅* | ✅ | ⚠️ module | ✅ | ✅ |
| N5   | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| N6   | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

*Nécessite agence définie

---

## 7. CHECKLIST DE VALIDATION POST-FIX

Après correction des findings:

### Tests de rôles
- [ ] N0 (base_user): Voit uniquement Support sur Landing, pas de sidebar Projects
- [ ] N1 (franchisee_user): Voit Help Academy, pas Pilotage ni Projects (sauf si module activé)
- [ ] N2 (franchisee_admin): Voit Pilotage si agence définie, console support uniquement si flag activé
- [ ] N3 (franchisor_user): Voit Franchiseur, peut gérer users, pas de console support sauf flag
- [ ] N4 (franchisor_admin): Voit Admin partiel (users/announcements), redevances visibles
- [ ] N5 (platform_admin): Voit tout Admin, console support par défaut
- [ ] N6 (superadmin): Accès total

### Tests édition utilisateur
- [ ] Admin N2 ne peut pas modifier utilisateur N3+ (bloqué)
- [ ] Admin N2 ne peut pas changer agence utilisateur vers agence hors scope (filtré dropdown)
- [ ] Admin N5 ne peut pas activer module `reseau_franchiseur` pour user N1 (validé + message erreur)
- [ ] role_agence modifiable dans EditUserDialog pour N3+ admins
- [ ] global_role modifiable dans accordion avec limite assignableRoles

### Tests navigation
- [ ] Sidebar "Gestion de Projet" masquée si module apogee_tickets désactivé
- [ ] Tile CONSOLE_SUPPORT masquée si canAccessSupportConsole = false
- [ ] Route /support/console bloquée pour N1 sans flag agent
- [ ] Accès direct URL /admin/users redirige N2 vers /

---

**FIN DU RAPPORT**  
**Total findings**: 12  
**Effort estimé correction complète**: 22h-30h selon décisions architecturales
