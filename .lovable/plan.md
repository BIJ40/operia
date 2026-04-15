

# Plan : Simplification Operia — Modele Freemium (sans suppression BDD)

## Principe fondamental

**Zero suppression en base de données.** Les tables, RPC, politiques RLS et fonctions existantes restent intactes. Le nouveau modele se superpose a l'existant.

## Ajouts en base de données

### Nouvelle table `user_subscriptions`
```sql
create table public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  plan_key text not null check (plan_key in ('pilotage', 'suivi')),
  stripe_subscription_id text,
  stripe_customer_id text,
  status text not null default 'inactive'
    check (status in ('active', 'inactive', 'past_due', 'canceled')),
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(agency_id, plan_key)
);
```
- RLS : lecture par membres de l'agence, ecriture par service_role uniquement (webhooks)
- Pas de FK sur `agencies` pour eviter les conflits — la coherence est geree applicativement

## Changements frontend (code uniquement)

### 1. Navigation — UnifiedWorkspace
Retirer les onglets suivants du tableau `allTabs` :
- **Organisation** (salaries, reunions, planning, zones, conformite)
- **Documents** (mediatheque)
- **Ticketing**

Onglets conserves :
- **Accueil** — acces libre
- **Pilotage** — conditionne a `subscription.pilotage = active`
- **Commercial** — conditionne a `subscription.pilotage = active` (veille apporteurs)
- **Relations** — conditionne a `subscription.suivi = active`
- **Support** — acces libre
- **Admin** — admin plateforme uniquement

### 2. Nouveau hook `useAgencySubscriptions(agencyId)`
Interroge `user_subscriptions` pour retourner les plans actifs de l'agence courante. Remplace les verifications de permissions V2 dans la navigation.

### 3. Composant `SubscriptionGuard`
```tsx
<SubscriptionGuard plan="pilotage" fallback={<UpgradePrompt />}>
  <PilotageTabContent />
</SubscriptionGuard>
```
Court-circuite `ModuleGuardV2` pour les onglets proteges. Les guards V2 existants ne sont pas supprimes — ils restent dans le code mais ne sont plus le point de decision principal pour la navigation.

### 4. Simplification des roles (code frontend uniquement)
Le systeme N0-N6 reste en BDD. Cote frontend, la logique se reduit a :
- `isAdmin` : detecte via `source_summary = 'bypass'` (comme aujourd'hui dans `RoleGuardV2`)
- Tout le reste = `user`

### 5. Page pricing dans Accueil
Composant affichant les 2 plans avec prix et bouton "S'abonner" redirigeant vers Stripe Checkout.

## Integration Stripe

### Edge Functions (nouvelles)
1. **`create-checkout-session`** — Cree une session Stripe Checkout pour le plan choisi (pilotage ou suivi), lie a l'agence
2. **`stripe-subscription-webhook`** — Recoit les evenements Stripe (`checkout.session.completed`, `customer.subscription.updated/deleted`) et met a jour `user_subscriptions`

### Configuration
- Utilisation de l'integration Stripe built-in de Lovable (`enable_stripe_payments`)
- Produits Stripe a creer : Pilotage (72E TTC/mois), Suivi (84E TTC/mois)

## Fichiers principaux impactes

| Fichier | Action |
|---------|--------|
| `src/components/unified/workspace/UnifiedWorkspace.tsx` | Retirer onglets Organisation, Documents, Ticketing |
| `src/components/unified/workspace/types.ts` | Simplifier `allTabs` |
| `src/hooks/useAgencySubscriptions.ts` | **Nouveau** — query `user_subscriptions` |
| `src/components/guards/SubscriptionGuard.tsx` | **Nouveau** — garde basee sur abonnement |
| `src/components/pricing/PricingPlans.tsx` | **Nouveau** — UI des plans |
| `supabase/functions/create-checkout-session/index.ts` | **Nouveau** |
| `supabase/functions/stripe-subscription-webhook/index.ts` | **Nouveau** |
| Migration SQL | **Nouveau** — table `user_subscriptions` + RLS |

## Ce qui ne change PAS

- Toutes les tables existantes (module_catalog, plan_module_grants, user_access, etc.)
- Tous les RPC existants (get_user_permissions, etc.)
- Les Edge Functions existantes (suivi-*, proxy-apogee, etc.)
- Les composants des modules desactives (le code reste, les imports lazy restent)
- Le PermissionsProviderV2 reste monte dans App.tsx

## Ordre d'implementation

1. Activer l'integration Stripe built-in
2. Creer la migration `user_subscriptions`
3. Creer les Edge Functions Stripe
4. Creer `useAgencySubscriptions` + `SubscriptionGuard`
5. Simplifier la navigation dans UnifiedWorkspace
6. Creer la page pricing
7. Tester le flux complet en mode test

