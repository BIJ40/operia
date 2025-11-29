import { Link } from 'react-router-dom';
import { BarChart3, ListTodo, Tv, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const pilotageModules = [
  {
    title: 'Statistiques',
    description: 'Tableau de bord et KPI de votre agence',
    icon: BarChart3,
    href: '/pilotage/indicateurs',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    title: 'Actions à Mener',
    description: 'Suivi des actions et tâches en cours',
    icon: ListTodo,
    href: '/pilotage/actions',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    title: 'Diffusion',
    description: 'Mode affichage TV agence',
    icon: Tv,
    href: '/pilotage/diffusion',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    badge: 'En cours',
  },
  {
    title: 'RH Tech',
    description: 'Planning hebdomadaire techniciens',
    icon: Calendar,
    href: '/pilotage/rh-tech',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
];

export default function PilotageIndex() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Pilotage Agence</h1>
        <p className="text-muted-foreground">
          Outils de gestion et de suivi de l'activité de votre agence.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {pilotageModules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} to={module.href}>
              <Card className="h-full transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${module.bgColor} flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${module.color}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{module.title}</CardTitle>
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
