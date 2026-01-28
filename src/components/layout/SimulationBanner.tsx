/**
 * SimulationBanner - Bandeau affiché quand l'admin simule une vue utilisateur
 */

import { useRoleSimulator, SIMULATED_VIEWS } from '@/contexts/RoleSimulatorContext';
import { X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SimulationBanner() {
  const { isSimulating, viewConfig, resetSimulation } = useRoleSimulator();

  if (!isSimulating) return null;

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-[100] h-10 flex items-center justify-center gap-4",
      "bg-amber-500 text-amber-950 shadow-lg"
    )}>
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4" />
        <span className="text-sm font-medium">
          Simulation : {viewConfig.label}
        </span>
        <span className="text-xs opacity-70">
          ({viewConfig.description})
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={resetSimulation}
        className="h-7 px-2 text-amber-950 hover:bg-amber-600 hover:text-amber-950"
      >
        <X className="w-4 h-4 mr-1" />
        Quitter
      </Button>
    </div>
  );
}
