import { LifeBuoy, Headset } from 'lucide-react';
import { IndexTile, getVariantForIndex } from '@/components/ui/index-tile';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/config/routes';
import { useMenuLabels } from '@/hooks/use-page-metadata';

const ROUTE_TO_PAGE_KEY: Record<string, string> = {
  [ROUTES.support.userTickets]: 'support_mes_demandes',
  [ROUTES.support.console]: 'support_console',
};

export default function SupportIndex() {
  const { canAccessSupportConsole } = useAuth();
  const menuLabels = useMenuLabels();

  const supportModules = [
    {
      title: 'Mes Demandes',
      description: 'Créer et suivre vos demandes de support',
      icon: LifeBuoy,
      href: ROUTES.support.userTickets,
      visible: true,
    },
    {
      title: 'Console Support',
      description: 'Traiter les demandes de support',
      icon: Headset,
      href: ROUTES.support.console,
      visible: canAccessSupportConsole,
    },
  ];

  const getModuleTitle = (module: typeof supportModules[0]): string => {
    const pageKey = ROUTE_TO_PAGE_KEY[module.href];
    if (pageKey && menuLabels.has(pageKey)) {
      return menuLabels.get(pageKey)!;
    }
    return module.title;
  };

  const visibleModules = supportModules.filter(m => m.visible);

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
            variant={getVariantForIndex(index)}
          />
        ))}
      </div>
    </div>
  );
}
