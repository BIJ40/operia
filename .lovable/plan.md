## Plan : Corriger le rapport de couverture COMPAT_MAP

### Correction

Ligne 35 du fichier `dev-reports/module-compat-coverage.md` :

**Avant** : `organisation.documents_legaux | ✅ | divers_documents | —`
**Après** : `organisation.documents_legaux | ❌ | — | —`

### Résumé mis à jour

- Avec compat : 35 → **34**
- Sans compat : 1 → **2** (`support.faq`, `organisation.documents_legaux`)
- Couverture : 97.2% → **94.4%**

### Section note

Ajouter une note expliquant que `organisation.documents_legaux` est une création pure Phase 4 (comme `support.faq`), sans legacy correspondant. `divers_documents` est réservé exclusivement au périmètre `mediatheque.*`.

Aucun autre fichier modifié.  
Oui, applique uniquement cette correction documentaire dans `dev-reports/module-compat-coverage.md`.

À corriger :

- Ligne 35

  - Avant : `organisation.documents_legaux | ✅ | divers_documents | —`

  - Après : `organisation.documents_legaux | ❌ | — | —`

Mettre à jour le résumé :

- Avec compat : 35 → 34

- Sans compat : 1 → 2 `support.faq`, `organisation.documents_legaux`)

- Couverture : 97.2% → 94.4%

Ajouter une note expliquant que :

- `organisation.documents_legaux` est une création pure Phase 4, sans équivalent legacy direct

- `divers_documents` ne doit pas être utilisé pour couvrir `organisation.documents_legaux`

- `divers_documents` reste cantonné au périmètre `mediatheque.*` dans cette migration

Aucun autre fichier ne doit être modifié.