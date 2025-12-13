/**
 * Onglet Plans - Édition des templates de plans (N5/N6)
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Layers, Check, X, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  usePlanTiers, 
  useUpdatePlanTierModule 
} from '@/hooks/access-rights/usePlanTiers';
import { MODULE_DEFINITIONS, ModuleKey } from '@/types/modules';
import { useAuditLog } from '@/hooks/access-rights/usePermissionAudit';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function PlansEditorTab() {
  const { data: planTiers, isLoading } = usePlanTiers();
  const updateModule = useUpdatePlanTierModule();
  const { log } = useAuditLog();
  const [expandedPlan, setExpandedPlan] = useState<string>('PRO');
  
  const handleModuleToggle = async (tierKey: string, moduleKey: string, currentEnabled: boolean) => {
    await updateModule.mutateAsync({
      tierKey,
      moduleKey,
      enabled: !currentEnabled,
    });
    
    await log({
      action: currentEnabled ? 'disable_plan_module' : 'enable_plan_module',
      entityType: 'plan_tier_module',
      changes: { tier: tierKey, module: moduleKey, enabled: !currentEnabled },
    });
  };
  
  const getModuleForPlan = (tierKey: string, moduleKey: string) => {
    const plan = planTiers?.find(p => p.key === tierKey);
    return plan?.plan_tier_modules.find(m => m.module_key === moduleKey);
  };
  
  const getPlanBadgeStyle = (plan: string) => {
    switch (plan) {
      case 'PRO': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'STARTER': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
      case 'FREE': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted';
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Configuration des Plans
        </CardTitle>
        <CardDescription>
          Définissez les modules inclus dans chaque plan. Ces configurations s'appliquent à toutes les agences abonnées.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion 
          type="single" 
          value={expandedPlan} 
          onValueChange={setExpandedPlan}
          className="space-y-4"
        >
          {planTiers?.map(plan => (
            <AccordionItem 
              key={plan.key} 
              value={plan.key}
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-4">
                  <Badge className={`${getPlanBadgeStyle(plan.key)} text-lg px-4 py-1`}>
                    {plan.label}
                  </Badge>
                  <span className="text-muted-foreground">
                    {plan.plan_tier_modules.filter(m => m.enabled).length} modules activés
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <p className="text-sm text-muted-foreground mb-4">
                  {plan.description}
                </p>
                
                <div className="grid gap-3">
                  {MODULE_DEFINITIONS.map(moduleDef => {
                    const tierModule = getModuleForPlan(plan.key, moduleDef.key);
                    const isEnabled = tierModule?.enabled ?? false;
                    
                    return (
                      <div 
                        key={moduleDef.key}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          isEnabled ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-md ${isEnabled ? 'bg-primary/10' : 'bg-muted'}`}>
                            {isEnabled ? (
                              <Check className="h-4 w-4 text-primary" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {moduleDef.label}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="h-3 w-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">{moduleDef.description}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {moduleDef.options.length} option(s) disponible(s)
                            </div>
                          </div>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => handleModuleToggle(plan.key, moduleDef.key, isEnabled)}
                          disabled={updateModule.isPending}
                        />
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        
        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800 dark:text-amber-200">
                Impact des modifications
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Les modifications des plans s'appliquent immédiatement à toutes les agences abonnées à ce plan.
                Les overrides utilisateur individuels restent prioritaires.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
