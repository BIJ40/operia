

# Plan : Avatars équipe HelpConfort dans le Social Hub

## Contexte

Deux images de groupe montrent les collaborateurs HelpConfort en style illustration. L'objectif est d'isoler chaque visage, les stocker comme avatars individuels, et les intégrer dans les visuels Social Hub (notamment les posts "brand" / équipe).

## Phase 1 — Extraction et stockage des avatars

**Action** : Découper chaque visage des 2 images uploadées via le script AI (Gemini image edit) ou manuellement, puis les stocker dans `src/assets/team/`.

Noms proposés (à confirmer selon identification) :

Image 1 (8 personnes) :
- `team-femme-1.png` (brune, gauche)
- `team-homme-1.png`
- `team-homme-2.png` (chauve)
- `team-homme-3.png` (barbe grise)
- `team-homme-4.png` (brun, polo bleu HC)
- `team-femme-2.png` (lunettes)
- `team-homme-5.png` (barbe, costaud)
- `team-homme-6.png` (chauve)

Image 2 (7 personnes) :
- `team-homme-7.png` à `team-homme-11.png`
- `team-femme-3.png` (brune courte)
- etc.

**Question clé** : Peux-tu nommer chaque personne (prénom/rôle) pour que les avatars soient correctement identifiés ? Sinon je les numérote.

## Phase 2 — Registre des collaborateurs

Créer `src/data/teamMembers.ts` :

```typescript
export interface TeamMember {
  slug: string;
  displayName: string;
  role: 'technicien' | 'secretaire' | 'commercial' | 'dirigeant';
  avatarImport: string; // chemin vers l'asset
  universe?: string[];  // univers métier si technicien
}
```

## Phase 3 — Intégration dans le canvas Social

Modifier le template `brand_card` (et potentiellement `awareness_card`) pour :

- Quand un post est de type "équipe" / "brand" / "prospection" sans photo media, afficher les avatars de l'équipe dans la **ZONE 2** (100–620px) en grille ou ligne
- Dessiner les portraits en cercle avec bordure HC bleue
- Afficher le prénom sous chaque avatar
- Garder le hook + CTA dans les zones 3-4 comme aujourd'hui

## Phase 4 — Intégration dans la génération IA

Modifier `social-visual-generate` pour :
- Quand le topic_type est `prospection`, `calendar` (brand), ou quand le prompt mentionne l'équipe → inclure les URLs des avatars team dans le prompt de génération comme contexte visuel
- Les avatars seraient uploadés dans le bucket `brand-assets` pour être accessibles par l'edge function

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/assets/team/*.png` | Nouveau — avatars individuels découpés |
| `src/data/teamMembers.ts` | Nouveau — registre collaborateurs |
| `src/components/commercial/social/templates/templateAssets.ts` | Ajouter exports avatars |
| `src/components/commercial/social/templates/drawBrandCard.ts` | Ajouter rendu avatars équipe en ZONE 2 |
| `src/components/commercial/social/SocialVisualCanvas.tsx` | Étendre payload avec `showTeam?: boolean` |
| `supabase/functions/social-visual-generate/index.ts` | Référencer les avatars pour les posts équipe |

## Prérequis avant implémentation

Je dois d'abord découper les visages. Pour ça, j'ai besoin de savoir :
- Peux-tu associer un prénom à chaque visage ? (ex: "la brune à gauche = Amandine")
- Sinon, je les numérote et tu les renommes après

