/**
 * StatIA - Page Admin (N5/N6)
 * Affiche toutes les métriques disponibles avec leurs valeurs
 */

import React from 'react';
import { AllMetricsViewer } from '../components/AllMetricsViewer';

export default function StatiaBuilderAdminPage() {
  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">StatIA - Toutes les métriques</h1>
        <p className="text-muted-foreground">
          Visualisez et vérifiez toutes les métriques StatIA disponibles. Survolez pour voir les détails.
        </p>
      </div>
      <AllMetricsViewer mode="admin" />
    </div>
  );
}
