
# Interface Multi-Onglets pour le Guide Apogée Public

## Objectif
Reproduire l'expérience "navigateur" du module Franchiseur sur `/guide-apogee` :
- Sidebar persistante avec la liste des catégories (toujours visible)
- Système d'onglets dynamiques pour les catégories ouvertes
- Possibilité d'avoir plusieurs catégories ouvertes et de naviguer entre elles

---

## Architecture Visuelle

```text
┌─────────────────────────────────────────────────────────────────────┐
│  🔵 Logo     Guide Apogée - HelpConfort                             │
├────────────┬────────────────────────────────────────────────────────┤
│            │  [Accueil]  [Dossiers ×]  [Clients ×]                  │
│ CATÉGORIES ├────────────────────────────────────────────────────────┤
│            │                                                        │
│ ▸ Accueil  │                                                        │
│ ▸ Dossiers │           CONTENU DE L'ONGLET ACTIF                    │
│ ▸ Clients  │                                                        │
│ ▸ Factures │                                                        │
│   ...      │                                                        │
├────────────┴────────────────────────────────────────────────────────┤
│       © HelpConfort - Guide Apogée                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Fichiers à Créer

### 1. `src/public-guide/contexts/PublicGuideTabsContext.tsx`
Contexte de gestion des onglets :
- État : `tabs[]`, `activeTabId`
- Actions : `openTab`, `closeTab`, `setActiveTab`, `reorderTabs`
- Persistance : `sessionStorage` + URL `?tab=slug`
- Onglet "Accueil" permanent et non fermable

### 2. `src/public-guide/components/PublicGuideHeader.tsx`
Header minimaliste extrait du layout existant

### 3. `src/public-guide/components/PublicGuideFooter.tsx`
Footer extrait du layout existant

### 4. `src/public-guide/components/PublicCategorySidebar.tsx`
Sidebar permanente :
- Liste des catégories Apogée (filtrées)
- Bouton "Accueil" en haut
- Clic = ouvre un onglet (ou active si déjà ouvert)
- Badges (NEW, En cours, Vide)
- Highlight de l'onglet actif

### 5. `src/public-guide/components/PublicGuideTabsBar.tsx`
Barre d'onglets draggable :
- Utilise `@dnd-kit` (même pattern que Franchiseur)
- Onglets réordonnables par drag & drop
- Bouton × pour fermer (sauf Accueil)

### 6. `src/public-guide/components/PublicGuideTab.tsx`
Onglet individuel :
- Réutilise le pattern de `BrowserTab.tsx`
- Sortable avec dnd-kit

### 7. `src/public-guide/components/PublicGuideTabsContent.tsx`
Zone de contenu :
- Affiche l'onglet actif
- Onglets inactifs restent montés (hidden) pour préserver l'état

### 8. `src/public-guide/pages/PublicGuideHome.tsx`
Page d'accueil (dans onglet) :
- Avertissement "En cours de rédaction"
- Grille des catégories (version allégée, car sidebar visible)
- Recherche locale

### 9. `src/public-guide/pages/PublicGuideCategoryPanel.tsx`
Contenu d'une catégorie (dans onglet) :
- Sections avec accordéon
- Mode lecture seule
- Scroll indépendant

---

## Fichiers à Modifier

### 1. `src/public-guide/components/PublicApogeeLayout.tsx`
Refonte complète :
- Intègre `ResizablePanelGroup` (sidebar + main)
- Wrap dans `PublicGuideTabsProvider`
- Sidebar à gauche (20%, collapsible)
- Tabs + contenu à droite (80%)

### 2. `src/routes/public.routes.tsx`
Simplification :
- Une seule route `/guide-apogee`
- Plus de route `/guide-apogee/category/:slug`
- Les catégories sont gérées par les onglets

### 3. `src/public-guide/index.ts`
Ajouter les nouveaux exports

---

## Composants Réutilisés du Franchiseur

| Pattern | Source | Usage |
|---------|--------|-------|
| Drag & drop onglets | `@dnd-kit/sortable` | Réordonnement |
| Panels redimensionnables | `react-resizable-panels` | Sidebar/Main |
| Scroll Area | `@radix-ui/react-scroll-area` | Sidebar |
| Style onglet | `BrowserTab.tsx` | Inspiration |

---

## Flux Utilisateur

| Action | Résultat |
|--------|----------|
| Arrivée sur `/guide-apogee` | Onglet "Accueil" actif |
| Clic catégorie sidebar | Ouvre nouvel onglet (ou active si existe) |
| Clic × sur onglet | Ferme et active le précédent |
| Drag onglet | Réordonne |
| Refresh page | État restauré depuis sessionStorage |

---

## Section Technique

### Interface des onglets
```typescript
interface PublicGuideTab {
  id: string;        // 'home' | categorySlug
  label: string;     // 'Accueil' | categoryTitle
  closable: boolean; // false pour Accueil
}
```

### Persistance
- Clé sessionStorage : `public_guide_tabs`
- URL : `/guide-apogee?tab=clients`

### Mobile
- Sidebar collapsible
- Onglets scrollables horizontalement
