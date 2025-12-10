/**
 * Onglet 4 - Simulateur & Audit
 * Permet de tester les permissions et d'auditer les incohérences
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, ArrowRight, FlaskConical, FileSearch } from 'lucide-react';
import { GLOBAL_ROLE_LABELS, GlobalRole } from '@/types/globalRoles';
import { MODULE_DEFINITIONS, ModuleKey } from '@/types/modules';
import { hasAccess, explainAccess, getDefaultModulesForRole, ROLE_HIERARCHY, AccessTrace } from '@/permissions';

const ROLES_ORDER: GlobalRole[] = [
  'base_user',
  'franchisee_user', 
  'franchisee_admin',
  'franchisor_user',
  'franchisor_admin',
  'platform_admin',
  'superadmin'
];

function AccessTraceDisplay({ traces }: { traces: AccessTrace[] }) {
  return (
    <div className="space-y-2">
      {traces.map((trace, idx) => (
        <div 
          key={idx}
          className={`
            flex items-start gap-3 p-2 rounded text-sm
            ${trace.result ? 'bg-green-500/10' : 'bg-red-500/10'}
          `}
        >
          <div className="flex-shrink-0 mt-0.5">
            {trace.result ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
          </div>
          <div>
            <div className="font-medium">{trace.step}</div>
            <div className="text-muted-foreground">{trace.reason}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PermissionSimulator() {
  const [config, setConfig] = useState({
    globalRole: 'franchisee_admin' as GlobalRole,
    hasAgency: true,
    useTemplate: true,
    targetModule: 'pilotage_agence' as ModuleKey,
    targetOption: '',
  });

  const result = useMemo(() => {
    try {
      const enabledModules = config.useTemplate 
        ? getDefaultModulesForRole(config.globalRole)
        : {};

      const ctx = {
        globalRole: config.globalRole,
        enabledModules,
        agencyId: config.hasAgency ? 'fake-agency-id' : null,
      };

      const access = hasAccess({
        ...ctx,
        moduleId: config.targetModule,
        optionId: config.targetOption || undefined,
      });

      const traces = explainAccess({
        ...ctx,
        moduleId: config.targetModule,
        optionId: config.targetOption || undefined,
      });

      return { access, traces };
    } catch (error) {
      console.error('Erreur dans le simulateur:', error);
      return { 
        access: false, 
        traces: [{ step: 'error', result: false, reason: `Erreur: ${error}` }] 
      };
    }
  }, [config]);

  const targetModuleDef = MODULE_DEFINITIONS.find(m => m.key === config.targetModule);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5" />
          Simulateur d'Accès
        </CardTitle>
        <CardDescription>
          Testez les règles de permissions avec différentes configurations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Rôle global</Label>
            <Select 
              value={config.globalRole} 
              onValueChange={(v) => setConfig(c => ({ ...c, globalRole: v as GlobalRole }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES_ORDER.map(role => (
                  <SelectItem key={role} value={role}>
                    N{ROLE_HIERARCHY[role]} - {GLOBAL_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Module cible</Label>
            <Select 
              value={config.targetModule} 
              onValueChange={(v) => setConfig(c => ({ ...c, targetModule: v as ModuleKey, targetOption: '' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODULE_DEFINITIONS.map(mod => (
                  <SelectItem key={mod.key} value={mod.key}>
                    {mod.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {targetModuleDef && targetModuleDef.options.length > 0 && (
            <div className="space-y-2">
              <Label>Option spécifique (optionnel)</Label>
              <Select 
                value={config.targetOption} 
                onValueChange={(v) => setConfig(c => ({ ...c, targetOption: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucune option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucune option</SelectItem>
                  {targetModuleDef.options.map(opt => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="hasAgency">A une agence</Label>
              <Switch 
                id="hasAgency"
                checked={config.hasAgency}
                onCheckedChange={(v) => setConfig(c => ({ ...c, hasAgency: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="useTemplate">Utiliser template rôle</Label>
              <Switch 
                id="useTemplate"
                checked={config.useTemplate}
                onCheckedChange={(v) => setConfig(c => ({ ...c, useTemplate: v }))}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Résultat */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="font-medium">Résultat :</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge 
              variant={result.access ? 'default' : 'destructive'}
              className={`text-base px-4 py-1 ${result.access ? 'bg-green-600' : ''}`}
            >
              {result.access ? '✓ ACCÈS AUTORISÉ' : '✗ ACCÈS REFUSÉ'}
            </Badge>
          </div>

          <div>
            <h4 className="font-medium mb-2">Trace de décision :</h4>
            <AccessTraceDisplay traces={result.traces} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AuditSummary() {
  // Statistiques basées sur les règles connues
  const auditRules = [
    {
      id: 'agency_roles_no_agency',
      label: 'N1/N2 sans agence',
      description: 'Utilisateurs avec rôle agence mais sans agence assignée',
      severity: 'error' as const,
    },
    {
      id: 'null_modules',
      label: 'Modules non configurés',
      description: 'enabled_modules est null (utilise les défauts du rôle)',
      severity: 'warning' as const,
    },
    {
      id: 'network_role_agency_modules',
      label: 'N3/N4 avec modules agence',
      description: 'Rôles réseau avec pilotage/RH/parc activés sans agence',
      severity: 'error' as const,
    },
    {
      id: 'support_level_no_agent',
      label: 'Support level sans agent',
      description: 'support_level défini mais option agent non activée',
      severity: 'error' as const,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSearch className="h-5 w-5" />
          Règles d'Audit
        </CardTitle>
        <CardDescription>
          Liste des vérifications automatiques effectuées sur les utilisateurs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {auditRules.map(rule => (
            <div 
              key={rule.id}
              className={`
                p-3 rounded-lg border
                ${rule.severity === 'error' ? 'border-destructive/50 bg-destructive/5' : 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20'}
              `}
            >
              <div className="flex items-center gap-2 font-medium">
                {rule.severity === 'error' ? (
                  <XCircle className="h-4 w-4 text-destructive" />
                ) : (
                  <Badge variant="outline" className="text-yellow-600">Warning</Badge>
                )}
                {rule.label}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SimulatorAuditTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <PermissionSimulator />
      <AuditSummary />
    </div>
  );
}
