/**
 * StatIA Builder - Page Admin (N5/N6)
 */

import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { StatiaBuilderEnhanced } from '../components/StatiaBuilder/StatiaBuilderEnhanced';

export default function StatiaBuilderAdminPage() {
  return (
    <RoleGuard minRole="platform_admin">
      <MainLayout>
        <div className="container mx-auto py-8 px-4 space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">StatIA Builder</h1>
            <p className="text-muted-foreground">
              Créez et testez des métriques personnalisées sur n'importe quelle agence du réseau.
            </p>
          </div>
          <StatiaBuilderEnhanced mode="admin" />
        </div>
      </MainLayout>
    </RoleGuard>
  );
}
