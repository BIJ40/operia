
# Plan de correction : 3 bugs StatIA (Techniciens + Apporteur)

## Problèmes identifiés

| Problème | Cause racine | Fichier concerné |
|----------|--------------|------------------|
| Alexandre FACON (inactif) dans le classement | Le moteur `caParTechnicien` ne filtre pas les users `is_on: false` | `src/statia/definitions/techniciens.ts` |
| Sébastien Caron (commercial) avec du CA | Le moteur ne vérifie pas le `type` user (technicien vs commercial) | `src/statia/definitions/techniciens.ts` |
| VIAREN CA = 0 | Le `ranking` apporteur ne contient pas le champ `ca`, seulement `id` et `label` | `src/statia/definitions/apporteurs.ts` |

---

## Corrections à apporter

### 1. Filtrer les techniciens inactifs et non-techniciens

**Fichier** : `src/statia/definitions/techniciens.ts`

**Modification** : Ajouter un filtre dans `caParTechnicien.compute()` pour exclure :
- Les users avec `is_on === false` (inactifs)
- Les users avec `type !== "technicien"` ET qui ne sont pas `utilisateur` avec `universes`

```typescript
// Créer un set des techniciens ACTIFS et VALIDES
const validTechIds = new Set<string | number>();
for (const user of users) {
  const isOn = user.is_on ?? user.data?.is_on ?? user.isOn ?? true;
  if (!isOn) continue; // Exclure inactifs
  
  // Règle: type="technicien" OU (type="utilisateur" ET universes non vide)
  const type = (user.type || '').toLowerCase();
  const hasUniverses = Array.isArray(user.data?.universes) && user.data.universes.length > 0;
  const isTechRole = type === 'technicien' || (type === 'utilisateur' && hasUniverses);
  
  // Exclure commerciaux, admins, etc.
  if (type === 'commercial' || type === 'admin') continue;
  
  if (isOn && isTechRole) {
    validTechIds.add(user.id);
    validTechIds.add(String(user.id));
    validTechIds.add(Number(user.id));
  }
}

// Dans la boucle de collecte, filtrer :
for (const techId of interventionTechs) {
  if (validTechIds.has(techId) || validTechIds.has(Number(techId)) || validTechIds.has(String(techId))) {
    techsProductifs.add(techId);
  }
}
```

---

### 2. Corriger le ranking apporteur pour inclure le CA

**Fichier** : `src/statia/definitions/apporteurs.ts`

**Modification** : Dans `topApporteursCA.compute()`, enrichir le `ranking` avec le CA :

```typescript
// AVANT (bug)
ranking: topEntries.map(([id], index) => ({ 
  rank: index + 1, 
  id, 
  label: baseResult.breakdown?.labels?.[id] 
})),

// APRÈS (correction)
ranking: topEntries.map(([name, ca], index) => ({ 
  rank: index + 1, 
  id: name,      // L'ID est le nom de l'apporteur
  name: name,    // Ajout explicite du nom
  label: name,   // Pour compatibilité
  ca: ca,        // AJOUT DU CA MANQUANT
  totalCA: ca,   // Alias pour compatibilité
})),
```

---

### 3. Mettre à jour l'extraction dans le hook Diffusion

**Fichier** : `src/components/diffusion/useDiffusionKpisStatia.ts`

L'extraction actuelle est correcte mais le fallback peut être renforcé :

```typescript
// Le code actuel est OK car il utilise value en fallback
// Mais on peut simplifier car avec la correction du ranking, 
// le ca sera toujours présent
if (topApporteursBreakdown?.ranking?.length > 0) {
  const top = topApporteursBreakdown.ranking[0];
  topApporteur = {
    name: top.name || top.label || top.id || 'Inconnu',
    ca: top.ca || top.totalCA || 0,  // Maintenant ca sera toujours là
  };
}
```

---

## Ordre d'implémentation

1. **Corriger `topApporteursCA`** dans `apporteurs.ts` (ajouter `ca` au ranking)
2. **Corriger `caParTechnicien`** dans `techniciens.ts` (filtrer is_on + type)
3. **Propager vers `topTechniciensCA`** (hérite automatiquement de caParTechnicien)
4. Tester sur la page Diffusion TV

---

## Règles métier à respecter

D'après les règles dans `rules.json` et la documentation :

```json
{
  "technicians": {
    "identification": {
      "rules": [
        "user.isTechnicien === true",
        "user.type === 'technicien'",
        "(user.type === 'utilisateur' && user.data.universes.length > 0)"
      ],
      "activeCheck": "user.is_on === true || user.isActive === true"
    }
  }
}
```

- Un **technicien actif** = `is_on === true` ET (type = "technicien" OU (type = "utilisateur" ET universes non vide))
- Un **commercial** = `type === 'commercial'` → **JAMAIS** de CA technicien
- Un **inactif** = `is_on === false` → **EXCLU** des stats
