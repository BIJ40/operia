/**
 * Onglet 2 - Templates par Rôle
 * Visualise les modules par défaut pour chaque rôle - version compacte
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Check, Lock, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GlobalRole } from '@/types/globalRoles';
import { VISIBLE_ROLE_LABELS } from '@/lib/visibleRoleLabels';
import { MODULE_DEFINITIONS } from '@/types/modules';
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
    <AccordionItem value={role} className="border rounded-md">
      <AccordionTrigger className="px-3 py-2 hover:no-underline text-sm">
        <div className="flex items-center justify-between w-full pr-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`font-mono text-xs px-1.5 py-0 ${getRoleBadgeColor(role)}`}>
              {VISIBLE_ROLE_LABELS[role]?.charAt(0) || 'U'}
            </Badge>
            <span className="font-medium">{VISIBLE_ROLE_LABELS[role]}</span>
          </div>
          <span className="text-xs text-muted-foreground">{enabledModules.length} modules</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-3 pb-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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

            const hasOptions = moduleDef.options && moduleDef.options.length > 0;
            const enabledOpts = hasOptions 
              ? moduleDef.options.filter(o => options[o.key] ?? o.defaultEnabled).map(o => o.label)
              : [];

            return (
              <div 
                key={moduleDef.key} 
                className={`px-2 py-1.5 rounded text-sm flex items-center justify-between gap-2 ${
                  isEnabled ? 'bg-green-50 dark:bg-green-950/30' : 
                  !canAccessModule ? 'bg-muted/30 opacity-50' : 'bg-muted/20'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {isEnabled ? (
                    <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                  ) : !canAccessModule ? (
                    <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                  )}
                  <span className={`truncate ${!canAccessModule ? 'text-muted-foreground' : ''}`}>
                    {moduleDef.label}
                  </span>
                </div>
                
                {hasOptions && isEnabled && enabledOpts.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {enabledOpts.length} opt
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <p className="text-xs font-medium mb-1">Options actives :</p>
                        <ul className="text-xs space-y-0.5">
                          {enabledOpts.map(o => <li key={o}>• {o}</li>)}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
    <div className="space-y-4">
      {/* Templates par rôle */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Templates par Rôle</CardTitle>
          <CardDescription className="text-xs">
            Modules par défaut (N0-N6). Définis dans <code className="text-[10px]">modulesByRole.ts</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="space-y-1">
            {ROLES_ORDER.map(role => (
              <RoleTemplateCard key={role} role={role} />
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Matrice compacte */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Matrice Modules × Rôles</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-1.5 font-medium">Module</th>
                  {ROLES_ORDER.map(role => (
                    <th key={role} className="text-center p-1 font-medium w-8">
                      N{ROLE_HIERARCHY[role]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULE_DEFINITIONS.map(mod => (
                  <tr key={mod.key} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-1.5 truncate max-w-[120px]" title={mod.label}>{mod.label}</td>
                    {ROLES_ORDER.map(role => {
                      const template = DEFAULT_MODULES_BY_ROLE[role];
                      const moduleState = template?.[mod.key];
                      const isEnabled = typeof moduleState === 'boolean' 
                        ? moduleState 
                        : (moduleState as any)?.enabled ?? false;
                      const minRole = MODULE_MIN_ROLES[mod.key] || 'base_user';
                      const canAccess = (ROLE_HIERARCHY[role] ?? 0) >= (ROLE_HIERARCHY[minRole] ?? 0);
                      
                      return (
                        <td key={role} className="text-center p-1">
                          {!canAccess ? (
                            <Lock className="h-3 w-3 text-muted-foreground/30 mx-auto" />
                          ) : isEnabled ? (
                            <Check className="h-3 w-3 text-green-600 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground/40">·</span>
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
