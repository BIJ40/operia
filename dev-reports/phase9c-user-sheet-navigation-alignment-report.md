# Phase 9c — User Sheet Navigation Alignment Report

## 1. Cause racine de l'échec des 3 tentatives précédentes

Les 3 tentatives précédentes patchaient le même concept cassé : itérer `MODULE_DEFINITIONS` (une liste plate de clés de permissions) et la présenter comme "ce que l'utilisateur peut accéder."

`MODULE_DEFINITIONS` est un **registre de permissions**, pas une **carte de navigation**. Il ne connaît pas :
- Les regroupements par domaine (Pilotage, Commercial, Organisation…)
- Les labels des sous-onglets tels qu'ils apparaissent dans l'UI ("Suivi client" et non "option dashboard de prospection")
- Quelles options de module correspondent à quels sous-onglets visibles
- Quelles entrées partagent un module parent avec différentes options

**L'erreur fondamentale** : confondre "module de permission" avec "entrée de navigation."

## 2. Différence entre vue runtime et vue navigation

| Vue runtime (avant) | Vue navigation (après) |
|---|---|
| Liste plate de `MODULE_DEFINITIONS` | Hiérarchie Domaine > Entrées |
| Labels techniques (ex: "Mon agence") | Labels UI runtime (ex: "Performance") |
| Options comme badges (ex: `[Indicateurs] [Actions]`) | Entrées distinctes (ex: "Performance", "Actions à mener") |
| Pas de contexte de domaine | Domaines visuels (Pilotage, Commercial…) |
| Seulement les modules actifs | Tous les accès, actifs ET inactifs |

## 3. Source de vérité retenue

- **Données** : RPC `get_user_effective_modules` (inchangée)
- **Structure de navigation** : Nouveau fichier `src/lib/navigationStructure.ts` — extrait des configurations réelles des onglets de l'application
- **Évaluation des guards** : Fonction `evaluateGuard()` qui vérifie `hasModule`, `hasModuleOption`, et les rôles

## 4. Composants modifiés

| Fichier | Action | Description |
|---|---|---|
| `src/lib/navigationStructure.ts` | **CRÉÉ** | Structure canonique de navigation avec 7 domaines, guards, et évaluateur |
| `src/components/admin/users/user-profile-sheet/NavigationAccessView.tsx` | **CRÉÉ** | Vue A — affiche la navigation hiérarchique avec indicateurs ✅/🔒 |
| `src/components/admin/users/UserProfileSheet.tsx` | **MODIFIÉ** | Remplacement de la liste plate par Vue A + Vue B repliée |

## 5. Avant / Après

### Avant
```
Accès réels (15 modules)
  Mon agence ✅ [Indicateurs] [Actions] [Diffusion]
  Stats ✅ [Stats Hub] [Exports]
  Commercial ✅ [Suivi client] [Comparateur] [Veille]
  ...
```

### Après
```
Navigation utilisateur

  Pilotage                    3/5
    ✅ Statistiques
    ✅ Performance
    ✅ Actions à mener
    🔒 Devis acceptés
    🔒 Incohérences

  Commercial                  4/5
    ✅ Suivi client
    ✅ Comparateur
    ✅ Veille
    ✅ Prospects
    🔒 Réalisations

  [▸ Afficher les droits effectifs techniques]
```

## 6. Ce qui N'A PAS changé
- RPC — aucune modification
- Base de données — aucune modification
- Moteur de permissions — aucune modification
- `COMPAT_MAP` — non réintroduit
- `userModulesUtils.ts` — mapping dual-key Phase 9 conservé
- `InlineModuleBadges.tsx` — badges dans la liste utilisateurs inchangés
- `UserAccessSimple.tsx` — vue compacte inchangée

## 7. Statut final prod

**GO** — Refonte de conception (pas un patch). La fiche utilisateur reflète désormais la navigation réelle de l'application.
