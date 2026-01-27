
# Interface Multi-Onglets RH + Synchronisation Apogée

## Vue d'ensemble

Ce plan implémente deux fonctionnalités majeures :
1. **Interface multi-onglets** style navigateur pour le Suivi RH
2. **Synchronisation automatique** des collaborateurs depuis l'API Apogée

---

## Partie 1 : Synchronisation Apogée → Collaborateurs

### Règle de détection Actif/Inactif

Le champ `is_on` dans la réponse API détermine le statut :
- `is_on: true` → Collaborateur actif
- `is_on: false` → Collaborateur désactivé (ex: ZIMMER, FACON, SOTTOM)

### Mapping des champs

| Champ Apogée | Champ Collaborator | Notes |
|--------------|-------------------|-------|
| `id` | `apogee_user_id` | Clé de liaison |
| `firstname` | `first_name` | |
| `name` | `last_name` | |
| `email` | `email` | |
| `numtel` | `phone` | |
| `type` | `type` | Mapping: technicien→TECHNICIEN, admin→DIRIGEANT, utilisateur→ASSISTANTE, commercial→COMMERCIAL |
| `is_on: false` | `leaving_date` | Date du jour si désactivé |
| `adresse` | `street` | |
| `ville` | `city` | |
| `cp` | `postal_code` | |
| `created_at` | `hiring_date` | Date de création Apogée |
| `data.universes` | → `rh_competencies.competences_techniques` | Array de compétences |
| `data.skills` | → `rh_competencies.competences_techniques` | Fusionné avec universes |
| `data.bgcolor.hex` | Couleur affichage | Non stocké, utilisé runtime |

### Logique de synchronisation

```text
Pour chaque utilisateur Apogée :
  1. Chercher collaborateur existant par apogee_user_id
  2. Si trouvé :
     - Mettre à jour les champs modifiés
     - Si is_on=false ET leaving_date null → marquer comme parti
  3. Si non trouvé ET is_on=true :
     - Créer nouveau collaborateur avec toutes les données
  4. Les collaborateurs sans apogee_user_id ne sont pas affectés
```

### Fichiers à créer

**`src/hooks/useApogeeSync.ts`** - Hook de synchronisation
- Récupère les utilisateurs Apogée via `useApogeeUsers`
- Compare avec les collaborateurs existants
- Propose les actions : créer / mettre à jour / marquer comme parti
- Mutation pour exécuter la sync

**`src/components/rh/ApogeeSync/ApogeeSyncButton.tsx`** - Bouton de sync
- Bouton "Synchroniser Apogée" dans le header RH
- Affiche un badge avec le nombre de changements détectés
- Ouvre un dialogue de confirmation avec aperçu des modifications

**`src/components/rh/ApogeeSync/ApogeeSyncDialog.tsx`** - Dialogue de confirmation
- Liste les collaborateurs à créer (nouveaux)
- Liste les collaborateurs à mettre à jour (modifications)
- Liste les collaborateurs à marquer comme partis (is_on: false)
- Bouton "Appliquer" pour exécuter

---

## Partie 2 : Interface Multi-Onglets

### Architecture visuelle

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  📋 Suivi RH                    [🔄 Sync Apogée] [+ Nouveau]           │
├─────────────────────────────────────────────────────────────────────────┤
│ Stats: 👥 5 actifs │ 🔧 3 terrain │ 📁 2 admin │ ⚠️ 1 alerte │ 78%     │
├─────────────────────────────────────────────────────────────────────────┤
│ [Vue d'ensemble ▼] [🔧 Jean D. ×] [📁 Marie M. ×] [+👤 Ouvrir...]      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                    CONTENU DE L'ONGLET ACTIF                            │
│   • "Vue d'ensemble" : Tableau compact avec tous les collaborateurs     │
│   • Onglet collaborateur : Fiche détaillée avec sous-onglets            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Fichiers à créer

**`src/components/rh/browser-tabs/types.ts`**
```typescript
interface RHStoredTabData {
  id: string;           // 'overview' | collaboratorId (UUID)
  label: string;        // 'Vue d'ensemble' | 'Jean Dupont'
  closable: boolean;
}

interface RHTabData extends RHStoredTabData {
  type: 'overview' | 'collaborator';
  collaboratorId?: string;
  collaboratorType?: CollaboratorType;
  icon: LucideIcon;
}
```

**`src/components/rh/browser-tabs/RHTabsContext.tsx`**
- Pattern identique à `BrowserTabsContext` du module Franchiseur
- Gère l'état des onglets avec persistance sessionStorage
- Synchronisation URL via `?tab=uuid`
- Actions : `openCollaborator`, `closeTab`, `setActiveTab`, `reorderTabs`
- Onglet "overview" permanent et non fermable

**`src/components/rh/browser-tabs/RHTabsBar.tsx`**
- Barre d'onglets avec drag & drop (@dnd-kit)
- Onglet "Vue d'ensemble" avec icône LayoutGrid
- Onglets collaborateurs avec avatar miniature + nom
- Bouton "+" avec dropdown pour ouvrir un collaborateur

**`src/components/rh/browser-tabs/RHTab.tsx`**
- Composant onglet individuel (réutilise le pattern BrowserTab)
- Affiche icône type (🔧 technicien, 📁 admin) + nom
- Bouton × pour fermer (sauf overview)

**`src/components/rh/browser-tabs/RHCollaboratorPicker.tsx`**
- Dropdown du bouton "+"
- Liste tous les collaborateurs groupés par type
- Recherche intégrée
- Indicateur "déjà ouvert" pour ceux en onglet

**`src/components/rh/browser-tabs/RHTabsContent.tsx`**
- Zone de contenu avec switch sur onglet actif
- Si "overview" : affiche `RHUnifiedTable` (le tableau actuel)
- Si collaborateur : affiche `RHCollaboratorPanel`
- Onglets inactifs restent montés mais hidden (préserve l'état)

**`src/components/rh/browser-tabs/RHCollaboratorPanel.tsx`**
- Fiche collaborateur en panneau (pas de navigation page)
- Reprend la structure de `RHCollaborateurPage`
- Header compact avec avatar, nom, statut, progression
- Sous-onglets internes (Essentiel, RH, Sécurité, Compétences, Parc, IT, Documents)

**`src/components/rh/browser-tabs/index.ts`**
- Exports du module

### Fichiers à modifier

**`src/pages/rh/RHSuiviIndex.tsx`**
- Wrap dans `RHTabsProvider`
- Header avec stats + bouton Sync Apogée + bouton Nouveau
- Remplacer le tableau direct par `RHTabsContent`
- Supprimer la logique d'onglet de colonnes (déplacée dans overview)

---

## Flux utilisateur complet

| Action | Résultat |
|--------|----------|
| Arrivée sur `/rh/suivi` | Onglet "Vue d'ensemble" actif, tableau global |
| Clic "Sync Apogée" | Dialogue avec aperçu des 5 nouveaux collaborateurs à créer |
| Clic "Appliquer" | Collaborateurs créés automatiquement avec toutes leurs données |
| Clic sur ligne tableau | Ouvre onglet fiche du collaborateur |
| Clic "+" puis collaborateur | Ouvre onglet fiche (ou active si déjà ouvert) |
| Clic × sur onglet | Ferme et revient au précédent |
| Drag onglet | Réordonne les onglets |
| Refresh page | État restauré depuis sessionStorage |

---

## Section Technique

### Persistance
- Clé sessionStorage : `rh_suivi_tabs`
- Format : `{ tabs: StoredTabData[], activeTabId: string }`
- URL sync : `/rh/suivi?tab=uuid`

### Intégration avec l'existant
- Réutilise `RHUnifiedTable` pour l'onglet Vue d'ensemble
- Réutilise les composants RHTab* de `RHCollaborateurPage`
- Conserve tous les hooks existants (useRHCollaborators, useRHSuivi, etc.)
- Pattern browser-tabs copié depuis le module Franchiseur

### Récapitulatif des fichiers

| Action | Fichier |
|--------|---------|
| Créer | `src/hooks/useApogeeSync.ts` |
| Créer | `src/components/rh/ApogeeSync/ApogeeSyncButton.tsx` |
| Créer | `src/components/rh/ApogeeSync/ApogeeSyncDialog.tsx` |
| Créer | `src/components/rh/ApogeeSync/index.ts` |
| Créer | `src/components/rh/browser-tabs/types.ts` |
| Créer | `src/components/rh/browser-tabs/RHTabsContext.tsx` |
| Créer | `src/components/rh/browser-tabs/RHTabsBar.tsx` |
| Créer | `src/components/rh/browser-tabs/RHTab.tsx` |
| Créer | `src/components/rh/browser-tabs/RHCollaboratorPicker.tsx` |
| Créer | `src/components/rh/browser-tabs/RHTabsContent.tsx` |
| Créer | `src/components/rh/browser-tabs/RHCollaboratorPanel.tsx` |
| Créer | `src/components/rh/browser-tabs/index.ts` |
| Modifier | `src/pages/rh/RHSuiviIndex.tsx` |
| Modifier | `src/shared/types/apogeePlanning.ts` (enrichir ApogeeUser) |
