

# Plan — Presets de modules par poste N1 + Interface N2 de gestion des droits

## Contexte

Aujourd'hui, tous les N1 (assistante, technicien, commercial) recoivent les memes modules (`franchisee_user` defaults). Le N2 (dirigeant) n'a aucune interface pour ajuster les droits de ses employes. Il faut :
1. Des **presets par poste** appliques automatiquement a la creation du compte N1
2. Une **interface simple** pour que le N2 puisse ajuster les droits de ses N1

## Architecture

Pas de nouveau niveau hierarchique. On utilise le systeme d'overrides existant (`user_modules`) avec un mapping `role_agence → modules par defaut`.

```text
┌─────────────────────────────────────────┐
│  role_agence_module_presets.ts (config)  │
│  commercial → [commercial.*, guides]    │
│  assistante → [organisation.*, guides]  │
│  technicien → [guides, aide]            │
└──────────────┬──────────────────────────┘
               │
   ┌───────────▼───────────┐
   │  create-user (edge)   │  Applique le preset au lieu de franchisee_user générique
   └───────────────────────┘
               │
   ┌───────────▼───────────────────────┐
   │  AgencyTeamRightsPanel.tsx (UI)   │  Le N2 voit ses N1 et toggle leurs modules
   └───────────────────────────────────┘
```

## Modifications

### 1. Config — `src/config/roleAgenceModulePresets.ts` (nouveau)

Mapping `role_agence → liste de module_keys` a activer par defaut pour un N1 :

```ts
export const ROLE_AGENCE_MODULE_PRESETS: Record<string, ModuleKey[]> = {
  commercial: [
    'commercial.suivi_client', 'commercial.comparateur', 
    'commercial.prospects', 'commercial.realisations',
    'support.guides', 'support.aide_en_ligne',
  ],
  assistante: [
    'organisation.salaries', 'organisation.plannings', 
    'organisation.documents_legaux',
    'mediatheque.consulter', 'mediatheque.documents',
    'support.guides', 'support.aide_en_ligne',
  ],
  technicien: [
    'support.guides', 'support.aide_en_ligne',
    // Accès minimal — le N2 peut ajouter des modules si besoin
  ],
};
```

Le N2 pourra ensuite ajuster individuellement via l'interface.

### 2. Edge function — `supabase/functions/_shared/defaultModules.ts`

Modifier `getDefaultModulesForCreation` pour utiliser les presets par poste quand `globalRole === 'franchisee_user'` :

```ts
export function getDefaultModulesForCreation(globalRole: string, roleAgence: string | null): EnabledModules {
  // N1 avec poste connu → preset par poste
  if (globalRole === 'franchisee_user' && roleAgence) {
    const preset = ROLE_AGENCE_MODULE_PRESETS[roleAgence.toLowerCase()];
    if (preset) return presetToEnabledModules(preset);
  }
  // Dirigeant vs employé (logique existante)
  ...
}
```

Dupliquer le mapping des presets dans le fichier edge function (les edge functions n'importent pas depuis `src/`).

### 3. UI — `src/components/agency/AgencyTeamRightsPanel.tsx` (nouveau)

Interface accessible au N2 depuis l'onglet Organisation > Salaries (ou un sous-onglet "Droits equipe") :

- **Liste des N1 de son agence** (query `profiles` filtre par `agency_id` + `global_role = franchisee_user`)
- Pour chaque N1 : son poste, et une **grille de toggles** par module
- Les modules affiches sont limites a ceux que le N2 possede lui-meme (on ne peut pas donner ce qu'on n'a pas)
- Toggle = upsert/delete dans `user_modules` (reutilise `useToggleModule`)
- Un bouton "Reinitialiser au preset" pour remettre les modules par defaut du poste

**UX simplifiee** :
- Pas d'arbre de droits complexe comme la page admin
- Une simple table : lignes = modules, colonnes = N1, cases a cocher
- Ou bien : clic sur un N1 → liste de modules avec switches on/off

### 4. Guard d'acces

Le panel est visible si :
- `global_role >= franchisee_admin` (N2+)
- L'utilisateur a une `agency_id`
- Scope : `organisation.salaries` (module RH existant)

### 5. Securite RLS

Les N2 ne peuvent modifier que les `user_modules` des profils de leur propre agence. Il faut une RLS policy :

```sql
CREATE POLICY "N2 can manage N1 modules in own agency"
ON user_modules FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p1, profiles p2
    WHERE p1.id = auth.uid()
      AND p2.id = user_modules.user_id
      AND p1.agency_id = p2.agency_id
      AND has_min_global_role(auth.uid(), 2)
      AND p2.global_role = 'franchisee_user'
  )
);
```

## Fichiers

| Fichier | Action |
|---------|--------|
| `src/config/roleAgenceModulePresets.ts` | Nouveau — presets par poste |
| `supabase/functions/_shared/defaultModules.ts` | Modifier — utiliser presets N1 |
| `src/components/agency/AgencyTeamRightsPanel.tsx` | Nouveau — interface N2 |
| `src/components/agency/TeamMemberModules.tsx` | Nouveau — toggles modules pour 1 N1 |
| Migration SQL | RLS policy sur `user_modules` pour N2 |
| Routage/navigation | Ajouter acces au panel depuis Organisation |

## Ce qui ne change pas

- La hierarchie N0-N6 reste intacte
- Le moteur `get_user_effective_modules` (RPC) reste inchange — il lit deja `user_modules`
- La page admin Droits (N5+) reste inchangee
- Les overrides existants restent fonctionnels

