/**
 * KPIs personnels pour les techniciens (N1)
 * Affiche: Mon CA, Mes interventions, Dossiers facturés
 * Utilise usePersonalKpis pour récupérer les vraies données via apogee_user_id
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Euro, Wrench, FolderCheck, LinkIcon } from 'lucide-react';
import { useDashboardPeriod } from '@/pages/DashboardStatic';
import { usePersonalKpis } from '@/hooks/usePersonalKpis';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function TechnicienPersonnelKPIs() {
  const { periodLabel, dateRange } = useDashboardPeriod();
  const { data, isLoading } = usePersonalKpis({ dateRange });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  // Si pas de lien apogee_user_id
  if (data?.type === 'not_linked') {
    return (
      <Alert variant="default" className="bg-amber-500/10 border-amber-500/20">
        <LinkIcon className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-700">
          Votre compte utilisateur n'est pas encore lié à votre profil Apogée. 
          Contactez votre responsable RH ou votre agence pour faire lier votre compte.
        </AlertDescription>
      </Alert>
    );
  }

  // Extraire les stats technicien
  const stats = data?.type === 'technicien' ? data.data : null;

  if (!stats) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        Données indisponibles
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
              {stats.caMonth.toLocaleString('fr-FR')} €
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

        {/* Dossiers facturés */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/5 border border-green-500/10">
          <div className="p-2 rounded-full bg-green-500/10">
            <FolderCheck className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dossiers facturés</p>
            <p className="text-xl font-bold">{stats.dossiersTraites}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
