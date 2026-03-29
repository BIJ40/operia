import React, { useState } from 'react';
import { useAgencyEntitlements } from '@/hooks/access-rights/useAgencyEntitlements';
import { useModuleCatalog, ModuleCatalogEntry } from '@/hooks/access-rights/useModuleCatalog';
import { usePlanCatalog } from '@/hooks/access-rights/usePlanCatalog';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Agency {
  id: string;
  label: string;
  plan_key?: string;
  plan_id?: string;
}

function AgencySelector({
  selected,
  onSelect,
}: {
  selected: Agency | null;
  onSelect: (agency: Agency) => void;
}) {
  const [open, setOpen] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAgencies = async () => {
    if (agencies.length > 0) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('apogee_agencies')
        .select('id, label')
        .eq('is_active', true)
        .order('label')
        .limit(200);

      const { data: plans } = await supabase
        .from('agency_plan')
        .select('agency_id, plan_id, status')
        .eq('status', 'active');

      const { data: planCatalog } = await supabase
        .from('plan_catalog')
        .select('id, key');

      const planKeyMap = new Map((planCatalog ?? []).map(p => [p.id, p.key]));
      const agencyPlanMap = new Map(
        (plans ?? []).map(p => [p.agency_id, { plan_id: p.plan_id, plan_key: planKeyMap.get(p.plan_id) }])
      );

      setAgencies(
        (data ?? []).map(a => ({
          id: a.id,
          label: a.label,
          plan_key: agencyPlanMap.get(a.id)?.plan_key,
          plan_id: agencyPlanMap.get(a.id)?.plan_id,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) loadAgencies(); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full max-w-md justify-between"
        >
          {selected ? selected.label : 'Sélectionner une agence...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full max-w-md p-0">
        <Command>
          <CommandInput placeholder="Rechercher une agence..." />
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          <CommandEmpty>Aucune agence trouvée.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-y-auto">
            {agencies.map(agency => (
              <CommandItem
                key={agency.id}
                value={agency.label}
                onSelect={() => {
                  onSelect(agency);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    selected?.id === agency.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex items-center gap-2">
                  <span>{agency.label}</span>
                  {agency.plan_key && (
                    <Badge variant="outline" className="text-xs">{agency.plan_key}</Badge>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function AgencyEntitlementsViewV2() {
  const { isAdmin, globalRole } = usePermissionsBridge();
  const canEdit = isAdmin || globalRole === 'franchisor_admin';

  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);

  const { entitlements, isLoading: entLoad, toggleEntitlement, upsertEntitlement } =
    useAgencyEntitlements(selectedAgency?.id ?? null);

  const { modules, isLoading: modLoad } = useModuleCatalog();
  const { plans } = usePlanCatalog();

  // Modules optionnels déployés (via_agency_option = true)
  const optionModules: ModuleCatalogEntry[] = modules.filter(
    m => m.is_deployed && m.via_agency_option && m.node_type !== 'section'
  );

  // Modules inclus via le plan de cette agence
  const agencyPlan = selectedAgency?.plan_id
    ? plans.find(p => p.id === selectedAgency.plan_id)
    : null;

  const includedByPlan = new Set(
    agencyPlan?.grants.filter(g => g.access_level !== 'none').map(g => g.module_key) ?? []
  );

  // Map entitlements par module_key
  const entitlementMap = new Map(entitlements.map(e => [e.module_key, e]));

  // Grouper par category
  const byCategory = optionModules.reduce<Record<string, ModuleCatalogEntry[]>>(
    (acc, m) => {
      const cat = m.category ?? 'Autre';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(m);
      return acc;
    },
    {}
  );

  const activeCount = entitlements.filter(e => e.is_active).length;

  if (!isAdmin && globalRole !== 'franchisor_admin') {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Accès réservé aux administrateurs N4+.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Options par agence</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Activez des modules supplémentaires au-delà du plan pour une agence.
          </p>
        </div>
        <Badge variant="outline" className="text-xs">V2</Badge>
      </div>

      {/* Sélecteur agence */}
      <div className="flex items-center gap-4">
        <AgencySelector selected={selectedAgency} onSelect={setSelectedAgency} />
        {selectedAgency && (
          <div className="flex items-center gap-2">
            {selectedAgency.plan_key && (
              <Badge variant="secondary">
                Plan {selectedAgency.plan_key}
              </Badge>
            )}
            <Badge variant="outline">
              {activeCount} option{activeCount !== 1 ? 's' : ''} active{activeCount !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}
      </div>

      {!selectedAgency && (
        <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
          Sélectionnez une agence pour gérer ses options.
        </div>
      )}

      {selectedAgency && (entLoad || modLoad) && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {selectedAgency && !entLoad && !modLoad && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left p-3 font-medium text-muted-foreground">Module</th>
                <th className="text-center p-3 font-medium text-muted-foreground w-28">Source</th>
                <th className="text-center p-3 font-medium text-muted-foreground w-20">Actif</th>
                <th className="text-center p-3 font-medium text-muted-foreground w-32">Niveau</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byCategory).map(([category, mods]) => (
                <React.Fragment key={category}>
                  <tr className="bg-muted/30">
                    <td colSpan={4} className="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      {category}
                    </td>
                  </tr>
                  {mods.map(mod => {
                    const ent = entitlementMap.get(mod.key);
                    const inPlan = includedByPlan.has(mod.key);
                    const isActive = inPlan || (ent?.is_active ?? false);
                    const accessLevel = ent?.access_level ?? 'full';

                    return (
                      <tr key={mod.key} className="border-b last:border-b-0 hover:bg-muted/20">
                        <td className="p-3">
                          <div>
                            <span className="font-medium text-foreground">{mod.label}</span>
                            <span className="block text-xs text-muted-foreground">{mod.key}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {inPlan ? (
                            <Badge variant="secondary" className="text-xs">Inclus plan</Badge>
                          ) : ent ? (
                            <Badge variant="outline" className="text-xs">Option</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Switch
                            checked={isActive}
                            disabled={inPlan || !canEdit}
                            onCheckedChange={(v) => {
                              if (!selectedAgency) return;
                              toggleEntitlement.mutate({
                                agency_id: selectedAgency.id,
                                module_key: mod.key,
                                is_active: v,
                              });
                            }}
                            className="scale-75"
                          />
                        </td>
                        <td className="p-3 text-center">
                          {inPlan ? (
                            <span className="text-muted-foreground">—</span>
                          ) : canEdit && isActive ? (
                            <Select
                              value={accessLevel}
                              onValueChange={(v) => {
                                if (!selectedAgency) return;
                                upsertEntitlement.mutate({
                                  agency_id: selectedAgency.id,
                                  module_key: mod.key,
                                  is_active: true,
                                  access_level: v as 'none' | 'read' | 'full',
                                  source: 'manual',
                                });
                              }}
                            >
                              <SelectTrigger className="h-8 w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="read">Lecture</SelectItem>
                                <SelectItem value="full">Complet</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {isActive ? (accessLevel === 'read' ? 'Lecture' : 'Complet') : '—'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AgencyEntitlementsViewV2;
