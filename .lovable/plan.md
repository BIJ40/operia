

## Fix : Latence des Tags dans le ticket ouvert

### Cause racine identifiée

Le problème n'est **pas** un problème d'événements (les `stopPropagation` et `modal={true}` sont déjà en place). C'est un problème de **latence async** :

1. Quand l'utilisateur clique sur un tag pour l'ajouter, `handleToggleTag` appelle `handleAddTag` qui fait **`await ensureTagExists(upperTag)`** — un appel base de données — **avant** de mettre à jour l'UI via `onTagsChange`.
2. Ce `await` crée un délai perceptible (200-500ms réseau) pendant lequel rien ne se passe visuellement.
3. Même pour les tags existants (BUG, EVO, NTH), le hook vérifie la liste en mémoire puis potentiellement fait un `mutateAsync` + `invalidateQueries`, ce qui provoque un re-render global.

### Correction

Rendre l'ajout de tag **optimiste** : mettre à jour l'UI immédiatement, puis persister le tag en base en arrière-plan (fire-and-forget).

### Fichier à modifier

**`src/apogee-tickets/components/TagSelector.tsx`** :
- `handleAddTag` : appeler `onTagsChange` **avant** `ensureTagExists`, pas après
- `ensureTagExists` en fire-and-forget (pas de `await`)
- `handleToggleTag` : retirer le `async/await` inutile

```typescript
// AVANT (latent)
const handleAddTag = async (tag: string) => {
  const upperTag = tag.toUpperCase().trim();
  if (upperTag && !selectedTags.includes(upperTag)) {
    await ensureTagExists(upperTag);      // ← bloque l'UI
    onTagsChange([...selectedTags, upperTag]);
  }
};

// APRÈS (optimiste)
const handleAddTag = (tag: string) => {
  const upperTag = tag.toUpperCase().trim();
  if (upperTag && !selectedTags.includes(upperTag)) {
    onTagsChange([...selectedTags, upperTag]);  // ← UI immédiate
    ensureTagExists(upperTag);                   // ← fire-and-forget
  }
};
```

Changement minimal, impact maximal sur la réactivité.

