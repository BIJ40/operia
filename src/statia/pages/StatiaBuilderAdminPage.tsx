/**
 * StatIA - Page Admin (N5/N6)
 * Affiche toutes les métriques disponibles avec leurs valeurs
 */

import React from 'react';
import { AllMetricsViewer } from '../components/AllMetricsViewer';
import { LocalErrorBoundary } from '@/components/system/LocalErrorBoundary';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

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
  return (
    <LocalErrorBoundary componentName="StatIA Builder">
      <div className="container mx-auto py-6 px-4">
        <AllMetricsViewer mode="admin" />
      </div>
    </LocalErrorBoundary>
  );
}
