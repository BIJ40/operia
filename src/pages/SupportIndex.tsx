import { Link } from 'react-router-dom';
import { LifeBuoy, Headset } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/config/routes';
import { useMenuLabels } from '@/hooks/use-page-metadata';

// Page keys correspondant aux routes
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
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      visible: true,
    },
    {
      title: 'Console Support',
      description: 'Traiter les demandes de support',
      icon: Headset,
      href: ROUTES.support.console,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
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
        {visibleModules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} to={module.href}>
              <Card className="h-full transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${module.bgColor} flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${module.color}`} />
                  </div>
                  <CardTitle>{getModuleTitle(module)}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-sm text-primary font-medium">
                    Accéder →
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
