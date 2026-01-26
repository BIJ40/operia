

## Corrections Interface Browser Tabs - Réseau Franchiseur

### Problème 1 : Sous-menu du header encore visible sur /hc-reseau

**Diagnostic :**
La condition de masquage `!location.pathname.startsWith('/hc-reseau')` à la ligne 372 de `TabHeader.tsx` est correcte mais elle ne semble pas appliquée dans l'interface visible. Cela peut être dû à une mise en cache du navigateur ou un problème de timing de déploiement.

**Solution :**
Renforcer la condition en vérifiant également si le pathname est exactement `/hc-reseau` ou commence par `/hc-reseau?` (avec query params). La condition actuelle devrait fonctionner pour le pathname nu.

---

### Problème 2 : Bouton "+" mal positionné

**État actuel :**
Le bouton "+" est positionné à l'extrême droite de la barre, séparé des onglets par le `ScrollArea`.

```text
Actuel:   [ Dashboard ] [ Stats ] [ Agences ]            [ + ]
                                                    ↑ tout à droite
```

**État souhaité :**
Le bouton "+" doit apparaître comme un faux onglet juste après le dernier onglet ouvert (ou après Dashboard s'il est seul).

```text
Souhaité: [ Dashboard ] [ + ] [ Stats ] [ Agences ]
                         ↑ intégré dans la ligne d'onglets
```

---

### Modifications à effectuer

**Fichier : `src/franchiseur/components/browser-tabs/BrowserTabsBar.tsx`**

1. Déplacer le bouton "+" à l'intérieur du `DndContext` / juste après les onglets
2. Styliser le bouton "+" comme un onglet avec bordures arrondies en haut
3. Garder le DropdownMenu pour la liste des modules disponibles

```typescript
// Structure modifiée
<div className="flex items-end px-2 pt-2">
  <DndContext ...>
    <SortableContext ...>
      {tabs.map(tab => <BrowserTab ... />)}
    </SortableContext>
  </DndContext>
  
  {/* Bouton + stylisé comme un onglet, juste après les tabs */}
  {availableToOpen.length > 0 && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 px-3 py-2 rounded-t-lg 
          border border-b-0 bg-muted/50 border-transparent 
          text-muted-foreground hover:bg-muted hover:text-foreground
          min-w-[40px] justify-center cursor-pointer">
          <Plus className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent ...>
        {/* Liste des modules */}
      </DropdownMenuContent>
    </DropdownMenu>
  )}
</div>
```

---

### Section technique

**Structure CSS du bouton "+" façon onglet :**

| Propriété | Valeur |
|-----------|--------|
| `rounded-t-lg` | Coins arrondis en haut uniquement |
| `border border-b-0` | Bordure sauf en bas (fusion avec contenu) |
| `bg-muted/50` | Fond semi-transparent |
| `hover:bg-muted` | Survol plus prononcé |
| `min-w-[40px]` | Largeur minimale |

**Impact sur le layout :**
- Le ScrollArea n'englobe plus le bouton "+" séparément
- Le bouton fait partie intégrante de la ligne d'onglets
- L'alignement `items-end` assure que tous les éléments (onglets + bouton) s'alignent sur la bordure du bas

---

### Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `src/franchiseur/components/browser-tabs/BrowserTabsBar.tsx` | Repositionner le bouton "+" dans la ligne d'onglets avec style "tab-like" |
| `src/components/layout/TabHeader.tsx` | Vérifier/renforcer la condition de masquage pour /hc-reseau (optionnel si déjà fonctionnel) |

