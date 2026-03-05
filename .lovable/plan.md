

## Diagnostic des 3 problèmes de réactivité des tickets

### Problème 1 : Clics sur la barre PEC / Slider non pris en compte

**Cause identifiée** : Dans `TicketTableRow.tsx`, la `<TableRow>` a un `onClick={onSelect}` (ligne 111) qui capture le clic avant que le `Select` ou le `Slider` ne puisse le traiter. Les `SelectTrigger` ont bien `e.stopPropagation()` (lignes 197, 235), mais dans le **TicketInlinePanel**, le `OwnerSideSlider` compact est un slider Radix qui n'a PAS de `stopPropagation`. Le clic peut être "avalé" par un parent ou par le re-render causé par `onSelect`.

De plus, le `OwnerSideSlider` compact utilise un slider avec `touch-none select-none` qui peut interférer avec les clics sur certains navigateurs.

**Correction** :
- Ajouter `onPointerDown={(e) => e.stopPropagation()}` et `onClick={(e) => e.stopPropagation()}` sur le wrapper du `OwnerSideSlider` dans `TicketInlinePanel` et `TicketTableRow`
- Dans `TicketTableRow`, les cellules interactives (PEC, Select) doivent avoir `onClick={(e) => e.stopPropagation()}` sur la `TableCell` elle-même, pas seulement sur le trigger

### Problème 2 : Champs estimatifs qui se remettent à vide

**Cause identifiée** : Le mécanisme `queueChange` dans `useTicketTabs.ts` utilise un debounce de 1200ms. Si l'utilisateur saisit une valeur dans h_min/h_max, le `onBlur` déclenche `onQueueChange`, mais :
1. Le `useEffect` à la ligne 190-195 de `TicketInlinePanel` synchronise `localHMin`/`localHMax` depuis `ticket.h_min`/`ticket.h_max` à chaque changement de ces props
2. Quand `invalidateQueries` est appelé après le save (ligne 266 de `useTicketTabs`), les données sont refetchées et le ticket est remplacé, ce qui fonctionne normalement
3. **Le vrai problème** : quand l'utilisateur ferme le tab (`closeTab`), `flushPendingChanges` est appelé, mais `updateMutation.mutate` est **asynchrone** et le composant est **démonté** avant que le save n'aboutisse. Si la mutation échoue silencieusement (ex: race condition), les données sont perdues.
4. De plus, si l'utilisateur change de tab **avant** que le blur ne se déclenche, le `onBlur` peut ne jamais être appelé.

**Correction** :
- Ajouter un `useEffect` cleanup dans `TicketInlinePanel` qui flush les champs locaux modifiés non sauvés quand le composant se démonte (pas seulement le blur)
- Utiliser `mutateAsync` au lieu de `mutate` dans `flushPendingChanges` avec `await`, et ajouter un toast d'erreur visible en cas d'échec
- Ajouter un `beforeunload` listener pour éviter la perte lors de la fermeture de page

### Problème 3 : Tags difficiles à changer (clics non pris en compte)

**Cause identifiée** : Le `TagSelector` utilise un `Popover` avec `modal={false}`. Le problème est que le `Popover` est imbriqué dans un contexte qui peut capturer les événements (ScrollArea, Tabs, etc.). Quand le `PopoverContent` s'ouvre, les clics sur les `Badge` à l'intérieur peuvent être interceptés par :
1. Le `ScrollArea` parent qui a son propre handling du scroll/pointer
2. Le `e.stopPropagation()` du `Input` component (ligne 10-14 de `input.tsx`) qui empêche la propagation de TOUTES les touches, y compris dans le popover

**Correction** :
- Passer `modal={true}` sur le `Popover` du `TagSelector` pour que le popover soit rendu dans un portal et ne soit pas affecté par les parents
- Ajouter `onClick={(e) => e.stopPropagation()}` sur le `PopoverContent`
- S'assurer que les `Badge` cliquables ont `onPointerDown` en plus de `onClick` pour une meilleure réactivité

### Fichiers à modifier

| Fichier | Changement |
|---|---|
| `src/apogee-tickets/components/TagSelector.tsx` | `modal={true}` sur Popover, `stopPropagation` sur PopoverContent |
| `src/apogee-tickets/components/TicketTableRow.tsx` | `stopPropagation` sur les `TableCell` interactives (PEC, Statut) |
| `src/apogee-tickets/components/TicketInlinePanel.tsx` | Flush des champs locaux au démontage, `stopPropagation` sur le wrapper du slider |
| `src/apogee-tickets/hooks/useTicketTabs.ts` | `mutateAsync` + toast d'erreur visible, protection contre perte de données |

