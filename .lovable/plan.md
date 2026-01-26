

## Proposition UX : Interface Navigateur pour le Module Réseau Franchiseur

### Contexte actuel
La page `/hc-reseau` affiche 10 tuiles reparties en deux sections (Statistiques et Gestion), chacune menant vers une page distincte. Cette approche force l'utilisateur a naviguer entre pages et perdre le contexte.

### Vision proposee : Interface a onglets dynamiques style navigateur

L'idee est de creer une experience similaire a un navigateur web moderne ou VS Code :
- Les tuiles deviennent des "lanceurs" qui ouvrent des onglets
- Les onglets s'affichent cote a cote en haut de la zone de contenu
- L'utilisateur peut ouvrir plusieurs vues simultanement
- Les onglets sont reordonnables par drag-and-drop
- Chaque onglet peut etre ferme individuellement
- L'etat des onglets persiste en session

```text
+------------------------------------------------------------------+
| [+] Dashboard  [x] | Comparatif  [x] | Agences  [x] |    [+]    |
+------------------------------------------------------------------+
|                                                                  |
|   Contenu de l'onglet actif (Dashboard, Comparatif, etc.)        |
|                                                                  |
+------------------------------------------------------------------+
```

### Architecture technique

**1. Nouveau composant : `BrowserTabsContainer`**
- Gere l'etat des onglets ouverts (liste, ordre, onglet actif)
- Utilise `@dnd-kit/sortable` pour le drag-and-drop (deja installe)
- Persiste l'etat en sessionStorage via `usePersistedState`

**2. Nouveau composant : `BrowserTab`**
- Represente un onglet individuel
- Icone + label + bouton fermer (X)
- Style actif/inactif
- Draggable via `useSortable`

**3. Modification de `ReseauIndex.tsx`**
- Remplace les tuiles par une interface unifiee
- Panneau lateral gauche : liste des modules disponibles (lanceurs)
- Zone principale : conteneur d'onglets avec contenu

**4. Lazy loading des contenus**
- Chaque "panneau" est charge a la demande
- Les composants existants (FranchiseurHome, FranchiseurStats, etc.) sont reutilises

### Fichiers a creer

| Fichier | Description |
|---------|-------------|
| `src/franchiseur/components/browser-tabs/BrowserTabsContext.tsx` | Contexte React pour l'etat des onglets |
| `src/franchiseur/components/browser-tabs/BrowserTabsBar.tsx` | Barre d'onglets draggables |
| `src/franchiseur/components/browser-tabs/BrowserTab.tsx` | Composant onglet individuel |
| `src/franchiseur/components/browser-tabs/BrowserTabsContent.tsx` | Zone de contenu avec lazy loading |
| `src/franchiseur/components/browser-tabs/ModuleLauncher.tsx` | Panneau lateral des lanceurs |
| `src/franchiseur/components/browser-tabs/index.ts` | Export barrel |

### Fichiers a modifier

| Fichier | Modification |
|---------|--------------|
| `src/pages/ReseauIndex.tsx` | Remplacer les tuiles par le nouveau layout |
| `src/routes/franchiseur.routes.tsx` | Simplifier les routes (une seule route principale) |

### Structure de donnees

```typescript
interface BrowserTab {
  id: string;           // ex: 'dashboard', 'stats', 'agences'
  label: string;        // ex: 'Dashboard'
  icon: LucideIcon;     // ex: Network
  closable: boolean;    // Dashboard peut etre non-fermable
}

interface BrowserTabsState {
  tabs: BrowserTab[];
  activeTabId: string | null;
}
```

### Modules disponibles comme onglets

| ID | Label | Icone | Composant |
|----|-------|-------|-----------|
| dashboard | Dashboard | Network | FranchiseurHome |
| stats | Statistiques | PieChart | FranchiseurStats |
| periodes | Periodes | GitCompare | FranchiseurComparison |
| comparatif | Comparatif | BarChart3 | ComparatifAgencesPage |
| graphiques | Graphiques | AreaChart | ReseauGraphiquesPage |
| agences | Agences | Building2 | FranchiseurAgencies |
| animateurs | Animateurs | UserCog | FranchiseurAnimateurs |
| redevances | Redevances | Coins | FranchiseurRoyalties |
| users | Utilisateurs | Users | TDRUsersPage |

### Fonctionnalites detaillees

**Barre d'onglets :**
- Bouton [+] pour ouvrir un nouveau module (dropdown)
- Onglets avec icone, label, bouton X
- Double-clic pour renommer (optionnel)
- Drag-and-drop pour reordonner
- Scroll horizontal si trop d'onglets

**Panneau lateral (optionnel, mode compact) :**
- Visible au clic sur [+]
- Liste des modules non encore ouverts
- Clic = ouvre en nouvel onglet

**Persistance :**
- sessionStorage pour les onglets ouverts
- URL params pour l'onglet actif (?tab=comparatif)

### Section technique

**Dependencies utilisees :**
- `@dnd-kit/core`, `@dnd-kit/sortable` (deja installes)
- `framer-motion` (deja installe) pour animations
- `lucide-react` (deja installe) pour icones

**Hooks a utiliser :**
- `usePersistedState` pour persistence sessionStorage
- `useSortable` de dnd-kit pour drag-and-drop
- `lazy()` de React pour code splitting

**Performance :**
- Les composants sont lazy-loaded au premier affichage
- Le contenu des onglets inactifs reste monte (pas de re-render)
- Utilisation de `React.memo` pour optimiser

### Avantages de cette approche

1. **Multi-tache** : L'utilisateur peut garder plusieurs vues ouvertes
2. **Contexte preserve** : Pas de perte de contexte lors de la navigation
3. **Familiarite** : UX similaire aux navigateurs et IDE modernes
4. **Flexibilite** : L'utilisateur organise son espace de travail
5. **Performance** : Lazy loading et montage persistant

### Alternative simplifiee

Si l'interface navigateur complete est trop ambitieuse, une alternative plus simple :
- Remplacer les tuiles par des onglets Radix classiques
- Un seul onglet actif a la fois
- Pas de drag-and-drop ni fermeture dynamique

Cette version utiliserait simplement le composant `Tabs` existant avec tous les modules en sous-onglets.

