/**
 * KPIs personnels pour les techniciens (N1)
 * Affiche: Mon CA, Mes interventions, Mon taux SAV
 */

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Euro, Wrench, AlertTriangle } from 'lucide-react';
import { useDashboardPeriod } from '@/pages/DashboardStatic';

export function TechnicienPersonnelKPIs() {
  const { periodLabel } = useDashboardPeriod();
  
  // TODO: Implémenter le hook useTechnicienPersonnelStats
  // basé sur apogee_user_id du collaborateur connecté
  const isLoading = false;
  const stats = {
    caPersonnel: 12450,
    interventionsRealisees: 28,
    tauxSavPersonnel: 2.1,
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Mes statistiques • {periodLabel}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Mon CA */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
          <div className="p-2 rounded-full bg-primary/10">
            <Euro className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Mon CA</p>
            <p className="text-xl font-bold">
              {stats.caPersonnel.toLocaleString('fr-FR')} €
            </p>
          </div>
        </div>

        {/* Mes interventions */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
          <div className="p-2 rounded-full bg-blue-500/10">
            <Wrench className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Mes interventions</p>
            <p className="text-xl font-bold">{stats.interventionsRealisees}</p>
          </div>
        </div>

        {/* Mon taux SAV */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-orange-500/5 border border-orange-500/10">
          <div className="p-2 rounded-full bg-orange-500/10">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Mon taux SAV</p>
            <p className="text-xl font-bold">{stats.tauxSavPersonnel.toFixed(1)} %</p>
          </div>
        </div>
      </div>
    </div>
  );
}
