# Moteur DocGen — Génération de Documents

> **Date** : 29 mars 2026

---

## 1. Vue d'ensemble

DocGen permet de générer des documents professionnels (contrats, lettres RH, rapports) à partir de templates DOCX avec remplacement de tokens.

## 2. Flux

```
Template DOCX (Storage)
    │
    ▼
parse-docx-tokens (Edge Function)
    │ Extraction des {{tokens}}
    ▼
documents-preview (Edge Function)
    │ Remplacement tokens + aperçu
    ▼
documents-finalize (Edge Function)
    │ Conversion DOCX → PDF via Gotenberg
    ▼
Document final (Storage)
```

## 3. Edge Functions

| Fonction | Rôle |
|----------|------|
| `parse-docx-tokens` | Extrait les tokens `{{nom}}`, `{{date}}` etc. du template |
| `documents-preview` | Remplace les tokens par les vraies valeurs, génère aperçu |
| `documents-finalize` | Conversion finale DOCX → PDF via Gotenberg |
| `generate-hr-document` | Génération spécifique documents RH |
| `generate-rh-letter` | Génération lettres RH |
| `epi-generate-ack-pdf` | Accusés réception EPI |
| `epi-generate-monthly-acks` | Accusés mensuels EPI batch |

## 4. Templates

Les templates sont stockés dans Supabase Storage. Chaque template contient des tokens au format `{{token_name}}` qui sont remplacés dynamiquement.

## 5. Gotenberg

Service auto-hébergé de conversion documents :
- DOCX → PDF
- HTML → PDF
- Configuré via `GOTENBERG_URL` (secret Edge Function)
