

# Plan: Popup dossier partagee apporteur/agence + regle metier de reponse

## Contexte

La popup `DossierDetailDialog` existe cote apporteur. Il faut la rendre utilisable cote OPERIA (agence), avec une regle metier simple pour le droit de reponse: N2 toujours, N1 assistante uniquement, tous les autres en lecture seule. Les boutons d'action legacy (Annuler, Relancer, Donner une info) sont supprimes au profit du fil d'echanges unique.

---

## Changements

### 1. Refonte DossierDetailDialog — popup partagee

**Fichier**: `src/apporteur/components/cockpit/DossierDetailDialog.tsx`

- Ajouter prop `viewerType: 'apporteur' | 'agence'` (defaut: `'apporteur'`)
- Ajouter prop optionnelle `viewerName?: string` et `viewerCanReply?: boolean`
- **Supprimer** tout le bloc "Actions" (Annuler, Relancer, Donner une info + textarea associee, lignes 303-385)
- Conserver Valider/Refuser devis uniquement si `viewerType === 'apporteur'`
- Chat input: 
  - Si `viewerCanReply === true` : actif, placeholder adapte selon viewerType
  - Si `viewerCanReply === false` : desactive + message "Seuls le dirigeant et les assistantes peuvent repondre aux apporteurs."
- Afficher le nom de l'expediteur dans chaque message du fil (deja fait)
- Ajouter le poste a cote du nom dans les messages agence: "Marie (Assistante)"

### 2. Fonction utilitaire — droit de reponse

**Fichier**: `src/lib/canReplyToApporteur.ts` (nouveau)

```typescript
export function canReplyToApporteur(
  globalRole: string | null, 
  roleAgence: string | null
): boolean {
  if (globalRole === 'franchisee_admin') return true;
  if (globalRole === 'franchisee_user') {
    const poste = roleAgence?.toLowerCase();
    return poste?.includes('assistante') || poste?.includes('secretaire') || false;
  }
  return false;
}
```

### 3. Edge Function reponse agence

**Fichier**: `supabase/functions/agency-dossier-reply/index.ts` (nouveau)

- Authentification via JWT Supabase (utilisateur OPERIA connecte)
- Recuperer le profil (global_role, role_agence) depuis `profiles`
- Verification serveur: `canReplyToApporteur(global_role, role_agence)` — sinon 403
- Inserer dans `dossier_exchanges` avec `sender_type = 'agence'`, `sender_name = "Prenom Nom (Poste)"`
- Envoyer un email de notification a l'apporteur (via Resend)
- Retourner succes

### 4. Migration SQL

- Etendre le CHECK constraint `action_type` de `dossier_exchanges` pour ajouter `'valider_devis'`, `'refuser_devis'`, `'systeme'`, `'message'`
- Pas de colonne `receive_apporteur_notifications` pour l'instant (simplifie — V1 sans systeme de preferences)

### 5. Section "Echanges apporteurs" cote OPERIA

**Fichier**: `src/components/agency/AgencyApporteurExchanges.tsx` (nouveau)

- Liste les dossiers ayant des echanges recents pour l'agence de l'utilisateur
- Requete sur `dossier_exchanges` filtree par `agency_id`
- Indicateur visuel: badge "Reponse requise" si dernier message = apporteur
- Clic sur un dossier → ouvre `DossierDetailDialog` avec `viewerType='agence'`
- Le `viewerCanReply` est calcule via `canReplyToApporteur(globalRole, roleAgence)`

**Integration**: Ajouter un onglet/lien dans la navigation OPERIA (section Organisation ou Commercial)

### 6. Hook echanges cote agence

**Fichier**: `src/hooks/useAgencyExchanges.ts` (nouveau)

- Requete directe Supabase (pas edge function) sur `dossier_exchanges` filtree par `agency_id`
- Groupement par `dossier_ref` avec dernier message et compteur non-lu (basique: dernier sender_type)

### 7. Hook reponse agence

**Fichier**: `src/hooks/useAgencyDossierReply.ts` (nouveau)

- Appel `supabase.functions.invoke('agency-dossier-reply', { body: { dossierRef, message } })`
- Invalidation du cache echanges apres envoi

---

## Details techniques importants

| Point | Decision |
|---|---|
| Poste "assistante" | Normalise en lowercase, match avec `includes('assistante')` ou `includes('secretaire')` |
| Double reponse | Pas de verrou en V1 — auteur + timestamp visible suffisent |
| Boutons actions | Supprimes de la popup — tout passe par le chat |
| Valider/Refuser devis | Reste sur la popup apporteur uniquement, event ajoute au fil |
| Inbound email | Phase ulterieure, pas dans ce scope |

---

## Ordre d'implementation

1. Creer `canReplyToApporteur.ts`
2. Migration SQL (etendre action_type)
3. Refondre `DossierDetailDialog` (supprimer actions, ajouter props viewerType/viewerCanReply)
4. Creer edge function `agency-dossier-reply`
5. Creer hooks agence (exchanges + reply)
6. Creer `AgencyApporteurExchanges.tsx` + integration navigation OPERIA

