/**
 * StatIA Builder - Page Admin (N5/N6)
 * RoleGuard et MainLayout sont appliqués au niveau route dans App.tsx
 */

import React from 'react';
import { StatiaBuilderEnhanced } from '../components/StatiaBuilder/StatiaBuilderEnhanced';

export default function StatiaBuilderAdminPage() {
  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">StatIA Builder</h1>
        <p className="text-muted-foreground">
          Créez et testez des métriques personnalisées sur n'importe quelle agence du réseau.
        </p>
      </div>
      <StatiaBuilderEnhanced mode="admin" />
    </div>
  );
}
