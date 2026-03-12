/**
 * Badges inline pour les modules utilisateur - V3 aligné avec les plans
 * Affiche les modules activés pour un utilisateur sous forme de badges cliquables
 * 
 * Auto-dérivé de MODULE_DEFINITIONS pour rester synchronisé.
 */

import { memo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, BarChart3, Users, Truck, Handshake, Calendar, 
  Video, FileText, BookOpen, Kanban, HelpCircle, Plus, Crown,
  Target, Camera, Brain,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnabledModules, ModuleKey } from '@/types/modules';
import { PLAN_VISIBLE_MODULES, MODULE_SHORT_LABELS } from '@/types/modules';

// Icônes pour chaque module — doit inclure TOUS les modules visibles
const MODULE_ICONS: Partial<Record<ModuleKey, LucideIcon>> = {
  'pilotage.agence': Building2,
  'pilotage.statistiques': BarChart3,
  'organisation.salaries': Users,
  'organisation.parc': Truck,
  'organisation.apporteurs': Handshake,
  'organisation.plannings': Calendar,
  'organisation.reunions': Video,
  'mediatheque.documents': FileText,
  'support.guides': BookOpen,
  ticketing: Kanban,
  'support.aide_en_ligne': HelpCircle,
  prospection: Target,
  'commercial.realisations': Camera,
  planning_augmente: Brain,
  reseau_franchiseur: Crown,
  admin_plateforme: Crown,
};

// Couleurs pour les badges actifs
const MODULE_COLORS: Partial<Record<ModuleKey, string>> = {
  'pilotage.agence': 'bg-blue-500 text-white hover:bg-blue-600',
  'pilotage.dashboard': 'bg-emerald-500 text-white hover:bg-emerald-600',
  'organisation.salaries': 'bg-violet-500 text-white hover:bg-violet-600',
  'organisation.parc': 'bg-orange-500 text-white hover:bg-orange-600',
  'organisation.apporteurs': 'bg-pink-500 text-white hover:bg-pink-600',
  'organisation.plannings': 'bg-cyan-500 text-white hover:bg-cyan-600',
  'organisation.reunions': 'bg-indigo-500 text-white hover:bg-indigo-600',
  'mediatheque.documents': 'bg-amber-500 text-white hover:bg-amber-600',
  'support.guides': 'bg-teal-500 text-white hover:bg-teal-600',
  ticketing: 'bg-purple-500 text-white hover:bg-purple-600',
  'support.aide_en_ligne': 'bg-rose-500 text-white hover:bg-rose-600',
  prospection: 'bg-orange-600 text-white hover:bg-orange-700',
  'commercial.realisations': 'bg-sky-500 text-white hover:bg-sky-600',
  planning_augmente: 'bg-fuchsia-500 text-white hover:bg-fuchsia-600',
  reseau_franchiseur: 'bg-slate-700 text-white hover:bg-slate-800',
  admin_plateforme: 'bg-slate-800 text-white hover:bg-slate-900',
};

interface InlineModuleBadgesProps {
  userId: string;
  enabledModules: EnabledModules | null;
  canEdit: boolean;
  onToggle: (moduleKey: ModuleKey, enabled: boolean, optionKey?: string) => void;
  /** Modules du plan de l'agence (pour montrer ce qui vient du plan vs override) */
  planModules?: ModuleKey[];
}

function isModuleEnabled(modules: EnabledModules | null, moduleKey: ModuleKey): boolean {
  if (!modules) return false;
  const mod = modules[moduleKey];
  if (!mod) return false;
  if (typeof mod === 'boolean') return mod;
  if (typeof mod === 'object') return mod.enabled ?? false;
  return false;
}

export const InlineModuleBadges = memo(function InlineModuleBadges({
  userId,
  enabledModules,
  canEdit,
  onToggle,
  planModules = [],
}: InlineModuleBadgesProps) {
  const [open, setOpen] = useState(false);
  
  // Modules activés pour cet utilisateur
  const activeModules = PLAN_VISIBLE_MODULES.filter(key => 
    isModuleEnabled(enabledModules, key)
  );
  
  // Modules non activés
  const inactiveModules = PLAN_VISIBLE_MODULES.filter(key => 
    !isModuleEnabled(enabledModules, key)
  );

  const handleToggle = (moduleKey: ModuleKey, enabled: boolean) => {
    onToggle(moduleKey, enabled);
  };

  // Mode lecture seule
  if (!canEdit) {
    if (activeModules.length === 0) {
      return <span className="text-muted-foreground text-sm">Aucun module</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {activeModules.slice(0, 4).map(key => {
          const Icon = MODULE_ICONS[key];
          return (
            <Badge key={key} className={cn("text-xs", MODULE_COLORS[key])}>
              <Icon className="w-3 h-3 mr-1" />
              {MODULE_SHORT_LABELS[key]}
            </Badge>
          );
        })}
        {activeModules.length > 4 && (
          <Badge variant="secondary" className="text-xs">
            +{activeModules.length - 4}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex flex-wrap gap-1 cursor-pointer group min-w-[100px]">
          {activeModules.length === 0 ? (
            <Badge variant="outline" className="text-xs text-muted-foreground hover:bg-muted">
              <Plus className="w-3 h-3 mr-1" />
              Configurer
            </Badge>
          ) : (
            <>
              {activeModules.slice(0, 3).map(key => {
                const Icon = MODULE_ICONS[key];
                const isFromPlan = planModules.includes(key);
                return (
                  <Badge 
                    key={key} 
                    className={cn(
                      "text-xs transition-colors",
                      MODULE_COLORS[key],
                      isFromPlan && "ring-1 ring-primary/50"
                    )}
                    title={isFromPlan ? "Inclus dans le plan" : "Override utilisateur"}
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {MODULE_SHORT_LABELS[key]}
                  </Badge>
                );
              })}
              {activeModules.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{activeModules.length - 3}
                </Badge>
              )}
              {inactiveModules.length > 0 && (
                <Badge 
                  variant="outline" 
                  className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Plus className="w-3 h-3" />
                </Badge>
              )}
            </>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <p className="text-sm font-medium">Modules configurés</p>
          <p className="text-xs text-muted-foreground">
            Configuration individuelle — cochez les modules pour cet utilisateur
          </p>
        </div>
        <div className="p-3 max-h-[400px] overflow-y-auto">
          <div className="space-y-1">
            {PLAN_VISIBLE_MODULES.map(key => {
              const Icon = MODULE_ICONS[key];
              const isEnabled = isModuleEnabled(enabledModules, key);
              const isFromPlan = planModules.includes(key);
              
              return (
                <div 
                  key={key} 
                  className={cn(
                    "flex items-center justify-between py-2 px-2 rounded-md",
                    isEnabled && "bg-muted/50"
                  )}
                >
                  <Label 
                    htmlFor={`${userId}-${key}`} 
                    className="flex items-center gap-2 text-sm cursor-pointer flex-1"
                  >
                    <Icon className={cn(
                      "w-4 h-4",
                      isEnabled ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className={cn(!isEnabled && "text-muted-foreground")}>
                      {MODULE_SHORT_LABELS[key]}
                    </span>
                    {isFromPlan && isEnabled && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">
                        Plan
                      </span>
                    )}
                  </Label>
                  <Switch
                    id={`${userId}-${key}`}
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleToggle(key, checked)}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <Separator />
        <div className="p-2 text-xs text-muted-foreground text-center">
          {activeModules.length} module{activeModules.length > 1 ? 's' : ''} activé{activeModules.length > 1 ? 's' : ''}
        </div>
      </PopoverContent>
    </Popover>
  );
});
