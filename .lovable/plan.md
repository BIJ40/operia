
# Refonte UX Cockpit Suivi RH - Style LUCCA

## Vision Produit

Transformer le tableau RH actuel (6 onglets techniques) en un **cockpit de gestion humain** inspiré de LUCCA : lisible en 2 secondes, actionnable sans formation, centré sur la personne et ses statuts.

---

## Architecture actuelle vs Cible

```text
AVANT (complexe)                         APRÈS (cockpit)
┌─────────────────────────┐             ┌─────────────────────────┐
│ 6 onglets techniques    │             │ Vue unique synthétique  │
│ - Général               │             │                         │
│ - Infos perso           │ ────────>   │ Colonnes = statuts      │
│ - Sécurité              │             │ ✓/⚠️/❌ = langage visuel │
│ - Compétences           │             │                         │
│ - Parc                  │             │ Clic cellule = drawer   │
│ - Documents             │             │                         │
└─────────────────────────┘             └─────────────────────────┘
```

---

## Structure du nouveau tableau

### Colonnes cockpit (ordre figé)

| # | Colonne | Affichage | Cliquable | Drawer |
|---|---------|-----------|-----------|--------|
| 1 | **Collaborateur** | Avatar + Nom + Badge statut | Survol = preview | Non |
| 2 | **Contact** | ✓ ou ⚠️ | Oui | Contact |
| 3 | **ICE** | 0, 1 ou 2 (couleur) | Oui | ICE |
| 4 | **RH** | ✓ ou ⚠️ | Oui | Dates RH |
| 5 | **EPI & Tailles** | ✓ ou ⚠️ ou ⚫ | Oui | EPI |
| 6 | **Parc** | 🚐 ou — | Oui | Parc |
| 7 | **Documents** | x/y ratio | Oui | Documents |
| 8 | **Compétences** | Nombre | Oui | Compétences |
| 9 | **Complétude** | Progress bar douce | Non | — |
| 10 | **Actions** | 👁 Voir | Oui | Fiche complète |

### Indicateurs visuels (design LUCCA)

```text
Couleurs douces, jamais agressives :
  ✓  → vert doux (#10b981)     = OK
  ⚠️ → ambre doux (#f59e0b)    = Attention
  ❌ → corail (#f87171)         = Critique
  ⚫ → gris (#9ca3af)           = N/A
  —  → tiret discret           = Non défini
```

---

## Drawer latéral universel

### Principe

Un seul composant `RHCockpitDrawer` réutilisé pour tous les domaines. Le contenu change dynamiquement selon la cellule cliquée.

### Structure drawer

```text
┌────────────────────────────────────────────┐
│ [×]  Titre contextuel                     │
├────────────────────────────────────────────┤
│ 💡 Message pédagogique                    │
│ "Il manque 1 information pour compléter"  │
├────────────────────────────────────────────┤
│                                            │
│   [Champs simples avec auto-save]          │
│                                            │
│   📧 Email    _____________________ ✓      │
│   📱 Tél      _____________________ ⚠️     │
│                                            │
└────────────────────────────────────────────┘
```

### Domaines du drawer

| Domaine | Contenu | Source existante |
|---------|---------|------------------|
| Contact | email, téléphone | Inline edit |
| ICE | 2 contacts urgence | useSensitiveData |
| RH | hiring_date, leaving_date | Inline edit |
| EPI & Tailles | Fusion popups existantes | RHEpiPopup + RHTaillesPopup |
| Parc | Véhicule + matériel | RHVehiculePopup + RHMaterielPopup |
| Documents | Finder documents | RHDocumentPopup |
| Compétences | Habilitations, CACES | RHMetiersMultiSelect |

---

## Filtres rapides (quick-access chips)

Barre de filtres cliquables sous les stats :

```text
[❗ À corriger] [🆕 Nouveaux] [🦺 EPI incomplets] [📄 Docs manquants] [🚗 Sans véhicule] [🎓 Compétences]
```

| Filtre | Logique |
|--------|---------|
| À corriger | Complétude < 80% |
| Nouveaux | hiring_date < 30 jours |
| EPI incomplets | statut_epi = 'MISSING' OR 'TO_RENEW' |
| Docs manquants | permis OR cni null |
| Sans véhicule | type=TECHNICIEN AND vehicule null |
| Compétences manquantes | competences_techniques empty |

---

## Hook de calcul des indicateurs

### `useRHCockpitIndicators`

```typescript
interface CockpitIndicators {
  contact: 'ok' | 'warning';           // email AND phone
  ice: 0 | 1 | 2;                      // contacts urgence
  rh: 'ok' | 'warning';                // hiring_date présent
  epiTailles: 'ok' | 'warning' | 'na'; // synthèse EPI+tailles
  parc: 'vehicle' | 'none';            // véhicule attribué
  documents: { filled: number; total: number };
  competences: number;                  // count
  completeness: number;                 // 0-100
  globalStatus: 'ok' | 'warning' | 'critical';
}
```

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `src/components/rh/cockpit/RHCockpitTable.tsx` | Tableau principal cockpit |
| `src/components/rh/cockpit/RHCockpitRow.tsx` | Ligne avec cellules compactes |
| `src/components/rh/cockpit/RHCockpitColumns.ts` | Configuration des colonnes |
| `src/components/rh/cockpit/RHCockpitDrawer.tsx` | Drawer latéral universel |
| `src/components/rh/cockpit/RHCockpitDrawerContact.tsx` | Contenu drawer Contact |
| `src/components/rh/cockpit/RHCockpitDrawerICE.tsx` | Contenu drawer ICE |
| `src/components/rh/cockpit/RHCockpitDrawerRH.tsx` | Contenu drawer dates RH |
| `src/components/rh/cockpit/RHCockpitDrawerEPI.tsx` | Fusion EPI + Tailles |
| `src/components/rh/cockpit/RHCockpitDrawerParc.tsx` | Véhicule + Matériel |
| `src/components/rh/cockpit/RHCockpitDrawerDocs.tsx` | Documents Finder |
| `src/components/rh/cockpit/RHCockpitDrawerCompetences.tsx` | Compétences |
| `src/components/rh/cockpit/RHCockpitFilters.tsx` | Barre filtres chips |
| `src/components/rh/cockpit/RHCockpitCell.tsx` | Cellule indicateur générique |
| `src/hooks/rh/useRHCockpitIndicators.ts` | Calcul indicateurs |
| `src/components/rh/cockpit/index.ts` | Exports |

## Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `src/pages/rh/RHSuiviIndex.tsx` | Remplacer RHUnifiedTable par RHCockpitTable |
| `src/components/rh/unified/RHStatsHeader.tsx` | Intégrer RHCockpitFilters |

## Fichiers conservés (réutilisation)

- `CollaboratorHoverPreview.tsx` - Preview au survol
- `RHProfileProgressBar.tsx` - Barre de progression
- `RHStatusBadges.tsx` - Logique de statut
- Browser tabs system - Fiches complètes
- Tous les hooks existants (useRHInlineEdit, useProfileCompleteness, etc.)

---

## Interactions UX

| Action | Résultat |
|--------|----------|
| Clic cellule statut | Ouvre drawer latéral droit |
| Survol nom | Affiche HoverCard preview existant |
| Double-clic ligne | Ouvre fiche complète (browser tab) |
| Clic droit ligne | Menu contextuel existant |
| Édition dans drawer | Auto-save + feedback ✓ |
| Clic filtre | Toggle on/off, combinables |

---

## Design LUCCA - Principes appliqués

1. **La personne avant la donnée** : Avatar toujours visible, nom en premier
2. **Tout est un état** : Chaque colonne = indicateur visuel, pas champ texte
3. **Progression visible** : Barre de complétude douce, jamais agressive
4. **Zéro friction** : Drawer non bloquant, tableau reste visible, auto-save
5. **Peu de texte** : Icônes + couleurs comme langage principal
6. **Design sobre** : Couleurs douces, ombres légères, espacement aéré

---

## Plan d'implémentation

### Phase 1 - Fondations
1. Créer le hook `useRHCockpitIndicators` avec logique de calcul
2. Créer le composant `RHCockpitCell` générique pour les indicateurs
3. Créer la structure du drawer `RHCockpitDrawer` (Sheet wrapper)

### Phase 2 - Contenus drawer
4. Implémenter `RHCockpitDrawerContact` (email, téléphone)
5. Implémenter `RHCockpitDrawerICE` (contacts urgence)
6. Implémenter `RHCockpitDrawerEPI` (fusion EPI + Tailles existants)
7. Implémenter `RHCockpitDrawerParc` (véhicule + matériel)
8. Implémenter `RHCockpitDrawerDocs` (Finder documents)
9. Implémenter `RHCockpitDrawerCompetences`

### Phase 3 - Tableau cockpit
10. Créer `RHCockpitRow` avec toutes les cellules indicateurs
11. Créer `RHCockpitTable` assemblant le tout
12. Créer `RHCockpitFilters` (chips filtres)

### Phase 4 - Intégration
13. Modifier `RHSuiviIndex.tsx` pour utiliser le cockpit
14. Intégrer les filtres dans le header
15. Tests et ajustements visuels

---

## Section technique

### Composant RHCockpitCell (pattern générique)

```typescript
interface RHCockpitCellProps {
  status: 'ok' | 'warning' | 'error' | 'na';
  label?: string | number;
  icon?: LucideIcon;
  onClick: () => void;
  tooltip?: string;
}
```

### Drawer state management

```typescript
const [drawer, setDrawer] = useState<{
  open: boolean;
  domain: 'contact' | 'ice' | 'rh' | 'epi' | 'parc' | 'docs' | 'competences';
  collaboratorId: string;
} | null>(null);
```

### Auto-save pattern (existant réutilisé)

```typescript
const { handleValueChange, getLocalValue } = useRHInlineEdit(collaborators, onRefresh);
// Debounce 2s, sauvegarde automatique
```

---

## Résultat attendu

Une interface qui :
- Se lit en 2 secondes
- Guide sans parler
- Valorise la personne
- Donne le controle sans complexité
- Ressemble à un produit SaaS premium type LUCCA
