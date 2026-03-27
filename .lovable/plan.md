

## Plan : Franchiseur → Relations + Renommage tables suivi

Le plan ChatGPT est cohérent avec le projet. Voici la synthèse d'exécution :

### Phase 1 — Migration SQL
- `ALTER TABLE public.agencies RENAME TO agency_suivi_settings`
- `ALTER TABLE public.payments RENAME TO payments_clients_suivi`
- Recréer `agencies_public` view sur `agency_suivi_settings`
- Mettre à jour les RLS policies si nécessaire

### Phase 2 — Edge Functions (5 fichiers)
Remplacement texte simple des noms de tables :
- `suivi-stripe-checkout` : `agencies` → `agency_suivi_settings`
- `suivi-api-proxy` : `agencies` → `agency_suivi_settings`
- `suivi-sms-satisfaction-scan` : `agencies` → `agency_suivi_settings`
- `suivi-record-payment` : `payments` → `payments_clients_suivi`
- `suivi-check-payment-status` : `payments` → `payments_clients_suivi`

### Phase 3 — AdminHubContent refactor
- Remplacer pill `franchiseur` → `relations` (icône `Handshake`, accent `purple`)
- Retirer `apporteurs` et `audit-apporteurs` de `GESTION_SUB_TABS`
- Créer `RELATIONS_SUB_TABS` avec : Apporteurs, Audit Apporteurs, Suivi Clients
- Ajouter `DEFAULT_RELATIONS_ORDER`, `admin_relations_tab_order`, `activeRelationsTab`
- Nouveau `<TabsContent value="relations">` avec structure folder draggable identique à Gestion
- Supprimer `<TabsContent value="franchiseur">` et l'import de `FranchiseurView`

**Important** : `FranchiseurView` dans `UnifiedWorkspace.tsx` (vue standalone N3+) reste inchangée.

### Phase 4 — SuiviClientsAdminView (nouveau composant)
3 sections internes (onglets) :
- **Agences** (`agency_suivi_settings`) : tableau éditable, modal d'édition
- **Paiements** (`payments_clients_suivi`) : tableau paginé lecture seule, filtres agence/période
- **Journal d'envois** (`sms_sent_log`) : tableau paginé lecture seule, filtres agence/statut/période

Export depuis `admin/views/index.ts`.

### Phase 5 — Routes legacy
- Ajouter `/admin/franchiseur` → `/?tab=admin&adminTab=relations` dans `admin.routes.tsx`

### Fichiers impactés
| Fichier | Action |
|---|---|
| Migration SQL | Renommage tables + vue |
| `suivi-stripe-checkout/index.ts` | `agencies` → `agency_suivi_settings` |
| `suivi-api-proxy/index.ts` | `agencies` → `agency_suivi_settings` |
| `suivi-sms-satisfaction-scan/index.ts` | `agencies` → `agency_suivi_settings` |
| `suivi-record-payment/index.ts` | `payments` → `payments_clients_suivi` |
| `suivi-check-payment-status/index.ts` | `payments` → `payments_clients_suivi` |
| `AdminHubContent.tsx` | Refactor tabs |
| `SuiviClientsAdminView.tsx` | **Nouveau** |
| `admin/views/index.ts` | Export |
| `admin.routes.tsx` | Redirect legacy |

