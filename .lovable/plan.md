
# Plan : Correction de la synchronisation Apogée - Salariés manquants

## Problème identifié

L'API Apogée retourne **19 utilisateurs** (dont ~15-16 actifs avec `is_on: true`), mais seulement **12 sont synchronisés** dans la base de données. Les collaborateurs comme **Maxime Pasquier** (ID: 9) et **Loic Lajus** (ID: 29) existent dans la base mais pourraient ne pas apparaître dans l'interface pour d'autres raisons.

Après investigation, les données sont présentes en base :
- MAXIME PASQUIER (apogee_user_id: 9) ✅
- LOIC LAJUS (apogee_user_id: 29) ✅

**Cause possible** : L'interface affiche 12 collaborateurs mais certains onglets sont hors de l'écran (scroll horizontal). Le problème réel est que **des utilisateurs Apogée actifs ne sont pas proposés à la synchronisation**.

---

## Corrections à apporter

### 1. Améliorer la visibilité du bouton de synchronisation avec badge

**Fichier** : `src/components/rh/ApogeeSync/ApogeeSyncButton.tsx`

Actuellement, le bouton de sync est un simple icône sans indication visuelle du nombre de changements détectés. Il faut :
- Afficher un **badge rouge** avec le nombre de créations/mises à jour en attente
- Rendre le bouton plus visible quand il y a des actions disponibles

```typescript
{totalChanges > 0 && (
  <Badge 
    variant="destructive" 
    className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
  >
    {totalChanges}
  </Badge>
)}
```

### 2. Filtrer les utilisateurs système de la synchronisation

**Fichier** : `src/hooks/useApogeeSync.ts`

Exclure les comptes système comme "Dynoco Admin" (ID: 1) et autres utilisateurs avec des noms clairement système (ex: contenant "admin" en minuscule dans username, ou type="admin" mais firstname="Dynoco").

```typescript
// Filtrer les utilisateurs système avant le traitement
const validApogeeUsers = (apogeeUsers as ApogeeUserFull[]).filter(user => {
  // Exclure les comptes système (Dynoco Admin, etc.)
  if (user.firstname?.toLowerCase() === 'dynoco') return false;
  if (user.username?.toLowerCase() === 'admin' && user.id === 1) return false;
  return true;
});
```

### 3. Ajouter un indicateur visuel dans les onglets pour le scroll

**Fichier** : `src/components/rh/salaries/SalariesFolderTabs.tsx`

Ajouter un indicateur visuel (flèche ou fade) indiquant qu'il y a plus d'onglets à droite quand le scroll est possible.

```typescript
// Détecter le scroll et afficher un indicateur
const [canScrollRight, setCanScrollRight] = useState(false);

useEffect(() => {
  const container = containerRef.current;
  if (container) {
    const checkScroll = () => {
      setCanScrollRight(container.scrollWidth > container.clientWidth + container.scrollLeft);
    };
    checkScroll();
    container.addEventListener('scroll', checkScroll);
    return () => container.removeEventListener('scroll', checkScroll);
  }
}, [collaborators]);
```

### 4. Forcer le rafraîchissement du cache Apogée lors de la synchronisation

**Fichier** : `src/hooks/useApogeeSync.ts` + `src/components/rh/RHSuiviContent.tsx`

Ajouter une option pour bypasser le cache lors de l'ouverture du dialogue de sync, afin de toujours avoir les données les plus récentes :

```typescript
// Dans useApogeeUsers - ajouter option bypassCache
const { users: apogeeUsers, loading: loadingUsers, refetch } = useApogeeUsers({ 
  agencySlug,
  bypassCache: true // Pour la sync, toujours aller chercher les données fraîches
});
```

---

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/components/rh/ApogeeSync/ApogeeSyncButton.tsx` | Badge visible avec compteur |
| `src/hooks/useApogeeSync.ts` | Filtrer utilisateurs système |
| `src/shared/api/apogee/useApogeeUsers.ts` | Option bypassCache |
| `src/components/rh/salaries/SalariesFolderTabs.tsx` | Indicateur de scroll |

---

## Détail technique

### Mapping des types Apogée → Collaborateur

Le mapping actuel dans `mapApogeeTypeToCollaboratorType` est correct :
- `technicien` → `TECHNICIEN`
- `admin` → `DIRIGEANT`  
- `utilisateur` → `ASSISTANTE`
- `commercial` → `COMMERCIAL`
- autres → `AUTRE`

### Utilisateurs à exclure de la sync

Les utilisateurs système Apogée à NE PAS synchroniser :
- ID 1 : "Dynoco Admin" (compte système technique)
- Tout utilisateur avec `firstname = "Dynoco"`

### Logique de détection des nouveaux utilisateurs

La logique existante est correcte :
```
Si apogee_user.is_on === true 
  ET apogee_user.id n'existe pas dans collaborators.apogee_user_id
  → Action "create" proposée
```

Le problème est probablement que :
1. Le cache (2h) retourne des données obsolètes
2. Le bouton ne montre pas visuellement qu'il y a des actions

---

## Résumé des améliorations

1. ✅ **Badge compteur** sur le bouton sync pour indiquer les actions disponibles
2. ✅ **Exclusion** des comptes système (Dynoco Admin)
3. ✅ **Bypass cache** automatique à l'ouverture du dialogue sync
4. ✅ **Indicateur de scroll** pour voir tous les onglets collaborateurs
5. ✅ **Logs de debug** pour tracer les utilisateurs exclus/inclus lors de la sync
