/**
 * StatIA - Page Admin (N5/N6)
 * Affiche toutes les métriques disponibles avec leurs valeurs
 * 
 * NOTE: Cette page est affichée DANS l'espace Admin unifié,
 * donc les onglets internes (Vue Métriques / Validator Hub) 
 * utilisent un paramètre URL dédié 'statiaTab' pour ne pas 
 * interférer avec les params de navigation admin.
 */

import React, { lazy, Suspense } from 'react';
import { AllMetricsViewer } from '../components/AllMetricsViewer';
import { MetricValidatorHub } from '../components/MetricValidatorHub';
import { LocalErrorBoundary } from '@/components/system/LocalErrorBoundary';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, LayoutGrid, CheckSquare, FileSearch, Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const ApogeeDocumentsExplorer = lazy(() => import('@/apogee-connect/components/ApogeeDocumentsExplorer'));

function StatiaErrorFallback({ error }: { error: Error }) {
  return (
    <div className="container mx-auto max-w-7xl py-6 px-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erreur StatIA</AlertTitle>
        <AlertDescription>
          <p className="mb-2">Une erreur s'est produite lors du chargement du module StatIA.</p>
          <details className="text-xs">
            <summary className="cursor-pointer">Détails techniques</summary>
            <pre className="mt-2 p-2 bg-destructive/10 rounded overflow-auto max-h-32">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default function StatiaBuilderAdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Utiliser un paramètre dédié pour les onglets internes StatIA
  const currentTab = searchParams.get('statiaTab') || 'viewer';

  const handleTabChange = (value: string) => {
    // Préserver TOUS les params existants (tab, adminTab, adminView)
    const next = new URLSearchParams(searchParams);
    next.set('statiaTab', value);
    setSearchParams(next);
  };

  return (
    <LocalErrorBoundary componentName="StatIA Builder">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">StatIA-BY-BIJ</h1>
        </div>

        <Tabs value={currentTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="viewer" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Vue Métriques
            </TabsTrigger>
            <TabsTrigger value="validator" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Validator Hub
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileSearch className="h-4 w-4" />
              Documents API
            </TabsTrigger>
          </TabsList>

          <TabsContent value="viewer" className="mt-6">
            <AllMetricsViewer mode="admin" />
          </TabsContent>

          <TabsContent value="validator" className="mt-6">
            <MetricValidatorHub mode="admin" />
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
              <ApogeeDocumentsExplorer />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </LocalErrorBoundary>
  );
}
