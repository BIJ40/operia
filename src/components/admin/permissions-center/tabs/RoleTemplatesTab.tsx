/**
 * Onglet 2 - Templates par Rôle
 * Visualise et permet de modifier les modules par défaut pour chaque rôle
 * Affiche les rôles minimum par option (ex: RH coffre vs RH admin)
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertTriangle, RefreshCw, Check, Lock, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GLOBAL_ROLE_LABELS, GlobalRole } from '@/types/globalRoles';
import { MODULE_DEFINITIONS, ModuleKey } from '@/types/modules';
import { DEFAULT_MODULES_BY_ROLE } from '@/config/modulesByRole';
import { ROLE_HIERARCHY, MODULE_OPTION_MIN_ROLES, MODULE_MIN_ROLES } from '@/permissions';

const ROLES_ORDER: GlobalRole[] = [
  'base_user',
  'franchisee_user', 
  'franchisee_admin',
  'franchisor_user',
  'franchisor_admin',
  'platform_admin',
  'superadmin'
];

function getRoleBadgeColor(role: GlobalRole): string {
  const level = ROLE_HIERARCHY[role];
  if (level >= 5) return 'bg-red-100 text-red-800 border-red-200';
  if (level >= 3) return 'bg-purple-100 text-purple-800 border-purple-200';
  if (level >= 2) return 'bg-blue-100 text-blue-800 border-blue-200';
  return 'bg-gray-100 text-gray-800 border-gray-200';
}

function RoleTemplateCard({ role }: { role: GlobalRole }) {
  const template = DEFAULT_MODULES_BY_ROLE[role];
  const roleLevel = ROLE_HIERARCHY[role];
  const enabledModules = Object.entries(template || {}).filter(([_, value]) => {
    if (typeof value === 'boolean') return value;
    return value?.enabled;
  });

  return (
    <AccordionItem value={role} className="border rounded-lg mb-2">
      <AccordionTrigger className="px-4 hover:no-underline">
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`font-mono ${getRoleBadgeColor(role)}`}>
              N{roleLevel}
            </Badge>
            <span className="font-medium">{GLOBAL_ROLE_LABELS[role]}</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {enabledModules.length} modules
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-4">
          {MODULE_DEFINITIONS.map(moduleDef => {
            const moduleState = template?.[moduleDef.key];
            const isEnabled = typeof moduleState === 'boolean' 
              ? moduleState 
              : moduleState?.enabled ?? false;
            const options = typeof moduleState === 'object' && moduleState !== null
              ? (moduleState as any).options || {} 
              : {};
            const moduleMinRole = MODULE_MIN_ROLES[moduleDef.key] || 'base_user';
            const moduleMinLevel = ROLE_HIERARCHY[moduleMinRole] ?? 0;
            const canAccessModule = roleLevel >= moduleMinLevel;

            return (
              <div 
                key={moduleDef.key} 
                className={`p-3 rounded-lg border ${
                  isEnabled ? 'bg-primary/5 border-primary/20' : 
                  !canAccessModule ? 'bg-muted/50 border-muted' : 'bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${!canAccessModule ? 'text-muted-foreground' : ''}`}>
                      {moduleDef.label}
                    </span>
                    {!canAccessModule && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Requiert N{moduleMinLevel}+ ({GLOBAL_ROLE_LABELS[moduleMinRole]})
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {isEnabled && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <Switch checked={isEnabled} disabled className="pointer-events-none" />
                </div>
                
                {moduleDef.options && moduleDef.options.length > 0 && (
                  <div className="mt-2 pl-4 border-l-2 border-primary/20 space-y-1">
                    {moduleDef.options.map(opt => {
                      const optEnabled = options[opt.key] ?? opt.defaultEnabled;
                      const optMinRoleKey = `${moduleDef.key}.${opt.key}`;
                      const optMinRole = MODULE_OPTION_MIN_ROLES[optMinRoleKey];
                      const optMinLevel = optMinRole ? (ROLE_HIERARCHY[optMinRole] ?? 0) : moduleMinLevel;
                      const canAccessOption = roleLevel >= optMinLevel;
                      
                      return (
                        <div key={opt.key} className="flex items-center justify-between text-sm py-1">
                          <div className="flex items-center gap-2">
                            <span className={
                              !canAccessOption ? 'text-muted-foreground line-through' :
                              optEnabled ? 'text-foreground' : 'text-muted-foreground'
                            }>
                              {opt.label}
                            </span>
                            {optMinRole && (
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] px-1 py-0 ${getRoleBadgeColor(optMinRole)}`}
                              >
                                N{optMinLevel}+
                              </Badge>
                            )}
                          </div>
                          {!canAccessOption ? (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <Badge 
                              variant={optEnabled ? 'default' : 'outline'} 
                              className="text-xs"
                            >
                              {optEnabled ? 'Oui' : 'Non'}
                            </Badge>
                          )}
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
  );
}

export function RoleTemplatesTab() {
  return (
    <div className="space-y-6">
      {/* Info */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Ces templates définissent les modules attribués par défaut lors de la création d'un utilisateur.
          Ils sont définis dans le code (<code>modulesByRole.ts</code>) et ne peuvent pas être modifiés depuis l'interface.
        </AlertDescription>
      </Alert>

      {/* Légende Option Min Roles */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            Module à facettes multiples : RH
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p className="mb-2">Le module RH a des options avec des rôles minimums différents :</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="flex items-center gap-2 p-2 bg-background rounded border">
              <Badge variant="outline" className={getRoleBadgeColor('base_user')}>N0</Badge>
              <span><strong>coffre</strong> : Salarié consulte ses docs</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-background rounded border">
              <Badge variant="outline" className={getRoleBadgeColor('franchisee_admin')}>N2</Badge>
              <span><strong>rh_viewer</strong> : Voir l'équipe</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-background rounded border">
              <Badge variant="outline" className={getRoleBadgeColor('franchisee_admin')}>N2</Badge>
              <span><strong>rh_admin</strong> : Gérer RH complet</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates par rôle */}
      <Card>
        <CardHeader>
          <CardTitle>Templates de Modules par Rôle</CardTitle>
          <CardDescription>
            Configuration par défaut des modules pour chaque niveau de rôle (N0-N6).
            Les badges <Badge variant="outline" className="text-[10px] px-1 py-0">N2+</Badge> indiquent le rôle minimum requis pour chaque option.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-2">
            {ROLES_ORDER.map(role => (
              <RoleTemplateCard key={role} role={role} />
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Résumé visuel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Résumé des Modules par Rôle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Module</th>
                  {ROLES_ORDER.map(role => (
                    <th key={role} className="text-center p-2 font-medium">
                      <span className="text-xs">N{ROLE_HIERARCHY[role]}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULE_DEFINITIONS.map(mod => (
                  <tr key={mod.key} className="border-b last:border-0">
                    <td className="p-2">{mod.label}</td>
                    {ROLES_ORDER.map(role => {
                      const template = DEFAULT_MODULES_BY_ROLE[role];
                      const moduleState = template?.[mod.key];
                      const isEnabled = typeof moduleState === 'boolean' 
                        ? moduleState 
                        : (moduleState as any)?.enabled ?? false;
                      const minRole = MODULE_MIN_ROLES[mod.key] || 'base_user';
                      const canAccess = (ROLE_HIERARCHY[role] ?? 0) >= (ROLE_HIERARCHY[minRole] ?? 0);
                      
                      return (
                        <td key={role} className="text-center p-2">
                          {!canAccess ? (
                            <Lock className="h-3 w-3 text-muted-foreground/50 mx-auto" />
                          ) : isEnabled ? (
                            <Check className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
