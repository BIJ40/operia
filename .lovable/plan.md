

## Plan : Francisation des statuts API bruts affichés en UX

### Problème
Plusieurs composants affichent directement les codes d'état bruts de l'API Apogée (`to_planify_tvx`, `wait_fourn`, `order`, `accepted`, `draft`, `sent`, etc.) au lieu de labels français lisibles.

---

### Étape 1 — Créer un mapping centralisé `src/shared/utils/stateLabels.ts`

Extraire et enrichir le mapping qui existe déjà dans `useAnomaliesDevisDossier.ts` :

```text
new           → Nouveau
devis_a_faire → Devis à rédiger
devis_sent    → Devis envoyé
devis_to_order→ À commander
wait_fourn    → En attente fournisseur
to_planify_tvx→ À planifier travaux
planified_tvx → Planifié travaux
planifie_rt   → Planifié RT
rt_fait       → Retour technicien réalisé
to_be_invoiced→ À facturer
invoiced/invoice → Facturé
done          → Réalisé
canceled      → Annulé
stand_by      → En attente
accepted      → Accepté
order         → Validé (commande)
refused       → Refusé
draft         → Brouillon
sent          → Envoyé
```

Exporter une fonction `stateLabel(state: string): string` qui retourne le label FR ou le state brut en fallback.

---

### Étape 2 — Appliquer le mapping dans les composants qui affichent des états bruts

| Fichier | Ce qui est affiché brut | Correction |
|---|---|---|
| `DossierDetailDialog.tsx` L145 | `data.project.state` | `stateLabel(...)` |
| `DossierDetailDialog.tsx` L295 | `devis.state` | `stateLabel(...)` |
| `DossierDetailDialog.tsx` L359 | `intervention.state` | `stateLabel(...)` |
| `TechWeeklyPlanningList.tsx` L169 | `slot.state` | `stateLabel(...)` |
| `ApogeeDocumentsExplorer.tsx` L194 | `doc.state` | `stateLabel(...)` |
| `DetailDrawer.tsx` L186, L189 | `a.status`, `a.projectState` | `stateLabel(...)` |
| `CAPlanifieDetailDialog.tsx` L254 | ternaire inline avec `'Att. fourn.'` | `stateLabel(state)` |
| `ticket.status` fallbacks (AideTabContent L370, RecentTicketsWidget L137) | `ticket.status` quand `statusLabel` est absent | `stateLabel(ticket.status)` |

---

### Étape 3 — Réutiliser le mapping centralisé dans le hook anomalies

Remplacer le `STATE_LABELS` local dans `useAnomaliesDevisDossier.ts` par un import de `stateLabel()` depuis le fichier partagé pour éviter la duplication.

---

### Fichiers modifiés (8 fichiers)

1. **`src/shared/utils/stateLabels.ts`** — nouveau, mapping + fonction
2. **`src/apogee-connect/components/DossierDetailDialog.tsx`** — 3 remplacements
3. **`src/apogee-connect/components/TechWeeklyPlanningList.tsx`** — 1 remplacement
4. **`src/apogee-connect/components/ApogeeDocumentsExplorer.tsx`** — 1 remplacement
5. **`src/planning-v2/components/shared/DetailDrawer.tsx`** — 2 remplacements
6. **`src/apogee-connect/components/stats-hub/CAPlanifieDetailDialog.tsx`** — remplacement ternaire
7. **`src/apogee-connect/hooks/useAnomaliesDevisDossier.ts`** — réutiliser le mapping partagé
8. **`src/components/unified/tabs/AideTabContent.tsx`** + **`RecentTicketsWidget.tsx`** — fallback ticket.status

