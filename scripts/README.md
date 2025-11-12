# Scripts de migration

## migrate-html-links.ts

Convertit les liens HTML `@` et `#` du manuel HTML en mentions TipTap.

### Installation

```bash
npm install -g tsx
```

### Usage

1. **Test (mode démo)** - Voir un exemple de conversion:
```bash
npx tsx scripts/migrate-html-links.ts
```

2. **Migration réelle** - Décommentez la section "Pour migrer réellement" dans le script, puis:
```bash
npx tsx scripts/migrate-html-links.ts
```

### Ce que fait le script

- ✅ Convertit `<a href="#theme-dossier">dossier</a>` en mentions TipTap cliquables
- ✅ Convertit les tags isolés `#dossier`, `#devis` en mentions
- ✅ Convertit les rôles `@Technicien`, `@BackOffice` en mentions
- ✅ Crée un backup automatique avant modification
- ✅ Mappe les anciens IDs HTML vers les nouveaux slugs

### Mappings

Le script utilise 3 mappings:

1. **HTML_ID_TO_SLUG_MAP**: ancres HTML → slugs actuels
2. **TAG_TO_SLUG_MAP**: tags `#xxx` → slugs
3. **ROLE_TO_SLUG_MAP**: rôles `@Xxx` → slugs

### Sécurité

- Un backup `apogee-data.backup.json` est créé automatiquement
- Le script ne modifie rien en mode démo par défaut
- Vous devez explicitement décommenter la section de migration

### Ajouter de nouveaux mappings

Éditez le script et ajoutez dans les maps correspondantes:

```typescript
const HTML_ID_TO_SLUG_MAP: Record<string, string> = {
  'mon-ancre-html': 'mon-slug-actuel',
  // ...
};
```
