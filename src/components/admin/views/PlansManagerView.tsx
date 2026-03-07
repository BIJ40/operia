/**
 * PlansManagerView - Interface de gestion des plans tarifaires
 * Arbre modules/options × plans (Basique/Pro) avec toggles individuels
 * Cocher un module parent propage aux options enfants
 * Chaque option peut être overridée individuellement
 */

import { useState, useCallback } from 'react';
import { usePlanTiers, useUpdatePlanTierModule } from '@/hooks/access-rights/usePlanTiers';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, Check, X, Info, ChevronDown, ChevronRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPlanColorClass } from '@/config/planTiers';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DEPLOYED_MODULES, ModuleCategory, type ModuleDefinition } from '@/types/modules';

// Legacy keys exclus de la vue plans
const LEGACY_MODULE_KEYS = ['help_academy', 'pilotage_agence', 'support', 'apogee_tickets', 'unified_search'];

// Catégorie config pour le regroupement
const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  stats: 'Statistiques',
  salaries: 'Salariés',
  outils: 'Outils',
  documents: 'Documents',
  guides: 'Guides',
  ticketing: 'Ticketing',
  aide: 'Aide & Support',
  reseau: 'Réseau',
  admin: 'Administration',
};

const CATEGORY_ORDER: ModuleCategory[] = [
  'stats', 'salaries', 'outils', 'documents', 'guides', 'ticketing', 'aide',
];

export function PlansManagerView() {
  const { data: planTiers, isLoading } = usePlanTiers();
  const updateModule = useUpdatePlanTierModule();
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Filter out FREE tier - only show STARTER and PRO
  const editablePlans = planTiers?.filter(p => p.key !== 'FREE') || [];

  // Get plan-visible modules grouped by category
  const planModules = DEPLOYED_MODULES.filter(
    m => !m.adminOnly && !LEGACY_MODULE_KEYS.includes(m.key)
  );

  const modulesByCategory = CATEGORY_ORDER
    .map(cat => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      modules: planModules.filter(m => m.category === cat),
    }))
    .filter(g => g.modules.length > 0);

  const getModuleData = (tierKey: string, moduleKey: string) => {
    const tier = planTiers?.find(p => p.key === tierKey);
    if (!tier) return null;
    return tier.plan_tier_modules?.find(m => m.module_key === moduleKey) || null;
  };

  const isModuleEnabled = (tierKey: string, moduleKey: string): boolean => {
    return getModuleData(tierKey, moduleKey)?.enabled ?? false;
  };

  const isOptionEnabled = (tierKey: string, moduleKey: string, optionKey: string): boolean => {
    const moduleData = getModuleData(tierKey, moduleKey);
    if (!moduleData?.enabled) return false;
    // Si options_override a une valeur pour cette option, l'utiliser
    const override = moduleData.options_override as Record<string, boolean> | null;
    if (override && optionKey in override) {
      return override[optionKey];
    }
    // Sinon, hériter du module parent (activé = toutes options activées par défaut)
    return true;
  };

  const getOptionState = (tierKey: string, moduleKey: string, optionKey: string): 'on' | 'off' | 'inherited' => {
    const moduleData = getModuleData(tierKey, moduleKey);
    if (!moduleData?.enabled) return 'off';
    const override = moduleData.options_override as Record<string, boolean> | null;
    if (override && optionKey in override) {
      return override[optionKey] ? 'on' : 'off';
    }
    return 'inherited';
  };

  const handleModuleToggle = useCallback((tierKey: string, moduleKey: string, enabled: boolean) => {
    // Quand on toggle le module parent, reset les options overrides
    updateModule.mutate({ tierKey, moduleKey, enabled, optionsOverride: undefined });
  }, [updateModule]);

  const handleOptionToggle = useCallback((tierKey: string, moduleDef: ModuleDefinition, optionKey: string) => {
    const moduleData = getModuleData(tierKey, moduleDef.key);
    if (!moduleData?.enabled) return;

    const currentOverride = (moduleData.options_override as Record<string, boolean> | null) || {};
    const currentState = getOptionState(tierKey, moduleDef.key, optionKey);
    
    let newOverride: Record<string, boolean>;
    if (currentState === 'inherited' || currentState === 'on') {
      // Désactiver cette option
      newOverride = { ...currentOverride, [optionKey]: false };
    } else {
      // Réactiver: supprimer l'override pour revenir à inherited
      newOverride = { ...currentOverride };
      delete newOverride[optionKey];
    }

    // Si l'override est vide, le mettre à null
    const finalOverride = Object.keys(newOverride).length > 0 ? newOverride : undefined;

    updateModule.mutate({ 
      tierKey, 
      moduleKey: moduleDef.key, 
      enabled: true, 
      optionsOverride: finalOverride 
    });
  }, [updateModule, planTiers]);

  const toggleModuleExpand = (moduleKey: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleKey)) next.delete(moduleKey);
      else next.add(moduleKey);
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          <CardTitle>Configuration des Plans</CardTitle>
        </div>
        <CardDescription>
          Définissez quels modules et options sont inclus dans chaque plan. 
          Cochez le module parent pour propager à toutes les options, ou cliquez sur une option pour l'overrider individuellement.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Matrix Header */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_repeat(2,120px)] bg-muted/50">
            <div className="px-4 py-3 font-medium text-sm text-muted-foreground border-b border-border">
              Module / Option
            </div>
            {editablePlans.map((tier) => (
              <div 
                key={tier.key} 
                className="px-4 py-3 text-center border-b border-l border-border"
              >
                <Badge className={cn("font-semibold", getPlanColorClass(tier.key))}>
                  {tier.label}
                </Badge>
              </div>
            ))}
          </div>

          {/* Matrix Body - Grouped by category */}
          <div className="divide-y divide-border">
            {modulesByCategory.map(group => (
              <div key={group.category}>
                {/* Category Header */}
                <div className="grid grid-cols-[1fr_repeat(2,120px)] bg-muted/30">
                  <div className="px-4 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </div>
                  <div className="border-l border-border" />
                  <div className="border-l border-border" />
                </div>

                {/* Modules in this category */}
                {group.modules.map(moduleDef => {
                  const hasOptions = moduleDef.options.length > 0;
                  const isExpanded = expandedModules.has(moduleDef.key);

                  return (
                    <div key={moduleDef.key}>
                      {/* Module Row */}
                      <div className="grid grid-cols-[1fr_repeat(2,120px)] hover:bg-muted/20 transition-colors">
                        <div 
                          className={cn(
                            "px-4 py-3 flex items-center gap-2",
                            hasOptions && "cursor-pointer"
                          )}
                          onClick={() => hasOptions && toggleModuleExpand(moduleDef.key)}
                        >
                          {hasOptions ? (
                            isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> 
                                       : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <span className="w-4" />
                          )}
                          <span className="text-sm font-semibold">{moduleDef.label}</span>
                          {hasOptions && (
                            <span className="text-xs text-muted-foreground">
                              ({moduleDef.options.length} option{moduleDef.options.length > 1 ? 's' : ''})
                            </span>
                          )}
                        </div>
                        
                        {editablePlans.map((tier) => {
                          const enabled = isModuleEnabled(tier.key, moduleDef.key);
                          return (
                            <div 
                              key={`${tier.key}-${moduleDef.key}`}
                              className="px-4 py-3 flex items-center justify-center border-l border-border"
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={enabled}
                                      onCheckedChange={(checked) => handleModuleToggle(tier.key, moduleDef.key, checked)}
                                      disabled={updateModule.isPending}
                                    />
                                    {enabled ? (
                                      <Check className="h-4 w-4 text-primary" />
                                    ) : (
                                      <X className="h-4 w-4 text-muted-foreground/50" />
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {enabled 
                                    ? `${moduleDef.label} inclus dans ${tier.label}. ${hasOptions ? 'Déplier pour voir les options.' : ''}`
                                    : `${moduleDef.label} non inclus dans ${tier.label}`
                                  }
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          );
                        })}
                      </div>

                      {/* Options rows (escalier) - gestion fine par option */}
                      {hasOptions && isExpanded && (
                        <div className="bg-muted/5">
                          {moduleDef.options.map(option => (
                            <div 
                              key={`${moduleDef.key}-${option.key}`}
                              className="grid grid-cols-[1fr_repeat(2,120px)] hover:bg-muted/10 transition-colors border-t border-border/50"
                            >
                              <div className="px-4 py-2 flex items-center gap-2 pl-12">
                                <span className="text-muted-foreground text-xs">└</span>
                                <span className="text-sm">{option.label}</span>
                                <span className="text-xs text-muted-foreground">{option.description}</span>
                              </div>
                              
                              {editablePlans.map((tier) => {
                                const moduleEnabled = isModuleEnabled(tier.key, moduleDef.key);
                                const optEnabled = isOptionEnabled(tier.key, moduleDef.key, option.key);
                                const optState = getOptionState(tier.key, moduleDef.key, option.key);

                                return (
                                  <div 
                                    key={`${tier.key}-${moduleDef.key}-${option.key}`}
                                    className="px-4 py-2 flex items-center justify-center border-l border-border/50"
                                  >
                                    {moduleEnabled ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => handleOptionToggle(tier.key, moduleDef, option.key)}
                                            disabled={updateModule.isPending}
                                            className={cn(
                                              "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
                                              optEnabled 
                                                ? optState === 'inherited'
                                                  ? "text-primary/70 hover:bg-primary/10"
                                                  : "text-primary font-medium hover:bg-primary/10"
                                                : "text-muted-foreground/50 hover:bg-muted/30"
                                            )}
                                          >
                                            {optEnabled ? (
                                              <Check className={cn(
                                                "h-3.5 w-3.5",
                                                optState === 'inherited' ? "text-primary/60" : "text-primary"
                                              )} />
                                            ) : (
                                              <X className="h-3.5 w-3.5 text-destructive/50" />
                                            )}
                                            {optState === 'inherited' && <span className="text-[10px] text-muted-foreground">hérité</span>}
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {optEnabled 
                                            ? optState === 'inherited' 
                                              ? `${option.label} hérité du module parent. Cliquez pour exclure.`
                                              : `${option.label} activé explicitement. Cliquez pour exclure.`
                                            : `${option.label} exclu. Cliquez pour réactiver (héritage parent).`
                                          }
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <X className="h-3.5 w-3.5 text-muted-foreground/30" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <span>Inclus dans le plan</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary/60" />
            <span className="text-[10px] bg-muted/50 px-1 rounded">hérité</span>
            <span>Hérité du module parent</span>
          </div>
          <div className="flex items-center gap-2">
            <X className="h-4 w-4 text-destructive/50" />
            <span>Exclu du plan</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Info className="h-4 w-4" />
            <span>Les modifications sont sauvegardées automatiquement</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
