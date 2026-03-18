

## Diagnostic du module Résultat

### Problème racine : les tables n'existent pas en base

Les 3 tables et la vue utilisées par le module Résultat **n'ont jamais été créées dans Supabase** :
- `agency_financial_months` -- 404
- `agency_financial_charges` -- 404
- `agency_financial_summary` (view) -- 404

La RPC `update_financial_charge` n'existe pas non plus. Le frontend a été codé mais aucune migration n'a été appliquée. Tous les appels renvoient une erreur 404 PGRST205, ce qui explique les chiffres vides et les 0 partout.

### Problème UX : le wizard Charges est one-way

Le stepper dans `ChargesBlock.tsx` ne permet pas de revenir en arriere (pas de bouton "Précédent"). Une fois une étape passée, impossible de corriger. De plus, les charges existantes ne sont pas éditables (pas de mode édition, uniquement un affichage lecture).

### Problème fonctionnel : manque d'informations

Le module actuel est minimaliste : Activité (3 chiffres), CA (4 lignes), Charges (wizard basique), Résultat (5 lignes). Il manque beaucoup par rapport à un vrai compte de résultat d'agence.

---

## Plan d'implémentation -- Phase 1 : Socle fonctionnel

### 1. Créer les tables et la vue en base (migration)

Créer une migration SQL avec :

```sql
-- agency_financial_months
CREATE TABLE public.agency_financial_months (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  nb_interventions integer DEFAULT 0,
  nb_factures integer DEFAULT 0,
  heures_facturees numeric(10,2) DEFAULT 0,
  ca_total numeric(12,2) DEFAULT 0,
  achats numeric(12,2) DEFAULT 0,
  sous_traitance numeric(12,2) DEFAULT 0,
  synced_at timestamptz,
  sync_version integer DEFAULT 0,
  locked_at timestamptz,
  locked_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agency_id, year, month)
);

-- agency_financial_charges
CREATE TABLE public.agency_financial_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  charge_type text NOT NULL,
  category text NOT NULL CHECK (category IN ('FIXE','VARIABLE')),
  label text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  start_month date NOT NULL,
  end_month date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- agency_financial_summary (view)
CREATE VIEW public.agency_financial_summary AS
SELECT
  m.id, m.agency_id, m.year, m.month,
  make_date(m.year, m.month, 1)::text AS month_date,
  m.locked_at, m.synced_at, m.sync_version,
  m.nb_interventions, m.nb_factures, m.heures_facturees,
  m.ca_total, m.achats, m.sous_traitance,
  (m.ca_total - m.sous_traitance) AS ca_net,
  (m.ca_total - m.sous_traitance - m.achats) AS marge_brute,
  COALESCE(cv.total, 0) AS charges_variables,
  (m.ca_total - m.sous_traitance - m.achats - COALESCE(cv.total, 0)) AS marge_contributive,
  COALESCE(cf.total, 0) AS charges_fixes,
  (m.ca_total - m.sous_traitance - m.achats - COALESCE(cv.total, 0) - COALESCE(cf.total, 0)) AS resultat_exploitation
FROM agency_financial_months m
LEFT JOIN LATERAL (
  SELECT SUM(c.amount) AS total FROM agency_financial_charges c
  WHERE c.agency_id = m.agency_id AND c.category = 'VARIABLE'
    AND c.start_month <= make_date(m.year, m.month, 1)
    AND (c.end_month IS NULL OR c.end_month >= make_date(m.year, m.month, 1))
) cv ON true
LEFT JOIN LATERAL (
  SELECT SUM(c.amount) AS total FROM agency_financial_charges c
  WHERE c.agency_id = m.agency_id AND c.category = 'FIXE'
    AND c.start_month <= make_date(m.year, m.month, 1)
    AND (c.end_month IS NULL OR c.end_month >= make_date(m.year, m.month, 1))
) cf ON true;

-- RPC update_financial_charge (versionnement)
CREATE OR REPLACE FUNCTION public.update_financial_charge(
  p_charge_id uuid, p_new_amount numeric, p_new_start_month date, p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_new_id uuid;
BEGIN
  UPDATE agency_financial_charges SET end_month = p_new_start_month - interval '1 day'
  WHERE id = p_charge_id AND end_month IS NULL;
  INSERT INTO agency_financial_charges (agency_id, charge_type, category, label, amount, start_month, notes)
    SELECT agency_id, charge_type, category, label, p_new_amount, p_new_start_month, COALESCE(p_notes, notes)
    FROM agency_financial_charges WHERE id = p_charge_id
  RETURNING id INTO v_new_id;
  RETURN v_new_id;
END; $$;
```

Plus : RLS policies, index, trigger updated_at, trigger lock protection.

### 2. Corriger le wizard Charges : navigation bidirectionnelle et édition

Dans `ChargesBlock.tsx` :
- Ajouter un bouton **Précédent** sur les étapes 2 et 3.
- Quand des charges existent deja, passer en mode **édition inline** au lieu d'un affichage lecture-seule. Permettre de modifier les montants et sauvegarder via `updateChargeViaRpc`.
- Afficher le total charges variables et charges fixes en bas du bloc.

### 3. Enrichir ResultatTabContent avec les infos manquantes

Ajouter au layout :
- **KPIs en haut** : Taux de marge brute (%), Taux de marge contributive (%), Panier moyen, CA/heure.
- **Bloc Univers** : Répartition du CA par univers (lecture depuis `agency_financial_univers` si disponible, sinon calcul depuis les données Apogee existantes).
- **Bloc Évolution** : Mini-graphe sparkline ou barre sur 6 mois glissants (CA, Marge).
- **Comparaison N-1** : Colonne delta par rapport au meme mois de l'annee precedente.

### 4. Gestion des erreurs gracieuse

Actuellement les erreurs 404 sont silencieuses (les hooks `throw` mais le composant montre juste 0). Ajouter une détection : si les tables n'existent pas encore, afficher un message explicite "Module en cours de déploiement" plutot que des zeros trompeurs.

---

## Fichiers modifiés

| Fichier | Action |
|---------|--------|
| **Migration SQL** (nouveau) | Crée les 3 tables + view + RPC + RLS + index |
| `src/components/financial/ChargesBlock.tsx` | Navigation bidirectionnelle, mode édition |
| `src/components/financial/ResultatTabContent.tsx` | Enrichir avec KPIs, univers, évolution |
| `src/hooks/useFinancialCharges.ts` | Gérer erreur 404 gracieusement |
| `src/hooks/useFinancialMonth.ts` | Idem |
| `src/hooks/useFinancialSummary.ts` | Idem |
| Nouveaux composants (KpiRow, UniversBlock, EvolutionBlock) | Blocs enrichis |

