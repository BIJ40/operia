

## Plan : Explorer les documents PDF générés via `apiGetProjectByHashZipCode`

### Objectif
Créer un composant UI permettant de rechercher un dossier Apogée par ref/hash/code postal et d'afficher les documents PDF générés (factures, devis, rapports d'intervention).

### Fichiers à créer

**1. `src/apogee-connect/components/ApogeeDocumentsExplorer.tsx`** — Composant principal

- Formulaire avec 3 champs : Réf dossier, Hash client (MD5), Code postal
- Bouton "Rechercher" qui appelle `apogeeProxy.getProjectByHash()`
- Affichage des résultats en sections groupées par catégorie :
  - Factures (`generatedDocs.factures` → `.flat()`)
  - Devis (`generatedDocs.deviss` → `.flat()`)
  - Rapports d'intervention (`generatedDocs.interventions` → `.flat()`)
  - Documents projet (`generatedDocs.projects` → `.flat()`)
- Chaque tuile affiche : `fileName`, `kind`, `data.docLabel`, `created_at`, `data.size`, badge "Signé" si `data.isSignature`, lien externe vers `url`
- Section JSON brute dépliable (Collapsible) pour debug
- Pré-remplissage intelligent : possibilité de passer `ref` en prop pour auto-remplir depuis un dossier existant

**2. `src/apogee-connect/types/generatedDocs.ts`** — Types TypeScript

```typescript
interface ApogeeGeneratedDoc {
  id: string;
  userId: string;
  type: string;
  fileName: string;
  kind: string;
  refId: string;
  url: string;
  state: string;
  created_at: string;
  data: {
    docLabel?: string;
    nbPages?: number;
    isSignature?: boolean;
    size?: number;
  };
}

interface ApogeeGeneratedDocs {
  projects: ApogeeGeneratedDoc[][];
  deviss: ApogeeGeneratedDoc[][];
  factures: ApogeeGeneratedDoc[][];
  interventions: ApogeeGeneratedDoc[][];
}
```

### Intégration UI

Le composant sera utilisable de 2 façons :
- **Standalone** : depuis l'admin ou un onglet dédié (formulaire complet)
- **Contextuel** : depuis une fiche dossier Apogée existante (ref pré-remplie, hash et CP récupérés depuis les données client)

### Ce qui ne change pas
- Aucune modification du proxy ou de l'Edge Function
- Aucune migration DB
- Le composant utilise l'`apogeeProxy.getProjectByHash()` déjà câblé

