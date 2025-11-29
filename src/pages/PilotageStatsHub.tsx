import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ROUTES } from '@/config/routes';
import { Link } from 'react-router-dom';
import { BarChart3, Users, Layers, Wrench, AlertTriangle } from 'lucide-react';

const statsTiles = [
  {
    title: 'Indicateurs généraux',
    description: 'Vue d\'ensemble des KPI de l\'agence (CA, dossiers, interventions, etc.).',
    icon: BarChart3,
    href: ROUTES.pilotage.indicateurs,
  },
  {
    title: 'Indicateurs Apporteurs',
    description: 'Performance par apporteur d\'affaires, volumes, CA, taux de transformation.',
    icon: Users,
    href: ROUTES.pilotage.indicateursApporteurs,
  },
  {
    title: 'Indicateurs Univers',
    description: 'Répartition du chiffre d\'affaires par univers métier (plomberie, électricité, etc.).',
    icon: Layers,
    href: ROUTES.pilotage.indicateursUnivers,
  },
  {
    title: 'Indicateurs Techniciens',
    description: 'Productivité, CA, SAV et performances individuelles des techniciens.',
    icon: Wrench,
    href: ROUTES.pilotage.indicateursTechniciens,
  },
  {
    title: 'Indicateurs SAV',
    description: 'Taux de SAV, multi-visites, réclamations et réinterventions.',
    icon: AlertTriangle,
    href: ROUTES.pilotage.indicateursSav,
  },
];

export default function PilotageStatsHub() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Statistiques</h1>
        <p className="text-sm text-muted-foreground">
          Accédez à l'ensemble des indicateurs de votre agence : vue globale, apporteurs, univers, techniciens et SAV.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statsTiles.map((tile) => (
          <Link key={tile.href} to={tile.href}>
            <Card className="h-full cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <tile.icon className="h-5 w-5 text-primary" />
                  {tile.title}
                </CardTitle>
                <CardDescription>{tile.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
