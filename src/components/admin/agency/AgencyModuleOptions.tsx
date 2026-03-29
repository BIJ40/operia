/**
 * AgencyModuleOptions — Options modules inline pour une fiche agence
 * Affiche les modules activables (via_agency_option) avec toggles
 */

import { useAgencyEntitlements } from '@/hooks/access-rights/useAgencyEntitlements';
import { useModuleCatalog, type ModuleCatalogEntry } from '@/hooks/access-rights/useModuleCatalog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package } from 'lucide-react';

interface AgencyModuleOptionsProps {
  agencyId: string;
}

export function AgencyModuleOptions({ agencyId }: AgencyModuleOptionsProps) {
  const { entitlements, isLoading: entLoad, toggleEntitlement } = useAgencyEntitlements(agencyId);
  const { modules, isLoading: modLoad } = useModuleCatalog();

  const optionModules: ModuleCatalogEntry[] = modules.filter(
    m => m.is_deployed && m.via_agency_option && m.node_type !== 'section'
  );

  const entitlementMap = new Map(entitlements.map(e => [e.module_key, e]));

  if (entLoad || modLoad) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (optionModules.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-2">
        Aucun module optionnel configuré.
      </p>
    );
  }

  // Group by category
  const byCategory = optionModules.reduce<Record<string, ModuleCatalogEntry[]>>((acc, m) => {
    const cat = m.category ?? 'Autre';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Package className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Options modules</span>
        <Badge variant="outline" className="text-[10px]">
          {entitlements.filter(e => e.is_active).length} actif{entitlements.filter(e => e.is_active).length !== 1 ? 's' : ''}
        </Badge>
      </div>
      {Object.entries(byCategory).map(([category, mods]) => (
        <div key={category} className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{category}</p>
          <div className="space-y-1">
            {mods.map(mod => {
              const ent = entitlementMap.get(mod.key);
              const isActive = ent?.is_active ?? false;
              return (
                <div key={mod.key} className="flex items-center justify-between gap-2 py-1 px-2 rounded-md hover:bg-muted/50 transition-colors">
                  <span className="text-xs text-foreground truncate">{mod.label}</span>
                  <Switch
                    checked={isActive}
                    onCheckedChange={(checked) => {
                      toggleEntitlement.mutate({
                        agency_id: agencyId,
                        module_key: mod.key,
                        is_active: checked,
                      });
                    }}
                    className="scale-75"
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
