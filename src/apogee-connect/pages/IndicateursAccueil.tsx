import { useQuery } from "@tanstack/react-query";
import { DataService } from "@/apogee-connect/services/dataService";
import { useFilters } from "@/apogee-connect/contexts/FiltersContext";
import { useApiToggle } from "@/apogee-connect/contexts/ApiToggleContext";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { Card } from "@/components/ui/card";
import { FolderOpen, ClipboardCheck, FileText, Euro } from "lucide-react";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { PeriodSelector } from "@/apogee-connect/components/filters/PeriodSelector";
import { calculateMonthlyCA } from "@/apogee-connect/utils/monthlyCalculations";
import { MonthlyCAChart } from "@/apogee-connect/components/widgets/MonthlyCAChart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { logWarn, logError } from "@/lib/logger";
import { useStatiaIndicateurs } from "@/statia/hooks/useStatiaIndicateurs";
import { PageHeader } from "@/components/layout/PageHeader";
import { ROUTES } from "@/config/routes";
import { HelpiMascot } from "@/components/helpi/HelpiMascot";
import { usePlanAccess } from "@/hooks/access-rights/usePlanAccess";

export default function IndicateursAccueil() {
  const { filters } = useFilters();
  const { isApiEnabled } = useApiToggle();
  const { agencyChangeCounter, currentAgency, isAgencyReady } = useAgency();
  const userAgency = currentAgency?.id || "";
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const { hasRequiredPlan: hasProPlan } = usePlanAccess('PRO');

  // StatIA V1: Hook centralisé pour les indicateurs
  const { data: statiaData, isLoading: statiaLoading, error: statiaError } = useStatiaIndicateurs(selectedYear);

  // Chargement séparé pour le graphique mensuel (sera migré vers StatIA plus tard)
  const { data: monthlyData } = useQuery({
    queryKey: ["monthly-ca", isApiEnabled, agencyChangeCounter, selectedYear],
    enabled: isAgencyReady && isApiEnabled,
    queryFn: async () => {
      if (!currentAgency?.id) return null;
      const apiData = await DataService.loadAllData(isApiEnabled, false, userAgency);
      return calculateMonthlyCA(
        apiData.factures || [],
        apiData.clients || [],
        apiData.projects || [],
        selectedYear,
        userAgency
      );
    },
  });

  // Combine StatIA data with monthly data
  const data = statiaData ? { ...statiaData, monthlyCAData: monthlyData } : null;
  const isLoading = statiaLoading;
  const error = statiaError;

  if (!isAgencyReady) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <p className="text-2xl text-muted-foreground animate-pulse">Chargement de vos données d&apos;agence...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <p className="text-2xl text-muted-foreground animate-pulse">Chargement des indicateurs...</p>
      </div>
    );
  }

  if (error) {
    logError('INDICATEURS', 'Erreur de chargement des indicateurs', { error });
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <p className="text-2xl text-muted-foreground">Erreur de chargement des données</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <p className="text-2xl text-muted-foreground">Aucune donnée disponible</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 sm:space-y-6">
      <PageHeader
        title="Indicateurs généraux"
        subtitle="Vue d'ensemble des KPI de votre agence"
        backTo={ROUTES.agency.index}
        backLabel="Mon Agence"
      />
      
      {/* Layout 2 colonnes : Temporels à gauche, Globaux à droite */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* COLONNE GAUCHE - KPI Temporels */}
        <Card className="p-3 sm:p-4 border-2 border-primary/20 bg-gradient-to-br from-background to-muted/20">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <h2 className="text-base sm:text-lg font-semibold text-foreground whitespace-nowrap">Indicateurs Temporels</h2>
              <div className="relative z-10">
                <div className="scale-90 sm:scale-100 origin-left sm:origin-right">
                  <PeriodSelector />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* KPI 1: Dossiers reçus */}
              <Card className="p-3 hover:scale-105 transition-all duration-200 cursor-pointer border hover:border-blue-500/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="relative group">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-1.5 rounded cursor-help">
                      <FolderOpen className="w-4 h-4 text-white" />
                    </div>
                    <div className="absolute z-50 left-0 top-full mt-1 rounded-md border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Nombre de dossiers créés sur la période sélectionnée.
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Dossiers reçus</p>
                </div>
                <p className="text-xl font-bold">{data?.dossiersJour || 0}</p>
              </Card>

              {/* KPI 2: RDV réalisés */}
              <Card className="p-3 hover:scale-105 transition-all duration-200 cursor-pointer border hover:border-green-500/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="relative group">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 p-1.5 rounded cursor-help">
                      <ClipboardCheck className="w-4 h-4 text-white" />
                    </div>
                    <div className="absolute z-50 left-0 top-full mt-1 rounded-md border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Nombre de rendez-vous réalisés sur la période.
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">RDV réalisés</p>
                </div>
                <p className="text-xl font-bold">{data?.rtJour || 0}</p>
              </Card>

              {/* KPI 3: Devis émis */}
              <Card className="p-3 hover:scale-105 transition-all duration-200 cursor-pointer border hover:border-purple-500/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="relative group">
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-1.5 rounded cursor-help">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <div className="absolute z-50 left-0 top-full mt-1 rounded-md border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Devis envoyés (state ≠ draft) et montant HT cumulé sur la période.
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Devis émis</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-bold">{data?.devisJour || 0}</p>
                  {data?.caDevis !== undefined && data.caDevis > 0 && (
                    <span className="text-[10px] text-muted-foreground">({formatEuros(data.caDevis)})</span>
                  )}
                </div>
              </Card>

              {/* KPI 4: CA période */}
              <Card className="p-3 hover:scale-105 transition-all duration-200 cursor-pointer border hover:border-orange-500/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="relative group">
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-1.5 rounded cursor-help">
                      <Euro className="w-4 h-4 text-white" />
                    </div>
                    <div className="absolute z-50 left-0 top-full mt-1 rounded-md border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Somme du montant HT des factures (type = facture) sur la période.
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">CA période</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-bold">{formatEuros(data?.caJour || 0)}</p>
                  {data?.nbFacturesCA !== undefined && (
                    <span className="text-[10px] text-muted-foreground">({data.nbFacturesCA})</span>
                  )}
                </div>
              </Card>

              {/* KPI 5: Taux de SAV */}
              <Card className="p-3 hover:scale-105 transition-all duration-200 cursor-pointer border hover:border-red-500/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="relative group">
                    <div className="bg-gradient-to-br from-red-500 to-red-600 p-1.5 rounded flex items-center justify-center cursor-help">
                      <span className="text-white font-bold text-xs">SAV</span>
                    </div>
                    <div className="absolute z-50 left-0 top-full mt-1 rounded-md border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Pourcentage d&apos;interventions de type SAV sur l&apos;ensemble.
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Taux de SAV</p>
                </div>
                <p className="text-xl font-bold">{(data?.tauxSAVGlobal || 0).toFixed(1)}%</p>
              </Card>

              {/* KPI 6: Dossiers complexes */}
              <Card className="p-3 hover:scale-105 transition-all duration-200 cursor-pointer border hover:border-indigo-500/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="relative group">
                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-1.5 rounded flex items-center justify-center cursor-help">
                      <span className="text-white font-bold text-xs">📊</span>
                    </div>
                    <div className="absolute z-50 left-0 top-full mt-1 rounded-md border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Dossiers avec ≥6 visites ET ≥2500€ HT ET ≥2 univers.
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Dossiers complexes</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-bold">{data?.dossiersComplexes?.tauxComplexite || 0}%</p>
                  {data?.dossiersComplexes?.nbComplexes !== undefined && (
                    <span className="text-[10px] text-muted-foreground">({data.dossiersComplexes.nbComplexes}/{data.dossiersComplexes.nbTotal})</span>
                  )}
                </div>
              </Card>

              {/* KPI 7: Panier moyen */}
              <Card className="p-3 hover:scale-105 transition-all duration-200 cursor-pointer border hover:border-pink-500/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="relative group">
                    <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-1.5 rounded flex items-center justify-center cursor-help">
                      <span className="text-white font-bold text-xs">🛒</span>
                    </div>
                    <div className="absolute z-50 left-0 top-full mt-1 rounded-md border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Montant moyen HT facturé par dossier facturé.
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Panier moyen</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-bold">{formatEuros(data?.panierMoyen?.panierMoyen || 0)}</p>
                  {data?.panierMoyen?.nbDossiers !== undefined && (
                    <span className="text-[10px] text-muted-foreground">({data.panierMoyen.nbDossiers})</span>
                  )}
                </div>
              </Card>

              {/* KPI 8: Taux de transformation */}
              <Card className="p-3 hover:scale-105 transition-all duration-200 cursor-pointer border hover:border-cyan-500/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="relative group">
                    <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 p-1.5 rounded flex items-center justify-center cursor-help">
                      <span className="text-white font-bold text-xs">📈</span>
                    </div>
                    <div className="absolute z-50 left-0 top-full mt-1 rounded-md border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Pourcentage de devis envoyés qui passent au statut accepté / facturé.
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Taux transfo devis</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-bold">{data?.tauxTransformationDevis?.tauxTransformation || 0}%</p>
                  {data?.tauxTransformationDevis?.nbAcceptes !== undefined && (
                    <span className="text-[10px] text-muted-foreground">({data.tauxTransformationDevis.nbAcceptes}/{data.tauxTransformationDevis.nbEnvoyes})</span>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </Card>

        {/* COLONNE DROITE - KPI Globaux */}
        <Card className="p-3 sm:p-4 border-2 border-primary/20 bg-gradient-to-br from-background to-muted/20">
          <div className="space-y-3">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">Indicateurs Globaux</h2>

            <div className="grid grid-cols-2 gap-2">
              {/* KPI 9: Délai moyen */}
              <Card className="p-3 hover:scale-105 transition-all duration-200 cursor-pointer border hover:border-teal-500/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="relative group">
                    <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-1.5 rounded flex items-center justify-center cursor-help">
                      <span className="text-white font-bold text-xs">⏱️</span>
                    </div>
                    <div className="absolute z-50 left-0 top-full mt-1 rounded-md border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Délai moyen en jours entre création dossier et facturation.
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Délai moyen d&apos;un dossier</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-bold">{data?.delaiDossierFacture?.delaiMoyen || 0}j</p>
                  {data?.delaiDossierFacture?.nbDossiers !== undefined && (
                    <span className="text-[10px] text-muted-foreground">({data.delaiDossierFacture.nbDossiers})</span>
                  )}
                </div>
              </Card>

              {/* KPI 10: Nb Moyen Interventions/Dossier */}
              <Card className="p-3 hover:scale-105 transition-all duration-200 cursor-pointer border hover:border-amber-500/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="relative group">
                    <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-1.5 rounded flex items-center justify-center cursor-help">
                      <span className="text-white font-bold text-xs">📊</span>
                    </div>
                    <div className="absolute z-50 left-0 top-full mt-1 rounded-md border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Nombre moyen de rendez-vous (interventions) par dossier.
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Nb moyen RDV/Dossier</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-bold">{data?.nbMoyenInterventionsParDossier?.nbMoyen || 0}</p>
                  {data?.nbMoyenInterventionsParDossier?.nbProjets !== undefined && (
                    <span className="text-[10px] text-muted-foreground">({data.nbMoyenInterventionsParDossier.nbProjets})</span>
                  )}
                </div>
              </Card>

              {/* KPI 11: Nb Moyen Visites/Intervention */}
              <Card className="p-3 hover:scale-105 transition-all duration-200 cursor-pointer border hover:border-lime-500/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="relative group">
                    <div className="bg-gradient-to-br from-lime-500 to-lime-600 p-1.5 rounded flex items-center justify-center cursor-help">
                      <span className="text-white font-bold text-xs">📍</span>
                    </div>
                    <div className="absolute z-50 left-0 top-full mt-1 rounded-md border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Nombre moyen de visites réalisées au sein d&apos;un même rendez-vous.
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Nb moyen visites/RDV</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-bold">{data?.nbMoyenVisitesParIntervention?.nbMoyen || 0}</p>
                  {data?.nbMoyenVisitesParIntervention?.nbInterventions !== undefined && (
                    <span className="text-[10px] text-muted-foreground">({data.nbMoyenVisitesParIntervention.nbInterventions})</span>
                  )}
                </div>
              </Card>

              {/* KPI 12: Taux Multi-Univers */}
              <Card className="p-3 hover:scale-105 transition-all duration-200 cursor-pointer border hover:border-violet-500/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="relative group">
                    <div className="bg-gradient-to-br from-violet-500 to-violet-600 p-1.5 rounded flex items-center justify-center cursor-help">
                      <span className="text-white font-bold text-xs">🌐</span>
                    </div>
                    <div className="absolute z-50 left-0 top-full mt-1 rounded-md border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Pourcentage de dossiers faisant intervenir au moins deux univers.
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Multi-univers</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-bold">{data?.tauxDossiersMultiUnivers?.tauxMultiUnivers || 0}%</p>
                  {data?.tauxDossiersMultiUnivers?.nbMultiUnivers !== undefined && (
                    <span className="text-[10px] text-muted-foreground">
                      ({data.tauxDossiersMultiUnivers.nbMultiUnivers}/{data.tauxDossiersMultiUnivers.nbTotal})
                    </span>
                  )}
                </div>
              </Card>

              {/* KPI 13: Taux One Shot */}
              <Card className="p-3 hover:scale-105 transition-all duration-200 cursor-pointer border hover:border-rose-500/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="relative group">
                    <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-1.5 rounded flex items-center justify-center cursor-help">
                      <span className="text-white font-bold text-xs">⚡</span>
                    </div>
                    <div className="absolute z-50 left-0 top-full mt-1 rounded-md border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Pourcentage de factures émises sans devis associé (One Shot).
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Taux One Shot</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-bold">{data?.tauxDossiersSansDevis?.tauxSansDevis || 0}%</p>
                  {data?.tauxDossiersSansDevis?.nbSansDevis !== undefined && (
                    <span className="text-[10px] text-muted-foreground">
                      ({data.tauxDossiersSansDevis.nbSansDevis}/{data.tauxDossiersSansDevis.nbFactures})
                    </span>
                  )}
                </div>
              </Card>

              {/* KPI 14: Taux Multi-Techniciens */}
              <Card className="p-3 hover:scale-105 transition-all duration-200 cursor-pointer border hover:border-sky-500/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="relative group">
                    <div className="bg-gradient-to-br from-sky-500 to-sky-600 p-1.5 rounded flex items-center justify-center cursor-help">
                      <span className="text-white font-bold text-xs">👥</span>
                    </div>
                    <div className="absolute z-50 left-0 top-full mt-1 rounded-md border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Pourcentage de dossiers avec au moins deux techniciens différents.
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Multi-techniciens</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-bold">{data?.tauxDossiersMultiTechniciens?.tauxMultiTech || 0}%</p>
                  {data?.tauxDossiersMultiTechniciens?.nbMultiTech !== undefined && (
                    <span className="text-[10px] text-muted-foreground">
                      ({data.tauxDossiersMultiTechniciens.nbMultiTech}/{data.tauxDossiersMultiTechniciens.nbTotal})
                    </span>
                  )}
                </div>
              </Card>

              {/* KPI 15: Polyvalence Techniciens */}
              <Card className="p-3 hover:scale-105 transition-all duration-200 cursor-pointer border hover:border-emerald-500/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="relative group">
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-1.5 rounded flex items-center justify-center cursor-help">
                      <span className="text-white font-bold text-xs">🎯</span>
                    </div>
                    <div className="absolute z-50 left-0 top-full mt-1 rounded-md border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Nombre moyen d&apos;univers différents couverts par technicien.
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Polyvalence tech</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-bold">{data?.polyvalenceTechniciens?.polyvalenceMoyenne || 0}</p>
                  {data?.polyvalenceTechniciens?.nbTechniciens !== undefined && (
                    <span className="text-[10px] text-muted-foreground">
                      ({data.polyvalenceTechniciens.nbTechniciens} techs)
                    </span>
                  )}
                </div>
              </Card>

              {/* KPI 16: Délai Dossier → 1er Devis */}
              <Card className="p-3 hover:scale-105 transition-all duration-200 cursor-pointer border hover:border-sky-500/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="relative group">
                    <div className="bg-gradient-to-br from-sky-500 to-sky-600 p-1.5 rounded flex items-center justify-center cursor-help">
                      <span className="text-white font-bold text-xs">📝</span>
                    </div>
                    <div className="absolute z-50 left-0 top-full mt-1 rounded-md border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Délai moyen entre création dossier et envoi premier devis.
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Délai Dossier → 1er Devis</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-bold">
                    {data?.delaiDossierPremierDevis?.delaiMoyen === null || data?.delaiDossierPremierDevis?.delaiMoyen === undefined
                      ? '–'
                      : `${data.delaiDossierPremierDevis.delaiMoyen}j`}
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </Card>
      </div>

      {/* Graphique CA Mensuel */}
      <div>
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-helpconfort-blue-dark to-helpconfort-blue-lighter bg-clip-text text-transparent">
            Évolution du CA
          </h2>
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-[120px] bg-gradient-to-r from-primary to-helpconfort-blue-dark text-white border-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border border-border z-50">
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {data?.monthlyCAData && <MonthlyCAChart data={data.monthlyCAData} />}
      </div>
    </div>
  );
}
