/**
 * DashboardStatic - Page d'accueil avec layout fixe (pas de widgets dynamiques)
 */

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IndicateursGlobauxWidget } from '@/components/dashboard/widgets/IndicateursGlobauxWidget';
import { FavorisWidget } from '@/components/dashboard/widgets/FavorisWidget';
import { RecentTicketsWidget } from '@/components/dashboard/widgets/RecentTicketsWidget';
import { CollaboratorsListWidget } from '@/components/dashboard/widgets/CollaboratorsListWidget';
import { CAParUniversWidget } from '@/components/dashboard/widgets/CAParUniversWidget';
import { TauxSavWidget } from '@/components/dashboard/widgets/TauxSavWidget';
import { BarChart3, Star, MessageSquare, Users, PieChart, AlertTriangle } from 'lucide-react';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export default function DashboardStatic() {
  const { firstName } = useAuth();
  const greeting = getGreeting();

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {greeting}{firstName ? `, ${firstName}` : ''} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Voici un aperçu de votre activité
        </p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* Row 1: Indicateurs Globaux (large) + Mon Équipe */}
        <Card className="col-span-12 lg:col-span-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Indicateurs du mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <IndicateursGlobauxWidget />
          </CardContent>
        </Card>

        <Card className="col-span-12 lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Mon équipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CollaboratorsListWidget />
          </CardContent>
        </Card>

        {/* Row 2: Derniers Tickets + CA par Univers + Taux SAV */}
        <Card className="col-span-12 md:col-span-6 lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Derniers tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecentTicketsWidget />
          </CardContent>
        </Card>

        <Card className="col-span-12 md:col-span-6 lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              CA par Univers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CAParUniversWidget />
          </CardContent>
        </Card>

        <Card className="col-span-12 md:col-span-6 lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Taux SAV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TauxSavWidget />
          </CardContent>
        </Card>

        {/* Row 3: Favoris */}
        <Card className="col-span-12 md:col-span-6 lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              Mes favoris
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-[150px]">
            <FavorisWidget />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
