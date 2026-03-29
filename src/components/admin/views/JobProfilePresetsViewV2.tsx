import React, { useState } from 'react';
import { useJobProfilePresets } from '@/hooks/access-rights/useJobProfilePresets';
import { useModuleCatalog, ModuleCatalogEntry } from '@/hooks/access-rights/useModuleCatalog';
import { usePermissionsBridge } from '@/hooks/usePermissionsBridge';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';

const CATEGORY_ORDER = ['accueil', 'pilotage', 'commercial', 'organisation', 'mediatheque', 'support', 'ticketing', 'admin'];

const CATEGORY_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  accueil:      { bg: 'bg-violet-50', text: 'text-violet-700', icon: '🏠' },
  pilotage:     { bg: 'bg-blue-50', text: 'text-blue-700', icon: '📊' },
  commercial:   { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: '💼' },
  organisation: { bg: 'bg-amber-50', text: 'text-amber-700', icon: '🗂️' },
  mediatheque:  { bg: 'bg-pink-50', text: 'text-pink-700', icon: '📚' },
  support:      { bg: 'bg-cyan-50', text: 'text-cyan-700', icon: '🛟' },
  ticketing:    { bg: 'bg-orange-50', text: 'text-orange-700', icon: '🎫' },
  admin:        { bg: 'bg-slate-100', text: 'text-slate-700', icon: '⚙️' },
};

export function JobProfilePresetsViewV2() {
  const { isAdmin } = usePermissionsBridge();
  const { presets, isLoading: presetsLoading, updatePreset } = useJobProfilePresets();
  const { modules, isLoading: modulesLoading } = useModuleCatalog();
  const [expanded, setExpanded] = useState<string | null>(null);

  const delegatableModules = modules.filter(
    (m: ModuleCatalogEntry) => m.is_deployed && m.is_delegatable && m.node_type !== 'section' && m.min_role < 5
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

  const sortedCategories = Object.entries(byCategory).sort(([a], [b]) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

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
                  {sortedCategories.map(([category, mods]) => {
                    const style = CATEGORY_STYLES[category] ?? { bg: 'bg-muted/30', text: 'text-muted-foreground', icon: '📦' };
                    return (
                      <div key={category}>
                        <div className={`${style.bg} rounded-md px-3 py-1.5 mb-2`}>
                          <h4 className={`text-xs font-bold ${style.text} uppercase tracking-widest`}>
                            <span className="mr-1.5 text-sm">{style.icon}</span>
                            {category}
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {mods.map(mod => (
                            <label key={mod.key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/30 p-1.5 rounded">
                              <Checkbox
                                checked={currentModules.has(mod.key)}
                                onCheckedChange={() => toggle(mod.key)}
                                disabled={updatePreset.isPending}
                              />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground">{mod.label}</span>
                                <span className="text-[10px] text-muted-foreground/60 font-mono">{mod.key}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
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
