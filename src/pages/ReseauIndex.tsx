import { Network, Building2, Users, PieChart, GitCompare, Coins } from 'lucide-react';
import { IndexTile, getVariantForIndex } from '@/components/ui/index-tile';
import { useAuth } from '@/contexts/AuthContext';
import { hasMinimumRole } from '@/types/globalRoles';
import { ROUTES } from '@/config/routes';
import { useMenuLabels } from '@/hooks/use-page-metadata';

const ROUTE_TO_PAGE_KEY: Record<string, string> = {
  [ROUTES.reseau.dashboard]: 'reseau_dashboard',
  [ROUTES.reseau.agences]: 'reseau_agences',
  [ROUTES.reseau.animateurs]: 'reseau_animateurs',
  [ROUTES.reseau.stats]: 'reseau_stats',
  [ROUTES.reseau.comparatifs]: 'reseau_comparatifs',
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
      title: 'Animateurs',
      description: 'Gestion des animateurs réseau',
      icon: Users,
      href: ROUTES.reseau.animateurs,
      visible: isFranchisorAdmin,
    },
    {
      title: 'Statistiques',
      description: 'Statistiques consolidées du réseau',
      icon: PieChart,
      href: ROUTES.reseau.stats,
      visible: true,
    },
    {
      title: 'Comparatifs',
      description: 'Comparer les performances',
      icon: GitCompare,
      href: ROUTES.reseau.comparatifs,
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
