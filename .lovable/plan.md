

# Plan de migration — Module Suivi Client (origin-box) vers un environnement externe

## Objectif
Extraire le module **Suivi Client** (portail public `suivi.helpconfort.services/{agencySlug}/{ref}/{hash}`) du monorepo OPERIA actuel pour le redéployer sur un autre site (via Claude Code, hors Lovable), **sans interruption de service** pour les clients qui consultent leur dossier.

---

## 1. Cartographie du module à migrer

### 1.1 Frontend (React/Vite)
Tout est isolé sous `src/suivi/` — c'est un sous-arbre quasi auto-suffisant :
- `src/suivi/pages/` — entrée principale `SuiviAgencyPage.tsx` (route `/:agencySlug/:ref/:hash`)
- `src/suivi/components/` — UI (Shell, CodePostalVerification, SuiviContent, états loading/error)
- `src/suivi/hooks/` — `useSecureProjectData`, `useVerificationState`, `useAgency`, `usePaymentCallback`
- `src/suivi/contexts/AgencyContext.tsx` — chargement du branding agence
- `src/suivi/utils/` — normalizers, localStorage helpers

### 1.2 Backend (Edge Functions Supabase)
Quatre fonctions Edge dédiées :
- `suivi-api-proxy` — proxy sécurisé vers Apogée (récupère projet, client, devis, factures, interventions, créneaux)
- `suivi-check-payment-status` — vérifie le paiement Stripe d'un dossier
- `suivi-stripe-checkout` — crée la session de paiement
- `suivi-stripe-webhook` — confirme le paiement et insère dans `payments_clients_suivi`

### 1.3 Base de données (Supabase)
Tables et vues utilisées :
- `agencies` (privée, sensible) + vue publique `agencies_public` (masque `api_subdomain`, `contact_email`)
- `agency_suivi_settings` (config par agence : sous-domaine API Apogée, activation Stripe, URL Google Reviews)
- `payments_clients_suivi` (historique paiements)

### 1.4 Dépendances externes
- **API Apogée** (`{subdomain}.hc-apogee.fr`) — secret `APOGEE_API_KEY`
- **Stripe** — secrets `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Supabase** — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### 1.5 Sécurité
- Accès via triple secret URL : `agencySlug` + `ref` + `hash` (8 premiers caractères d'un HMAC)
- Vérification 2nde couche : code postal du client (5 chiffres normalisés)
- Toute la logique sensible côté Edge Functions, jamais de clé exposée au client

---

## 2. Stratégie de migration sans interruption

### Principe : **strangler fig pattern + DNS switchover progressif**

```text
Phase 0 (actuel)   suivi.helpconfort.services ──► Lovable (operiav2)
                                                  └─► Edge Functions Supabase
                                                  └─► Apogée + Stripe

Phase 1 (parallèle) Nouveau projet Claude Code
                    suivi-v2.helpconfort.services ──► Nouveau host (Vercel/Netlify/VPS)
                                                      └─► MÊMES Edge Functions Supabase
                                                      └─► MÊME Apogée + MÊME Stripe

Phase 2 (canary)   5% trafic ──► v2     |     95% ──► v1

Phase 3 (cutover)  suivi.helpconfort.services ──► v2 (DNS swap)
                   v1 reste accessible en fallback 30 jours

Phase 4 (cleanup)  Suppression code suivi/ du monorepo OPERIA
```

### Pourquoi ça marche sans interruption
- **Backend partagé** : les deux frontends parlent aux mêmes Edge Functions et à la même base. Aucune migration de données.
- **URLs compatibles** : on garde le format `/{agencySlug}/{ref}/{hash}` à l'identique → les liens déjà envoyés aux clients restent valides.
- **localStorage compatible** : la vérification code postal 24h (clé `verified_postal_code_*`) survit au cutover puisque le domaine reste le même.

---

## 3. Livrable pour Claude Code (dossier de transfert)

À placer dans `/mnt/documents/MIGRATION_SUIVI/` :

### 3.1 `README_MIGRATION.md` — point d'entrée
- Vue d'ensemble + diagramme d'architecture
- Stack cible recommandée (Vite + React 18 + Tailwind + React Query + supabase-js)
- Variables d'environnement nécessaires côté front (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`)
- Procédure de cutover DNS étape par étape

### 3.2 `ARCHITECTURE.md` — fonctionnement détaillé
- Flow utilisateur : URL → AgencyContext → CodePostalVerification → useSecureProjectData → SuiviContent
- Schéma de sécurité (hash + code postal)
- Cycle de paiement Stripe (checkout → webhook → check-status)
- Multi-tenant via `agencySlug` + branding dynamique (CSS var `--agency-primary`)

### 3.3 `DEPENDENCIES.md` — inventaire exhaustif
- Liste des fichiers à copier (`src/suivi/**`, plus quelques fichiers `src/integrations/supabase/`, `src/components/ui/` shadcn utilisés)
- Liste des Edge Functions (avec code source complet, à dupliquer ou réutiliser)
- Tables/vues Supabase + politiques RLS associées
- Secrets requis

### 3.4 `CONTRACTS.md` — interfaces stables
- Schéma JSON des réponses Edge Functions (`suivi-api-proxy` retourne `{ project, client, devis, users, factures, interventions, creneaux }`)
- Format URL (`/{agencySlug}/{ref}/{hash}`)
- Schéma des tables `agencies_public`, `agency_suivi_settings`, `payments_clients_suivi`

### 3.5 `MIGRATION_PLAYBOOK.md` — runbook opérationnel
- Phase 1 : bootstrap projet Claude Code, copie du code, build, déploiement sur sous-domaine temporaire
- Phase 2 : tests E2E sur dossiers réels (avec un dossier de test connu, ex: 202601008 / 40320)
- Phase 3 : split DNS (Cloudflare load balancer ou record TTL bas)
- Phase 4 : monitoring (logs Edge Functions, taux d'erreur 4xx/5xx, alertes)
- Phase 5 : rollback (revert DNS en 60s grâce au TTL bas)

### 3.6 `TESTS_E2E.md` — checklist de validation
Cas à valider avant chaque montée de pourcentage de trafic :
- Affichage dossier valide (avec et sans paiement)
- Refus dossier inexistant
- Refus code postal incorrect
- Paiement Stripe complet (checkout → succès → statut payé)
- Branding agence (logo, couleur primaire) pour 2-3 agences différentes
- Mobile + desktop

---

## 4. Points critiques à expliciter à Claude Code

1. **Ne PAS dupliquer les Edge Functions** dans un premier temps : pointer le nouveau front sur le même projet Supabase → zéro risque de divergence backend.
2. **TTL DNS à 60s** au moins 48h avant le cutover pour permettre rollback rapide.
3. **Les liens déjà envoyés par email aux clients** continuent de marcher car le domaine et le format d'URL ne changent pas.
4. **CORS** : les Edge Functions ont déjà `Access-Control-Allow-Origin: *`, donc le nouveau domaine sera accepté sans modification.
5. **Branding dynamique** : la variable CSS `--agency-primary` est injectée par `AgencyContext` — bien copier ce mécanisme.
6. **Normalisation code postal** : la règle `(v) => v.replace(/\D/g, '').slice(0, 5)` doit être identique côté front ET côté Edge Functions (récemment corrigée).

---

## 5. Ce que je propose de générer maintenant

Si tu valides, je produis dans `/mnt/documents/MIGRATION_SUIVI/` les 6 documents listés ci-dessus, en m'appuyant sur une lecture exhaustive de :
- tout `src/suivi/`
- les 4 Edge Functions `suivi-*`
- les schémas des 3 tables/vues concernées
- les secrets référencés

Le livrable sera un dossier zip prêt à être transmis à Claude Code, avec tout le contexte nécessaire pour qu'il reconstruise le module à l'identique sur un autre hébergeur, **sans jamais interrompre le service en production**.

