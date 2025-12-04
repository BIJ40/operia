import { Network, Building2, Users, UserCog, PieChart, GitCompare, Coins, Bell, BarChart3, AreaChart } from 'lucide-react';
import { IndexTile, getVariantForIndex } from '@/components/ui/index-tile';
import { useAuth } from '@/contexts/AuthContext';
import { hasMinimumRole } from '@/types/globalRoles';
import { ROUTES } from '@/config/routes';
import { useMenuLabels } from '@/hooks/use-page-metadata';

const ROUTE_TO_PAGE_KEY: Record<string, string> = {
  [ROUTES.reseau.dashboard]: 'reseau_dashboard',
  [ROUTES.reseau.agences]: 'reseau_agences',
  [ROUTES.reseau.users]: 'reseau_users',
  [ROUTES.reseau.animateurs]: 'reseau_animateurs',
  [ROUTES.reseau.tableaux]: 'reseau_stats',
  [ROUTES.reseau.periodes]: 'reseau_periodes',
  [ROUTES.reseau.comparatif]: 'reseau_comparatif',
  [ROUTES.reseau.graphiques]: 'reseau_graphiques',
  [ROUTES.reseau.redevances]: 'reseau_redevances',
};

export default function ReseauIndex() {
  const { globalRole } = useAuth();
  const menuLabels = useMenuLabels();
  const isFranchisorAdmin = hasMinimumRole(globalRole, 'franchisor_admin');

  const reseauModules = [
    {
      title: 'Dashboard Réseau',
      description: 'Vue d\'ensemble du réseau',
      icon: Network,
      href: ROUTES.reseau.dashboard,
      visible: true,
    },
    {
      title: 'Agences',
      description: 'Gestion des agences du réseau',
      icon: Building2,
      href: ROUTES.reseau.agences,
      visible: true,
    },
    {
      title: 'Utilisateurs',
      description: 'Gestion des utilisateurs du réseau',
      icon: Users,
      href: ROUTES.reseau.users,
      visible: true,
    },
    {
      title: 'Animateurs',
      description: 'Gestion des animateurs réseau',
      icon: UserCog,
      href: ROUTES.reseau.animateurs,
      visible: isFranchisorAdmin,
    },
    {
      title: 'Statistiques',
      description: 'Statistiques consolidées du réseau',
      icon: PieChart,
      href: ROUTES.reseau.tableaux,
      visible: true,
    },
    {
      title: 'Périodes',
      description: 'Comparer les performances',
      icon: GitCompare,
      href: ROUTES.reseau.periodes,
      visible: true,
    },
    {
      title: 'Comparatif',
      description: 'Tableau comparatif par agence',
      icon: BarChart3,
      href: ROUTES.reseau.comparatif,
      visible: true,
    },
    {
      title: 'Graphiques',
      description: 'Visualisations des KPI réseau',
      icon: AreaChart,
      href: ROUTES.reseau.graphiques,
      visible: true,
    },
    {
      title: 'Redevances',
      description: 'Gestion des redevances',
      icon: Coins,
      href: ROUTES.reseau.redevances,
      visible: isFranchisorAdmin,
      badge: 'En cours',
    },
    {
      title: 'Annonces Prioritaires',
      description: 'Diffuser des informations importantes',
      icon: Bell,
      href: ROUTES.admin.announcements,
      visible: true,
    },
  ];

  const getModuleTitle = (module: typeof reseauModules[0]): string => {
    const pageKey = ROUTE_TO_PAGE_KEY[module.href];
    if (pageKey && menuLabels.has(pageKey)) {
      return menuLabels.get(pageKey)!;
    }
    return module.title;
  };

  const visibleModules = reseauModules.filter(m => m.visible);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visibleModules.map((module, index) => (
          <IndexTile
            key={module.href}
            title={getModuleTitle(module)}
            description={module.description}
            icon={module.icon}
            href={module.href}
            badge={module.badge}
            variant={getVariantForIndex(index)}
          />
        ))}
      </div>
    </div>
  );
}
