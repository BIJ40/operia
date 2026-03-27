

## Plan : Fusion Veille + Suivi client → "Veille" & Renommage origin-box → "Suivi Client"

### Contexte

Deux éléments portent le nom "Suivi client" :
1. **L'onglet interne Commercial** (`commercial.suivi_client`) — liste des apporteurs avec fiches
2. **Le portail client externe** (origin-box, routes `/suivi/*`) — lien envoyé au client final

**Décision utilisateur** : Fusionner l'onglet "Veille" et "Suivi client" en un seul onglet **"Veille"**, qui conserve la présentation actuelle de Suivi client (liste + browser tabs) mais intègre les filtres Veille (Dormants, En baisse, Stables, En hausse). Le nom "Suivi Client" est alors libéré pour désigner exclusivement le portail client externe.

---

### Étape 1 — Fusion de l'onglet Veille dans Suivi client

**Fichier principal : `src/prospection/pages/ApporteurListPage.tsx`**
- Ajouter les **filter pills** de Veille (Dormants, En baisse, Stables, En hausse) au-dessus de la liste existante
- Importer le hook `useVeilleAdaptive` pour obtenir les KPIs et le scoring adaptatif par apporteur
- Enrichir chaque ligne du tableau avec le **badge de statut Veille** (dormant, en baisse, stable, en hausse)
- Ajouter un filtre actif qui restreint la liste aux apporteurs correspondant au pill sélectionné
- La logique existante (recherche, tri par colonne, périodes, browser tabs) reste inchangée

**Fichier : `src/components/unified/tabs/CommercialTabContent.tsx`**
- Supprimer le tab `veille` de `allTabs` et de `TAB_MODULE_MAP`
- Supprimer le `<TabsContent value="veille">` et l'import de `VeilleApporteursTab`
- Renommer le tab `apporteurs` de "Suivi client" → **"Veille"** avec l'icône `Radar`
- Conserver le module key `commercial.suivi_client` pour le guard (la clé `commercial.veille` sera fusionnée côté permissions)

**Fichier : `src/prospection/pages/ProspectionTabContent.tsx`**
- Même refactoring miroir (supprimer tab veille, renommer)

### Étape 2 — Renommage des labels et modules

**Fichier : `src/types/modules.ts`**
- `commercial.suivi_client` → label change de "Suivi client" à **"Veille"**
- `commercial.veille` → marquer comme déprécié ou fusionner dans `commercial.suivi_client`
- Mettre à jour `MODULE_LABELS` : `'commercial.suivi_client': 'Veille'`

**Fichier : `src/components/admin/views/rightsTaxonomy.ts`**
- Retirer `commercial.veille` de la liste `moduleKeys` de la catégorie Commercial (fusionné dans `commercial.suivi_client`)

**Fichier : `src/config/roleAgenceModulePresets.ts`**
- Retirer `commercial.veille` du preset `commercial` (déjà couvert par `commercial.suivi_client`)

**Fichier : `src/permissions/constants.ts`**
- Retirer `prospection.veille` (legacy, plus de tab dédié)

**Fichier : `src/config/navigation.ts` / `sitemapData.ts`**
- Mettre à jour les labels/scopes qui référencent "Suivi client" dans Commercial

### Étape 3 — Renommage origin-box → "Suivi Client" (label officiel)

**Fichier : `src/components/layout/PublicLanding.tsx`**
- La feature card "Suivi Client" est déjà correctement nommée — pas de changement

**Fichier : `src/components/landing/DemoCarousel.tsx`**
- L'entrée `suivi-client` reste "Suivi Client" — pas de changement

**Fichier : `src/types/modules.ts`**
- Ajouter/confirmer un module `portail_client` ou utiliser la clé existante origin-box si elle existe, avec le label **"Suivi Client"** pour l'admin

### Étape 4 — Page admin de gestion du module Suivi Client (origin-box)

Cette étape sera traitée dans un **second lot** une fois la fusion Veille validée, car elle nécessite de définir :
- Les paramètres configurables du portail (activation par agence, personnalisation des sections visibles, branding)
- Le lien avec le nouveau plan APPORTEUR

### Étape 5 — Migration SQL

**Nouvelle migration** pour fusionner les droits :
```sql
-- Pour chaque agence ayant commercial.veille activé, s'assurer que commercial.suivi_client est aussi activé
-- Puis supprimer les entrées commercial.veille de plan_tier_modules et user_modules
UPDATE plan_tier_modules 
SET module_key = 'commercial.suivi_client' 
WHERE module_key = 'commercial.veille' 
  AND NOT EXISTS (
    SELECT 1 FROM plan_tier_modules p2 
    WHERE p2.tier_key = plan_tier_modules.tier_key 
      AND p2.module_key = 'commercial.suivi_client'
  );

DELETE FROM plan_tier_modules WHERE module_key = 'commercial.veille';

-- Idem pour user_modules
UPDATE user_modules 
SET module_key = 'commercial.suivi_client' 
WHERE module_key = 'commercial.veille'
  AND NOT EXISTS (
    SELECT 1 FROM user_modules u2 
    WHERE u2.user_id = user_modules.user_id 
      AND u2.module_key = 'commercial.suivi_client'
  );

DELETE FROM user_modules WHERE module_key = 'commercial.veille';
```

---

### Résumé des fichiers impactés

| Fichier | Action |
|---|---|
| `ApporteurListPage.tsx` | Ajouter filter pills Veille + badges |
| `CommercialTabContent.tsx` | Supprimer tab veille, renommer tab → "Veille" |
| `ProspectionTabContent.tsx` | Idem |
| `types/modules.ts` | Renommer label, déprécier `commercial.veille` |
| `rightsTaxonomy.ts` | Retirer `commercial.veille` |
| `roleAgenceModulePresets.ts` | Retirer `commercial.veille` |
| `permissions/constants.ts` | Retirer `prospection.veille` |
| `ModulesMasterView.tsx` | Retirer entrée `commercial.veille` |
| Migration SQL | Fusionner droits `commercial.veille` → `commercial.suivi_client` |

