import { Link } from 'react-router-dom';
import { Network, Building2, Users, PieChart, GitCompare, Coins } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { hasMinimumRole } from '@/types/globalRoles';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/config/routes';

export default function ReseauIndex() {
  const { globalRole } = useAuth();
  const isFranchisorAdmin = hasMinimumRole(globalRole, 'franchisor_admin');

  const reseauModules = [
    {
      title: 'Dashboard Réseau',
      description: 'Vue d\'ensemble du réseau',
      icon: Network,
      href: ROUTES.reseau.dashboard,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      visible: true,
    },
    {
      title: 'Agences',
      description: 'Gestion des agences du réseau',
      icon: Building2,
      href: ROUTES.reseau.agences,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      visible: true,
    },
    {
      title: 'Animateurs',
      description: 'Gestion des animateurs réseau',
      icon: Users,
      href: ROUTES.reseau.animateurs,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      visible: isFranchisorAdmin,
    },
    {
      title: 'Statistiques',
      description: 'Statistiques consolidées du réseau',
      icon: PieChart,
      href: ROUTES.reseau.stats,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      visible: true,
    },
    {
      title: 'Comparatifs',
      description: 'Comparer les performances',
      icon: GitCompare,
      href: ROUTES.reseau.comparatifs,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
      visible: true,
    },
    {
      title: 'Redevances',
      description: 'Gestion des redevances',
      icon: Coins,
      href: ROUTES.reseau.redevances,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      visible: isFranchisorAdmin,
      badge: 'En cours',
    },
  ];

  const visibleModules = reseauModules.filter(m => m.visible);

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
                  <div className="flex items-center gap-2">
                    <CardTitle>{module.title}</CardTitle>
                    {module.badge && (
                      <Badge variant="secondary" className="text-xs bg-orange-500 text-white">
                        {module.badge}
                      </Badge>
                    )}
                  </div>
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
