import React from 'react';
import { usePlanCatalog, PlanWithGrants } from '@/hooks/access-rights/usePlanCatalog';
import { useModuleCatalog, ModuleCatalogEntry } from '@/hooks/access-rights/useModuleCatalog';
import { usePermissionsBridge } from '@/hooks/usePermissionsBridge';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { AdminViewHeader } from '@/components/admin/shared/AdminViewHeader';

const CATEGORY_ORDER = ['accueil', 'pilotage', 'commercial', 'organisation', 'mediatheque', 'support', 'ticketing', 'admin'];

const CATEGORY_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  accueil:      { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', icon: '🏠' },
  pilotage:     { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: '📊' },
  commercial:   { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: '💼' },
  organisation: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: '🗂️' },
  mediatheque:  { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', icon: '📚' },
  support:      { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', icon: '🛟' },
  ticketing:    { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: '🎫' },
  admin:        { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700', icon: '⚙️' },
};

const ACCESS_LEVEL_COLORS: Record<string, string> = {
  none: 'text-muted-foreground',
  read: 'text-amber-600',
  full: 'text-green-600',
};

const ACCESS_LEVEL_LABELS: Record<string, string> = {
  none: '—',
  read: 'Lecture',
  full: 'Complet',
};

function getAccessLevel(plan: PlanWithGrants, moduleKey: string): 'none' | 'read' | 'full' {
  const grant = plan.grants.find(g => g.module_key === moduleKey);
  return grant?.access_level ?? 'none';
}

function PlanHeader({
  plan,
  onToggleActive,
  canEdit,
}: {
  plan: PlanWithGrants;
  onToggleActive: (id: string, value: boolean) => void;
  canEdit: boolean;
}) {
  return (
    <th className="text-center p-3 min-w-[120px]">
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground">{plan.label}</span>
          {plan.is_system && (
            <Badge variant="secondary" className="text-[10px]">Sys</Badge>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {plan.grants.filter(g => g.access_level !== 'none').length} modules
        </div>
        {!plan.is_system && (
          <div className="flex items-center gap-1">
            <Switch
              checked={plan.is_active}
              onCheckedChange={(v) => canEdit && onToggleActive(plan.id, v)}
              disabled={!canEdit}
              className="scale-[0.65]"
            />
            {!plan.is_active && (
              <span className="text-[10px] text-muted-foreground">Dormant</span>
            )}
          </div>
        )}
      </div>
    </th>
  );
}

export function PlanCatalogViewV2() {
  const { isAdmin } = usePermissionsBridge();
  const canEdit = isAdmin;
  const { plans, isLoading: plansLoading, updatePlanModuleGrant, togglePlanActive } =
    usePlanCatalog();
  const { modules, isLoading: modulesLoading } = useModuleCatalog();

  const editableModules: ModuleCatalogEntry[] = modules.filter(
    m => m.is_deployed && m.node_type !== 'section'
  );

  const byCategory = editableModules.reduce<Record<string, ModuleCatalogEntry[]>>(
    (acc, m) => {
      const cat = m.category ?? 'autre';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(m);
      return acc;
    },
    {}
  );

  const sortedCategories = Object.entries(byCategory).sort(([a], [b]) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  if (plansLoading || modulesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Accès réservé aux administrateurs plateforme.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminViewHeader
        title="Gestion des Plans"
        subtitle="Modules inclus par plan. Les changements s'appliquent immédiatement."
      />

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground min-w-[220px]">Module</th>
              {plans.map(plan => (
                <PlanHeader
                  key={plan.id}
                  plan={plan}
                  canEdit={canEdit}
                  onToggleActive={(id, v) => togglePlanActive.mutate({ id, is_active: v })}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedCategories.map(([category, mods]) => {
              const style = CATEGORY_STYLES[category] ?? { bg: 'bg-muted/20', border: 'border-border', text: 'text-muted-foreground', icon: '📦' };

              return (
                <React.Fragment key={category}>
                  <tr className={`${style.bg} ${style.border} border-t`}>
                    <td
                      colSpan={plans.length + 1}
                      className={`px-3 py-2 font-semibold text-xs uppercase tracking-wider ${style.text}`}
                    >
                      <span className="mr-1.5">{style.icon}</span>
                      {category}
                      <Badge variant="outline" className="ml-2 text-[10px] font-normal">
                        {mods.length}
                      </Badge>
                    </td>
                  </tr>
                  {mods.map(mod => (
                    <tr key={mod.key} className="border-b last:border-b-0 hover:bg-muted/10 transition-colors">
                      <td className="p-3 pl-6">
                        <div className="font-medium text-foreground text-sm">{mod.label}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{mod.key}</div>
                      </td>
                      {plans.map(plan => {
                        const current = getAccessLevel(plan, mod.key);
                        return (
                          <td key={plan.id} className="p-2 text-center">
                            {canEdit ? (
                              <Select
                                value={current}
                                onValueChange={(v) =>
                                  updatePlanModuleGrant.mutate({
                                    plan_id: plan.id,
                                    module_key: mod.key,
                                    access_level: v as 'none' | 'read' | 'full',
                                  })
                                }
                              >
                                <SelectTrigger className="h-7 w-24 mx-auto text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">—</SelectItem>
                                  <SelectItem value="read">Lecture</SelectItem>
                                  <SelectItem value="full">Complet</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className={`text-xs ${ACCESS_LEVEL_COLORS[current]}`}>
                                {ACCESS_LEVEL_LABELS[current]}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PlanCatalogViewV2;
