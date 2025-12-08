import { BarChart3, ListTodo, PieChart, TrendingUp, Building2, Info, ShoppingCart, Car, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { useMenuLabels } from '@/hooks/use-page-metadata';
import { AgencyInfoTile } from '@/components/pilotage/AgencyInfoTile';
import { useAuth } from '@/contexts/AuthContext';
import { CollapsibleSection } from '@/components/dashboard/CollapsibleSection';
import { memo, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';

const ROUTE_TO_PAGE_KEY: Record<string, string> = {
  [ROUTES.pilotage.statsHub]: 'pilotage_statistiques',
  [ROUTES.pilotage.indicateurs]: 'pilotage_indicateurs',
  [ROUTES.pilotage.actions]: 'pilotage_actions',
  [ROUTES.pilotage.diffusion]: 'pilotage_diffusion',
};

interface PilotageModule {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  badge?: string | number;
  category: 'statistiques' | 'autres';
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
  autres: {
    title: 'Autres',
    icon: Building2,
    colorClass: 'text-muted-foreground',
  },
} as const;

export default function PilotageIndex() {
  const menuLabels = useMenuLabels();
  const { globalRole } = useAuth();

  const isPlatformAdmin = globalRole === 'superadmin' || globalRole === 'platform_admin';

  const getModuleTitle = (module: PilotageModule): string => {
    const pageKey = ROUTE_TO_PAGE_KEY[module.href];
    if (pageKey && menuLabels.has(pageKey)) {
      return menuLabels.get(pageKey)!;
    }
    return module.title;
  };

  // Grouper par catégorie
  const modulesByCategory = useMemo(() => {
    const groups: Record<string, PilotageModule[]> = {
      statistiques: [],
      autres: [],
    };
    
    pilotageModules.forEach(module => {
      groups[module.category].push(module);
    });
    
    return groups;
  }, []);

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
              badge={module.badge}
              isAdmin={isPlatformAdmin}
            />
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
                  badge={module.badge}
                  isAdmin={isPlatformAdmin}
                  isClickable={false}
                />
              </div>
            ) : (
              <PilotageTileCard
                key={module.id}
                module={module}
                title={getModuleTitle(module)}
                badge={module.badge}
                isAdmin={isPlatformAdmin}
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
