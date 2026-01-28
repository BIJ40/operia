
# Plan de Refonte UX/UI du Dashboard d'Accueil

## Vision Cible
Transformer le dashboard "outil administratif" en une **expérience engageante** que l'on ouvre par envie, pas par obligation. L'interface doit être chaleureuse, intuitive et orientée décision.

---

## 1. Analyse Critique du Dashboard Actuel

### Forces
- Structure claire par rôle (N0, N1, N2+)
- Sélecteur de période fonctionnel
- Widgets modulaires réutilisables
- Design system cohérent (HelpConfort colors)

### Faiblesses
- **Titres administratifs froids** : "Indicateurs clés", "CA par Univers", "Top 3 Techniciens"
- **Cartes plates** : Bordures fines, peu de profondeur, effet "tableur Excel"
- **Surcharge visuelle** : Trop d'informations affichées d'emblée
- **Pas de carte RDV** : Module clé absent de la page d'accueil
- **Effet ERP** : Grille rigide, zéro respiration, couleurs trop saturées
- **Pas de hiérarchie visuelle** : Tout semble avoir la meme importance

---

## 2. Nouvelle Architecture du Dashboard

### Structure en 3 Niveaux de Lecture

```text
+------------------------------------------------------------------+
|  HERO SECTION - "Où ça se passe aujourd'hui" (Carte RDV mini)    |
|  [ Carte interactive intégrée avec pastilles techniciens ]       |
+------------------------------------------------------------------+
|                                                                   |
|  NIVEAU 1 - VUE IMMÉDIATE                                        |
|  +-------------+  +-------------+  +-------------+  +------------+|
|  | Le Pouls    |  | Qui fait    |  | Ce qui      |  | À         ||
|  | de l'Agence |  | tourner     |  | mérite      |  | surveiller||
|  | (CA + KPIs) |  | (Univers)   |  | le podium   |  | (SAV)     ||
|  +-------------+  +-------------+  +-------------+  +------------+|
|                                                                   |
|  NIVEAU 2 - EXPLORABLE                                           |
|  +---------------------------+  +--------------------------------+|
|  | À ne pas oublier          |  | Mes raccourcis                 ||
|  | (Tickets récents)         |  | (Favoris)                      ||
|  +---------------------------+  +--------------------------------+|
|                                                                   |
+------------------------------------------------------------------+
```

---

## 3. Nouveaux Titres "Humains"

### Remplacement des titres actuels

| Ancien Titre             | Nouveaux Titres (rotation aléatoire)                                |
|--------------------------|---------------------------------------------------------------------|
| "Indicateurs clés"       | "Le pouls de l'agence", "Comment ça tourne", "En un coup d'oeil"   |
| "Top 3 Techniciens"      | "Qui fait la différence", "Le podium du mois", "Les étoiles"      |
| "CA par Univers"         | "Ce qui fait tourner", "Où se fait le CA", "Les métiers"          |
| "CA par Apporteur"       | "D'où vient le travail", "Nos prescripteurs", "Les sources"       |
| "Taux SAV"               | "À surveiller", "Attention requise", "Point de vigilance"         |
| "Derniers tickets"       | "À ne pas oublier", "Demandes en cours", "Ce qui attend"          |
| "Mes favoris"            | "Mes raccourcis", "Accès rapides", "Ma boîte à outils"            |

---

## 4. Design System "Warm Dashboard"

### Nouveaux Tokens CSS
```css
/* Palette émotionnelle pastel */
--warm-blue: 200 85% 60%;      /* Bleu doux */
--warm-green: 145 60% 55%;     /* Vert apaisant */
--warm-orange: 35 90% 60%;     /* Orange chaleureux */
--warm-purple: 270 60% 65%;    /* Violet doux */
--warm-pink: 340 70% 65%;      /* Rose tendre */

/* Ombres douces */
--shadow-card: 0 4px 20px -4px rgba(0,0,0,0.08);
--shadow-card-hover: 0 8px 30px -8px rgba(0,0,0,0.12);

/* Rayons ultra-arrondis */
--radius-warm: 1.25rem; /* 20px */
```

### Composant `WarmCard`
- Border-radius: 20px (ultra-arrondi)
- Ombres douces et diffuses
- Background avec gradient subtil
- Hover: légère élévation + scale(1.02)
- Icones colorées en pastilles rondes

---

## 5. Intégration Module Carte RDV

### Position: Hero Section du Dashboard
- **Emplacement**: En haut, pleine largeur, hauteur 280px
- **Mode compact**: Carte simplifiée sans filtres visibles
- **Interaction**: Clic pour agrandir en modal/drawer

### Caractéristiques
- Affiche les RDV du jour uniquement
- Pastilles colorées par technicien (réutilise `PinMarker.tsx`)
- Compteur de RDV visible: "12 RDV aujourd'hui"
- Bouton "Voir en grand" → Modal plein écran avec filtres

### Composant `DashboardMapWidget`
```text
+-----------------------------------------------------------+
| 🗺️  Où ça se passe aujourd'hui         12 RDV  [Agrandir] |
+-----------------------------------------------------------+
|                                                           |
|     [Carte Mapbox simplifiée avec markers]                |
|                                                           |
+-----------------------------------------------------------+
```

---

## 6. Animations et Interactions

### Micro-interactions avec Framer Motion
- **Entrée des cartes**: fade-in + scale-in échelonné (stagger 50ms)
- **Hover cartes**: scale(1.02) + shadow-lg
- **Chargement KPIs**: Skeleton avec shimmer effect
- **Compteurs**: Animation numérique (count-up)

### Révélation Progressive
- Widgets secondaires (SAV, Panier Moyen) en mode "collapsed" par défaut
- Expansion au clic ou hover
- Drawers latéraux pour les détails

---

## 7. Fichiers à Créer/Modifier

### Nouveaux Fichiers
```text
src/components/dashboard/v2/
├── WarmCard.tsx              # Nouveau composant carte arrondie
├── DashboardHero.tsx         # Hero section avec carte RDV
├── DashboardMapWidget.tsx    # Widget carte intégré
├── PulseIndicator.tsx        # KPI avec animation
├── HumanTitle.tsx            # Générateur de titres aléatoires
├── DashboardV2.tsx           # Nouveau layout principal
└── hooks/
    └── useHumanTitles.ts     # Hook pour rotation des titres
```

### Fichiers à Modifier
```text
src/pages/DashboardStatic.tsx        # Refactor complet du layout
src/components/ui/card.tsx           # Ajouter variante "warm"
src/index.css                        # Nouveaux tokens CSS pastel
tailwind.config.ts                   # Ajouter couleurs + shadows
src/components/dashboard/KpiTile.tsx # Appliquer style warm
src/components/dashboard/widgets/*   # Adapter tous les widgets
```

---

## 8. Plan d'Exécution

### Phase 1: Design System (30 min)
1. Ajouter tokens CSS pastel dans `index.css`
2. Étendre `tailwind.config.ts` avec nouvelles couleurs/shadows
3. Créer composant `WarmCard.tsx`

### Phase 2: Titres Humains (15 min)
1. Créer hook `useHumanTitles.ts`
2. Créer composant `HumanTitle.tsx`
3. Configurer la rotation aléatoire des titres

### Phase 3: Widget Carte RDV (45 min)
1. Créer `DashboardMapWidget.tsx` (version compacte)
2. Réutiliser `useRdvMap` et `PinMarker`
3. Ajouter modal d'expansion

### Phase 4: Refonte DashboardStatic (60 min)
1. Restructurer le layout en 3 niveaux
2. Remplacer tous les titres par `HumanTitle`
3. Appliquer `WarmCard` partout
4. Intégrer le hero avec carte

### Phase 5: Animations (20 min)
1. Ajouter framer-motion pour entrées échelonnées
2. Animer les compteurs KPI
3. Implémenter hover effects

---

## 9. Exemple de Rendu Visuel

### Avant (Actuel)
```text
┌─────────────────────────────────────────────────┐
│ Indicateurs clés                    [icône]     │
├─────────────────────────────────────────────────┤
│ CA période: 45 230 €   Taux SAV: 3.2%          │
│ ...                                             │
└─────────────────────────────────────────────────┘
```

### Après (Nouveau)
```text
╭─────────────────────────────────────────────────╮
│  🔵                                             │
│  Le pouls de l'agence                           │
│                                                 │
│  ╭─────╮ ╭─────╮ ╭─────╮ ╭─────╮ ╭─────╮ ╭────╮│
│  │ 45k │ │ 72% │ │ 3.2%│ │ 890€│ │ 127 │ │ 48 ││
│  │ CA  │ │Trans│ │ SAV │ │Panie│ │Dossi│ │Devi││
│  ╰─────╯ ╰─────╯ ╰─────╯ ╰─────╯ ╰─────╯ ╰────╯│
│                                                 │
│  [Sparkline CA mensuel avec gradient doux]      │
╰─────────────────────────────────────────────────╯
```

---

## 10. Section Technique

### Dépendances Existantes Utilisées
- `framer-motion` (déjà installé) - Animations
- `mapbox-gl` (déjà installé) - Carte
- `recharts` (déjà installé) - Graphiques
- `@radix-ui/*` (déjà installé) - Composants UI

### Compatibilité Rôles
- **N0**: Tickets + Favoris (style warm, pas de carte)
- **N1 Tech**: KPIs perso + Tickets + Favoris
- **N2+**: Layout complet avec carte RDV

### Performance
- Carte RDV chargée en lazy (Suspense)
- Widgets avec `staleTime: 5min` (déjà en place)
- Animations CSS uniquement (pas de JS pour hover)
