/**
 * DashboardStatic - Page d'accueil avec layout conditionnel par rôle
 * 
 * Layouts par niveau:
 * - N0 (external): Tickets + Favoris uniquement
 * - N1 Technicien: KPIs personnels + Tickets + Favoris
 * - N1 Assistante: KPIs personnels + Tickets + Favoris
 * - N1 Autre: Tickets + Favoris
 * - N2 (franchisee_admin): Layout complet agence
 * - N3/N4 (franchisor): Placeholder réseau + Tickets + Favoris
 * - N5/N6 (admin): Layout agence pour l'instant
 */

import { useState, useMemo, createContext, useContext, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IndicateursGlobauxWidget } from '@/components/dashboard/widgets/IndicateursGlobauxWidget';
import { FavorisWidget } from '@/components/dashboard/widgets/FavorisWidget';
import { RecentTicketsWidget } from '@/components/dashboard/widgets/RecentTicketsWidget';
import { Top3TechniciensWidget } from '@/components/dashboard/widgets/Top3TechniciensWidget';
import { CAParUniversWidget } from '@/components/dashboard/widgets/CAParUniversWidget';
import { CAApporteursWidget } from '@/components/dashboard/widgets/CAApporteursWidget';
import { TauxSavWidget } from '@/components/dashboard/widgets/TauxSavWidget';
import { PanierMoyenWidget } from '@/components/dashboard/widgets/PanierMoyenWidget';
import { TechniciensProdWidget } from '@/components/dashboard/widgets/TechniciensProdWidget';
import { TechnicienPersonnelKPIs } from '@/components/dashboard/TechnicienPersonnelKPIs';
import { AssistantePersonnelKPIs } from '@/components/dashboard/AssistantePersonnelKPIs';
import { BarChart3, Star, MessageSquare, Trophy, PieChart, AlertTriangle, TrendingUp, Users, ShoppingCart, Building2, Network } from 'lucide-react';
import { startOfYear, endOfYear, startOfQuarter, endOfQuarter, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, subMonths, subWeeks, subDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { GLOBAL_ROLES } from '@/types/globalRoles';

// Types pour les périodes
type PeriodKey = 'year' | 'quarter' | 'prev_month' | 'month' | 'prev_week' | 'week' | 'prev_day' | 'day';

interface PeriodOption {
  key: PeriodKey;
  label: string;
  shortLabel: string;
  getDates: () => { start: Date; end: Date };
}

// Configuration des périodes
const PERIODS: PeriodOption[] = [
  { 
    key: 'year', 
    label: 'Année', 
    shortLabel: 'Année',
    getDates: () => ({ start: startOfYear(new Date()), end: endOfYear(new Date()) })
  },
  { 
    key: 'quarter', 
    label: 'Trimestre', 
    shortLabel: 'Trim.',
    getDates: () => ({ start: startOfQuarter(new Date()), end: endOfQuarter(new Date()) })
  },
  { 
    key: 'prev_month', 
    label: 'M-1', 
    shortLabel: 'M-1',
    getDates: () => {
      const prev = subMonths(new Date(), 1);
      return { start: startOfMonth(prev), end: endOfMonth(prev) };
    }
  },
  { 
    key: 'month', 
    label: 'Mois', 
    shortLabel: 'M',
    getDates: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) })
  },
  { 
    key: 'prev_week', 
    label: 'S-1', 
    shortLabel: 'S-1',
    getDates: () => {
      const prev = subWeeks(new Date(), 1);
      return { start: startOfWeek(prev, { weekStartsOn: 1 }), end: endOfWeek(prev, { weekStartsOn: 1 }) };
    }
  },
  { 
    key: 'week', 
    label: 'Semaine', 
    shortLabel: 'S',
    getDates: () => ({ start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfWeek(new Date(), { weekStartsOn: 1 }) })
  },
  { 
    key: 'prev_day', 
    label: 'J-1', 
    shortLabel: 'J-1',
    getDates: () => {
      const prev = subDays(new Date(), 1);
      return { start: startOfDay(prev), end: endOfDay(prev) };
    }
  },
  { 
    key: 'day', 
    label: "Aujourd'hui", 
    shortLabel: 'J',
    getDates: () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) })
  },
];

// Context pour partager la période sélectionnée
interface DashboardPeriodContextValue {
  period: PeriodKey;
  dateRange: { start: Date; end: Date };
  periodLabel: string;
}

const DashboardPeriodContext = createContext<DashboardPeriodContextValue | null>(null);

export function useDashboardPeriod() {
  const ctx = useContext(DashboardPeriodContext);
  if (!ctx) {
    // Fallback vers le mois en cours si pas de contexte
    return {
      period: 'month' as PeriodKey,
      dateRange: { start: startOfMonth(new Date()), end: endOfMonth(new Date()) },
      periodLabel: 'Mois en cours',
    };
  }
  return ctx;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export default function DashboardStatic() {
  const { firstName, globalRole, roleAgence, user } = useAuth();
  const greeting = getGreeting();
  
  // Détermination du niveau d'accès
  const globalRoleLevel = globalRole ? GLOBAL_ROLES[globalRole] : 0;
  const isN0 = globalRole === 'base_user' || !globalRole;
  const isN1 = globalRole === 'franchisee_user';
  const isN2 = globalRole === 'franchisee_admin';
  const isN3orN4 = globalRole === 'franchisor_user' || globalRole === 'franchisor_admin';
  const isN5orN6 = globalRoleLevel >= GLOBAL_ROLES.platform_admin;
  
  // Sous-types N1
  const isTechnicien = roleAgence === 'technicien';
  const isAssistante = roleAgence === 'assistante';
  
  // N2+ = accès aux KPIs agence
  const hasAgencyAccess = isN2 || isN5orN6;
  
  // Vérifier si le N1 a une liaison apogee_user_id (pour masquer le sélecteur si pas lié)
  const { data: hasApogeeLink } = useQuery({
    queryKey: ['dashboard-apogee-link', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('collaborators')
        .select('apogee_user_id')
        .eq('user_id', user.id)
        .single();
      return !!data?.apogee_user_id;
    },
    enabled: !!user?.id && isN1,
    staleTime: 5 * 60 * 1000,
  });
  
  // État du sélecteur de période - défaut: mois en cours, mais persisté en sessionStorage
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>(() => {
    if (typeof window === 'undefined') return 'month';
    const stored = window.sessionStorage.getItem('dashboard-selected-period') as PeriodKey | null;
    const isValid = stored && PERIODS.some((p) => p.key === stored);
    return isValid ? stored! : 'month';
  });
  
  // Sauvegarde de la période sélectionnée pour éviter la réinitialisation au changement d'onglet / reload
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('dashboard-selected-period', selectedPeriod);
  }, [selectedPeriod]);
  
  // Calcul des dates selon la période sélectionnée
  const periodConfig = useMemo(() => {
    const period = PERIODS.find(p => p.key === selectedPeriod) || PERIODS[3]; // fallback mois
    const dates = period.getDates();
    
    // Générer le label de période lisible
    let periodLabel = '';
    switch (selectedPeriod) {
      case 'year':
        periodLabel = format(dates.start, 'yyyy');
        break;
      case 'quarter':
        periodLabel = `T${Math.ceil((dates.start.getMonth() + 1) / 3)} ${format(dates.start, 'yyyy')}`;
        break;
      case 'prev_month':
      case 'month':
        periodLabel = format(dates.start, 'MMMM yyyy', { locale: fr });
        break;
      case 'prev_week':
      case 'week':
        periodLabel = `Sem. ${format(dates.start, 'w', { locale: fr })} (${format(dates.start, 'dd/MM')} - ${format(dates.end, 'dd/MM')})`;
        break;
      case 'prev_day':
      case 'day':
        periodLabel = format(dates.start, 'EEEE dd MMMM', { locale: fr });
        break;
    }
    
    return {
      period: selectedPeriod,
      dateRange: dates,
      periodLabel,
    };
  }, [selectedPeriod]);

  // ============================================================================
  // RENDU CONDITIONNEL PAR RÔLE
  // ============================================================================
  
  const renderDashboardContent = () => {
    // N0 (Extérieur) - Tickets + Favoris uniquement
    if (isN0) {
      return (
        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12 md:col-span-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Mes tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecentTicketsWidget />
            </CardContent>
          </Card>

          <Card className="col-span-12 md:col-span-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Mes favoris
              </CardTitle>
            </CardHeader>
            <CardContent className="min-h-[150px]">
              <FavorisWidget />
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // N1 Technicien - KPIs personnels + Tickets + Favoris
    if (isN1 && isTechnicien) {
      return (
        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Mes performances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TechnicienPersonnelKPIs />
            </CardContent>
          </Card>

          <Card className="col-span-12 md:col-span-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Mes tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecentTicketsWidget />
            </CardContent>
          </Card>

          <Card className="col-span-12 md:col-span-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Mes favoris
              </CardTitle>
            </CardHeader>
            <CardContent className="min-h-[150px]">
              <FavorisWidget />
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // N1 Assistante - KPIs personnels + Tickets + Favoris
    if (isN1 && isAssistante) {
      return (
        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Mon activité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AssistantePersonnelKPIs />
            </CardContent>
          </Card>

          <Card className="col-span-12 md:col-span-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Mes tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecentTicketsWidget />
            </CardContent>
          </Card>

          <Card className="col-span-12 md:col-span-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Mes favoris
              </CardTitle>
            </CardHeader>
            <CardContent className="min-h-[150px]">
              <FavorisWidget />
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // N1 Autre (ni technicien ni assistante) - Tickets + Favoris
    if (isN1) {
      return (
        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12 md:col-span-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Mes tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecentTicketsWidget />
            </CardContent>
          </Card>

          <Card className="col-span-12 md:col-span-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Mes favoris
              </CardTitle>
            </CardHeader>
            <CardContent className="min-h-[150px]">
              <FavorisWidget />
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // N3/N4 (Franchiseur) - Placeholder réseau + Tickets + Favoris
    if (isN3orN4) {
      return (
        <div className="grid grid-cols-12 gap-4">
          {/* Placeholder pour KPIs réseau */}
          <Card className="col-span-12">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Network className="h-4 w-4 text-primary" />
                Vue Réseau
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-sm">Les KPIs réseau seront affichés ici</p>
                <p className="text-xs mt-1">Accédez à l'espace Franchiseur pour la vue complète</p>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-12 md:col-span-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Derniers tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecentTicketsWidget />
            </CardContent>
          </Card>

          <Card className="col-span-12 md:col-span-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Mes favoris
              </CardTitle>
            </CardHeader>
            <CardContent className="min-h-[150px]">
              <FavorisWidget />
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // N2, N5, N6 - Layout complet agence
    return (
      <div className="grid grid-cols-12 gap-4">
        {/* Row 1: Indicateurs Globaux (large) + Top 3 Techniciens */}
        <Card className="col-span-12 lg:col-span-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Indicateurs clés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <IndicateursGlobauxWidget />
          </CardContent>
        </Card>

        <Card className="col-span-12 lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Top 3 Techniciens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Top3TechniciensWidget />
          </CardContent>
        </Card>

        {/* Row 2: Derniers Tickets + CA par Univers + CA par Apporteur */}
        <Card className="col-span-12 md:col-span-6 lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Derniers tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecentTicketsWidget />
          </CardContent>
        </Card>

        <Card className="col-span-12 md:col-span-6 lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              CA par Univers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CAParUniversWidget />
          </CardContent>
        </Card>

        <Card className="col-span-12 md:col-span-6 lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              CA par Apporteur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CAApporteursWidget />
          </CardContent>
        </Card>

        {/* Row 3: Taux SAV + Panier Moyen + Productivité Techniciens + Favoris */}
        <Card className="col-span-6 md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Taux SAV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TauxSavWidget />
          </CardContent>
        </Card>

        <Card className="col-span-6 md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-pink-500" />
              Panier Moyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PanierMoyenWidget />
          </CardContent>
        </Card>

        <Card className="col-span-12 md:col-span-6 lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Productivité Techniciens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TechniciensProdWidget />
          </CardContent>
        </Card>

        <Card className="col-span-12 md:col-span-6 lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              Mes favoris
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-[150px]">
            <FavorisWidget />
          </CardContent>
        </Card>
      </div>
    );
  };

  // Afficher le sélecteur de période uniquement pour N2+ ou N1 avec liaison Apogée
  const showPeriodSelector = hasAgencyAccess || (isN1 && hasApogeeLink === true);

  return (
    <DashboardPeriodContext.Provider value={periodConfig}>
      <div className="container mx-auto py-6 px-4">
        {/* Header avec sélecteur de période */}
        <div className="mb-6 space-y-4">
          <div>
            <h1 className="text-2xl font-bold">
              {greeting}{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Voici un aperçu de votre activité
            </p>
          </div>
          
          {/* Sélecteur de période - visible pour N1+ avec KPIs */}
          {showPeriodSelector && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground mr-2">Période :</span>
                {PERIODS.map((period) => (
                  <Button
                    key={period.key}
                    variant={selectedPeriod === period.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPeriod(period.key)}
                    className="h-8 px-3 text-xs"
                  >
                    <span className="hidden sm:inline">{period.label}</span>
                    <span className="sm:hidden">{period.shortLabel}</span>
                  </Button>
                ))}
              </div>
              
              {/* Affichage de la période sélectionnée */}
              <p className="text-sm font-medium text-primary capitalize">
                {periodConfig.periodLabel}
              </p>
            </>
          )}
        </div>

        {/* Contenu du dashboard */}
        {renderDashboardContent()}
      </div>
    </DashboardPeriodContext.Provider>
  );
}
