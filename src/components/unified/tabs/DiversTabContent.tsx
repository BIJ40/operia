/**
 * DiversTabContent - Contenu de l'onglet "Divers"
 * Réunions, documentation, paramètres, apporteurs, plannings
 */

import { lazy, Suspense, useState } from 'react';
import { FileText, Settings, Users2, Loader2, Users, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const RHMeetingsPage = lazy(() => import('@/pages/rh/RHMeetingsPage'));
const DocGenPage = lazy(() => import('@/pages/rh/DocGenPage'));
const MesApporteursTab = lazy(() => import('@/components/pilotage/MesApporteursTab').then(m => ({ default: m.MesApporteursTab })));
const PlanningHebdo = lazy(() => import('@/pages/PlanningTechniciensSemaine'));

type DiversSection = 'reunions' | 'docgen' | 'apporteurs' | 'plannings' | null;

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function DiversTabContent() {
  const [activeSection, setActiveSection] = useState<DiversSection>(null);
  
  if (activeSection === 'reunions') {
    return (
      <div className="py-3 px-2 sm:px-4">
        <Button variant="ghost" onClick={() => setActiveSection(null)} className="mb-4">
          ← Retour
        </Button>
        <Suspense fallback={<LoadingFallback />}>
          <RHMeetingsPage />
        </Suspense>
      </div>
    );
  }
  
  if (activeSection === 'docgen') {
    return (
      <div className="py-3 px-2 sm:px-4">
        <Button variant="ghost" onClick={() => setActiveSection(null)} className="mb-4">
          ← Retour
        </Button>
        <Suspense fallback={<LoadingFallback />}>
          <DocGenPage />
        </Suspense>
      </div>
    );
  }

  if (activeSection === 'apporteurs') {
    return (
      <div className="py-3 px-2 sm:px-4">
        <Button variant="ghost" onClick={() => setActiveSection(null)} className="mb-4">
          ← Retour
        </Button>
        <Suspense fallback={<LoadingFallback />}>
          <MesApporteursTab />
        </Suspense>
      </div>
    );
  }

  if (activeSection === 'plannings') {
    return (
      <div className="py-3 px-2 sm:px-4">
        <Button variant="ghost" onClick={() => setActiveSection(null)} className="mb-4">
          ← Retour
        </Button>
        <Suspense fallback={<LoadingFallback />}>
          <PlanningHebdo />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="py-3 px-2 sm:px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card 
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => setActiveSection('apporteurs')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-primary" />
              Apporteurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Gestion des apporteurs d'affaires
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => setActiveSection('plannings')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="w-5 h-5 text-primary" />
              Plannings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Planning hebdomadaire des techniciens
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => setActiveSection('reunions')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users2 className="w-5 h-5 text-primary" />
              Réunions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Planifier et gérer les réunions d'équipe
            </p>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => setActiveSection('docgen')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-primary" />
              Génération de documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Créer des documents RH automatiquement
            </p>
          </CardContent>
        </Card>
        
        <Card className="opacity-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="w-5 h-5 text-muted-foreground" />
              Paramètres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Configuration de l'agence (à venir)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
