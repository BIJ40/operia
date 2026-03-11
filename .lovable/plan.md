

## Diagnostic : les documents ne s'affichent pas

### Problème identifié

L'endpoint `apiGetProjectByHashZipCode` ne retourne **pas** la structure `{ factures: [][], deviss: [][], interventions: [][], projects: [][] }` qu'on attendait dans le type `ApogeeGeneratedDocsResponse`.

D'après la capture d'écran, il retourne **un objet projet** avec des champs comme `id`, `ref`, `state`, `label`, `data: { ... }`. Les documents générés (PDF) sont vraisemblablement imbriqués dans cet objet (possiblement sous `data.generatedDocs`, `data.docs`, ou une autre clé).

Le composant `ApogeeDocumentsExplorer` tente d'accéder à `result.factures`, `result.deviss`, etc. qui n'existent pas sur la réponse réelle, d'où `totalDocs = 0` et le message "Aucun document trouvé".

### Plan de correction

**1. Ajouter un affichage de debug exhaustif** pour comprendre la structure réelle de la réponse

Dans `ApogeeDocumentsExplorer.tsx` :
- Stocker la réponse brute telle quelle (sans la caster en `ApogeeGeneratedDocsResponse`)
- Afficher la section JSON brute **ouverte par défaut** pour pouvoir inspecter la structure
- Lister toutes les clés de premier niveau de la réponse pour identifier où sont les documents PDF
- Rechercher récursivement les clés qui contiennent des tableaux de fichiers (url, fileName, etc.)

**2. Adapter le parsing une fois la structure connue**

Le type `ApogeeGeneratedDocsResponse` et la logique `flattenDocs` seront ajustés pour correspondre à la vraie structure retournée par l'API.

### Fichiers modifiés
- `src/apogee-connect/components/ApogeeDocumentsExplorer.tsx` — Réponse typée en `unknown`, debug amélioré, recherche automatique de documents dans l'arbre JSON

