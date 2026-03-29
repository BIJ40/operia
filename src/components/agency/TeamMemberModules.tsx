/**
 * TeamMemberModules — Toggles de modules pour un N1 individuel
 * 
 * Affiche la liste des modules assignables groupés par domaine.
 * Les sous-modules (ex: pilotage.statistiques.general) sont
 * regroupés sous leur parent et indentés visuellement.
 * Chaque domaine a un switch maître (tout cocher / décocher).
 * Le N2 ne peut attribuer que les modules qu'il possède lui-même.
 */

import { useMemo, useCallback, useState } from 'react';
import { useUserModules, useToggleModule } from '@/hooks/useUserModules';
import { getDelegatableModules, getPresetForRole } from '@/config/roleAgenceModulePresets';
import { useAgencyHasApporteurs } from '@/hooks/useAgencyHasApporteurs';
import { useModuleLabels } from '@/hooks/useModuleLabels';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { RotateCcw, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
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

type DelegatableModule = { key: ModuleKey; fallbackLabel: string; category: string };

interface HierarchicalModule {
  module: DelegatableModule;
  children: DelegatableModule[];
}

export function TeamMemberModules({ userId, roleAgence, n2HasModule, isDeployedModule }: Props) {
  const { data: userModules, isLoading } = useUserModules(userId);
  const toggleModule = useToggleModule();
  const queryClient = useQueryClient();
  const { user } = useAuthCore();
  const { getShortLabel } = useModuleLabels();
  const agencyHasApporteurs = useAgencyHasApporteurs();
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());

  const delegatableModules = useMemo(() => getDelegatableModules(), []);

  const assignableModules = useMemo(() => {
    return delegatableModules.filter(m => {
      if (m.key === 'relations.apporteurs' && !agencyHasApporteurs) return false;
      return isDeployedModule(m.key) && n2HasModule(m.key);
    });
  }, [delegatableModules, n2HasModule, isDeployedModule, agencyHasApporteurs]);

  /** Build hierarchical structure: parent modules with their children */
  const grouped = useMemo(() => {
    const categoryMap = new Map<string, HierarchicalModule[]>();

    // Separate parents and children
    const parentKeys = new Set<string>();
    for (const mod of assignableModules) {
      // A module is a parent if other modules start with its key + '.'
      const hasChildren = assignableModules.some(
        other => other.key !== mod.key && other.key.startsWith(mod.key + '.')
      );
      if (hasChildren) parentKeys.add(mod.key);
    }

    // Build hierarchy
    for (const mod of assignableModules) {
      // Skip if this is a child (will be nested under parent)
      const parentKey = [...parentKeys].find(pk => mod.key !== pk && mod.key.startsWith(pk + '.'));
      if (parentKey) continue;

      const children = assignableModules.filter(
        other => other.key !== mod.key && other.key.startsWith(mod.key + '.')
      );

      const list = categoryMap.get(mod.category) ?? [];
      list.push({ module: mod, children });
      categoryMap.set(mod.category, list);
    }

    return categoryMap;
  }, [assignableModules]);

  /** Flat list of all leaf module keys for counting */
  const allLeafKeys = useMemo(() => {
    const keys: ModuleKey[] = [];
    for (const [, items] of grouped) {
      for (const item of items) {
        if (item.children.length > 0) {
          keys.push(...item.children.map(c => c.key));
        } else {
          keys.push(item.module.key);
        }
      }
    }
    return keys;
  }, [grouped]);

  const isModuleEnabled = useCallback((key: ModuleKey): boolean => {
    if (!userModules) return false;
    const state = userModules[key];
    if (typeof state === 'boolean') return state;
    return state?.enabled ?? false;
  }, [userModules]);

  /** Find the parent HierarchicalModule for a given child key */
  const findParentOf = useCallback((childKey: ModuleKey): HierarchicalModule | null => {
    for (const [, items] of grouped) {
      for (const item of items) {
        if (item.children.some(c => c.key === childKey)) return item;
      }
    }
    return null;
  }, [grouped]);

  const handleToggle = (key: ModuleKey, enabled: boolean) => {
    toggleModule.mutate({ userId, moduleKey: key, enabled });

    // Sync parent: if disabling last child → disable parent; if enabling a child → enable parent
    const parent = findParentOf(key);
    if (parent) {
      if (enabled) {
        // Ensure parent is on
        if (!isModuleEnabled(parent.module.key)) {
          toggleModule.mutate({ userId, moduleKey: parent.module.key, enabled: true });
        }
      } else {
        // If all siblings (except this one being disabled) are already off → disable parent
        const otherChildrenAllOff = parent.children.every(c =>
          c.key === key ? true : !isModuleEnabled(c.key)
        );
        if (otherChildrenAllOff && isModuleEnabled(parent.module.key)) {
          toggleModule.mutate({ userId, moduleKey: parent.module.key, enabled: false });
        }
      }
    }
  };

  /** Toggle all modules in a category at once (leaf modules only) */
  const handleToggleCategory = (items: HierarchicalModule[], enabled: boolean) => {
    for (const item of items) {
      if (item.children.length > 0) {
        // Toggle parent + all children
        if (isModuleEnabled(item.module.key) !== enabled) {
          toggleModule.mutate({ userId, moduleKey: item.module.key, enabled });
        }
        for (const child of item.children) {
          if (isModuleEnabled(child.key) !== enabled) {
            toggleModule.mutate({ userId, moduleKey: child.key, enabled });
          }
        }
      } else {
        if (isModuleEnabled(item.module.key) !== enabled) {
          toggleModule.mutate({ userId, moduleKey: item.module.key, enabled });
        }
      }
    }
  };

  /** Toggle a parent and all its children */
  const handleToggleParent = (item: HierarchicalModule, enabled: boolean) => {
    if (isModuleEnabled(item.module.key) !== enabled) {
      toggleModule.mutate({ userId, moduleKey: item.module.key, enabled });
    }
    for (const child of item.children) {
      if (isModuleEnabled(child.key) !== enabled) {
        toggleModule.mutate({ userId, moduleKey: child.key, enabled });
      }
    }
  };

  /** Category state: all checked, none checked, or partial */
  const getCategoryState = (items: HierarchicalModule[]) => {
    let total = 0;
    let enabled = 0;
    for (const item of items) {
      if (item.children.length > 0) {
        for (const child of item.children) {
          total++;
          if (isModuleEnabled(child.key)) enabled++;
        }
      } else {
        total++;
        if (isModuleEnabled(item.module.key)) enabled++;
      }
    }
    if (enabled === 0) return 'none';
    if (enabled === total) return 'all';
    return 'partial';
  };

  const getCategoryCount = (items: HierarchicalModule[]) => {
    let total = 0;
    let enabled = 0;
    for (const item of items) {
      if (item.children.length > 0) {
        for (const child of item.children) {
          total++;
          if (isModuleEnabled(child.key)) enabled++;
        }
      } else {
        total++;
        if (isModuleEnabled(item.module.key)) enabled++;
      }
    }
    return { enabled, total };
  };

  const getParentState = (item: HierarchicalModule) => {
    const enabledCount = item.children.filter(c => isModuleEnabled(c.key)).length;
    if (enabledCount === 0) return 'none';
    if (enabledCount === item.children.length) return 'all';
    return 'partial';
  };

  const toggleCollapse = (parentKey: string) => {
    setCollapsedParents(prev => {
      const next = new Set(prev);
      if (next.has(parentKey)) next.delete(parentKey);
      else next.add(parentKey);
      return next;
    });
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
      {[...grouped.entries()].map(([category, items]) => {
        const state = getCategoryState(items);
        const { enabled, total } = getCategoryCount(items);
        const colorClass = CATEGORY_COLORS[category] ?? 'text-primary';

        return (
          <div key={category}>
            {/* Category header with master toggle */}
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  checked={state === 'all'}
                  data-state={state === 'partial' ? 'indeterminate' : state === 'all' ? 'checked' : 'unchecked'}
                  onCheckedChange={(checked) => handleToggleCategory(items, !!checked)}
                  disabled={toggleModule.isPending}
                  className="h-4.5 w-4.5"
                />
                <h4 className={`text-sm font-bold tracking-wide ${colorClass}`}>
                  {category}
                </h4>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {enabled}/{total}
              </span>
            </div>

            {/* Module toggles */}
            <div className="space-y-0.5 pl-7">
              {items.map(item => {
                if (item.children.length > 0) {
                  // Parent with sub-modules
                  const parentState = getParentState(item);
                  const isCollapsed = collapsedParents.has(item.module.key);
                  const childEnabled = item.children.filter(c => isModuleEnabled(c.key)).length;

                  return (
                    <div key={item.module.key}>
                      {/* Parent row */}
                      <div className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-muted/50 transition-colors duration-150">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleCollapse(item.module.key)}
                            className="p-0.5 rounded hover:bg-muted transition-colors"
                          >
                            {isCollapsed
                              ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            }
                          </button>
                          <span className="text-sm font-medium">
                            {getShortLabel(item.module.key, item.module.fallbackLabel)}
                          </span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {childEnabled}/{item.children.length}
                          </span>
                        </div>
                        <Checkbox
                          checked={parentState === 'all'}
                          data-state={parentState === 'partial' ? 'indeterminate' : parentState === 'all' ? 'checked' : 'unchecked'}
                          onCheckedChange={(checked) => handleToggleParent(item, !!checked)}
                          disabled={toggleModule.isPending}
                          className="h-4 w-4"
                        />
                      </div>

                      {/* Children */}
                      {!isCollapsed && (
                        <div className="space-y-0.5 pl-6 border-l border-border/40 ml-3 mt-0.5">
                          {item.children.map(child => (
                            <div
                              key={child.key}
                              className="flex items-center justify-between py-1 px-2 rounded-xl hover:bg-muted/50 transition-colors duration-150"
                            >
                              <span className="text-sm text-muted-foreground">
                                {getShortLabel(child.key, child.fallbackLabel)}
                              </span>
                              <Switch
                                checked={isModuleEnabled(child.key)}
                                onCheckedChange={(checked) => handleToggle(child.key, checked)}
                                disabled={toggleModule.isPending}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                // Simple module (no children)
                return (
                  <div
                    key={item.module.key}
                    className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-muted/50 transition-colors duration-150"
                  >
                    <span className="text-sm">{getShortLabel(item.module.key, item.module.fallbackLabel)}</span>
                    <Switch
                      checked={isModuleEnabled(item.module.key)}
                      onCheckedChange={(checked) => handleToggle(item.module.key, checked)}
                      disabled={toggleModule.isPending}
                    />
                  </div>
                );
              })}
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
