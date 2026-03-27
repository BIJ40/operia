/**
 * KPIs personnels pour les assistantes (N1)
 * Affiche: Devis créés, Factures créées, Dossiers en cours
 * Utilise usePersonalKpis pour récupérer les vraies données via apogee_user_id
 */

import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Receipt, FolderOpen, LinkIcon } from 'lucide-react';
import { useDashboardPeriod } from '@/pages/DashboardStatic';
import { usePersonalKpis } from '@/hooks/usePersonalKpis';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function AssistantePersonnelKPIs() {
  const { periodLabel } = useDashboardPeriod();
  const { data, isLoading } = usePersonalKpis();

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

  // Extraire les stats assistante
  const stats = data?.type === 'administratif' ? data.data : null;

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
        {/* Devis créés */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
          <div className="p-2 rounded-full bg-blue-500/10">
            <FileText className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Devis créés</p>
            <p className="text-xl font-bold">{stats.devisCrees}</p>
          </div>
        </div>

        {/* Factures créées */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/5 border border-green-500/10">
          <div className="p-2 rounded-full bg-green-500/10">
            <Receipt className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Factures créées</p>
            <p className="text-xl font-bold">{stats.facturesCrees}</p>
          </div>
        </div>

        {/* Dossiers en cours */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/5 border border-amber-500/10">
          <div className="p-2 rounded-full bg-amber-500/10">
            <FolderOpen className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dossiers en cours</p>
            <p className="text-xl font-bold">{stats.dossiersEnCours}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
