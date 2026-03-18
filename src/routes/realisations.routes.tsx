/**
 * Routes for the Réalisations module
 */
import { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { MinimalLayout } from '@/components/layout';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { ModuleGuard } from '@/components/auth/ModuleGuard';

const RealisationDetailPage = lazy(() => import('@/realisations/pages/RealisationDetailPage'));
const RealisationCreatePage = lazy(() => import('@/realisations/pages/RealisationCreatePage'));

export function RealisationsRoutes() {
  return (
    <>
      {/* Liste = sous-onglet Commercial, pas de route standalone */}
      <Route
        path="/realisations"
        element={<Navigate to="/?tab=commercial" replace />}
      />
      <Route
        path="/realisations/new"
        element={
          <MinimalLayout backTab="commercial" backLabel="Retour aux réalisations">
            <RoleGuard minRole="franchisee_user">
              <ModuleGuard moduleKey="commercial.realisations" showError>
                <RealisationCreatePage />
              </ModuleGuard>
            </RoleGuard>
          </MinimalLayout>
        }
      />
      <Route
        path="/realisations/:id"
        element={
          <MinimalLayout backTab="commercial" backLabel="Retour aux réalisations">
            <RoleGuard minRole="franchisee_user">
              <ModuleGuard moduleKey="commercial.realisations" showError>
                <RealisationDetailPage />
              </ModuleGuard>
            </RoleGuard>
          </MinimalLayout>
        }
      />
    </>
  );
}
