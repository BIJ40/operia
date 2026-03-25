

# Plan Optimisation Apogee — Version finale renforcee

## Phase 0 — Comparaison de payload reel

Avant toute modification, capturer et comparer les reponses `apiGetProjects` :

- Capturer un payload reel actuel via `proxy-apogee`
- Comparer avec les champs effectivement consommes par chaque moteur
- Produire un rapport d'impact couvrant : StatIA, compute-kpis, get-kpis, compute-metric, generate-monthly-report, get-apporteur-dossiers/stats/planning, unified-search, get-rdv-map, get-zones-deplacement, planning V2, modules pilotage
- Lister champs supprimes, conserves, devenus partiels/nuls/deplaces
- Corriger immediatement les calculateurs impactes

**Fichiers concernes** : toutes les Edge Functions listees + `src/statia/`, `src/services/apogeeProxy.ts`

---

## Phase 1 — Proxy `apiGetProjectByRef`

- Ajouter `apiGetProjectByRef` a la whitelist dans `supabase/functions/proxy-apogee/index.ts`
- Rate limiting strict : 10 req/min par utilisateur
- Validation serveur que l'utilisateur a acces a l'agence du dossier
- Journaliser chaque acces detail dossier (user_id, ref, timestamp)

---

## Phase 2 — Project Detail Loader (client)

- `src/services/projectDetailLoader.ts` : cache memoire (Map + TTL 10min, max 100 entrees LRU), deduplication des appels concurrents
- `src/hooks/useProjectDetail.ts` : hook React Query, `enabled` uniquement quand ref fourni, `staleTime: 10min`
- `src/services/normalizeGeneratedDocs.ts` : normalise `generatedDocs` en liste unifiee, typee, triee par date, groupee par categorie

---

## Phase 3 — Cache serveur Edge

- Cache court cote Edge Function pour `apiGetProjectByRef`
- Cle de cache : **meme ref + meme agencySlug + meme perimetre d'acces autorise** (ne jamais contourner la verification des droits)
- TTL 2 a 10 min, invalidation simple
- Logs d'usage pour mesurer le taux de hit

**Fichier** : `supabase/functions/proxy-apogee/index.ts`

---

## Phase 4 — UX Apporteur (priorite 1)

- `supabase/functions/get-apporteur-dossiers/index.ts` : ajouter `ref` dans les champs retournes. **Ne pas exposer `hash`.**
- `src/apporteur/pages/ApporteurDossiers.tsx` : au clic sur un dossier, appeler `useProjectDetail(ref)` dans la Dialog
- `src/apporteur/components/DossierDocumentsPanel.tsx` (nouveau) : affiche documents generes groupes par type avec liens PDF

---

## Phase 5 — UX Utilisateur interne (priorite 2)

### Micro-tache prealable obligatoire

Identifier precisement tous les ecrans internes ou un `ref` dossier est deja disponible sans reconstruction supplementaire, puis prioriser ceux ou l'acces aux documents generes apporte une vraie valeur metier.

### Ecrans eligibles
- **Fiche dossier interne** : oui
- **Pages devis/facture liees a un dossier** : a etudier au cas par cas
- **ApogeeDocumentsExplorer** : migrer vers `getProjectByRef` uniquement si le flux passe par un controle serveur avec verification stricte des droits

### Ecrans exclus
- Dashboards, KPI, planning, cartes, recherche unifiee, previsionnel : **non**

---

## Phase 6 — Verification metriques

Aucun impact metrique n'est attendu **si** `apiGetProjects` conserve l'integralite des champs consommes. Cette hypothese **doit etre validee par comparaison reelle des payloads** (Phase 0).

Tache dediee :
- Comparer ancien/nouveau payload
- Lister champs disparus ou devenus partiels/nullables
- Corriger immediatement les calculateurs impactes
- Tester : CA total, CA par univers, CA par apporteur, taux transformation, SAV, delais, planning, productivite techniciens

---

## Interdictions strictes

- Ne jamais appeler `apiGetProjectByRef` au chargement d'une liste
- Ne jamais faire de prefetch automatique des details pour les lignes visibles
- Ne jamais faire de cascade "1 liste = N appels detail"
- Ne jamais charger les documents au hover, au scroll ou au mount d'une card
- Ne charger le detail qu'apres action explicite utilisateur ou besoin metier ponctuel clairement justifie
- Ne pas exposer `hash` aux apporteurs connectes sauf necessite demontree
- Ne jamais reconstituer un bulk via appels unitaires
- Ne pas migrer `ApogeeDocumentsExplorer` sans controle serveur strict

---

## Contraintes de robustesse supplementaires

- `generatedDocs` doit etre traite comme **optionnel, nullable ou partiellement renseigne** — l'absence de documents ne doit jamais provoquer d'erreur UI
- En cas d'echec de `apiGetProjectByRef` : conserver la liste, afficher un etat degrade propre ("documents indisponibles pour ce dossier"), ne jamais casser la Dialog complete, ne jamais relancer automatiquement en boucle
- Les liens PDF ne doivent etre affiches que si leur URL est reellement exploitable — distinguer clairement : document disponible / reference mais non consultable / absent
- Le cache Edge ne doit jamais contourner la verification des droits d'acces
- Identifier precisement les ecrans internes deja porteurs d'une `ref` exploitable avant d'ajouter les documents generes

---

## Ordre d'implementation

1. Phase 0 : comparaison payload reel (prerequis)
2. Phase 1 : proxy + whitelist + rate limiting + logs
3. Phase 3 : cache serveur Edge
4. Phase 2 : detail loader client + normalizer
5. Phase 4 : UX apporteur
6. Phase 5 : inventaire ecrans internes + UX interne
7. Phase 6 : verification metriques end-to-end

---

## Fichiers modifies (estimation)

| Fichier | Action |
|---------|--------|
| `supabase/functions/proxy-apogee/index.ts` | Whitelist, rate limiting, cache serveur, logs |
| `supabase/functions/get-apporteur-dossiers/index.ts` | Ajouter `ref` (pas `hash`) |
| `src/services/projectDetailLoader.ts` | Nouveau — cache + dedup |
| `src/services/normalizeGeneratedDocs.ts` | Nouveau — normalisation docs |
| `src/hooks/useProjectDetail.ts` | Nouveau — hook React Query |
| `src/apporteur/pages/ApporteurDossiers.tsx` | Chargement detail au clic |
| `src/apporteur/components/DossierDocumentsPanel.tsx` | Nouveau — panel documents |
| `src/apporteur/hooks/useApporteurDossiers.ts` | Type `ref` dans `DossierRow` |
| Edge Functions KPI/StatIA | Correction si champs disparus (Phase 0) |

---

## Livrables obligatoires

- Rapport de comparaison payload reel `apiGetProjects` avant/apres
- Liste des champs effectivement conserves / supprimes / modifies
- Liste des corrections metriques effectuees
- Liste des ecrans enrichis avec documents generes
- Detail des garde-fous securite ajoutes
- Estimation d'impact sur la charge API
- Points non traites ou volontairement exclus

