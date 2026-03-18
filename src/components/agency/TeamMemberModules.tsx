/**
 * TeamMemberModules — Toggles de modules pour un N1 individuel
 * 
 * Affiche la liste des modules assignables groupés par domaine.
 * Chaque domaine a un switch maître (tout cocher / décocher).
 * Le N2 ne peut attribuer que les modules qu'il possède lui-même.
 */

import { useMemo, useCallback } from 'react';
import { useUserModules, useToggleModule } from '@/hooks/useUserModules';
import { N2_ASSIGNABLE_MODULES, getPresetForRole } from '@/config/roleAgenceModulePresets';
import { useModuleLabels } from '@/hooks/useModuleLabels';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { RotateCcw, Loader2 } from 'lucide-react';
import { ModuleKey } from '@/types/modules';
import { toast } from 'sonner';
import { deleteAllUserModules, bulkInsertUserModules } from '@/repositories/userModulesRepository';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthCore } from '@/contexts/AuthCoreContext';

interface Props {
  userId: string;
  roleAgence: string | null;
  n2HasModule: (key: ModuleKey) => boolean;
  isDeployedModule: (key: ModuleKey) => boolean;
}

/** Couleur d'accent par domaine — aligné sur DomainAccentContext */
const CATEGORY_COLORS: Record<string, string> = {
  Pilotage: 'text-blue-600 dark:text-blue-400',
  Commercial: 'text-orange-600 dark:text-orange-400',
  Organisation: 'text-green-600 dark:text-green-400',
  Médiathèque: 'text-teal-600 dark:text-teal-400',
  Support: 'text-violet-600 dark:text-violet-400',
};

export function TeamMemberModules({ userId, roleAgence, n2HasModule, isDeployedModule }: Props) {
  const { data: userModules, isLoading } = useUserModules(userId);
  const toggleModule = useToggleModule();
  const queryClient = useQueryClient();
  const { user } = useAuthCore();
  const { getShortLabel } = useModuleLabels();

  const assignableModules = useMemo(() => {
    return N2_ASSIGNABLE_MODULES.filter(m => isDeployedModule(m.key) && n2HasModule(m.key));
  }, [n2HasModule, isDeployedModule]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof assignableModules>();
    for (const mod of assignableModules) {
      const list = map.get(mod.category) ?? [];
      list.push(mod);
      map.set(mod.category, list);
    }
    return map;
  }, [assignableModules]);

  const isModuleEnabled = useCallback((key: ModuleKey): boolean => {
    if (!userModules) return false;
    const state = userModules[key];
    if (typeof state === 'boolean') return state;
    return state?.enabled ?? false;
  }, [userModules]);

  const handleToggle = (key: ModuleKey, enabled: boolean) => {
    toggleModule.mutate({ userId, moduleKey: key, enabled });
  };

  /** Toggle all modules in a category at once */
  const handleToggleCategory = (modules: typeof assignableModules, enabled: boolean) => {
    for (const mod of modules) {
      const current = isModuleEnabled(mod.key);
      if (current !== enabled) {
        toggleModule.mutate({ userId, moduleKey: mod.key, enabled });
      }
    }
  };

  /** Category state: all checked, none checked, or partial */
  const getCategoryState = (modules: typeof assignableModules) => {
    const enabledCount = modules.filter(m => isModuleEnabled(m.key)).length;
    if (enabledCount === 0) return 'none';
    if (enabledCount === modules.length) return 'all';
    return 'partial';
  };

  const handleResetToPreset = async () => {
    if (!roleAgence) return;
    const preset = getPresetForRole(roleAgence);
    try {
      await deleteAllUserModules(userId);
      if (preset.length > 0) {
        await bulkInsertUserModules(
          preset.map(key => ({
            user_id: userId,
            module_key: key,
            options: null,
            enabled_at: new Date().toISOString(),
            enabled_by: user?.id || null,
          }))
        );
      }
      queryClient.invalidateQueries({ queryKey: ['user-modules', userId] });
      toast.success('Droits réinitialisés au profil par défaut');
    } catch {
      toast.error('Erreur lors de la réinitialisation');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Chargement des droits…</span>
      </div>
    );
  }

  if (assignableModules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Aucun module assignable disponible.
      </p>
    );
  }

  return (
    <div className="space-y-5" onClick={(e) => e.stopPropagation()}>
      {[...grouped.entries()].map(([category, modules]) => {
        const state = getCategoryState(modules);
        const colorClass = CATEGORY_COLORS[category] ?? 'text-primary';

        return (
          <div key={category}>
            {/* Category header with master toggle */}
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  checked={state === 'all'}
                  // @ts-ignore — indeterminate is valid on the DOM element
                  data-state={state === 'partial' ? 'indeterminate' : state === 'all' ? 'checked' : 'unchecked'}
                  onCheckedChange={(checked) => handleToggleCategory(modules, !!checked)}
                  disabled={toggleModule.isPending}
                  className="h-4.5 w-4.5"
                />
                <h4 className={`text-sm font-bold tracking-wide ${colorClass}`}>
                  {category}
                </h4>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {modules.filter(m => isModuleEnabled(m.key)).length}/{modules.length}
              </span>
            </div>

            {/* Individual module toggles */}
            <div className="space-y-1 pl-7">
              {modules.map(mod => (
                <div
                  key={mod.key}
                  className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-muted/50 transition-colors duration-150"
                >
                  <span className="text-sm">{getShortLabel(mod.key, mod.fallbackLabel)}</span>
                  <Switch
                    checked={isModuleEnabled(mod.key)}
                    onCheckedChange={(checked) => handleToggle(mod.key, checked)}
                    disabled={toggleModule.isPending}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {roleAgence && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={handleResetToPreset}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Réinitialiser au profil « {roleAgence} »
        </Button>
      )}
    </div>
  );
}
