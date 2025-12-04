/**
 * StatIA Builder - Page Agence (N2+)
 */

import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { useAuth } from '@/contexts/AuthContext';
import { StatiaBuilderEnhanced } from '../components/StatiaBuilder/StatiaBuilderEnhanced';

export default function StatiaBuilderAgencyPage() {
  const { agence } = useAuth();

  return (
    <RoleGuard minRole="franchisee_admin">
      <MainLayout>
        <div className="container mx-auto py-8 px-4 space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">StatIA Builder</h1>
            <p className="text-muted-foreground">
              Créez des métriques personnalisées pour votre agence.
            </p>
          </div>
          <StatiaBuilderEnhanced mode="agency" fixedAgencySlug={agence || undefined} />
        </div>
      </MainLayout>
    </RoleGuard>
  );
}
