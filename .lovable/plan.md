
# Plan : Bouton "Nouveaux" - Tickets modifiés depuis la dernière visite

## Objectif
Ajouter un bouton "NOUVEAUX" à côté du bouton "RETARD" sur la page `/liste` (ApogeeTicketsList) qui affiche les tickets ayant été modifiés par d'autres utilisateurs depuis la dernière consultation de l'utilisateur courant.

## Analyse Technique

### Système existant
- **Table `apogee_ticket_views`** : stocke `ticket_id`, `user_id`, `viewed_at`
- **Champs tickets** : `last_modified_at`, `last_modified_by_user_id`
- **Logique de clignotement** : Un ticket est "nouveau" si :
  1. `last_modified_by_user_id !== user.id` (modifié par quelqu'un d'autre)
  2. `last_modified_at > viewed_at` (modifié après la dernière consultation)
  3. Ou jamais consulté (`myView` inexistant)

### Réutilisation
- Hook existant : `useMyTicketViews()` pour récupérer les vues de l'utilisateur
- Même pattern que le Kanban (`blinkingTicketsCount`, `filterBlinkingOnly`)

---

## Phase 1 : Nouveau Composant `NewTicketsPanel.tsx`

Créer un panel similaire à `LateTicketsPanel` qui affiche les tickets "nouveaux" (modifiés depuis la dernière visite).

```text
Structure du panel:
┌─────────────────────────────────────────────────────────┐
│ 🆕 X tickets avec mises à jour                         │
│ [Filtre Priorité]                                       │
│ Tickets modifiés par d'autres depuis votre dernière vue│
├─────────────────────────────────────────────────────────┤
│ #123  [Statut]  [Module]                               │
│ Titre du ticket                                         │
│ 📝 Modifié par Jean D. il y a 2h                       │
│                                              [8] 🔥     │
├─────────────────────────────────────────────────────────┤
│ ...                                                     │
└─────────────────────────────────────────────────────────┘
```

**Caractéristiques** :
- Style identique à `LateTicketsPanel` (ScrollArea, badges colorés)
- Icône : `Sparkles` ou `MessageSquare` (cohérent avec le Kanban)
- Couleur thématique : Vert/Teal (comme le badge "Nouveaux" du Kanban)
- Tri : par `last_modified_at` décroissant (les plus récents en haut)
- Affiche le nom du dernier modificateur et la date relative

---

## Phase 2 : Mise à jour de `TicketTabBar.tsx`

Ajouter un nouvel onglet "NOUVEAUX" entre "LISTE" et "RETARD".

**Nouvelles props** :
```typescript
interface TicketTabBarProps {
  // ... existants ...
  showNewTab?: boolean;
  isNewTabActive?: boolean;
  onNewTabClick?: () => void;
  newCount?: number;
}
```

**Style de l'onglet NOUVEAUX** :
- Couleur : Vert/Teal (bg-emerald-50, border-emerald-400)
- Icône : `Sparkles` ou `MessageSquarePlus`
- Badge pulsant si `newCount > 0` et onglet non actif

---

## Phase 3 : Mise à jour de `ApogeeTicketsList.tsx`

### Ajouter les états
```typescript
// État pour afficher l'onglet NOUVEAUX
const [showNewTab, setShowNewTab] = useState(false);
const [isNewTabActive, setIsNewTabActive] = useState(false);
```

### Calculer le compteur de tickets "nouveaux"
Utiliser `useMyTicketViews()` pour compter les tickets modifiés depuis la dernière visite :

```typescript
const { data: myViews = [] } = useMyTicketViews();

const newTicketsCount = useMemo(() => {
  return tickets.filter(ticket => {
    if (!user?.id || !ticket.last_modified_by_user_id || !ticket.last_modified_at) {
      return false;
    }
    // Pas modifié par moi-même
    if (ticket.last_modified_by_user_id === user.id) {
      return false;
    }
    const myView = myViews.find(v => v.ticket_id === ticket.id);
    // Jamais vu = nouveau
    if (!myView) return true;
    // Modifié après ma dernière vue
    return new Date(ticket.last_modified_at).getTime() > new Date(myView.viewed_at).getTime();
  }).length;
}, [tickets, myViews, user?.id]);
```

### Ajouter le bouton "Nouveaux" dans le header
À côté du bouton "En retard", avec le même style :

```tsx
<Button
  variant={showNewTab ? "secondary" : "outline"}
  size="sm"
  onClick={() => {
    if (!showNewTab) {
      setShowNewTab(true);
      setIsNewTabActive(true);
      setActiveTabId(null);
    } else {
      setShowNewTab(false);
      setIsNewTabActive(false);
    }
  }}
  className={cn(
    "gap-2 transition-all",
    newTicketsCount > 0 && !showNewTab && "border-emerald-500/50 text-emerald-600 hover:bg-emerald-50"
  )}
>
  <Sparkles className="h-4 w-4" />
  <span className="hidden sm:inline">Nouveaux</span>
  {newTicketsCount > 0 && (
    <span className={cn(
      "inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-medium rounded-full",
      showNewTab 
        ? "bg-emerald-500 text-white" 
        : "bg-emerald-100 text-emerald-700 animate-pulse"
    )}>
      {newTicketsCount}
    </span>
  )}
</Button>
```

### Passer les nouvelles props à `TicketTabBar`
```tsx
<TicketTabBar
  // ... existants ...
  showNewTab={showNewTab}
  isNewTabActive={isNewTabActive}
  onNewTabClick={handleNewTabClick}
  newCount={newTicketsCount}
/>
```

### Gérer l'affichage du panel
Dans la zone de contenu, ajouter la condition pour `showingNew` :

```tsx
const showingNew = isNewTabActive;
const showingLate = isLateTabActive && !isNewTabActive;
const showingList = activeTabId === null && !isLateTabActive && !isNewTabActive;

// Dans le rendu:
{showingNew ? (
  <NewTicketsPanel onTicketClick={handleTicketClick} />
) : showingLate ? (
  <LateTicketsPanel onTicketClick={handleTicketClick} />
) : showingList ? (
  // Vue Liste
) : /* Vue ticket */}
```

---

## Phase 4 : Styling & Cohérence

### Palette de couleurs
| Onglet | Background | Border | Text |
|--------|------------|--------|------|
| LISTE | sky-50 | sky-400 | sky-700 |
| NOUVEAUX | emerald-50 | emerald-400 | emerald-600 |
| RETARD | red-50 | destructive/50 | destructive |
| Ticket | violet-50 | violet-400 | violet-700 |

### Icônes
- LISTE : `List`
- NOUVEAUX : `Sparkles` (cohérent avec "mises à jour")
- RETARD : `AlertTriangle`

---

## Fichiers à Modifier

1. **`src/apogee-tickets/components/NewTicketsPanel.tsx`** (NOUVEAU)
   - Panel affichant les tickets modifiés depuis la dernière visite
   - Style copié de `LateTicketsPanel` avec couleur emerald/teal

2. **`src/apogee-tickets/components/TicketTabBar.tsx`**
   - Ajouter props pour l'onglet NOUVEAUX
   - Ajouter le rendu de l'onglet avec style emerald

3. **`src/apogee-tickets/pages/ApogeeTicketsList.tsx`**
   - Import de `useMyTicketViews`
   - Calcul de `newTicketsCount`
   - États `showNewTab`, `isNewTabActive`
   - Bouton "Nouveaux" dans le header
   - Rendu conditionnel de `NewTicketsPanel`

---

## Comportement UX

1. **État initial** : Le bouton "Nouveaux" affiche un badge vert pulsant si des tickets ont été modifiés
2. **Clic sur "Nouveaux"** : 
   - Active l'onglet NOUVEAUX dans la tab bar
   - Affiche le panel avec la liste des tickets modifiés
3. **Clic sur un ticket** : Ouvre le ticket en onglet (comme depuis RETARD)
4. **Ouverture d'un ticket** : Marque le ticket comme "vu" (via `useMarkTicketAsViewed`)
5. **Fermeture de l'onglet NOUVEAUX** : Re-clic sur le bouton "Nouveaux" dans le header

---

## Avantages

- **Cohérence** : Même pattern visuel et comportemental que "En retard"
- **Réutilisation** : Utilise les hooks existants (`useMyTicketViews`)
- **Clarté** : L'utilisateur voit immédiatement les tickets nécessitant son attention
- **Performance** : Le compteur est calculé côté client à partir des données déjà chargées
