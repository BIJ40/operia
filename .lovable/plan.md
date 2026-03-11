

## Fix : Comptage descendants incorrect + Indicateur d'overrides redondants

### Problème 1 — "Propager à 5 enfants" mais 2 affichés

**Cause** : `getDescendantKeys` compte TOUS les enfants dans l'arbre mémoire (5 pour Guides), y compris les 3 non-déployés (`guides.apporteurs`, `guides.helpconfort`, `guides.faq`). Ceux-ci sont cachés dans la section "En développement", d'où la confusion.

**Correction** : Filtrer les descendants non-déployés du compteur de propagation. La propagation DB continuera de toucher tous les descendants (correct), mais le dialogue affichera le compte réel visible, avec une mention des descendants cachés le cas échéant.

```text
Avant : "Propager à 5 enfants"
Après : "Propager à 5 enfants (dont 3 non déployés)"
```

Modifier `getDialogDescription` et passer l'info de déploiement dans le dialog state.

---

### Problème 2 — Overrides redondants non signalés

**Cause** : Un utilisateur avec un rôle N2+ et un plan PRO a déjà accès au module via le système automatique. L'override dans `user_modules` est inutile — il n'apporte rien mais crée de la confusion.

**Correction** :
1. Enrichir `useModuleOverrides` pour récupérer `global_role` et `agency_id` + le `tier_key` de l'agence
2. Dans `OverridesPopover`, comparer le `min_role` du module et le `required_plan` avec le rôle/plan de l'utilisateur
3. Afficher un badge "Redondant" en gris + tooltip explicatif pour les overrides inutiles
4. Ajouter un bouton "Nettoyer les redondants" qui supprime en batch ces overrides

### Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/components/admin/views/ModulesMasterView.tsx` | Dialog description enrichie, OverridesPopover avec indicateur redondant |
| `src/hooks/access-rights/useModuleOverrides.ts` | Ajouter `globalRole`, `agencyTierKey` au type `UserOverride` |

