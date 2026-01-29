/**
 * PlansManagerView - Interface de gestion des plans tarifaires
 * Affiche une matrice modules × plans avec des toggles
 */

import { usePlanTiers, useUpdatePlanTierModule } from '@/hooks/access-rights/usePlanTiers';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, Check, X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPlanColorClass } from '@/config/planTiers';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Définition des modules avec labels UI
// Note: 'ticketing' is excluded - it's an individual user permission, not a plan-level module
const MODULE_CATALOG = [
  { key: 'agence', label: 'Mon agence', group: null },
  { key: 'stats', label: 'Statistiques', group: null },
  { key: 'rh', label: 'Salariés (RH)', group: null },
  { key: 'parc', label: 'Parc', group: null },
  { key: 'divers_apporteurs', label: 'Apporteurs', group: 'Divers' },
  { key: 'divers_plannings', label: 'Plannings', group: 'Divers' },
  { key: 'divers_reunions', label: 'Réunions', group: 'Divers' },
  { key: 'divers_documents', label: 'Documents', group: 'Divers' },
  { key: 'guides', label: 'Guides', group: null },
  { key: 'aide', label: 'Aide', group: null },
] as const;

export function PlansManagerView() {
  const { data: planTiers, isLoading } = usePlanTiers();
  const updateModule = useUpdatePlanTierModule();

  // Filter out FREE tier - only show STARTER and PRO
  const editablePlans = planTiers?.filter(p => p.key !== 'FREE') || [];

  const isModuleEnabled = (tierKey: string, moduleKey: string): boolean => {
    const tier = planTiers?.find(p => p.key === tierKey);
    if (!tier) return false;
    const module = tier.plan_tier_modules?.find(m => m.module_key === moduleKey);
    return module?.enabled ?? false;
  };

  const handleToggle = (tierKey: string, moduleKey: string, enabled: boolean) => {
    updateModule.mutate({
      tierKey,
      moduleKey,
      enabled,
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

  // Group modules by their group property
  let lastGroup: string | null = null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          <CardTitle>Configuration des Plans</CardTitle>
        </div>
        <CardDescription>
          Définissez quels modules sont inclus dans chaque plan tarifaire
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Matrix Header */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_repeat(2,120px)] bg-muted/50">
            <div className="px-4 py-3 font-medium text-sm text-muted-foreground border-b border-border">
              Module
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

          {/* Matrix Body */}
          <div className="divide-y divide-border">
            {MODULE_CATALOG.map((module) => {
              const showGroupHeader = module.group && module.group !== lastGroup;
              lastGroup = module.group;

              return (
                <div key={module.key}>
                  {/* Group Header */}
                  {showGroupHeader && (
                    <div className="grid grid-cols-[1fr_repeat(2,120px)] bg-muted/30">
                      <div className="px-4 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                        {module.group}
                      </div>
                      <div className="border-l border-border" />
                      <div className="border-l border-border" />
                    </div>
                  )}
                  
                  {/* Module Row */}
                  <div className="grid grid-cols-[1fr_repeat(2,120px)] hover:bg-muted/20 transition-colors">
                    <div className="px-4 py-3 flex items-center gap-2">
                      {module.group && <span className="text-muted-foreground">└</span>}
                      <span className="text-sm font-medium">{module.label}</span>
                    </div>
                    
                    {editablePlans.map((tier) => {
                      const enabled = isModuleEnabled(tier.key, module.key);
                      return (
                        <div 
                          key={`${tier.key}-${module.key}`}
                          className="px-4 py-3 flex items-center justify-center border-l border-border"
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={enabled}
                                  onCheckedChange={(checked) => handleToggle(tier.key, module.key, checked)}
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
                                ? `${module.label} est inclus dans ${tier.label}`
                                : `${module.label} n'est pas inclus dans ${tier.label}`
                              }
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
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
