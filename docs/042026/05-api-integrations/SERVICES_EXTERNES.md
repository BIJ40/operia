# Services Externes OPERIA

> **Date** : 29 mars 2026

---

## Services intégrés

| Service | Usage | Edge Function | Secret |
|---------|-------|--------------|--------|
| **Resend** | Envoi emails (invitations, notifications, rapports) | `send-email` | `RESEND_API_KEY` |
| **AllMySMS** | Envoi SMS (satisfaction, rappels) | `test-sms`, `suivi-sms-satisfaction-scan` | `ALLMYSMS_*` (par agence) |
| **Mapbox** | Cartes RDV, zones d'intervention | `get-mapbox-token`, `get-rdv-map` | `MAPBOX_ACCESS_TOKEN` |
| **OpenAI** | Embeddings pour recherche sémantique | `generate-embeddings`, `search-embeddings` | `OPENAI_API_KEY` |
| **Gotenberg** | Conversion DOCX → PDF | `documents-finalize` | `GOTENBERG_URL` |
| **Stripe** | Paiements suivi client | `suivi-stripe-checkout`, `suivi-check-payment-status` | `STRIPE_SECRET_KEY` |
| **Sentry** | Monitoring erreurs | SDK frontend + Edge | `SENTRY_DSN` |
| **Apogée** | ERP métier (sync données) | `proxy-apogee`, `apogee-full-sync` | Clés API par agence |

---

## Détail par service

### Resend (emails)

- **Templates** : invitations utilisateur, reset password, notifications tickets
- **Expéditeur** : configurable par agence
- **Suivi** : pas de tracking ouverture (vie privée)

### Mapbox

- **Token** : distribué via Edge Function (jamais dans le frontend)
- **Usages** : carte des RDV, zones de déplacement, géocodage
- **Limites** : quota Mapbox standard

### OpenAI

- **Modèle** : embeddings pour indexation des guides
- **Fonctions** : `helpi-search` (recherche sémantique), `social-suggest` (suggestions réseaux sociaux)
- **Cache** : `ai_search_cache` avec TTL

### Gotenberg

- **Usage** : conversion de documents DOCX générés → PDF
- **Flux** : `parse-docx-tokens` → `documents-preview` → `documents-finalize` (Gotenberg)
- **Self-hosted** : instance Gotenberg hébergée

### Stripe

- **Usage actuel** : paiements suivi client (portail apporteurs)
- **Usage prévu V2** : facturation plans SaaS + options modules
- **Sécurité** : webhook signature verification
