# AUDIT MODULE DOCGEN
> Date: 2025-12-18 | Version: 0.8.1

## 1. PÉRIMÈTRE

### Description
Module de génération de documents à partir de templates DOCX avec tokens dynamiques. Permet de créer des documents personnalisés (contrats, attestations, courriers) avec prévisualisation PDF.

### Routes
- `/admin/templates` - Studio templates (N4+)
- `/rh/documents/generate` - Génération document
- `/rh/documents/:id/preview` - Prévisualisation

### Tables Supabase
```
doc_templates     - Templates DOCX
doc_instances     - Documents générés
```

## 2. ARCHITECTURE

### Fichiers principaux
```
src/components/docgen/
├── TemplateStudio.tsx         # Éditeur templates
├── TemplateUploader.tsx       # Upload DOCX
├── TokenEditor.tsx            # Gestion tokens
├── DocumentGenerator.tsx      # Génération
├── DocumentPreview.tsx        # Prévisualisation PDF
└── SmartTokenFiller.tsx       # Auto-remplissage

src/hooks/
├── use-doc-templates.ts       # CRUD templates
├── use-doc-instances.ts       # Documents générés
└── use-token-extraction.ts    # Extraction tokens DOCX
```

### Edge Functions
```
supabase/functions/
├── docgen-extract-tokens/     # Extraction tokens du DOCX
├── docgen-fill-template/      # Remplissage template
└── docgen-convert-pdf/        # Conversion PDF via Gotenberg
```

## 3. SYSTÈME DE TOKENS

### Format tokens
```
{{TOKEN_NAME}}
```

### Smart Tokens (auto-remplis)
```typescript
// Agence
{{AGENCE_NOM}}
{{AGENCE_ADRESSE}}
{{AGENCE_TELEPHONE}}
{{AGENCE_EMAIL}}

// Collaborateur
{{COLLABORATEUR_NOM}}
{{COLLABORATEUR_PRENOM}}
{{COLLABORATEUR_EMAIL}}
{{COLLABORATEUR_POSTE}}

// Dirigeant
{{DIRIGEANT_NOM}}
{{DIRIGEANT_PRENOM}}

// Date
{{DATE_JOUR}}
{{DATE_MOIS}}
{{DATE_ANNEE}}
{{DATE_COMPLETE}}
```

### Tokens manuels
- Tout token non reconnu = saisie manuelle requise

## 4. WORKFLOW GÉNÉRATION

```
1. Sélection template
2. Sélection collaborateur (optionnel)
3. Vérification complétude tokens
4. Auto-remplissage smart tokens
5. Saisie tokens manuels
6. Prévisualisation PDF
7. Finalisation → stockage
```

### États document
```
DRAFT → FINALIZED
  ↑_________|  (réouverture possible)
```

## 5. PROBLÈMES IDENTIFIÉS

### P0 - Critiques
- ❌ Aucun problème critique

### P1 - Importants
- ⚠️ Gotenberg timeout sur gros documents
- ⚠️ Extraction tokens parfois incomplète

### P2 - Améliorations
- 📝 Signature électronique intégrée
- 📝 Versioning templates
- 📝 Templates par catégorie

## 6. SÉCURITÉ

### Stockage
```
Bucket: doc-templates (templates DOCX)
Bucket: doc-instances (documents générés)
```

### RLS Policies
```sql
-- Templates: lecture tous, écriture N4+
SELECT: auth.uid() IS NOT NULL
INSERT/UPDATE/DELETE: has_min_global_role('franchisor_admin')

-- Instances: agence uniquement
SELECT/INSERT/UPDATE: agency_id = get_user_agency_id()
```

### Points d'attention
- ✅ Templates globaux vs agence
- ✅ Documents générés isolés par agence
- ✅ Accès studio restreint N4+

## 7. INTÉGRATION GOTENBERG

### Configuration
```typescript
// URL Gotenberg (secret)
GOTENBERG_URL=https://...

// Conversion DOCX → PDF
POST /forms/libreoffice/convert
Content-Type: multipart/form-data
```

### Timeout
- Défaut: 30s
- Documents complexes peuvent échouer
- Solution: optimiser templates

## 8. TESTS RECOMMANDÉS

```typescript
// Extraction tokens
1. Upload DOCX avec tokens
2. Vérifier tous tokens extraits
3. Vérifier smart tokens reconnus

// Génération
1. Sélectionner template
2. Remplir tokens
3. Prévisualiser PDF
4. Finaliser
5. Vérifier stockage

// Permissions
- N2 peut générer
- N4+ peut créer templates
```

## 9. ÉVOLUTIONS PRÉVUES

1. Signature électronique intégrée
2. Versioning templates avec historique
3. Catégorisation templates (RH, Commercial, Juridique)
4. Génération batch
5. QR code traçabilité
