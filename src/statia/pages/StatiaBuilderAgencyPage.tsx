/**
 * StatIA - Page Agence (N2+)
 * Affiche toutes les métriques disponibles pour l'agence
 */

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AllMetricsViewer } from '../components/AllMetricsViewer';

export default function StatiaBuilderAgencyPage() {
  const { agence } = useAuth();

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">StatIA - Métriques</h1>
        <p className="text-muted-foreground">
          Visualisez toutes les métriques disponibles pour votre agence.
        </p>
      </div>
      <AllMetricsViewer mode="agency" fixedAgencySlug={agence || undefined} />
    </div>
  );
}
