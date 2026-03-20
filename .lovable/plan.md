

## Plan: Daily Content Machine — 1 post/jour, cadence hebdomadaire

### Résumé

Passage de ~20 posts/mois (répartition macro) à **28-31 posts/mois** (1/jour) avec structure hebdomadaire semi-aléatoire, 8 topic_types, anti-fatigue avancé.

### 1. Nouveaux topic_types (remplacent les anciens)

| Ancien | Nouveau | Template canvas |
|--------|---------|-----------------|
| awareness_day | urgence | tip_card |
| seasonal_tip | prevention | awareness_card |
| realisation | amelioration | brand_card |
| local_branding | conseil | tip_card |
| educational | preuve | brand_card / realisation_card |
| — | saisonnier | awareness_card |
| — | contre_exemple | tip_card |
| — | pedagogique | educational_card |

### 2. Structure hebdomadaire semi-aléatoire

Chaque semaine contient les 7 catégories dans un ordre **shufflé** (randomisé). L'ordre change chaque semaine → variété naturelle, non prévisible.

### 3. Règles de rotation (anti-fatigue)

- **Universe gap** : min 3 jours, max 2/semaine, max 6/mois
- **Pas 2 posts consécutifs** même univers NI même catégorie
- **Fatigue score** : si score > 3 → rejet et swap automatique
  - same_universe_recent: +2/+1
  - same_topic_type_recent: +2
  - similar_hook_pattern: +3
- **Micro-variation** : alterner question, affirmation, alerte, conseil, chiffre

### 4. Format des posts (variation obligatoire)

| Format | Structure | Distribution |
|--------|-----------|-------------|
| Punchline | Hook seul | 20% |
| Court | Hook + CTA | 30% |
| Moyen | Hook + 1 phrase + CTA | 40% |
| Long | Hook + 2 phrases + CTA | 10% |

### 5. Preuve — sous-types

Les posts "preuve" varient entre : réalisation, avant/après, témoignage, process d'intervention.

### 6. Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/social-suggest/index.ts` | 8 topic_types, daily volume, weekly schedule, fatigue score, format distribution, universe rules |
| `supabase/functions/_shared/hookLibrary.ts` | HookIntent étendu (8 intents) |
| `src/components/commercial/social/SocialCalendarView.tsx` | 8 couleurs + légende |
| `src/components/commercial/social/SocialListView.tsx` | 8 badges + labels |
| `src/components/commercial/social/SocialPostCard.tsx` | 8 labels |
| `src/pages/commercial/SocialHubPage.tsx` | 8 filtres |
| `src/components/commercial/social/templateResolver.ts` | Mapping 8 types → 5 templates |
| `src/components/commercial/social/templates/canvasHelpers.ts` | 8 labels canvas |
