/**
 * PlansManagerView - Interface de gestion des plans tarifaires
 * Affiche un arbre modules/options × plans avec des toggles
 * Cocher un module parent propage aux options enfants
 */

import { useState } from 'react';
import { usePlanTiers, useUpdatePlanTierModule } from '@/hooks/access-rights/usePlanTiers';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, Check, X, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPlanColorClass } from '@/config/planTiers';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PLAN_VISIBLE_MODULES, MODULE_DEFINITIONS, DEPLOYED_MODULES, ModuleCategory } from '@/types/modules';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Legacy keys exclus de la vue plans
const LEGACY_MODULE_KEYS = ['help_academy', 'pilotage_agence', 'support', 'apogee_tickets', 'unified_search'];

// Catégorie config pour le regroupement
const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  agence: 'Agence & Stats',
  rh: 'Ressources Humaines',
  parc: 'Parc & Équipements',
  outils: 'Outils',
  documents: 'Documents',
  guides: 'Guides',
  ticketing: 'Ticketing',
  support: 'Aide & Support',
  commercial: 'Commercial',
  reseau: 'Réseau',
  admin: 'Administration',
};

const CATEGORY_ORDER: ModuleCategory[] = [
  'agence', 'rh', 'parc', 'outils', 'documents', 'guides', 'ticketing', 'support', 'commercial',
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

  const isModuleEnabled = (tierKey: string, moduleKey: string): boolean => {
    const tier = planTiers?.find(p => p.key === tierKey);
    if (!tier) return false;
    const module = tier.plan_tier_modules?.find(m => m.module_key === moduleKey);
    return module?.enabled ?? false;
  };

  const handleToggle = (tierKey: string, moduleKey: string, enabled: boolean) => {
    updateModule.mutate({ tierKey, moduleKey, enabled });
  };

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
          L'arbre reflète exactement les onglets de la plateforme.
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
                                      onCheckedChange={(checked) => handleToggle(tier.key, moduleDef.key, checked)}
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
                                    ? `${moduleDef.label} est inclus dans ${tier.label}`
                                    : `${moduleDef.label} n'est pas inclus dans ${tier.label}`
                                  }
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          );
                        })}
                      </div>

                      {/* Options rows (escalier) */}
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
                                // Options héritent du module parent pour l'instant
                                // (la gestion fine des options par plan viendra à l'étape 2)
                                return (
                                  <div 
                                    key={`${tier.key}-${moduleDef.key}-${option.key}`}
                                    className="px-4 py-2 flex items-center justify-center border-l border-border/50"
                                  >
                                    {moduleEnabled ? (
                                      <Check className="h-3.5 w-3.5 text-primary/60" />
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
        <div className="mt-4 flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <span>Inclus dans le plan</span>
          </div>
          <div className="flex items-center gap-2">
            <X className="h-4 w-4 text-muted-foreground/50" />
            <span>Non inclus</span>
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
