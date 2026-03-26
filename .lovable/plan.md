
# Plan: Popup dossier partagee apporteur/agence + regle metier de reponse

## Etat actuel

- `DossierDetailDialog.tsx` (461 lignes) : popup apporteur avec stepper, infos, bloc "Actions" legacy (Annuler/Relancer/Info lines 303-385), fil d'echanges + chat input
- `dossier_exchanges` table : `action_type CHECK ('annuler', 'relancer', 'info', 'reponse')` — a etendre
- Source de verite poste : `profiles.role_agence` expose via `AuthContext.roleAgence`
- Navigation OPERIA : section Organisation contient deja "Apporteurs" (subTab `apporteurs`)

---

## 1. Creer `src/lib/canReplyToApporteur.ts`

Helper unique, source de verite front pour le droit de reponse :

```typescript
export function canReplyToApporteur(
  globalRole: string | null,
  roleAgence: string | null
): boolean {
  if (globalRole === 'franchisee_admin') return true;
  const isAgencyUser = globalRole === 'franchisee_user' || globalRole === 'user' || globalRole === 'agency_user';
  if (isAgencyUser) {
    const poste = roleAgence?.toLowerCase() ?? '';
    return poste.includes('assistante') || poste.includes('secretaire');
  }
  return false;
}
```

## 2. Migration SQL — etendre action_type

```sql
ALTER TABLE public.dossier_exchanges
  DROP CONSTRAINT dossier_exchanges_action_type_check;
ALTER TABLE public.dossier_exchanges
  ADD CONSTRAINT dossier_exchanges_action_type_check
  CHECK (action_type IN ('annuler', 'relancer', 'info', 'reponse', 'message', 'valider_devis', 'refuser_devis', 'systeme'));
```

## 3. Refonte `DossierDetailDialog.tsx`

**Props ajoutees** :
- `viewerType?: 'apporteur' | 'agence'` (defaut `'apporteur'`)
- `viewerName?: string`
- `viewerCanReply?: boolean` (defaut `true` pour apporteur)

**Suppressions** (lignes 42-48, 117, 127-144, 303-385) :
- `ACTION_CONFIG`, `QuickAction`, `activeAction` state, `message` state
- `handleSendAction` handler
- Tout le bloc "Actions directes" (Quick actions + textarea conditionnelle)

**Conserve** :
- Valider/Refuser devis uniquement si `viewerType === 'apporteur'`
- Chat input : placeholder adapte (`Ecrire a l'agence...` vs `Ecrire a l'apporteur...`)
- Si `viewerCanReply === false` : textarea disabled + message explicatif

**Ajouts** :
- Dans le fil, pour les messages agence, afficher le poste a cote du nom si dispo dans `metadata`
- Labels action_type enrichis : `message` → bulle classique, `valider_devis`/`refuser_devis` → badge metier, `systeme` → ligne timeline centree

## 4. Edge Function `agency-dossier-reply`

Nouveau fichier : `supabase/functions/agency-dossier-reply/index.ts`

- Auth via JWT Supabase (`getClaims`)
- Recupere profil : `global_role`, `role_agence`, `first_name`, `last_name`, `agency_id`
- Applique `canReplyToApporteur(global_role, role_agence)` — sinon 403
- Insere dans `dossier_exchanges` : `sender_type='agence'`, `sender_name`, `action_type='message'`, `metadata: { role_label: poste }`
- Envoie email notification a l'apporteur via Resend (sujet : `[Dossier REF] Nouveau message de l'agence`)
- Utilise CORS partage

## 5. Hook `src/hooks/useAgencyDossierReply.ts`

- `supabase.functions.invoke('agency-dossier-reply', { body: { dossierRef, message } })`
- Invalidation `['apporteur-exchanges', dossierRef]` + `['agency-exchanges']`

## 6. Hook `src/hooks/useAgencyExchanges.ts`

- Query Supabase directe sur `dossier_exchanges` filtree par `agency_id` du user connecte
- Retourne une liste agregee par `dossier_ref` : `last_message_at`, `last_sender_type`, `last_message_preview`, `sender_name`
- Badge : "Reponse requise" si `last_sender_type === 'apporteur'`

## 7. Composant `src/components/agency/AgencyApporteurExchanges.tsx`

- Liste des dossiers avec echanges pour l'agence
- Recherche par ref/nom
- Apercu dernier message + date + badge "Reponse requise"
- Clic ligne → ouvre `DossierDetailDialog` avec `viewerType='agence'`, `viewerCanReply` calcule via `canReplyToApporteur`
- Necessite `useAuth()` pour `globalRole`, `roleAgence`, `agencyId`, `firstName`, `lastName`

## 8. Integration navigation OPERIA

Dans `headerNavigation.ts`, sous le groupe Organisation, ajouter :
```
{ label: 'Echanges apporteurs', icon: MessagesSquare, tab: 'organisation',
  description: 'Fil de discussion avec les apporteurs',
  scope: 'organisation.apporteurs',
  subTabKey: 'organisation_sub_tab', subTabValue: 'echanges-apporteurs' }
```

Ajouter le rendu du composant `AgencyApporteurExchanges` dans le routage de l'onglet Organisation pour le subTab `echanges-apporteurs`.

---

## Ordre d'implementation

1. `canReplyToApporteur.ts`
2. Migration SQL
3. Refonte `DossierDetailDialog`
4. Edge function `agency-dossier-reply` + deploy
5. `useAgencyDossierReply` + `useAgencyExchanges`
6. `AgencyApporteurExchanges` + integration navigation

## Hors scope V1

Inbound email, preferences notifications, non-lu, verrou anti-double, notes internes, statuts conversation.
