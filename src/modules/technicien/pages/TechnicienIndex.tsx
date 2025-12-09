/**
 * TechnicienIndex - Page d'accueil du module Technicien
 * 
 * Hub central pour les fonctionnalités technicien :
 * - Relevé Technique (RT)
 * - Bon d'Intervention (BI)
 * - PV Apporteur
 */

import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardList, 
  FileSignature, 
  FileCheck, 
  Wrench,
  ChevronRight,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/utils';

interface TechnicienTile {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  status: 'available' | 'coming_soon' | 'in_progress';
  badge?: string;
  color: string;
}

const tiles: TechnicienTile[] = [
  {
    id: 'rt',
    title: 'Relevé Technique',
    description: 'Remplir un questionnaire RT pour un RDV technique',
    icon: ClipboardList,
    href: ROUTES.pilotage.techInterventions,
    status: 'available',
    color: 'text-blue-500',
  },
  {
    id: 'bi',
    title: 'Bon d\'Intervention',
    description: 'Compléter un BI avec travaux, heures et signature client',
    icon: FileSignature,
    href: ROUTES.technicien.bonIntervention,
    status: 'coming_soon',
    badge: 'Bientôt',
    color: 'text-green-500',
  },
  {
    id: 'pv',
    title: 'PV Apporteur',
    description: 'Générer et faire signer un PV pour apporteur d\'affaires',
    icon: FileCheck,
    href: ROUTES.technicien.pvApporteur,
    status: 'coming_soon',
    badge: 'Bientôt',
    color: 'text-orange-500',
  },
];

function StatusBadge({ status, badge }: { status: TechnicienTile['status']; badge?: string }) {
  if (status === 'available') {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Disponible
      </Badge>
    );
  }
  
  if (status === 'coming_soon') {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
        <Clock className="h-3 w-3 mr-1" />
        {badge || 'Bientôt'}
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
      <Wrench className="h-3 w-3 mr-1" />
      En cours
    </Badge>
  );
}

export default function TechnicienIndex() {
  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Wrench className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Espace Technicien</h1>
          <p className="text-muted-foreground">
            Gérez vos interventions terrain
          </p>
        </div>
      </div>

      {/* Tiles Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          const isDisabled = tile.status === 'coming_soon';

          if (isDisabled) {
            return (
              <div key={tile.id} className="cursor-not-allowed">
                <Card className="h-full transition-all opacity-60">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className={cn('p-2 rounded-lg bg-muted', tile.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <StatusBadge status={tile.status} badge={tile.badge} />
                    </div>
                    <CardTitle className="text-lg mt-3">{tile.title}</CardTitle>
                    <CardDescription>{tile.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0" />
                </Card>
              </div>
            );
          }

          return (
            <Link key={tile.id} to={tile.href}>
              <Card className="h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={cn('p-2 rounded-lg bg-muted', tile.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <StatusBadge status={tile.status} badge={tile.badge} />
                  </div>
                  <CardTitle className="text-lg mt-3">{tile.title}</CardTitle>
                  <CardDescription>{tile.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center text-sm text-primary font-medium">
                    Accéder
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Info card */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10 shrink-0">
              <FileSignature className="h-4 w-4 text-primary" />
            </div>
            <div className="text-sm">
              <p className="font-medium">Module Technicien</p>
              <p className="text-muted-foreground mt-1">
                Ce module permet aux techniciens de remplir leurs relevés techniques, 
                bons d'intervention et faire signer les documents directement sur le terrain.
                Les signatures sont capturées de manière tactile et intégrées aux PDF générés.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
