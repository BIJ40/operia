import { BarChart3, ListTodo, Calendar, Users, Inbox, Briefcase, PieChart, TrendingUp, Building2, FileText, Info, ShoppingCart, Car } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { useMenuLabels } from '@/hooks/use-page-metadata';
import { AgencyInfoTile } from '@/components/pilotage/AgencyInfoTile';
import { GEDCollaboratorDropdown } from '@/components/pilotage/GEDCollaboratorDropdown';
import { usePendingDocumentRequestsCount } from '@/hooks/useDocumentRequests';
import { useAuth } from '@/contexts/AuthContext';
import { isModuleOptionEnabled, ModuleKey } from '@/types/modules';
import { CollapsibleSection } from '@/components/dashboard/CollapsibleSection';
import { memo, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';

const ROUTE_TO_PAGE_KEY: Record<string, string> = {
  [ROUTES.pilotage.statsHub]: 'pilotage_statistiques',
  [ROUTES.pilotage.indicateurs]: 'pilotage_indicateurs',
  [ROUTES.pilotage.actions]: 'pilotage_actions',
  [ROUTES.pilotage.diffusion]: 'pilotage_diffusion',
  [ROUTES.pilotage.rhTech]: 'pilotage_rh_tech',
  [ROUTES.pilotage.equipe]: 'pilotage_equipe',
  [ROUTES.pilotage.monCoffreRh]: 'pilotage_mon_coffre_rh',
  [ROUTES.pilotage.demandesRh]: 'pilotage_demandes_rh',
};

interface PilotageModule {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  badge?: string | number;
  requiresModuleOptions?: { module: ModuleKey; options: string[] };
  category: 'statistiques' | 'rh' | 'autres';
}

const pilotageModules: PilotageModule[] = [
  // STATISTIQUES
  {
    id: 'stats_hub',
    title: 'Hub Statistiques',
    description: 'Tableau de bord et KPI de votre agence',
    icon: BarChart3,
    href: ROUTES.pilotage.statsHub,
    category: 'statistiques',
  },
  {
    id: 'stats_apporteurs',
    title: 'CA par Apporteurs',
    description: 'Analyse du CA par source d\'affaires',
    icon: TrendingUp,
    href: `${ROUTES.pilotage.statsHub}/apporteurs`,
    category: 'statistiques',
  },
  {
    id: 'stats_univers',
    title: 'CA par Univers',
    description: 'Répartition du CA par métier',
    icon: PieChart,
    href: `${ROUTES.pilotage.statsHub}/univers`,
    category: 'statistiques',
  },
  {
    id: 'stats_techniciens',
    title: 'Performances Techniciens',
    description: 'CA et activité par technicien',
    icon: Users,
    href: `${ROUTES.pilotage.statsHub}/techniciens`,
    category: 'statistiques',
  },
  // RESSOURCES HUMAINES
  {
    id: 'rh_tech',
    title: 'Validation plannings',
    description: 'Planning hebdomadaire techniciens',
    icon: Calendar,
    href: ROUTES.pilotage.rhTech,
    badge: 'Bientôt',
    category: 'rh',
  },
  {
    id: 'mon_equipe',
    title: 'Mon équipe',
    description: 'Collaborateurs, documents RH et bulletins de salaire',
    icon: Users,
    href: ROUTES.pilotage.equipe,
    category: 'rh',
  },
  {
    id: 'mon_coffre_rh',
    title: 'Mon Coffre RH',
    description: 'Mes documents RH et demandes',
    icon: Briefcase,
    href: ROUTES.pilotage.monCoffreRh,
    requiresModuleOptions: { module: 'rh', options: ['coffre', 'rh_viewer', 'rh_admin'] },
    category: 'rh',
  },
  {
    id: 'demandes_rh',
    title: 'Demandes RH',
    description: 'Traitement des demandes de documents',
    icon: Inbox,
    href: ROUTES.pilotage.demandesRh,
    requiresModuleOptions: { module: 'rh', options: ['rh_viewer', 'rh_admin'] },
    category: 'rh',
  },
  {
    id: 'dashboard_rh',
    title: 'Dashboard RH',
    description: 'Statistiques et indicateurs RH',
    icon: BarChart3,
    href: ROUTES.pilotage.dashboardRh,
    requiresModuleOptions: { module: 'rh', options: ['rh_admin'] },
    category: 'rh',
  },
  {
    id: 'ged',
    title: 'G.E.D',
    description: 'Dépôt et gestion des documents collaborateurs',
    icon: FileText,
    href: ROUTES.pilotage.equipe,
    requiresModuleOptions: { module: 'rh', options: ['rh_viewer', 'rh_admin'] },
    category: 'rh',
  },
  // AUTRES
  {
    id: 'maintenance_preventive',
    title: 'Maintenance préventive',
    description: 'Véhicules, matériel et EPI',
    icon: Car,
    href: ROUTES.pilotage.maintenance,
    category: 'autres',
  },
  {
    id: 'actions',
    title: 'Actions à Mener',
    description: 'Suivi des actions et tâches en cours',
    icon: ListTodo,
    href: ROUTES.pilotage.actions,
    category: 'autres',
  },
  {
    id: 'infos_agence',
    title: 'Infos Agence',
    description: 'Informations et paramètres de l\'agence',
    icon: Info,
    href: '#infos-agence',
    category: 'autres',
  },
  {
    id: 'commercial',
    title: 'Commercial',
    description: 'Outils et suivi commercial',
    icon: ShoppingCart,
    href: ROUTES.pilotage.commercial,
    badge: 'Nouveau',
    category: 'autres',
  },
];

const PILOTAGE_GROUPS = {
  statistiques: {
    title: 'Statistiques',
    icon: BarChart3,
    colorClass: 'text-helpconfort-blue',
  },
  rh: {
    title: 'Ressources Humaines',
    icon: Users,
    colorClass: 'text-helpconfort-orange',
  },
  autres: {
    title: 'Autres',
    icon: Building2,
    colorClass: 'text-muted-foreground',
  },
} as const;

export default function PilotageIndex() {
  const menuLabels = useMenuLabels();
  const { enabledModules, globalRole } = useAuth();
  const { count: pendingRequestsCount } = usePendingDocumentRequestsCount();

  const isAdmin = globalRole === 'superadmin' || globalRole === 'platform_admin';

  const getModuleTitle = (module: PilotageModule): string => {
    const pageKey = ROUTE_TO_PAGE_KEY[module.href];
    if (pageKey && menuLabels.has(pageKey)) {
      return menuLabels.get(pageKey)!;
    }
    return module.title;
  };

  // Filtrer les modules selon les permissions
  const visibleModules = useMemo(() => {
    return pilotageModules.filter(module => {
      // Les admins voient tout
      if (isAdmin) return true;
      
      // Vérifier si le module nécessite des options spécifiques
      if (module.requiresModuleOptions) {
        const { module: moduleKey, options } = module.requiresModuleOptions;
        const hasAnyOption = options.some(opt => 
          isModuleOptionEnabled(enabledModules, moduleKey, opt)
        );
        return hasAnyOption;
      }
      
      return true;
    });
  }, [isAdmin, enabledModules]);

  // Grouper par catégorie
  const modulesByCategory = useMemo(() => {
    const groups: Record<string, PilotageModule[]> = {
      statistiques: [],
      rh: [],
      autres: [],
    };
    
    visibleModules.forEach(module => {
      groups[module.category].push(module);
    });
    
    return groups;
  }, [visibleModules]);

  // Badge dynamique pour Demandes RH
  const getBadge = (module: PilotageModule): string | number | undefined => {
    if (module.id === 'demandes_rh' && pendingRequestsCount > 0) {
      return pendingRequestsCount;
    }
    return module.badge;
  };

  const scrollToAgencyInfo = () => {
    document.getElementById('agency-info-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Statistiques */}
      {modulesByCategory.statistiques.length > 0 && (
        <CollapsibleSection
          id="pilotage_statistiques"
          title={PILOTAGE_GROUPS.statistiques.title}
          icon={PILOTAGE_GROUPS.statistiques.icon}
          colorClass={PILOTAGE_GROUPS.statistiques.colorClass}
          href={ROUTES.pilotage.statsHub}
        >
          {modulesByCategory.statistiques.map(module => (
            <PilotageTileCard
              key={module.id}
              module={module}
              title={getModuleTitle(module)}
              badge={getBadge(module)}
              isAdmin={isAdmin}
            />
          ))}
        </CollapsibleSection>
      )}

      {/* Ressources Humaines */}
      {modulesByCategory.rh.length > 0 && (
        <CollapsibleSection
          id="pilotage_rh"
          title={PILOTAGE_GROUPS.rh.title}
          icon={PILOTAGE_GROUPS.rh.icon}
          colorClass={PILOTAGE_GROUPS.rh.colorClass}
        >
          {modulesByCategory.rh.map(module => (
            module.id === 'ged' ? (
              <GEDCollaboratorDropdown key={module.id} />
            ) : (
              <PilotageTileCard
                key={module.id}
                module={module}
                title={getModuleTitle(module)}
                badge={getBadge(module)}
                isAdmin={isAdmin}
              />
            )
          ))}
        </CollapsibleSection>
      )}

      {/* Autres */}
      {modulesByCategory.autres.length > 0 && (
        <CollapsibleSection
          id="pilotage_autres"
          title={PILOTAGE_GROUPS.autres.title}
          icon={PILOTAGE_GROUPS.autres.icon}
          colorClass={PILOTAGE_GROUPS.autres.colorClass}
        >
          {modulesByCategory.autres.map(module => (
            module.id === 'infos_agence' ? (
              <div key={module.id} onClick={scrollToAgencyInfo} className="cursor-pointer">
                <PilotageTileCard
                  module={module}
                  title={getModuleTitle(module)}
                  badge={getBadge(module)}
                  isAdmin={isAdmin}
                  isClickable={false}
                />
              </div>
            ) : (
              <PilotageTileCard
                key={module.id}
                module={module}
                title={getModuleTitle(module)}
                badge={getBadge(module)}
                isAdmin={isAdmin}
              />
            )
          ))}
        </CollapsibleSection>
      )}

      {/* Tuile Informations Agence */}
      <div id="agency-info-section">
        <AgencyInfoTile />
      </div>
    </div>
  );
}

interface PilotageTileCardProps {
  module: PilotageModule;
  title: string;
  badge?: string | number;
  isAdmin?: boolean;
  isClickable?: boolean;
}

const PilotageTileCard = memo(function PilotageTileCard({ 
  module, 
  title, 
  badge, 
  isAdmin,
  isClickable = true 
}: PilotageTileCardProps) {
  const Icon = module.icon;
  const isDisabled = module.badge === 'Bientôt' && !isAdmin;

  const content = (
    <div className={`
      group relative rounded-xl border border-helpconfort-blue/15 p-4
      bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-background to-background
      shadow-sm transition-all duration-300 border-l-4 border-l-helpconfort-blue
      min-w-[280px] md:min-w-0 snap-start
      ${isDisabled 
        ? 'opacity-50 cursor-not-allowed' 
        : 'cursor-pointer hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5'
      }
    `}>
      {badge && (
        <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full z-10 ${
          typeof badge === 'number' 
            ? 'bg-red-500 text-white animate-pulse min-w-[20px] text-center' 
            : 'bg-helpconfort-blue text-white text-[10px]'
        }`}>
          {badge}
        </span>
      )}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full border-2 border-helpconfort-blue/30 flex-shrink-0 flex items-center justify-center bg-helpconfort-blue/10
          ${!isDisabled && 'group-hover:border-helpconfort-blue'} transition-all`}>
          <Icon className="w-5 h-5 text-helpconfort-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-foreground truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{module.description}</p>
        </div>
        <ArrowRight className={`w-4 h-4 flex-shrink-0 text-muted-foreground ${!isDisabled && 'group-hover:text-helpconfort-blue group-hover:translate-x-0.5'} transition-all`} aria-hidden="true" />
      </div>
    </div>
  );

  if (isDisabled || !isClickable) {
    return content;
  }

  return <Link to={module.href}>{content}</Link>;
});
