

# Plan : Nouveau système de navigation dual-mode (Header SaaS + Tabs legacy)

## Résumé

Ajouter un mode de navigation alternatif "Header SaaS" avec dropdowns, en parallèle du mode onglets actuel. L'utilisateur bascule entre les deux via le menu Profil. Le mode choisi est persisté en localStorage.

## Architecture

```text
UnifiedWorkspace
├─ if mode === 'header' → MainHeader + WorkspaceTabContent (sans TabBar)
├─ if mode === 'tabs'   → WorkspaceTabBar + WorkspaceTabContent (actuel)
```

## Fichiers à créer

### 1. `src/hooks/useNavigationMode.ts`
Hook simple : lit/écrit `nav-mode` dans localStorage. Valeurs : `'header' | 'tabs'`. Défaut : `'tabs'`.

### 2. `src/config/headerNavigation.ts`
Data model des groupes de navigation header, réutilisant les mêmes `UnifiedTab` et permissions :

```ts
interface HeaderNavChild {
  label: string;
  tab?: UnifiedTab;
  path?: string;
  icon: LucideIcon;
  description?: string;
  badge?: string;
}

interface HeaderNavGroup {
  label: string;
  icon: LucideIcon;
  children: HeaderNavChild[];
}
```

Groupes mappés sur les onglets existants :
- **Pilotage** → sous-items : Statistiques, Agence
- **Commercial** → Prospection, Réalisations
- **Organisation** → Salariés, Véhicules, Apporteurs, Plannings
- **Documents** → Médiathèque
- **Support** → Aide, Ticketing
- **Admin** → Administration

### 3. `src/components/navigation/MainHeader.tsx`
Header sticky 64px avec `backdrop-blur-md` :
- Logo HelpConfort à gauche
- Nav horizontale au centre : chaque groupe = bouton hover → dropdown
- Dropdowns : `fade-in zoom-in-95`, icône + label + description par item
- Clic sur item → `setActiveTab(tab)` ou `navigate(path)`
- Profil condensé à droite (avatar + dropdown existant)
- Couleur : `primary` + neutres uniquement (pas de rainbow)

### 4. `src/components/navigation/HeaderNavDropdown.tsx`
Composant dropdown réutilisable pour chaque groupe. Ouverture au hover, fermeture clic extérieur. Min-width 220px. Animation Tailwind `animate-in fade-in zoom-in-95`.

### 5. `src/components/navigation/MobileNavMenu.tsx`
Menu hamburger pour mobile (<768px) : sheet/drawer avec les mêmes groupes en accordéon.

## Fichiers à modifier

### 6. `src/pages/UnifiedWorkspace.tsx`
- Importer `useNavigationMode`
- Rendu conditionnel : si `mode === 'header'`, afficher `MainHeader` au lieu de `WorkspaceTabBar`
- Le `WorkspaceTabContent` reste identique (piloté par le même state `activeTab`)
- Le composant `Tabs` de Radix reste le wrapper (value/onValueChange inchangés)

### 7. `src/components/unified/workspace/ProfileMenu.tsx`
- Ajouter une entrée "Changer de navigation" avec icône `PanelTop` / `Columns`
- Au clic : toggle entre `'header'` et `'tabs'`
- L'entrée est visible dans les deux modes

### 8. `src/index.css`
- Ajouter les tokens CSS pour les tuiles unifiées (`--tile-border`, `--tile-bg-gradient`, etc.) tel que spécifié dans le blueprint
- Pas de refonte des tokens existants — ajout uniquement

## Règles de style appliquées

- Header : `bg-background/95 backdrop-blur-md`, hauteur 64px, `shadow-sm`
- Dropdowns : `bg-popover border border-border shadow-lg rounded-xl`
- Items : `hover:bg-primary/5`, icône dans cercle `bg-primary/10`, texte `text-foreground`
- Transitions : 150-200ms
- Pas de couleurs hardcodées — tokens sémantiques uniquement
- Mobile : hamburger menu remplace la nav horizontale

## Séquence d'implémentation

1. Hook `useNavigationMode`
2. Config `headerNavigation.ts`
3. `HeaderNavDropdown` (dropdown unitaire)
4. `MainHeader` (assemblage header complet)
5. `MobileNavMenu` (responsive)
6. Modifier `UnifiedWorkspace` pour le dual-mode
7. Modifier `ProfileMenu` pour le toggle
8. Tokens CSS tuiles dans `index.css`

## Ce qui ne change PAS

- `WorkspaceTabContent` : inchangé, même lazy-loading
- Système de permissions / `filterWorkspaceTabs` : réutilisé tel quel
- État `activeTab` + URL sync : identique
- Mode tabs existant : préservé intégralement
- Routes, providers, error boundaries : aucun changement

