
# Corrections Admin - Janvier 2026

## ✅ Corrections effectuées

### 1. Bug critique : Modules non sauvegardés (Help! Academy, etc.)
**Problème** : Quand on décochait un module (ex: Help! Academy), il se recochait après sauvegarde.
**Cause** : Le hook `use-user-management.ts` lisait les modules depuis `profiles.enabled_modules` (JSONB legacy) mais sauvegardait vers `user_modules` (nouvelle table normalisée). Lors du rechargement, il relisait le JSONB qui n'était jamais mis à jour.
**Solution** : Modifié la requête fetch dans `useUserManagement` pour lire depuis `user_modules` table (source de vérité).

### 2. Incohérences N1 (rôle Collaborateur obsolète)
**Problème** : L'ancien rôle "Collaborateur" (N1/franchisee_user) apparaissait encore dans les interfaces.
**Solution** :
- `visibleRoleLabels.ts` : Renommé `base_user` → "Partenaire externe", `franchisee_user` → "Utilisateur agence (legacy)"
- `UserEditForm.tsx`, `UserFullDialog.tsx`, `UserAccordionItem.tsx` : Supprimé "Technicien" des postes disponibles
- `UnifiedManagementPage.tsx` : Labels alignés avec le système unifié

### 3. Statistiques Admin supprimées
**Action** : Supprimé le composant `StatsOverview` de `AdminIndex.tsx` (inutile et ajoutait de la lourdeur).

## Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/hooks/use-user-management.ts` | Lecture modules depuis user_modules au lieu de profiles.enabled_modules |
| `src/lib/visibleRoleLabels.ts` | Labels N1 mis à jour |
| `src/components/users/UserEditForm.tsx` | Poste technicien supprimé |
| `src/components/admin/users/UserFullDialog.tsx` | Poste technicien supprimé |
| `src/components/admin/users/UserAccordionItem.tsx` | Poste technicien supprimé |
| `src/pages/admin/UnifiedManagementPage.tsx` | Labels rôles alignés |
| `src/pages/AdminIndex.tsx` | StatsOverview supprimé |

## Note technique

La table `user_modules` est maintenant la source de vérité unique pour les permissions utilisateurs.
La colonne `profiles.enabled_modules` (JSONB) n'est plus utilisée - migration P3.2 complète.
