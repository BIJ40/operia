

# Plan : Mascotte Helpi — Assistant stats intelligent (Plan PRO)

## Concept

Un personnage "Helpi" (mascotte illustrée HC) affiché en bas à droite de la page d'accueil Indicateurs, uniquement pour les agences au plan PRO (ou override). Au clic, une bulle de BD s'ouvre pour saisir une question. La réponse apparait dans une seconde bulle en dessous, style bande dessinée.

## Controle d'accès

- Utiliser `usePlanAccess('PRO')` pour conditionner l'affichage
- Les N5+ (bypass) voient aussi la mascotte
- Si plan insuffisant : mascotte invisible (pas grisée, absente)

## Fichiers a creer

| Fichier | Description |
|---|---|
| `src/assets/helpi/helpi-mascot.svg` | Mascotte SVG inline — personnage sympathique style cartoon aux couleurs HC (bleu/orange), casquette ou casque de chantier, souriant |
| `src/components/helpi/HelpiMascot.tsx` | Composant principal : mascotte flottante + bulles BD |
| `src/components/helpi/HelpiChatBubble.tsx` | Bulle de saisie (question) + bulle de réponse, style BD avec queues de bulle |

## Architecture du composant HelpiMascot

```text
┌─────────────────────────────┐
│  Bulle réponse (BD style)   │  ← apparait après réponse
│  "Vous avez 116 dossiers…"  │
└──────────┬──────────────────┘
           │ (queue de bulle)
┌──────────┴──────────────────┐
│  Bulle question (input)     │  ← apparait au clic mascotte
│  "Posez votre question..."  │
└──────────┬──────────────────┘
           │ (queue de bulle)
       ┌───┴───┐
       │ HELPI │  ← mascotte cliquable, fixed bottom-right
       │  😊   │
       └───────┘
```

- **Position** : `fixed bottom-6 right-6 z-50`
- **Clic mascotte** → toggle bulle de saisie (input + send)
- **Envoi question** → appel edge function `unified-search` avec la query
- **Réponse** → affichée dans bulle BD au-dessus, rendue en markdown
- **Historique** : afficher les 3-4 derniers échanges max (bulles empilées)
- **Fermeture** : clic hors des bulles ou bouton X

## Intégration

Dans `IndicateursAccueil.tsx`, ajouter en fin de page :

```tsx
import { HelpiMascot } from '@/components/helpi/HelpiMascot';
import { usePlanAccess } from '@/hooks/access-rights/usePlanAccess';

// Dans le composant :
const { hasRequiredPlan } = usePlanAccess('PRO');

// En fin de JSX :
{hasRequiredPlan && <HelpiMascot />}
```

## Style bulles BD

- Fond blanc, border-radius arrondi, ombre douce
- Queue de bulle triangulaire pointant vers le bas (question) ou vers la mascotte (réponse)
- Animation d'apparition (scale + fade)
- Bulle question : input + bouton send inline
- Bulle réponse : markdown rendu, texte qui s'affiche progressivement (typewriter optionnel)

## Appel backend

Réutiliser l'edge function `unified-search` existante :

```typescript
const { data } = await supabase.functions.invoke('unified-search', {
  body: { query: userQuestion }
});
```

La réponse contient déjà un champ `answer` en markdown.

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/assets/helpi/helpi-mascot.svg` | Nouveau — mascotte SVG |
| `src/components/helpi/HelpiMascot.tsx` | Nouveau — composant principal |
| `src/components/helpi/HelpiChatBubble.tsx` | Nouveau — bulles BD |
| `src/apogee-connect/pages/IndicateursAccueil.tsx` | Ajouter `<HelpiMascot />` conditionné au plan PRO |

