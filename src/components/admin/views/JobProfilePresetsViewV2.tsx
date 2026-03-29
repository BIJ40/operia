import React, { useState } from 'react';
import { useJobProfilePresets } from '@/hooks/access-rights/useJobProfilePresets';
import { useModuleCatalog, ModuleCatalogEntry } from '@/hooks/access-rights/useModuleCatalog';
import { usePermissionsBridge } from '@/hooks/usePermissionsBridge';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';

export function JobProfilePresetsViewV2() {
  const { isAdmin } = usePermissionsBridge();
  const { presets, isLoading: presetsLoading, updatePreset } = useJobProfilePresets();
  const { modules, isLoading: modulesLoading } = useModuleCatalog();
  const [expanded, setExpanded] = useState<string | null>(null);

  // Set default expanded on first load
  React.useEffect(() => {
    if (presets.length > 0 && expanded === null) {
      setExpanded(presets[0].role_agence);
    }
  }, [presets, expanded]);

  const delegatableModules = modules.filter(
    (m: ModuleCatalogEntry) => m.is_deployed && m.is_delegatable && m.node_type !== 'section'
  );

  const byCategory = delegatableModules.reduce<Record<string, ModuleCatalogEntry[]>>(
    (acc, m) => {
      const cat = m.category ?? 'Autre';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(m);
      return acc;
    },
    {}
  );

  if (presetsLoading || modulesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return <p className="text-muted-foreground p-4">Accès réservé aux administrateurs plateforme.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Presets par poste</h2>
          <p className="text-sm text-muted-foreground">
            Modules attribués par défaut à la création d'un utilisateur selon son poste.
          </p>
        </div>
        <Badge variant="outline" className="text-xs">V2</Badge>
      </div>

      <div className="space-y-3">
        {presets.map(preset => {
          const isOpen = expanded === preset.role_agence;
          const currentModules = new Set(preset.default_modules);

          const toggle = (moduleKey: string) => {
            const next = new Set(currentModules);
            if (next.has(moduleKey)) next.delete(moduleKey);
            else next.add(moduleKey);
            updatePreset.mutate({
              role_agence: preset.role_agence,
              default_modules: Array.from(next),
            });
          };

          return (
            <div key={preset.role_agence} className="border border-border rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                onClick={() => setExpanded(isOpen ? null : preset.role_agence)}
              >
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="font-medium text-foreground">{preset.label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {preset.role_agence}
                  </Badge>
                </div>
                <Badge variant="outline" className="text-xs">
                  {currentModules.size} module{currentModules.size !== 1 ? 's' : ''}
                </Badge>
              </button>

              {isOpen && (
                <div className="p-4 space-y-4">
                  {Object.entries(byCategory).map(([category, mods]) => (
                    <div key={category}>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        {category}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {mods.map(mod => (
                          <label key={mod.key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/30 p-1.5 rounded">
                            <Checkbox
                              checked={currentModules.has(mod.key)}
                              onCheckedChange={() => toggle(mod.key)}
                              disabled={updatePreset.isPending}
                            />
                            <div>
                              <span className="text-foreground">{mod.label}</span>
                              <span className="text-muted-foreground text-xs ml-1.5">{mod.key}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default JobProfilePresetsViewV2;
