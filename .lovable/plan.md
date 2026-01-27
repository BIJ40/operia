
# Plan de simplification de l'interface du tableau RH Suivi

## Problèmes identifiés

Sur la base de la capture d'écran et de l'analyse du code :

1. **Survol (HoverCard) passe dessous** : Le z-index du HoverCard (z-50) est inférieur à celui des éléments parents ou entre en conflit avec le contexte de stacking des colonnes sticky
2. **Icônes inutiles** : Le stylo (Pencil) et les 3 points (MoreVertical) encombrent l'espace entre l'avatar et le nom
3. **UX complexe** : L'accès au wizard d'édition et à la fiche complète n'est pas intuitif

---

## Solution proposée

### 1. Supprimer les icônes (Pencil et MoreVertical)

**Fichier :** `src/components/rh/unified/RHUnifiedTableRow.tsx`

- Retirer le bouton Pencil (lignes 483-493)
- Retirer le DropdownMenu avec les 3 points (lignes 494-535)
- Garder uniquement : Avatar + indicateur de statut global

**Avant :**
```
[Avatar] [●] [✏️] [⋮] | BOUHI | AMANDINE
```

**Après :**
```
[Avatar] [●] | BOUHI | AMANDINE
```

---

### 2. Corriger le z-index du HoverCard

**Fichier :** `src/components/rh/unified/CollaboratorHoverPreview.tsx`

- Ajouter un z-index plus élevé (z-[100]) au `HoverCardContent` pour qu'il passe au-dessus des colonnes sticky (z-10)

---

### 3. Simplifier l'UX : accès Wizard + Fiche complète

**Approche :** Utiliser le clic droit (Context Menu) sur la ligne du collaborateur pour afficher les actions

**Fichier :** `src/components/rh/unified/RHUnifiedTableRow.tsx`

Ajouter un `ContextMenu` enveloppant la `TableRow` avec les options :
- **Ouvrir la fiche** → Appelle `onOpenProfile(collaborator)`
- **Modifier (Wizard)** → Appelle `onEditCollaborator(collaborator.id)`
- **Changer classification** → Sous-menu existant
- **Supprimer** → Option existante

En plus, le **clic simple** sur le nom/prénom ouvre la fiche complète (comportement actuel préservé).

---

## Résumé des modifications

| Fichier | Modification |
|---------|--------------|
| `RHUnifiedTableRow.tsx` | Supprimer Pencil + MoreVertical, ajouter ContextMenu sur la ligne |
| `CollaboratorHoverPreview.tsx` | Augmenter z-index à z-[100] |

---

## Récapitulatif UX simplifié

| Action | Résultat |
|--------|----------|
| Clic sur nom/prénom | Ouvre la fiche complète dans un onglet |
| Survol sur nom | Affiche l'aperçu HoverCard |
| Clic droit sur la ligne | Menu contextuel (Fiche, Wizard, Classification, Supprimer) |
| Double-clic sur cellule | Édition inline (comportement existant) |

---

## Détails techniques

### Modification du z-index (CollaboratorHoverPreview.tsx)
```tsx
<HoverCardContent 
  side="right" 
  align="start" 
  className="w-80 p-0 overflow-hidden z-[100]"  // Ajout de z-[100]
  sideOffset={8}
>
```

### Structure du Context Menu (RHUnifiedTableRow.tsx)
```tsx
<ContextMenu>
  <ContextMenuTrigger asChild>
    <TableRow ...>
      {/* Contenu de la ligne */}
    </TableRow>
  </ContextMenuTrigger>
  <ContextMenuContent className="w-56">
    <ContextMenuItem onClick={() => onOpenProfile?.(collaborator)}>
      <ExternalLink className="h-4 w-4 mr-2" />
      Ouvrir la fiche complète
    </ContextMenuItem>
    <ContextMenuItem onClick={() => onEditCollaborator?.(collaborator.id)}>
      <Pencil className="h-4 w-4 mr-2" />
      Modifier (Wizard)
    </ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuSub>
      <ContextMenuSubTrigger>
        <UserCog className="h-4 w-4 mr-2" />
        Changer classification
      </ContextMenuSubTrigger>
      <ContextMenuSubContent>
        {/* Options de classification */}
      </ContextMenuSubContent>
    </ContextMenuSub>
    <ContextMenuSeparator />
    <ContextMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
      <Trash2 className="h-4 w-4 mr-2" />
      Supprimer
    </ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>
```

