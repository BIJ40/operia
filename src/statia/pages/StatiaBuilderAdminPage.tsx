/**
 * StatIA - Page Admin (N5/N6)
 * Affiche toutes les métriques disponibles avec leurs valeurs
 */

import React from 'react';
import { AllMetricsViewer } from '../components/AllMetricsViewer';

export default function StatiaBuilderAdminPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <AllMetricsViewer mode="admin" />
    </div>
  );
}
