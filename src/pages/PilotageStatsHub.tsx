import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ROUTES } from '@/config/routes';
import { Link } from 'react-router-dom';
import { BarChart3, Users, Building2, Calendar, LifeBuoy, Settings2, Euro, Clock, FileText, TrendingUp, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { DataService } from '@/apogee-connect/services/dataService';
import { FiltersProvider } from '@/apogee-connect/contexts/FiltersContext';
import { ApiToggleProvider, useApiToggle } from '@/apogee-connect/contexts/ApiToggleContext';
import { AgencyProvider, useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { calculateDashboardStats, calculateDelaiMoyenDossierFacture, calculatePanierMoyen, calculateDelaiMoyenDossierPremierDevis, calculateTauxTransformationDevis } from '@/apogee-connect/utils/dashboardCalculations';
import { calculateTauxSAVGlobal } from '@/apogee-connect/utils/apporteursCalculations';
import { formatEuros } from '@/apogee-connect/utils/formatters';
import { useState, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { startOfMonth, endOfMonth } from 'date-fns';

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

function PilotageStatsHubContent() {
  const { isApiEnabled } = useApiToggle();
  const { agencyChangeCounter, currentAgency, isAgencyReady } = useAgency();
  const userAgency = currentAgency?.id || '';
  
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

  const { data, isLoading } = useQuery({
    queryKey: ['stats-hub-kpis', isApiEnabled, agencyChangeCounter],
    enabled: isAgencyReady && isApiEnabled,
    queryFn: async () => {
      if (!currentAgency?.id) return null;
      
      const apiData = await DataService.loadAllData(isApiEnabled);
      
      // Stats du mois en cours pour le CA
      const statsMonth = calculateDashboardStats({
        projects: apiData.projects || [],
        interventions: apiData.interventions || [],
        factures: apiData.factures || [],
        devis: apiData.devis || [],
        clients: apiData.clients || [],
        users: apiData.users || [],
      }, currentMonthRange, userAgency);
      
      const delaiDossierFacture = calculateDelaiMoyenDossierFacture(
        apiData.factures || [],
        apiData.projects || [],
        undefined
      );
      
      const panierMoyen = calculatePanierMoyen(
        apiData.factures || [],
        currentMonthRange
      );
      
      const tauxTransformationDevis = calculateTauxTransformationDevis(
        apiData.devis || [],
        currentMonthRange
      );
      
      const delaiDossierPremierDevis = calculateDelaiMoyenDossierPremierDevis(
        apiData.projects || [],
        apiData.devis || []
      );
      
      // Large plage pour le taux SAV global (toutes données)
      const globalRange = {
        start: new Date(2020, 0, 1),
        end: new Date(2030, 11, 31)
      };
      
      const tauxSAVGlobal = calculateTauxSAVGlobal(
        apiData.interventions || [],
        apiData.factures || [],
        apiData.projects || [],
        apiData.clients || [],
        globalRange
      );
      
      return {
        ...statsMonth,
        delaiDossierFacture,
        panierMoyen,
        tauxTransformationDevis,
        delaiDossierPremierDevis,
        tauxSAVGlobal,
      };
    },
  });

  const getKpiValue = (kpiId: KpiId): string => {
    if (!data) return '-';
    
    switch (kpiId) {
      case 'ca_mois':
        return formatEuros(data.caJour || 0);
      case 'delai_dossier_facture':
        return `${data.delaiDossierFacture?.delaiMoyen || 0}j`;
      case 'taux_sav':
        return `${(data.tauxSAVGlobal || 0).toFixed(1)}%`;
      case 'delai_devis':
        return `${data.delaiDossierPremierDevis?.delaiMoyen || 0}j`;
      case 'panier_moyen':
        return formatEuros(data.panierMoyen?.panierMoyen || 0);
      case 'taux_transfo':
        return `${data.tauxTransformationDevis?.tauxTransformation || 0}%`;
      case 'dossiers_recus':
        return `${data.dossiersJour || 0}`;
      case 'devis_emis':
        return `${data.devisJour || 0}`;
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
      <PageHeader
        pageKey="pilotage_statistiques"
        backTo={ROUTES.pilotage.index}
        backLabel="Retour Pilotage Agence"
      />

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
            <Card className="h-full cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <tile.icon className="h-5 w-5 text-primary" />
                  {tile.title}
                </CardTitle>
                <CardDescription>{tile.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
