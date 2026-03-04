

## Problème

Dans `InternalGuideCategoryPanel.tsx`, les sections en mode édition ont des boutons (ajouter, éditer, dupliquer, supprimer) mais **pas de drag-and-drop pour réordonner**. Il manque :
1. Un `DndContext` + `SortableContext` autour de la liste de sections
2. Un composant sortable wrapper pour chaque section
3. L'icône `GripVertical` (poignée de déplacement) à côté des autres boutons
4. La logique de persistance du nouvel ordre après un drag

## Plan

### 1. Ajouter le drag-and-drop dans `InternalGuideCategoryPanel.tsx`

**Imports** : Ajouter `DndContext`, `SortableContext`, `closestCenter`, sensors, `verticalListSortingStrategy`, `arrayMove`, `GripVertical`.

**Wrapper sortable** : Créer un petit composant interne `SortableSectionWrapper` qui utilise `useSortable` et passe les `attributes`/`listeners` au bouton GripVertical.

**Structure** :
```text
<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={filteredSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
    <Accordion ...>
      {filteredSections.map(section => (
        <SortableSectionWrapper key={section.id} id={section.id}>
          {({ dragAttributes, dragListeners }) => (
            // existing AccordionItem / TIPS rendering
            // + GripVertical button with dragAttributes/dragListeners
          )}
        </SortableSectionWrapper>
      ))}
    </Accordion>
  </SortableContext>
</DndContext>
```

### 2. Ajouter l'icône GripVertical

Dans la barre de boutons d'édition (ligne ~558-622), ajouter un bouton `GripVertical` en première position avec `cursor-move` et les props `{...dragAttributes} {...dragListeners}`.

### 3. Persister l'ordre

Dans `handleDragEnd`, calculer le nouvel ordre via `arrayMove`, puis appeler `updateBlock` pour mettre à jour le champ `order` de chaque section déplacée dans la base de données.

### Fichier modifié
- `src/components/guides/apogee/InternalGuideCategoryPanel.tsx`

