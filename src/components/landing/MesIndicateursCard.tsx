import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { TrendingUp, AlertCircle, Clock, Euro } from "lucide-react";
import { DataService } from "@/apogee-connect/services/dataService";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { calculateDashboardStats } from "@/apogee-connect/utils/dashboardCalculations";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

export function MesIndicateursCard() {
  const { agence } = useAuth();
  const { isAgencyReady, currentAgency } = useAgency();

  const { data: kpis, isLoading, error } = useQuery({
    queryKey: ["landing-kpis-preview", agence],
    enabled: !!agence && isAgencyReady,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      console.log('🎯 MesIndicateursCard - Chargement KPIs pour agence:', agence, 'isAgencyReady:', isAgencyReady);
      try {
        const apiData = await DataService.loadAllData(true);
        
        const stats = calculateDashboardStats({
          projects: apiData.projects || [],
          interventions: apiData.interventions || [],
          factures: apiData.factures || [],
          devis: apiData.devis || [],
          clients: apiData.clients || [],
          users: apiData.users || [],
        }, undefined, currentAgency?.id);

        // Calculer le taux SAV global
        let tauxSAV = 0;
        const savProjectIds = new Set<number>();
        apiData.interventions?.forEach((intervention: any) => {
          const type2 = intervention.type2 || intervention.data?.type2 || "";
          const type = intervention.type || intervention.data?.type || "";
          const isSAV = type2.toLowerCase().includes("sav") || type.toLowerCase().includes("sav");
          
          if (isSAV && intervention.projectId) {
            savProjectIds.add(intervention.projectId);
          }
        });
        
        const totalProjects = apiData.projects?.length || 0;
        if (totalProjects > 0) {
          tauxSAV = (savProjectIds.size / totalProjects) * 100;
        }

        // Calculer le délai moyen dossier -> facture
        const { calculateDelaiMoyenDossierFacture } = await import("@/apogee-connect/utils/dashboardCalculations");
        const delaiDossierFacture = calculateDelaiMoyenDossierFacture(
          apiData.factures || [],
          apiData.projects || [],
          undefined
        );

        return {
          caTotal: stats.caJour || 0,
          tauxSAV: tauxSAV,
          delaiMoyen: delaiDossierFacture.delaiMoyen,
          nbProjets: stats.dossiersJour || 0,
        };
      } catch (error) {
        console.error('Erreur chargement KPIs preview:', error);
        return null;
      }
    },
  });

  return (
    <Link
      to="/mes-indicateurs"
      className="group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-2xl p-4 hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 flex flex-col gap-3"
    >
      {/* En-tête avec icône et titre */}
      <div className="flex items-center gap-3">
        <TrendingUp className="w-12 h-12 text-primary flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground">Mes indicateurs</h2>
          <p className="text-xs text-muted-foreground">Tableau de bord KPIs</p>
        </div>
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-2 gap-2 mt-1">
        {isLoading ? (
          <>
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </>
        ) : kpis ? (
          <>
            {/* CA Total */}
            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-2 border border-border/50">
              <div className="flex items-center gap-1 mb-0.5">
                <Euro className="w-3 h-3 text-green-600" />
                <span className="text-[10px] text-muted-foreground font-medium">CA Total</span>
              </div>
              <div className="text-sm font-bold text-foreground">
                {formatEuros(kpis.caTotal)}
              </div>
            </div>

            {/* Taux SAV */}
            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-2 border border-border/50">
              <div className="flex items-center gap-1 mb-0.5">
                <AlertCircle className="w-3 h-3 text-orange-600" />
                <span className="text-[10px] text-muted-foreground font-medium">Taux SAV</span>
              </div>
              <div className="text-sm font-bold text-foreground">
                {kpis.tauxSAV.toFixed(1)}%
              </div>
            </div>

            {/* Délai moyen */}
            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-2 border border-border/50">
              <div className="flex items-center gap-1 mb-0.5">
                <Clock className="w-3 h-3 text-blue-600" />
                <span className="text-[10px] text-muted-foreground font-medium">Délai dossier</span>
              </div>
              <div className="text-sm font-bold text-foreground">
                {kpis.delaiMoyen.toFixed(0)}j
              </div>
            </div>

            {/* Nb Projets */}
            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-2 border border-border/50">
              <div className="flex items-center gap-1 mb-0.5">
                <TrendingUp className="w-3 h-3 text-primary" />
                <span className="text-[10px] text-muted-foreground font-medium">Projets</span>
              </div>
              <div className="text-sm font-bold text-foreground">
                {kpis.nbProjets}
              </div>
            </div>
          </>
        ) : (
          <div className="col-span-2 text-center text-xs text-muted-foreground py-2">
            Aucune donnée disponible
          </div>
        )}
      </div>
    </Link>
  );
}
