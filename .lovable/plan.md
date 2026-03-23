

# Audit critique : Dossiers manquants dans le CA prévisionnel

## Résultat de l'audit

J'ai identifié **5 causes distinctes** qui expliquent pourquoi des dossiers comme 202507151 et 202601293 n'apparaissent ni en mars ni en avril. Le problème principal : **le fichier `useChargeTravauxAVenir.ts` n'a JAMAIS été mis à jour** lors des corrections précédentes — il contient encore l'ancienne logique restrictive.

## Les 5 causes identifiées

### Cause 1 (CRITIQUE) — `useChargeTravauxAVenir.ts` : ancien filtre devis
Le hook qui alimente les données brutes du CA planifié utilise encore l'ancien `isDevisToOrder` avec seulement 3 états :
```typescript
// ACTUEL (ligne 49-52) — OBSOLÈTE
return state === 'to order' || state === 'to_order' || state === 'order';
```
Tout devis avec état `accepted`, `accepté`, `commande`, `validé`, etc. est IGNORÉ.

### Cause 2 (CRITIQUE) — `useChargeTravauxAVenir.ts` : filtre factures sans exemption acompte
Lignes 119-123 : tout projet avec la moindre facture (même un acompte) est exclu :
```typescript
// ACTUEL — AUCUNE exemption acompte/proforma
for (const f of factures) {
  const pid = getProjectId(f);
  if (pid != null) facturedProjectIds.add(pid); // Tout est exclu !
}
```

### Cause 3 (IMPORTANTE) — Détection du type de facture cassée
Dans CAPlanifieCard et CAPlanifieDetailDialog, la chaîne de détection du type facture est :
```typescript
f?.typeFacture ?? f?.type ?? f?.data?.typeFacture
```
Or l'API Apogée stocke le type dans `f.data.type` (pas `f.data.typeFacture`). Résultat : **le type est toujours vide**, donc l'exemption acompte ne fonctionne jamais même dans les fichiers "corrigés".

### Cause 4 (MODÉRÉE) — `useChargeTravauxAVenir.ts` : `getProjectId` incomplet
Ne vérifie que `projectId`, `project_id`, `project.id` — manque `refId`, `dossierId`, `data.projectId`. Certaines factures/devis/interventions ne sont pas rattachées au bon projet.

### Cause 5 (MODÉRÉE) — `useChargeTravauxAVenir.ts` : dates dans `data.visites` non lues
Ligne 41 ne cherche que dans `itv.visites`, pas dans `itv.data.visites`. Des interventions avec dates uniquement dans la structure imbriquée sont invisibles.

## Impact par fichier

| Fichier | Causes | Corrigé précédemment ? |
|---|---|---|
| `src/statia/hooks/useChargeTravauxAVenir.ts` | 1, 2, 4, 5 | **NON — jamais touché** |
| `src/apogee-connect/components/stats-hub/CAPlanifieCard.tsx` | 3 | Partiellement |
| `src/apogee-connect/components/stats-hub/CAPlanifieDetailDialog.tsx` | 3 | Partiellement |

## Plan de correction

### 1. Harmoniser `useChargeTravauxAVenir.ts`

- Remplacer `isDevisToOrder` par la version étendue (11 états)
- Ajouter l'exemption acompte/proforma dans le filtre factures
- Étendre `getProjectId` avec `refId`, `dossierId`, `data.projectId`
- Étendre `getInterventionPlanningDate` pour chercher dans `itv.data.visites`
- Ajouter l'exclusion TH/SAV/RT (cohérence avec les autres fichiers)

### 2. Corriger la détection du type facture partout

Ajouter `f?.data?.type` dans la chaîne de détection, dans les 3 fichiers :
```typescript
// AVANT
f?.typeFacture ?? f?.type ?? f?.data?.typeFacture

// APRÈS  
f?.typeFacture ?? f?.type ?? f?.data?.typeFacture ?? f?.data?.type
```

### 3. Ajouter un log de diagnostic temporaire

Dans `CAPlanifieDetailDialog`, ajouter un `console.debug` qui affiche les dossiers exclus et la raison de leur exclusion, pour faciliter le débogage futur.

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/statia/hooks/useChargeTravauxAVenir.ts` | Correction majeure — 5 points |
| `src/apogee-connect/components/stats-hub/CAPlanifieCard.tsx` | Fix détection type facture |
| `src/apogee-connect/components/stats-hub/CAPlanifieDetailDialog.tsx` | Fix détection type facture + log diagnostic |

