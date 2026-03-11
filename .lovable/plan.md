

## Wave 2.5 — Ajout de 3 entrées COMPAT_MAP

### Fichier 1 : `src/permissions/compatMap.ts` — 3 insertions

**Après L39** (fin section Pilotage ← stats) :
```
'pilotage.dashboard':                 { keys: ['stats'] },
```

**Après L44** (fin section Pilotage ← agence, après `pilotage.incoherences`) :
```
'pilotage.agence':          { keys: ['agence'] },
```

**Après L63** (fin section Médiathèque, après `mediatheque.corbeille`) :
```
'mediatheque.documents': { keys: ['divers_documents'] },
```

### Fichier 2 : `src/devtools/moduleCompatTest.ts` — 2 cas de test ajoutés

Dans `TEST_CASES` (Chemin A), après le Cas 3 existant (L70-77) :

**Cas 2 enrichi** — ajouter assertion `pilotage.agence` :
```typescript
{ label: 'hasModule("pilotage.agence")', key: 'pilotage.agence', expected: true },
```

**Nouveau Cas 4** — stats → pilotage.dashboard :
```typescript
{
  name: 'Cas 4 — stats → pilotage.dashboard',
  modules: { stats: { enabled: true, options: {} } },
  assertions: [
    { label: 'hasModule("pilotage.dashboard")',    key: 'pilotage.dashboard',    expected: true },
    { label: 'hasModule("pilotage.statistiques")', key: 'pilotage.statistiques', expected: true },
  ],
},
```

**Nouveau Cas 5** — divers_documents → mediatheque.documents :
```typescript
{
  name: 'Cas 5 — divers_documents → mediatheque.documents',
  modules: { divers_documents: { enabled: true, options: {} } },
  assertions: [
    { label: 'hasModule("mediatheque.documents")', key: 'mediatheque.documents', expected: true },
    { label: 'hasModule("mediatheque.consulter")', key: 'mediatheque.consulter', expected: false },
  ],
},
```

### Périmètre strict

- 2 fichiers modifiés : `compatMap.ts`, `moduleCompatTest.ts`
- Aucun guard front modifié
- Backend, Supabase, ticketing inchangés

