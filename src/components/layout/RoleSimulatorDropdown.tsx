/**
 * RoleSimulatorDropdown - Sélecteur de simulation de vue pour admins N5+
 * Affiche un badge coloré quand une simulation est active
 */

import { useRoleSimulator, SIMULATED_VIEWS, SimulatedView } from '@/contexts/RoleSimulatorContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Check, User, Building2, Network, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const VIEW_ICONS: Record<SimulatedView, React.ElementType> = {
  none: Eye,
  franchisee: Building2,
  franchiseur: Network,
  n0_project: UserCircle,
  n0_simple: User,
};

export function RoleSimulatorDropdown() {
  const { isAdmin } = useAuth();
  const { simulatedView, setSimulatedView, isSimulating, viewConfig } = useRoleSimulator();

  // Seulement visible pour les admins N5+
  if (!isAdmin) {
    return null;
  }

  const CurrentIcon = VIEW_ICONS[simulatedView];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isSimulating ? 'default' : 'ghost'}
          size="sm"
          className={cn(
            'gap-2 h-8',
            isSimulating && 'bg-amber-500 hover:bg-amber-600 text-white'
          )}
        >
          <CurrentIcon className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">
            {isSimulating ? viewConfig.label : 'Simuler'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Simuler une vue utilisateur
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {SIMULATED_VIEWS.map((view) => {
          const Icon = VIEW_ICONS[view.id];
          const isSelected = simulatedView === view.id;
          
          return (
            <DropdownMenuItem
              key={view.id}
              onClick={() => setSimulatedView(view.id)}
              className={cn(
                'flex items-center gap-3 cursor-pointer',
                isSelected && 'bg-primary/10'
              )}
            >
              <Icon className={cn(
                'w-4 h-4',
                isSelected ? 'text-primary' : 'text-muted-foreground'
              )} />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium',
                  isSelected && 'text-primary'
                )}>
                  {view.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {view.description}
                </p>
              </div>
              {isSelected && (
                <Check className="w-4 h-4 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
