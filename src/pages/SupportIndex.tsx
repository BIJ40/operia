import { Link } from 'react-router-dom';
import { LifeBuoy, Headset } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export default function SupportIndex() {
  const { canAccessSupportConsole } = useAuth();

  const supportModules = [
    {
      title: 'Mes Demandes',
      description: 'Créer et suivre vos demandes de support',
      icon: LifeBuoy,
      href: '/support/mes-demandes',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      visible: true,
    },
    {
      title: 'Console Support',
      description: 'Traiter les demandes de support',
      icon: Headset,
      href: '/support/console',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      visible: canAccessSupportConsole,
    },
  ];

  const visibleModules = supportModules.filter(m => m.visible);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Support</h1>
        <p className="text-muted-foreground">
          Assistance et gestion des demandes de support.
        </p>
      </div>

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
                  <CardTitle>{module.title}</CardTitle>
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
