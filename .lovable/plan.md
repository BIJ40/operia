

# Plan : Vue Franchiseur dédiée (pas un onglet)

## 🎯 Contexte et Objectif

**Problème actuel** : "Franchiseur" est implémenté comme un onglet parmi d'autres dans `UnifiedWorkspace`. C'est incorrect.

**Correction demandée** : Quand l'utilisateur a le rôle `franchiseur` (N3+), il doit voir une **VUE COMPLÈTEMENT DIFFÉRENTE** avec ses propres onglets :

| Onglets Franchiseur (nouvelle vue) |
|---|
| Accueil |
| Periode |
| Agences |
| Redevances |
| Statistiques |
| Divers |
| Guides |
| Ticketing |
| Aide |

---

## 📋 Stratégie d'implémentation

### Logique de rendu conditionnel

```text
┌──────────────────────────────────────────────────────┐
│                  UnifiedWorkspace                    │
├──────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐ │
│  │  isFranchiseur (N3+) ?                          │ │
│  │    ├── OUI → Afficher FranchiseurView          │ │
│  │    │         (onglets dédiés: Accueil,         │ │
│  │    │          Periode, Agences, etc.)          │ │
│  │    │                                            │ │
│  │    └── NON → Afficher vue standard              │ │
│  │              (onglets: Accueil, Mon agence,     │ │
│  │               Stats, Salariés, Parc, etc.)      │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

---

## 📁 Fichiers à modifier/créer

### 1. Créer `src/components/unified/views/FranchiseurView.tsx`
Nouveau composant contenant :
- Système d'onglets dédié avec les 9 onglets demandés
- Réutilise les composants existants (`GuidesTabContent`, `TicketingTabContent`, `SupportTabContent`)
- Intègre les pages franchiseur existantes (`FranchiseurHome`, `FranchiseurStats`, etc.)
- Même style visuel que l'interface standard (tabs dossier, drag-and-drop)

**Mapping des onglets :**
| Onglet | Composant |
|--------|-----------|
| Accueil | `FranchiseurHome` (existant) |
| Periode | `FranchiseurComparison` (existant) |
| Agences | `FranchiseurAgencies` (existant) |
| Redevances | `FranchiseurRoyalties` (existant) |
| Statistiques | `FranchiseurStats` (existant) |
| Divers | `DiversTabContent` (existant) ou nouveau |
| Guides | `GuidesTabContent` (existant) |
| Ticketing | `TicketingTabContent` (existant) |
| Aide | `SupportTabContent` (existant) |

### 2. Modifier `src/pages/UnifiedWorkspace.tsx`
- Ajouter la détection du rôle franchiseur via `isFranchiseur` de `useAuth()`
- Rendu conditionnel : si `isFranchiseur` → afficher `FranchiseurView`, sinon vue standard
- **Supprimer** l'onglet "Franchiseur" de la liste `allTabs`

### 3. Supprimer `src/components/unified/tabs/FranchiseurTabContent.tsx`
Ce fichier devient obsolète car la vue franchiseur sera un composant racine, pas un contenu d'onglet.

### 4. Envelopper dans les Providers nécessaires
La vue Franchiseur nécessite :
- `FranchiseurProvider` (contexte franchiseur)
- `NetworkFiltersProvider` (filtres réseau)

---

## 🔧 Détails techniques

### Structure de `FranchiseurView.tsx`

```tsx
// Pseudo-code simplifié
function FranchiseurView() {
  const tabs = [
    { id: 'accueil', label: 'Accueil', icon: Home },
    { id: 'periode', label: 'Periode', icon: GitCompare },
    { id: 'agences', label: 'Agences', icon: Building2 },
    { id: 'redevances', label: 'Redevances', icon: Coins },
    { id: 'statistiques', label: 'Statistiques', icon: BarChart3 },
    { id: 'divers', label: 'Divers', icon: MoreHorizontal },
    { id: 'guides', label: 'Guides', icon: BookOpen },
    { id: 'ticketing', label: 'Ticketing', icon: Ticket },
    { id: 'aide', label: 'Aide', icon: HelpCircle },
  ];
  
  return (
    <FranchiseurProvider>
      <NetworkFiltersProvider>
        <Tabs>
          {/* Même style visuel que UnifiedWorkspace */}
          <TabsList>...</TabsList>
          <TabsContent>...</TabsContent>
        </Tabs>
      </NetworkFiltersProvider>
    </FranchiseurProvider>
  );
}
```

### Modification de `UnifiedWorkspace.tsx`

```tsx
function UnifiedWorkspaceContent() {
  const { isFranchiseur } = useAuth();
  
  // Vue Franchiseur = système d'onglets complètement différent
  if (isFranchiseur) {
    return <FranchiseurView />;
  }
  
  // Vue standard (franchisés)
  return (
    <Tabs>
      {/* Onglets actuels sans "Franchiseur" */}
    </Tabs>
  );
}
```

---

## ✅ Résultat attendu

1. **Utilisateurs franchisés (N2)** : voient les onglets actuels (Accueil, Mon agence, Stats, Salariés, etc.)

2. **Utilisateurs franchiseurs (N3+)** : voient automatiquement une interface dédiée avec les 9 onglets spécifiques

3. **Plus d'onglet "Franchiseur"** : supprimé de la vue standard

4. **Cohérence visuelle** : même style de tabs "dossier" dans les deux vues

