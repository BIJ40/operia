import { BarChart3, ListTodo, Tv, Calendar, Users, Inbox, Briefcase } from 'lucide-react';
import { IndexTile, getVariantForIndex } from '@/components/ui/index-tile';
import { ROUTES } from '@/config/routes';
import { useMenuLabels } from '@/hooks/use-page-metadata';
import { AgencyInfoTile } from '@/components/pilotage/AgencyInfoTile';
import { usePendingDocumentRequestsCount } from '@/hooks/useDocumentRequests';
import { useAuth } from '@/contexts/AuthContext';
import { isModuleOptionEnabled, ModuleKey } from '@/types/modules';

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
  title: string;
  description: string;
  icon: typeof BarChart3;
  href: string;
  badge?: string | number;
  requiresModuleOptions?: { module: ModuleKey; options: string[] };
}

const pilotageModules: PilotageModule[] = [
  {
    title: 'Statistiques',
    description: 'Tableau de bord et KPI de votre agence',
    icon: BarChart3,
    href: ROUTES.pilotage.statsHub,
  },
  {
    title: 'Actions à Mener',
    description: 'Suivi des actions et tâches en cours',
    icon: ListTodo,
    href: ROUTES.pilotage.actions,
  },
  {
    title: 'Diffusion',
    description: 'Mode affichage TV agence',
    icon: Tv,
    href: ROUTES.pilotage.diffusion,
    badge: 'En cours',
  },
  {
    title: 'RH Tech',
    description: 'Planning hebdomadaire techniciens',
    icon: Calendar,
    href: ROUTES.pilotage.rhTech,
  },
  {
    title: 'Mon équipe',
    description: 'Collaborateurs, documents RH et bulletins de salaire',
    icon: Users,
    href: ROUTES.pilotage.equipe,
  },
  {
    title: 'Mon Coffre RH',
    description: 'Documents RH et demandes',
    icon: Briefcase,
    href: ROUTES.pilotage.monCoffreRh,
    requiresModuleOptions: { module: 'rh', options: ['coffre', 'rh_viewer', 'rh_admin'] },
  },
  {
    title: 'Demandes RH',
    description: 'Traitement des demandes de documents',
    icon: Inbox,
    href: ROUTES.pilotage.demandesRh,
    requiresModuleOptions: { module: 'rh', options: ['rh_viewer', 'rh_admin'] },
  },
];

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
  const visibleModules = pilotageModules.filter(module => {
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

  // Badge dynamique pour Demandes RH
  const getBadge = (module: PilotageModule): string | undefined => {
    if (module.href === ROUTES.pilotage.demandesRh && pendingRequestsCount > 0) {
      return String(pendingRequestsCount);
    }
    return typeof module.badge === 'number' ? String(module.badge) : module.badge;
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Modules de pilotage */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visibleModules.map((module, index) => (
          <IndexTile
            key={module.href}
            title={getModuleTitle(module)}
            description={module.description}
            icon={module.icon}
            href={module.href}
            badge={getBadge(module)}
            variant={getVariantForIndex(index)}
          />
        ))}
      </div>

      {/* Tuile Informations Agence */}
      <AgencyInfoTile />
    </div>
  );
}
