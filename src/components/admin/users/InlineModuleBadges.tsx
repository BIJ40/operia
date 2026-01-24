/**
 * Badges inline pour les modules utilisateur - Ultra simplifié
 * Affiche les accès spéciaux sous forme de badges cliquables
 */

import { memo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Kanban, Headphones, HelpCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnabledModules, ModuleKey } from '@/types/modules';

// Accès spéciaux gérés individuellement (hors plan agence)
const SPECIAL_ACCESS = [
  { 
    key: 'apogee_tickets' as ModuleKey, 
    label: 'Projet', 
    icon: Kanban,
    color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300',
    activeColor: 'bg-indigo-500 text-white hover:bg-indigo-600',
  },
  { 
    key: 'support' as ModuleKey, 
    option: 'agent',
    label: 'Support Agent', 
    icon: Headphones,
    color: 'bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-300',
    activeColor: 'bg-violet-500 text-white hover:bg-violet-600',
  },
  { 
    key: 'help_academy' as ModuleKey, 
    option: 'edition',
    label: 'Éditeur FAQ', 
    icon: HelpCircle,
    color: 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
    activeColor: 'bg-amber-500 text-white hover:bg-amber-600',
  },
];

interface InlineModuleBadgesProps {
  userId: string;
  enabledModules: EnabledModules | null;
  canEdit: boolean;
  onToggle: (moduleKey: ModuleKey, enabled: boolean, optionKey?: string) => void;
}

function isAccessEnabled(modules: EnabledModules | null, moduleKey: ModuleKey, optionKey?: string): boolean {
  if (!modules) return false;
  const mod = modules[moduleKey];
  if (!mod) return false;
  
  if (optionKey) {
    if (typeof mod === 'object' && mod.options) {
      return !!mod.options[optionKey];
    }
    return false;
  }
  
  if (typeof mod === 'boolean') return mod;
  if (typeof mod === 'object') return mod.enabled ?? false;
  return false;
}

export const InlineModuleBadges = memo(function InlineModuleBadges({
  userId,
  enabledModules,
  canEdit,
  onToggle,
}: InlineModuleBadgesProps) {
  const [open, setOpen] = useState(false);
  
  const activeAccess = SPECIAL_ACCESS.filter(access => 
    isAccessEnabled(enabledModules, access.key, access.option)
  );
  
  const inactiveAccess = SPECIAL_ACCESS.filter(access => 
    !isAccessEnabled(enabledModules, access.key, access.option)
  );

  const handleToggle = (access: typeof SPECIAL_ACCESS[0], enabled: boolean) => {
    onToggle(access.key, enabled, access.option);
  };

  // Si pas le droit d'éditer, afficher juste les badges actifs
  if (!canEdit) {
    if (activeAccess.length === 0) {
      return <span className="text-muted-foreground text-sm">—</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {activeAccess.map(access => (
          <Badge key={access.key} variant="secondary" className={cn("text-xs", access.activeColor)}>
            <access.icon className="w-3 h-3 mr-1" />
            {access.label}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex flex-wrap gap-1 cursor-pointer group">
          {activeAccess.length === 0 ? (
            <Badge variant="outline" className="text-xs text-muted-foreground hover:bg-muted">
              <Plus className="w-3 h-3 mr-1" />
              Ajouter accès
            </Badge>
          ) : (
            <>
              {activeAccess.map(access => (
                <Badge key={access.key} className={cn("text-xs transition-colors", access.activeColor)}>
                  <access.icon className="w-3 h-3 mr-1" />
                  {access.label}
                </Badge>
              ))}
              {inactiveAccess.length > 0 && (
                <Badge variant="outline" className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="w-3 h-3" />
                </Badge>
              )}
            </>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <p className="text-sm font-medium">Accès spéciaux</p>
          <div className="space-y-2">
            {SPECIAL_ACCESS.map(access => {
              const isEnabled = isAccessEnabled(enabledModules, access.key, access.option);
              return (
                <div key={access.key + (access.option || '')} className="flex items-center justify-between">
                  <Label htmlFor={`${userId}-${access.key}`} className="flex items-center gap-2 text-sm cursor-pointer">
                    <access.icon className="w-4 h-4 text-muted-foreground" />
                    {access.label}
                  </Label>
                  <Switch
                    id={`${userId}-${access.key}`}
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleToggle(access, checked)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});
