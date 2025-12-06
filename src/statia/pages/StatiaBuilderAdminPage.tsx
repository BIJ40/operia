/**
 * StatIA - Page Admin (N5/N6)
 * Affiche toutes les métriques disponibles avec leurs valeurs
 */

import React, { useState } from 'react';
import { AllMetricsViewer } from '../components/AllMetricsViewer';
import { MetricValidatorHub } from '../components/MetricValidatorHub';
import { LocalErrorBoundary } from '@/components/system/LocalErrorBoundary';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, FlaskConical, LayoutGrid, CheckSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';

function StatiaErrorFallback({ error }: { error: Error }) {
  return (
    <div className="container mx-auto py-6 px-4">
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
  const currentTab = searchParams.get('tab') || 'viewer';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <LocalErrorBoundary componentName="StatIA Builder">
      <div className="container mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">StatIA-BY-BIJ</h1>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/statia-validator" className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Validator NLP
            </Link>
          </Button>
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
          </TabsList>

          <TabsContent value="viewer" className="mt-6">
            <AllMetricsViewer mode="admin" />
          </TabsContent>

          <TabsContent value="validator" className="mt-6">
            <MetricValidatorHub mode="admin" />
          </TabsContent>
        </Tabs>
      </div>
    </LocalErrorBoundary>
  );
}
