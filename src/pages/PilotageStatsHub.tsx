import { Card } from '@/components/ui/card';
import { ROUTES } from '@/config/routes';
import { Link } from 'react-router-dom';
import { BarChart3, Users, Building2, Calendar, LifeBuoy, Settings2, Euro, Clock, FileText, TrendingUp, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { DataService } from '@/apogee-connect/services/dataService';
import { FiltersProvider } from '@/apogee-connect/contexts/FiltersContext';
import { ApiToggleProvider, useApiToggle } from '@/apogee-connect/contexts/ApiToggleContext';
import { AgencyProvider, useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { formatEuros } from '@/apogee-connect/utils/formatters';
import { useState, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfMonth, endOfMonth } from 'date-fns';
import { computeStat } from '@/statia/engine/computeStat';
import { LoadedData, StatParams } from '@/statia/definitions/types';
import { logError } from '@/lib/logger';

// Définition des KPI disponibles
const AVAILABLE_KPIS = [
  { id: 'ca_mois', label: 'CA mois en cours', icon: Euro, color: 'orange' },
  { id: 'delai_dossier_facture', label: 'Délai moyen dossier', icon: Clock, color: 'blue' },
  { id: 'taux_sav', label: 'Taux de SAV global', icon: LifeBuoy, color: 'red' },
  { id: 'delai_devis', label: 'Délai 1er devis', icon: FileText, color: 'purple' },
  { id: 'panier_moyen', label: 'Panier moyen', icon: Euro, color: 'pink' },
  { id: 'taux_transfo', label: 'Taux transfo devis', icon: TrendingUp, color: 'cyan' },
  { id: 'dossiers_recus', label: 'Dossiers reçus', icon: BarChart3, color: 'blue' },
  { id: 'devis_emis', label: 'Devis émis', icon: FileText, color: 'purple' },
] as const;

type KpiId = typeof AVAILABLE_KPIS[number]['id'];

const DEFAULT_SELECTED_KPIS: KpiId[] = ['ca_mois', 'delai_dossier_facture', 'taux_sav', 'delai_devis'];

const STORAGE_KEY = 'pilotage_stats_hub_kpis';

const statsTiles = [
  {
    title: 'Indicateurs généraux',
    description: 'Vue d\'ensemble des KPI de l\'agence (CA, dossiers, interventions, etc.).',
    icon: BarChart3,
    href: ROUTES.pilotage.indicateurs,
  },
  {
    title: 'Indicateurs Apporteurs',
    description: 'Performance par apporteur d\'affaires, volumes, CA, taux de transformation.',
    icon: Users,
    href: ROUTES.pilotage.indicateursApporteurs,
  },
  {
    title: 'Indicateurs Univers',
    description: 'Répartition du chiffre d\'affaires par univers métier (plomberie, électricité, etc.).',
    icon: Building2,
    href: ROUTES.pilotage.indicateursUnivers,
  },
  {
    title: 'Indicateurs Techniciens',
    description: 'Productivité, CA, SAV et performances individuelles des techniciens.',
    icon: Calendar,
    href: ROUTES.pilotage.indicateursTechniciens,
  },
  {
    title: 'Indicateurs SAV',
    description: 'Taux de SAV, multi-visites, réclamations et réinterventions.',
    icon: LifeBuoy,
    href: ROUTES.pilotage.indicateursSav,
  },
];

const colorClasses: Record<string, string> = {
  orange: 'from-orange-500 to-orange-600',
  blue: 'from-blue-500 to-blue-600',
  red: 'from-red-500 to-red-600',
  purple: 'from-purple-500 to-purple-600',
  pink: 'from-pink-500 to-pink-600',
  cyan: 'from-cyan-500 to-cyan-600',
  green: 'from-green-500 to-green-600',
};

export default function PilotageStatsHub() {
  return (
    <ApiToggleProvider>
      <AgencyProvider>
        <FiltersProvider>
          <PilotageStatsHubContent />
        </FiltersProvider>
      </AgencyProvider>
    </ApiToggleProvider>
  );
}

/** Safe wrapper for computeStat */
async function computeStatSafe(statId: string, loadedData: LoadedData, params: StatParams) {
  try {
    return await computeStat(statId, params, {
      getFactures: async () => loadedData.factures,
      getDevis: async () => loadedData.devis,
      getInterventions: async () => loadedData.interventions,
      getProjects: async () => loadedData.projects,
      getUsers: async () => loadedData.users,
      getClients: async () => loadedData.clients,
    });
  } catch (error) {
    logError('STATIA', `Erreur calcul métrique ${statId}`, { error });
    return null;
  }
}

function PilotageStatsHubContent() {
  const { isApiEnabled } = useApiToggle();
  const { agencyChangeCounter, currentAgency, isAgencyReady } = useAgency();
  
  const [selectedKpis, setSelectedKpis] = useState<KpiId[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_SELECTED_KPIS;
      }
    }
    return DEFAULT_SELECTED_KPIS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedKpis));
  }, [selectedKpis]);

  // Date range du mois en cours pour le CA
  const currentMonthRange = useMemo(() => ({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  }), []);

  // StatIA-powered KPIs
  const { data, isLoading } = useQuery({
    queryKey: ['stats-hub-kpis-statia', isApiEnabled, agencyChangeCounter, currentMonthRange],
    enabled: isAgencyReady && isApiEnabled,
    queryFn: async () => {
      if (!currentAgency?.id) return null;
      
      const apiData = await DataService.loadAllData(isApiEnabled);
      
      const loadedData: LoadedData = {
        factures: apiData.factures || [],
        devis: apiData.devis || [],
        interventions: apiData.interventions || [],
        projects: apiData.projects || [],
        users: apiData.users || [],
        clients: apiData.clients || [],
      };
      
      const params: StatParams = {
        dateRange: currentMonthRange,
        agencySlug: currentAgency.id
      };

      // Compute all KPIs via StatIA
      const [
        caResult,
        tauxSavResult,
        tauxTransfoResult,
        nbDevisResult,
        panierMoyenResult,
        dureeDossierResult,
        nbDossiersResult,
        delaiDevisResult
      ] = await Promise.all([
        computeStatSafe('ca_global_ht', loadedData, params),
        computeStatSafe('taux_sav_global', loadedData, params),
        computeStatSafe('taux_transformation_devis_nombre', loadedData, params),
        computeStatSafe('nombre_devis', loadedData, params),
        computeStatSafe('panier_moyen', loadedData, params),
        computeStatSafe('duree_moyenne_dossier', loadedData, params),
        computeStatSafe('nb_dossiers_crees', loadedData, params),
        computeStatSafe('delai_dossier_premier_devis', loadedData, params)
      ]);

      return {
        caMois: (caResult?.value as number) ?? 0,
        tauxSAV: (tauxSavResult?.value as number) ?? 0,
        tauxTransfo: (tauxTransfoResult?.value as number) ?? 0,
        nbDevis: (nbDevisResult?.value as number) ?? 0,
        panierMoyen: (panierMoyenResult?.value as number) ?? 0,
        delaiDossier: (dureeDossierResult?.value as number) ?? 0,
        nbDossiers: (nbDossiersResult?.value as number) ?? 0,
        delaiPremierDevis: (delaiDevisResult?.value as number) ?? 0
      };
    },
  });

  const getKpiValue = (kpiId: KpiId): string => {
    if (!data) return '-';
    
    switch (kpiId) {
      case 'ca_mois':
        return formatEuros(data.caMois || 0);
      case 'delai_dossier_facture':
        return `${data.delaiDossier || 0}j`;
      case 'taux_sav':
        return `${(data.tauxSAV || 0).toFixed(1)}%`;
      case 'delai_devis':
        return `${data.delaiPremierDevis || 0}j`;
      case 'panier_moyen':
        return formatEuros(data.panierMoyen || 0);
      case 'taux_transfo':
        return `${data.tauxTransfo || 0}%`;
      case 'dossiers_recus':
        return `${data.nbDossiers || 0}`;
      case 'devis_emis':
        return `${data.nbDevis || 0}`;
      default:
        return '-';
    }
  };

  const handleKpiChange = (slotIndex: number, newKpiId: KpiId) => {
    setSelectedKpis(prev => {
      const updated = [...prev];
      updated[slotIndex] = newKpiId;
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      {/* Widgets favoris */}
      {isAgencyReady && isApiEnabled && (
        <Card className="p-4 border-2 border-primary/20 bg-gradient-to-br from-background to-muted/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Widgets favoris</h2>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              Cliquez sur <Settings2 className="h-3.5 w-3.5 inline" /> pour personnaliser
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {selectedKpis.map((kpiId, index) => {
              const kpi = AVAILABLE_KPIS.find(k => k.id === kpiId);
              if (!kpi) return null;
              const Icon = kpi.icon;
              
              return (
                <Card key={`${kpiId}-${index}`} className="p-3 relative group hover:shadow-md transition-all">
                  {/* Settings button */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="end">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Choisir un KPI</p>
                        {AVAILABLE_KPIS.map(option => (
                          <button
                            key={option.id}
                            onClick={() => handleKpiChange(index, option.id)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors ${
                              option.id === kpiId ? 'bg-primary/10 text-primary' : ''
                            }`}
                          >
                            <option.icon className="h-4 w-4" />
                            <span className="flex-1 text-left">{option.label}</span>
                            {option.id === kpiId && <Check className="h-4 w-4" />}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  {/* KPI Content */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`bg-gradient-to-br ${colorClasses[kpi.color]} p-1.5 rounded`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground truncate">{kpi.label}</p>
                  </div>
                  
                  {isLoading ? (
                    <Skeleton className="h-7 w-20" />
                  ) : (
                    <p className="text-xl font-bold">{getKpiValue(kpiId)}</p>
                  )}
                </Card>
              );
            })}
          </div>
        </Card>
      )}

      {/* Navigation tiles */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statsTiles.map((tile) => (
          <Link key={tile.href} to={tile.href}>
            <div className="group h-full rounded-xl p-5
              bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))]
              from-helpconfort-blue/10 via-white to-white
              dark:via-background dark:to-background
              border border-helpconfort-blue/20 border-l-4 border-l-helpconfort-blue
              shadow-sm transition-all duration-300
              hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center
                  bg-white/50 dark:bg-background/50 
                  group-hover:border-helpconfort-blue group-hover:ring-2 group-hover:ring-helpconfort-blue/30 group-hover:bg-white dark:group-hover:bg-background 
                  transition-all duration-300">
                  <tile.icon className="w-5 h-5 text-helpconfort-blue" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{tile.title}</h3>
                  <p className="text-sm text-muted-foreground">{tile.description}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
