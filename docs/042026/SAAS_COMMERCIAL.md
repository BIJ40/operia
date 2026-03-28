# Modèle Commercial SaaS — Documentation

> **Date** : 28 mars 2026  
> **Statut** : Planifié (V2)

---

## 1. Plans

### Plans disponibles

| Plan | Clé | Label | Positionnement |
|------|-----|-------|----------------|
| Essentiel | `STARTER` | Plan de base | Modules socle |
| Performance | `PRO` | Plan avancé | Modules socle + statistiques avancées + fonctionnalités PRO |

### Différences clés

| Fonctionnalité | STARTER | PRO |
|----------------|:---:|:---:|
| Dashboard agence | ✅ | ✅ |
| Statistiques générales | ✅ | ✅ |
| Statistiques avancées (7 modules) | ❌ | ✅ |
| Réalisations | ❌ | ✅ |
| Signature commerciale | ❌ | ✅ |
| Corbeille médiathèque | ❌ | ✅ |
| Tous les autres modules socle | ✅ | ✅ |

---

## 2. Options agence (add-ons)

### Options disponibles

| Option | Module(s) | Vendable Stripe | Mode d'activation |
|--------|-----------|:-:|---|
| Pack Relations | `organisation.apporteurs` | ✅ | Manual ou Stripe |
| Suivi Client | `commercial.suivi_client` | ✅ | Manual ou Stripe |
| Signature (STARTER) | `commercial.signature` | ✅ | Manual ou Stripe |

### Fonctionnement

1. L'option est activée pour une agence via `agency_module_entitlements`
2. Elle devient partie de l'enveloppe délégable de l'agence
3. Le N2 peut la déléguer à ses N1
4. La facturation est trackée via `stripe_price_id` et `stripe_subscription_item_id`

### Sources d'activation

| Source | Signification |
|--------|---------------|
| `manual` | Activé manuellement par N4+ |
| `stripe` | Activé via paiement Stripe |
| `included` | Inclus gratuitement (promotion, partenariat) |
| `trial` | Période d'essai (expiration via `trial_ends_at`) |

---

## 3. Assignation utilisateur

### Modules assignables individuellement

| Module | Qui peut assigner | Cas d'usage |
|--------|-------------------|-------------|
| `support.ticketing` | N2+ ou N4+ (`both`) | Accès à la gestion de projet Apogée |
| `support.guides` | N2+ (`agency_admin`) | Accès aux guides Help! Academy |

### Fonctionnement

1. Le module est attribué via `user_access` avec `source = 'platform_assignment'` ou `'agency_delegation'`
2. Indépendant du plan agence
3. Pas de contrainte d'enveloppe agence

---

## 4. Facturation Stripe (prévu)

### Architecture

```
billing_catalog (mapping)
     │
     ├── item_type = 'plan'
     │     item_key = 'STARTER' / 'PRO'
     │     stripe_product_id, stripe_price_id
     │
     └── item_type = 'module'
           item_key = 'commercial.suivi_client'
           stripe_product_id, stripe_price_id
```

### Principe fondamental

> **Stripe facture, ne décide pas.**

La vérité des droits est toujours dans :
- `agency_plan` (plan de base)
- `agency_module_entitlements` (options activées)
- `user_access` (overrides individuels)

`billing_catalog` ne sert qu'à mapper les items fonctionnels vers les produits Stripe.

### Flux prévu

```
1. Client souscrit un plan ou une option via Stripe Checkout
2. Webhook Stripe → Edge Function `stripe-webhook`
3. Edge Function met à jour agency_plan ou agency_module_entitlements
4. RPC get_user_permissions reflète immédiatement le changement
```

---

## 5. Interface admin "Offres"

### Vue d'ensemble

L'onglet "Offres" du Hub Admin permet de :

1. **Catalogue modules** — Voir et configurer `module_distribution_rules`
2. **Gestion plans** — Définir quels modules sont dans STARTER / PRO
3. **Options agence** — Activer/désactiver des options par agence
4. **Presets poste** — Définir les modules par défaut par poste N1
5. **Catalogue facturation** — Mapper modules/plans vers Stripe

### Accès

| Section | Rôle minimum |
|---------|:-:|
| Catalogue modules | N4+ |
| Gestion plans | N4+ |
| Options agence | N4+ |
| Presets poste | N4+ |
| Catalogue facturation | N4+ |
