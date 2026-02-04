
# Plan de correction : Unification du calcul CA par Technicien

## Objectif

Harmoniser tous les calculs CA technicien pour utiliser la **même règle métier** :
- Répartition **au prorata du temps**
- Lissage pour les factures sans temps productif
- Inclusion de tous états de factures sauf annulées/pro-forma

---

## Diagnostic actuel

Le code utilise **2 moteurs différents** pour calculer le CA par technicien :

| Métrique | Moteur utilisé | Méthode | Problème |
|----------|---------------|---------|----------|
| `ca_par_technicien` | `techniciens.ts:541` | Égale | ❌ Pas conforme |
| `top_techniciens_ca` | Délègue à `ca_par_technicien` | Égale | ❌ |
| `ca_mensuel_par_technicien` | `techniciens.ts:1094` | Égale | ❌ |
| `ca_par_technicien_univers` | `technicienUniversEngine.ts` | Prorata temps | ✅ |
| Heatmap / Performance | `technicienUniversEngine.ts` | Prorata temps | ✅ |

---

## Changements proposés

### 1. Créer une fonction de calcul UNIFIÉE

Créer un helper central `calculateTechCAForInvoice()` dans `src/shared/utils/technicienUniversEngine.ts` qui sera utilisé par TOUS les moteurs.

```text
Logique :
┌──────────────────────────────────────────────────────────────────┐
│ calculateTechCAForInvoice(facture, interventions, usersMap)      │
│ ────────────────────────────────────────────────────────────     │
│ 1. Vérifier état facture (exclure annulées/pro-forma)           │
│ 2. Extraire montantNetHT (avoirs en négatif)                    │
│ 3. Récupérer interventions du projet                            │
│ 4. Filtrer interventions productives (exclure RT/TH/SAV/Diag)   │
│ 5. Parcourir visites validated + durée > 0                      │
│ 6. Filtrer usersIds : uniquement techniciens actifs             │
│ 7. Calculer temps par technicien                                │
│ 8. Répartir CA au prorata temps                                 │
│ 9. Si temps total = 0 → return { unallocated: montantNetHT }    │
│                                                                  │
│ Return: Map<techId, { ca, duree }>                              │
└──────────────────────────────────────────────────────────────────┘
```

### 2. Modifier les définitions StatIA (`techniciens.ts`)

Refactoriser ces métriques pour utiliser le nouveau helper :

| Métrique | Changement |
|----------|------------|
| `ca_par_technicien` | Remplacer la logique "égale" par appel au helper prorata |
| `top_techniciens_ca` | Aucun changement (délègue à `ca_par_technicien`) |
| `ca_mensuel_par_technicien` | Remplacer la logique "égale" par appel au helper prorata |
| `ca_par_technicien_univers` | Refactoriser pour utiliser le même helper |

### 3. Appliquer le lissage

Dans la fonction de synthèse finale (après parcours de toutes les factures), ajouter :

```text
// Calcul de l'écart
écartCA = totalFacturesHT - somme(caAttribuésAuxTechs)

// Lissage équitable
Si écartCA > 0.01 ET nbTechniciens > 0 :
  ajustement = écartCA / nbTechniciens
  Pour chaque technicien :
    tech.ca += ajustement
```

Ce lissage existe déjà dans `technicienUniversEngine.ts:439-475` - on s'assure qu'il est appliqué dans tous les contextes.

### 4. Centraliser les constantes d'exclusion

Dans `src/statia/domain/rules.ts`, ajouter/vérifier :

```typescript
export const EXCLUDED_USER_TYPES = ['commercial', 'admin', 'assistant', 'administratif'];

export const EXCLUDED_INTERVENTION_TYPES = ['RT', 'TH', 'SAV', 'diagnostic'];

export const ALWAYS_PRODUCTIVE_TYPES = ['recherche de fuite', 'recherche fuite'];
```

S'assurer que `caParTechnicienCore.ts` importe et utilise ces constantes.

### 5. Synchroniser le moteur Edge Function

Le fichier `supabase/functions/_shared/statiaEngines/caParTechnicien.ts` doit refléter les mêmes règles pour que les calculs côté serveur soient cohérents.

---

## Fichiers impactés

| Fichier | Type de modification |
|---------|---------------------|
| `src/shared/utils/technicienUniversEngine.ts` | Refactoring + export du helper |
| `src/statia/definitions/techniciens.ts` | Refactoring des métriques `ca_par_*` |
| `src/statia/engines/caParTechnicienCore.ts` | Aligner sur le nouveau helper ou supprimer |
| `src/statia/domain/rules.ts` | Ajouter/centraliser les constantes |
| `src/apogee-connect/utils/technicienUniversCalculations.ts` | Aligner ou supprimer (doublon) |
| `supabase/functions/_shared/statiaEngines/caParTechnicien.ts` | Synchroniser avec le frontend |

---

## Tableau de correspondance final

| Règle métier | Implémentation cible |
|--------------|---------------------|
| Source CA | `apiGetFactures.data.totalHT` |
| Avoirs | Montants négatifs via `extractFactureMeta` |
| États inclus | Tous sauf `canceled`, `annulee`, `pro_forma`, `proforma` |
| Répartition | **Prorata temps** (`CA × dureeTech / dureeTotale`) |
| Visites | `state = "validated"`, `duree > 0` |
| Types productifs | biDepan, biTvx, "recherche de fuite" |
| Types exclus | RT, TH, SAV, Diagnostic |
| Identification tech | `isTechnicien=true` OU `type=technicien` OU (`utilisateur` + univers) |
| Exclusions user | commercial, admin, assistant, administratif |
| Factures sans temps | Lissage équitable sur tous les techs |

---

## Résultat attendu

1. **Cohérence** : Le Top 10 et la Heatmap afficheront les mêmes CA par technicien
2. **Conformité** : La règle "prorata temps" sera appliquée partout
3. **Complétude** : Aucun CA ne sera "perdu" grâce au lissage
4. **Maintenabilité** : Une seule source de vérité pour le calcul
