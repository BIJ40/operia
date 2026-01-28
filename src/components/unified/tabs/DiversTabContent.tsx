/**
 * DiversTabContent - Contenu de l'onglet "Divers"
 * Réunions, documentation, paramètres
 */

import { lazy, Suspense, useState } from 'react';
import { FileText, Settings, Users2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const RHMeetingsPage = lazy(() => import('@/pages/rh/RHMeetingsPage'));
const DocGenPage = lazy(() => import('@/pages/rh/DocGenPage'));

type DiversSection = 'reunions' | 'docgen' | null;

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
      <div className="container mx-auto py-4 px-4">
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
      <div className="container mx-auto py-4 px-4">
        <Button variant="ghost" onClick={() => setActiveSection(null)} className="mb-4">
          ← Retour
        </Button>
        <Suspense fallback={<LoadingFallback />}>
          <DocGenPage />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
