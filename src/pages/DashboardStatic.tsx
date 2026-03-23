/**
 * DashboardStatic - Page d'accueil "Warm Dashboard" avec layout conditionnel par rôle
 * 
 * Refonte UX/UI complète:
 * - Design chaleureux avec cartes arrondies et couleurs pastel
 * - Titres humains et conversationnels
 * - Hiérarchie visuelle en 2 niveaux
 * - Hero section avec carte RDV pour N2+
 * - Animations framer-motion
 * 
 * Layouts par niveau:
 * - N0 (external): Placeholder simple
 * - N1 Technicien/Assistante: KPIs personnels uniquement
 * - N2 (franchisee_admin): Layout complet agence avec carte
 * - N3/N4 (franchisor): Placeholder réseau
 * - N5/N6 (admin): Layout agence complet
 */

import { useState, useMemo, createContext, useContext, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ChevronDown, BarChart3, Trophy, PieChart, TrendingUp, Users, Building2, Network, MapPin, AlertTriangle } from 'lucide-react';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { useProfile } from '@/contexts/ProfileContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Button } from '@/components/ui/button';

// Widgets existants
import { IndicateursGlobauxWidget } from '@/components/dashboard/widgets/IndicateursGlobauxWidget';
import { Top3TechniciensWidget } from '@/components/dashboard/widgets/Top3TechniciensWidget';
import { CAParUniversWidget } from '@/components/dashboard/widgets/CAParUniversWidget';
import { CAApporteursWidget } from '@/components/dashboard/widgets/CAApporteursWidget';
import { TechniciensProdWidget } from '@/components/dashboard/widgets/TechniciensProdWidget';
import { ActionsAMenerWidget } from '@/components/dashboard/widgets/ActionsAMenerWidget';
import { CAParTrancheHoraireWidget } from '@/components/dashboard/widgets/CAParTrancheHoraireWidget';
import { TechnicienPersonnelKPIs } from '@/components/dashboard/TechnicienPersonnelKPIs';
import { AssistantePersonnelKPIs } from '@/components/dashboard/AssistantePersonnelKPIs';

// Nouveaux composants V2
import { WarmCard, HumanTitle, DashboardMapWidget } from '@/components/dashboard/v2';

import { GLOBAL_ROLES } from '@/types/globalRoles';
import { startOfYear, endOfYear, startOfQuarter, endOfQuarter, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, subMonths, subWeeks, subDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Types pour les périodes
type PeriodKey = 'year' | 'quarter' | 'prev_month' | 'month' | 'prev_week' | 'week' | 'prev_day' | 'day';

interface PeriodOption {
  key: PeriodKey;
  label: string;
  shortLabel: string;
  getDates: (yearOffset?: number) => { start: Date; end: Date };
  hasYearSelector?: boolean;
}

// Configuration des périodes
const PERIODS: PeriodOption[] = [
  { 
    key: 'year', 
    label: 'Année', 
    shortLabel: 'Année',
    getDates: (yearOffset = 0) => {
      const targetYear = new Date().getFullYear() + yearOffset;
      const targetDate = new Date(targetYear, 0, 1);
      return { start: startOfYear(targetDate), end: endOfYear(targetDate) };
    },
    hasYearSelector: true
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

// Animation stagger pour les cartes
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

export default function DashboardStatic() {
  const { user } = useAuthCore();
  const { firstName, agence, roleAgence } = useProfile();
  const { globalRole } = usePermissions();
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
  
  // Vérifier si le N1 a une liaison apogee_user_id
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
  
  // État du sélecteur de période
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>(() => {
    if (typeof window === 'undefined') return 'month';
    const stored = window.sessionStorage.getItem('dashboard-selected-period') as PeriodKey | null;
    const isValid = stored && PERIODS.some((p) => p.key === stored);
    return isValid ? stored! : 'month';
  });
  
  const [selectedYearOffset, setSelectedYearOffset] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const stored = window.sessionStorage.getItem('dashboard-selected-year-offset');
    return stored ? parseInt(stored, 10) : 0;
  });
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('dashboard-selected-period', selectedPeriod);
  }, [selectedPeriod]);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('dashboard-selected-year-offset', selectedYearOffset.toString());
  }, [selectedYearOffset]);
  
  const periodConfig = useMemo(() => {
    const period = PERIODS.find(p => p.key === selectedPeriod) || PERIODS.find(p => p.key === 'month')!;
    const dates = period.getDates(period.hasYearSelector ? selectedYearOffset : undefined);
    
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
  }, [selectedPeriod, selectedYearOffset]);

  // ============================================================================
  // LAYOUTS PAR RÔLE AVEC NOUVEAU DESIGN WARM
  // ============================================================================
  
  const renderDashboardContent = () => {
    // N0 (Extérieur) - Aucun contenu dashboard, accès direct aux autres onglets
    if (isN0) {
      return null;
    }
    
    // N1 - KPIs personnels uniquement
    if (isN1) {
      return (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-5"
        >
          {/* KPIs personnels si technicien */}
          {isTechnicien && (
            <motion.div variants={itemVariants}>
              <WarmCard
                variant="blue"
                icon={BarChart3}
                title="Mes performances"
                subtitle="Vos indicateurs personnels"
              >
                <TechnicienPersonnelKPIs />
              </WarmCard>
            </motion.div>
          )}
          
          {/* KPIs personnels si assistante */}
          {isAssistante && (
            <motion.div variants={itemVariants}>
              <WarmCard
                variant="purple"
                icon={BarChart3}
                title="Mon activité"
                subtitle="Suivi de votre travail"
              >
                <AssistantePersonnelKPIs />
              </WarmCard>
            </motion.div>
          )}
        </motion.div>
      );
    }
    
    // N3/N4 (Franchiseur) - Placeholder réseau
    if (isN3orN4) {
      return (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-5"
        >
          <motion.div variants={itemVariants}>
            <WarmCard
              variant="purple"
              icon={Network}
              title="Vue Réseau"
              subtitle="Pilotage multi-agences"
            >
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-sm">Les KPIs réseau seront affichés ici</p>
                <p className="text-xs mt-1">Accédez à l'espace Franchiseur pour la vue complète</p>
              </div>
            </WarmCard>
          </motion.div>
        </motion.div>
      );
    }
    
    // N2, N5, N6 - Layout complet agence avec Hero Map
    return (
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* LAYOUT: Colonne gauche (CA Univers) chevauche les 2 lignes */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          
          {/* COL GAUCHE — chevauche les 2 lignes : CA Univers + tuile complémentaire */}
          <div className="lg:row-span-2 flex flex-col gap-4">
            <motion.div variants={itemVariants}>
              <WarmCard
                variant="blue"
                animate={false}
              >
                <HumanTitle titleKey="ca_univers" icon={PieChart} iconColor="text-warm-blue" size="sm" />
                <div className="mt-3">
                  <CAParUniversWidget />
                </div>
              </WarmCard>
            </motion.div>

            {/* Tuile complémentaire — comble la hauteur restante */}
            <motion.div variants={itemVariants} className="flex-1">
              <WarmCard
                variant="blue"
                animate={false}
                className="h-full"
              >
                <HumanTitle titleKey="ca_univers" icon={PieChart} iconColor="text-warm-blue" size="sm" showSubtitle={false} />
                <p className="text-[10px] text-muted-foreground -mt-1 mb-2 ml-6">Par tranche horaire</p>
                <CAParTrancheHoraireWidget />
              </WarmCard>
            </motion.div>
          </div>

          {/* LIGNE 1 — Carte RDV (2 cols) + En un coup d'œil (2 cols) */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <DashboardMapWidget agencySlug={agence} className="h-full" />
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-2">
            <WarmCard
              variant="blue"
              animate={false}
              className="h-full"
            >
              <HumanTitle titleKey="kpis" icon={BarChart3} iconColor="text-warm-blue" size="lg" />
              <div className="mt-4">
                <IndicateursGlobauxWidget />
              </div>
            </WarmCard>
          </motion.div>

          {/* LIGNE 2 — 4 tuiles (colonnes 2-5) */}
          <motion.div variants={itemVariants}>
            <WarmCard variant="blue" animate={false} className="h-full">
              <HumanTitle titleKey="ca_apporteurs" icon={TrendingUp} iconColor="text-warm-blue" size="sm" />
              <div className="mt-3"><CAApporteursWidget /></div>
            </WarmCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <WarmCard variant="blue" animate={false} className="h-full">
              <HumanTitle titleKey="top_techniciens" icon={Trophy} iconColor="text-warm-blue" size="sm" />
              <div className="mt-3"><Top3TechniciensWidget /></div>
            </WarmCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <WarmCard variant="blue" animate={false} className="h-full">
              <HumanTitle titleKey="productivite" icon={Users} iconColor="text-warm-blue" size="sm" />
              <div className="mt-3"><TechniciensProdWidget /></div>
            </WarmCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <WarmCard
              variant="blue"
              animate={false}
              className="h-full cursor-pointer"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('session-state-change', { detail: { key: 'workspace_tab', value: 'pilotage' } }));
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('session-state-change', { detail: { key: 'pilotage_sub_tab', value: 'actions' } }));
                }, 100);
              }}
            >
              <HumanTitle titleKey="actions_a_mener" icon={AlertTriangle} iconColor="text-warm-red" size="sm" />
              <div className="mt-3">
                <ActionsAMenerWidget onNavigate={() => {
                  window.dispatchEvent(new CustomEvent('session-state-change', { detail: { key: 'workspace_tab', value: 'pilotage' } }));
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('session-state-change', { detail: { key: 'pilotage_sub_tab', value: 'actions' } }));
                  }, 100);
                }} />
              </div>
            </WarmCard>
          </motion.div>
        </div>
      </motion.div>
    );
  };

  // Afficher le sélecteur de période uniquement pour N2+ ou N1 avec liaison Apogée
  const showPeriodSelector = hasAgencyAccess || (isN1 && hasApogeeLink === true);

  return (
    <DashboardPeriodContext.Provider value={periodConfig}>
      <TooltipProvider delayDuration={0}>
      <div className="container mx-auto py-6 px-4 max-w-app">
        {/* Header avec greeting chaleureux */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {greeting}{firstName ? `, ${firstName}` : ''} 👋
              </h1>
              <p className="text-muted-foreground mt-1">
                Voici un aperçu de votre activité
              </p>
            </div>
            
            {/* Sélecteur de période - visible pour N1+ avec KPIs */}
            {showPeriodSelector && (
              <div className="flex flex-col items-start sm:items-end gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {PERIODS.map((period) => (
                    period.hasYearSelector ? (
                      <Popover key={period.key}>
                        <PopoverTrigger asChild>
                          <Button
                            variant={selectedPeriod === period.key ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 px-3 text-xs gap-1 rounded-full"
                          >
                            <span className="hidden sm:inline">{period.label}</span>
                            <span className="sm:hidden">{period.shortLabel}</span>
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-1 bg-popover" align="end">
                          <div className="flex flex-col gap-1">
                            {[0, -1, -2].map((offset) => {
                              const year = new Date().getFullYear() + offset;
                              return (
                                <Button
                                  key={offset}
                                  variant={selectedPeriod === period.key && selectedYearOffset === offset ? 'default' : 'ghost'}
                                  size="sm"
                                  className="h-8 justify-start text-xs"
                                  onClick={() => {
                                    setSelectedPeriod(period.key);
                                    setSelectedYearOffset(offset);
                                  }}
                                >
                                  {year}
                                </Button>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <Button
                        key={period.key}
                        variant={selectedPeriod === period.key ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedPeriod(period.key)}
                        className="h-8 px-3 text-xs rounded-full"
                      >
                        <span className="hidden sm:inline">{period.label}</span>
                        <span className="sm:hidden">{period.shortLabel}</span>
                      </Button>
                    )
                  ))}
                </div>
                
                {/* Affichage de la période sélectionnée */}
                <p className="text-sm font-medium text-primary capitalize">
                  {periodConfig.periodLabel}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Contenu du dashboard */}
        {renderDashboardContent()}
      </div>
      </TooltipProvider>
    </DashboardPeriodContext.Provider>
  );
}
