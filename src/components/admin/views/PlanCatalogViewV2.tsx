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

const ACCESS_LEVEL_LABELS: Record<string, string> = {
  none: 'Aucun',
  read: 'Lecture',
  full: 'Complet',
};

const ACCESS_LEVEL_COLORS: Record<string, string> = {
  none: 'text-muted-foreground',
  read: 'text-amber-600',
  full: 'text-green-600',
};

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
    <div className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm">{plan.label}</span>
        {!plan.is_system && (
          <Switch
            checked={plan.is_active}
            onCheckedChange={(v) => canEdit && onToggleActive(plan.id, v)}
            disabled={!canEdit}
            className="scale-75"
          />
        )}
        {plan.is_system && (
          <Badge variant="secondary" className="text-[10px]">Système</Badge>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        {plan.grants.filter(g => g.access_level !== 'none').length} modules inclus
      </div>
      {!plan.is_active && (
        <Badge variant="outline" className="text-[10px] text-muted-foreground">
          Dormant
        </Badge>
      )}
    </div>
  );
}

function getAccessLevel(
  plan: PlanWithGrants,
  moduleKey: string
): 'none' | 'read' | 'full' {
  const grant = plan.grants.find(g => g.module_key === moduleKey);
  return grant?.access_level ?? 'none';
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
      const cat = m.category ?? 'Autre';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(m);
      return acc;
    },
    {}
  );

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Gestion des Plans</h2>
          <p className="text-sm text-muted-foreground">
            Modules inclus par plan. Les changements s'appliquent immédiatement.
          </p>
        </div>
        <Badge variant="outline">V2</Badge>
      </div>

      {/* Plan headers */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `minmax(200px, 1fr) repeat(${plans.length}, minmax(120px, 1fr))` }}>
        <div /> {/* colonne module */}
        {plans.map(plan => (
          <PlanHeader
            key={plan.id}
            plan={plan}
            canEdit={canEdit}
            onToggleActive={(id, v) => togglePlanActive.mutate({ id, is_active: v })}
          />
        ))}
      </div>

      {/* Matrix */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Module</th>
              {plans.map(plan => (
                <th key={plan.id} className="text-center p-3 font-medium text-muted-foreground">
                  {plan.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(byCategory).map(([category, mods]) => (
              <CategoryBlock
                key={category}
                category={category}
                modules={mods}
                plans={plans}
                canEdit={canEdit}
                onUpdate={(planId, moduleKey, level) =>
                  updatePlanModuleGrant.mutate({
                    plan_id: planId,
                    module_key: moduleKey,
                    access_level: level,
                  })
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoryBlock({
  category,
  modules,
  plans,
  canEdit,
  onUpdate,
}: {
  category: string;
  modules: ModuleCatalogEntry[];
  plans: PlanWithGrants[];
  canEdit: boolean;
  onUpdate: (planId: string, moduleKey: string, level: 'none' | 'read' | 'full') => void;
}) {
  return (
    <>
      <tr className="bg-muted/20">
        <td colSpan={plans.length + 1} className="p-2 pl-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
          {category}
        </td>
      </tr>
      {modules.map(mod => (
        <tr key={mod.key} className="border-b last:border-b-0 hover:bg-muted/10 transition-colors">
          <td className="p-3">
            <div className="font-medium text-foreground">{mod.label}</div>
            <div className="text-xs text-muted-foreground">{mod.key}</div>
          </td>
          {plans.map(plan => {
            const current = getAccessLevel(plan, mod.key);
            return (
              <td key={plan.id} className="p-3 text-center">
                {canEdit ? (
                  <Select
                    value={current}
                    onValueChange={(v) =>
                      onUpdate(plan.id, mod.key, v as 'none' | 'read' | 'full')
                    }
                  >
                    <SelectTrigger className="h-8 w-24 mx-auto text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      <SelectItem value="read">Lecture</SelectItem>
                      <SelectItem value="full">Complet</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={ACCESS_LEVEL_COLORS[current]}>
                    {ACCESS_LEVEL_LABELS[current]}
                  </span>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

export default PlanCatalogViewV2;
