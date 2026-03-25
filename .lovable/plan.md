

# Isolation webhook par agence

## Ce qui change pour toi

**Une seule action de ta part** : après déploiement, tu devras renseigner l'URL webhook de ton agence (Dax) dans l'interface admin agences. Les autres agences sans URL configurée n'enverront simplement plus rien. Zero regression.

**Fallback** : pendant la transition, si une agence n'a pas d'URL configurée, on utilise l'ancien `CONTENT_WEBHOOK_URL` global. Tu pourras le retirer plus tard quand toutes les agences seront migrées. Aucune casse immédiate.

---

## Plan technique

### 1. Migration SQL
- Ajouter `content_webhook_url TEXT DEFAULT NULL` sur `apogee_agencies`

### 2. Modifier les 3 edge functions

Pour chacune (`dispatch-realisation-webhook`, `dispatch-social-webhook`, `dispatch-scheduled-social`) :
- Lire `content_webhook_url` depuis `apogee_agencies` via `agency_id`
- Si trouvé → utiliser cette URL
- Sinon → fallback sur `CONTENT_WEBHOOK_URL` env var (transition douce)
- `WEBHOOK_SECRET` reste global, inchangé

### 3. Rendre `agency_id` obligatoire sur `content-api`
- `GET /realisations` sans `agency_id` → erreur 400

### 4. Champ admin dans la page agences
- Ajouter un input "Webhook URL" dans `src/pages/AdminAgencies.tsx` (formulaire existant)
- Sauvegarde dans `apogee_agencies.content_webhook_url`

---

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| Migration SQL | `ALTER TABLE apogee_agencies ADD COLUMN content_webhook_url` |
| `supabase/functions/dispatch-realisation-webhook/index.ts` | Lire URL depuis agence, fallback env var |
| `supabase/functions/dispatch-social-webhook/index.ts` | Idem |
| `supabase/functions/dispatch-scheduled-social/index.ts` | Idem |
| `supabase/functions/content-api/index.ts` | `agency_id` obligatoire |
| `src/pages/AdminAgencies.tsx` | Champ webhook URL |

## Impact

- **Aucune regression** : le fallback sur l'env var globale garantit que tout fonctionne comme avant tant que tu n'as pas configuré les URLs par agence
- Une fois l'URL de Dax renseignée, seules ses réalisations et posts sociaux iront vers ton outil
- Les agences sans URL configurée continuent d'utiliser le webhook global (ou tu peux le retirer pour bloquer l'envoi)

