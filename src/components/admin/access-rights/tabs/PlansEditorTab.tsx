/**
 * Onglet Plans - Édition des templates de plans (N5/N6)
 * Permet de configurer les modules ET sous-options par plan
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Layers, Check, X, Info, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  
  const toggleModuleExpand = (tierKey: string, moduleKey: string) => {
    const key = `${tierKey}-${moduleKey}`;
    setExpandedModules(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  const handleModuleToggle = async (tierKey: string, moduleKey: string, currentEnabled: boolean, currentOptions: Record<string, boolean> | null) => {
    await updateModule.mutateAsync({
      tierKey,
      moduleKey,
      enabled: !currentEnabled,
      optionsOverride: currentOptions || undefined,
    });
    
    await log({
      action: currentEnabled ? 'disable_plan_module' : 'enable_plan_module',
      entityType: 'plan_tier_module',
      changes: { tier: tierKey, module: moduleKey, enabled: !currentEnabled },
    });
  };
  
  const handleOptionToggle = async (
    tierKey: string, 
    moduleKey: string, 
    optionKey: string, 
    currentOptions: Record<string, boolean> | null,
    newValue: boolean
  ) => {
    const updatedOptions = {
      ...(currentOptions || {}),
      [optionKey]: newValue,
    };
    
    await updateModule.mutateAsync({
      tierKey,
      moduleKey,
      enabled: true, // Si on active une option, le module doit être activé
      optionsOverride: updatedOptions,
    });
    
    await log({
      action: newValue ? 'enable_plan_option' : 'disable_plan_option',
      entityType: 'plan_tier_module',
      changes: { tier: tierKey, module: moduleKey, option: optionKey, enabled: newValue },
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
        <CardDescription className="flex flex-col gap-1">
          <span>Définissez les modules et sous-options inclus dans chaque plan.</span>
          <span className="text-purple-600 font-medium">
            Ce sont les modules de BASE (Priorité 4/4). Les modules utilisateur et overrides agence peuvent y ajouter des accès supplémentaires.
          </span>
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
                
                <div className="space-y-2">
                  {MODULE_DEFINITIONS.map(moduleDef => {
                    const tierModule = getModuleForPlan(plan.key, moduleDef.key);
                    const isEnabled = tierModule?.enabled ?? false;
                    const options = tierModule?.options_override ?? {};
                    const expandKey = `${plan.key}-${moduleDef.key}`;
                    const isExpanded = expandedModules[expandKey] ?? false;
                    const enabledOptionsCount = Object.values(options).filter(Boolean).length;
                    
                    return (
                      <div key={moduleDef.key} className="border rounded-lg overflow-hidden">
                        {/* Module header */}
                        <div 
                          className={`flex items-center justify-between p-3 ${
                            isEnabled ? 'bg-primary/5' : 'bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <button 
                              onClick={() => toggleModuleExpand(plan.key, moduleDef.key)}
                              className="p-1 hover:bg-muted rounded"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
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
                                {enabledOptionsCount > 0 ? (
                                  <span className="text-primary">{enabledOptionsCount}/{moduleDef.options.length} options actives</span>
                                ) : (
                                  <span>{moduleDef.options.length} options disponibles</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={() => handleModuleToggle(plan.key, moduleDef.key, isEnabled, options)}
                            disabled={updateModule.isPending}
                          />
                        </div>
                        
                        {/* Options panel - exclude user-only options (edition, agent) */}
                        {isExpanded && (
                          <div className="border-t bg-muted/10 p-3 space-y-2">
                            {moduleDef.options
                              .filter(option => !['edition', 'agent'].includes(option.key))
                              .map(option => {
                                const isOptionEnabled = options[option.key] ?? false;
                              
                                return (
                                  <div 
                                    key={option.key}
                                    className={`flex items-center justify-between p-2 rounded ${
                                      isOptionEnabled ? 'bg-primary/5' : 'bg-background'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 flex-1">
                                      <div className={`w-2 h-2 rounded-full ${isOptionEnabled ? 'bg-primary' : 'bg-muted'}`} />
                                      <div className="flex-1">
                                        <div className="text-sm font-medium flex items-center gap-2">
                                          {option.label}
                                          {option.routes && option.routes.length > 0 && (
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary cursor-help">
                                                    <ExternalLink className="h-3 w-3" />
                                                    {option.routes.length} page{option.routes.length > 1 ? 's' : ''}
                                                  </span>
                                                </TooltipTrigger>
                                                <TooltipContent side="right" className="max-w-xs">
                                                  <p className="font-medium mb-1">Pages concernées :</p>
                                                  <ul className="text-xs space-y-0.5">
                                                    {option.routes.map(route => (
                                                      <li key={route} className="font-mono text-primary">{route}</li>
                                                    ))}
                                                  </ul>
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{option.description}</div>
                                      </div>
                                    </div>
                                    <Switch
                                      checked={isOptionEnabled}
                                      onCheckedChange={(checked) => handleOptionToggle(
                                        plan.key, 
                                        moduleDef.key, 
                                        option.key, 
                                        options, 
                                        checked
                                      )}
                                      disabled={updateModule.isPending}
                                    />
                                  </div>
                                );
                              })}
                          </div>
                        )}
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
