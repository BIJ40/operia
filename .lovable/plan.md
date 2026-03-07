

# Replier/déplier les sections dans ModulesMasterView

## Approche

Ajouter un state `collapsedSections` (Set de keys) dans `ModulesMasterView`. Les nœuds `depth === 0` (sections racine) deviennent cliquables : clic sur le nom toggle la section. Les enfants sont masqués quand la section est repliée.

## Changements dans `ModulesMasterView.tsx`

1. **State** : `const [collapsed, setCollapsed] = useState<Set<string>>(new Set());`

2. **Toggle** : fonction `toggleCollapse(key)` qui ajoute/retire la key du Set.

3. **Filtrage** : avant le `.map(node => <ModuleRow>)`, filtrer `flatNodes` pour exclure les nœuds dont un ancêtre (depth 0) est replié. On détecte cela en vérifiant si le key du nœud commence par une key repliée + `.`.

4. **ModuleRow** : pour les nœuds `depth === 0`, rendre le nom cliquable avec `cursor-pointer`, et animer le `ChevronRight` (rotation 90° quand déplié). Passer `isCollapsed` et `onToggleCollapse` en props.

## Détail technique

```typescript
// Filtrer les nœuds visibles
const visibleNodes = flatNodes.filter(node => {
  // Les racines sont toujours visibles
  if (node.depth === 0) return true;
  // Vérifier si un ancêtre racine est replié
  return !Array.from(collapsed).some(key => node.key.startsWith(key + '.'));
});
```

Pour le chevron sur les sections racine :
```tsx
<ChevronRight className={cn('w-4 h-4 mr-1.5 shrink-0 transition-transform', 
  !isCollapsed && 'rotate-90', branchColor)} />
```

Le nom de la section racine reçoit `onClick={() => onToggleCollapse(node.key)}` avec `cursor-pointer`.

