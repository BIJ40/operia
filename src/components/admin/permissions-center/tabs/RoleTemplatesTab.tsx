/**
 * Onglet 2 - Templates par Rôle
 * Visualise et permet de modifier les modules par défaut pour chaque rôle
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertTriangle, RefreshCw, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GLOBAL_ROLE_LABELS, GlobalRole } from '@/types/globalRoles';
import { MODULE_DEFINITIONS, ModuleKey } from '@/types/modules';
import { DEFAULT_MODULES_BY_ROLE } from '@/config/modulesByRole';
import { ROLE_HIERARCHY } from '@/permissions';

const ROLES_ORDER: GlobalRole[] = [
  'base_user',
  'franchisee_user', 
  'franchisee_admin',
  'franchisor_user',
  'franchisor_admin',
  'platform_admin',
  'superadmin'
];

function RoleTemplateCard({ role }: { role: GlobalRole }) {
  const template = DEFAULT_MODULES_BY_ROLE[role];
  const enabledModules = Object.entries(template || {}).filter(([_, value]) => {
    if (typeof value === 'boolean') return value;
    return value?.enabled;
  });

  return (
    <AccordionItem value={role} className="border rounded-lg mb-2">
      <AccordionTrigger className="px-4 hover:no-underline">
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono">
              N{ROLE_HIERARCHY[role]}
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
            const options = typeof moduleState === 'object' 
              ? moduleState.options || {} 
              : {};

            return (
              <div 
                key={moduleDef.key} 
                className={`p-3 rounded-lg border ${isEnabled ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{moduleDef.label}</span>
                    {isEnabled && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <Switch checked={isEnabled} disabled className="pointer-events-none" />
                </div>
                
                {isEnabled && moduleDef.options.length > 0 && (
                  <div className="mt-2 pl-4 border-l-2 border-primary/20 space-y-1">
                    {moduleDef.options.map(opt => {
                      const optEnabled = options[opt.key] ?? opt.defaultEnabled;
                      return (
                        <div key={opt.key} className="flex items-center justify-between text-sm">
                          <span className={optEnabled ? 'text-foreground' : 'text-muted-foreground'}>
                            {opt.label}
                          </span>
                          <Badge 
                            variant={optEnabled ? 'default' : 'outline'} 
                            className="text-xs"
                          >
                            {optEnabled ? 'Oui' : 'Non'}
                          </Badge>
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
          Une évolution future (P2) permettra de les éditer via une table Supabase.
        </AlertDescription>
      </Alert>

      {/* Templates par rôle */}
      <Card>
        <CardHeader>
          <CardTitle>Templates de Modules par Rôle</CardTitle>
          <CardDescription>
            Configuration par défaut des modules pour chaque niveau de rôle (N0-N6)
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
                        : moduleState?.enabled ?? false;
                      return (
                        <td key={role} className="text-center p-2">
                          {isEnabled ? (
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
