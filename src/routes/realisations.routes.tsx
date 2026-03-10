/**
 * Routes for the Réalisations module
 */
import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { MinimalLayout } from '@/components/layout';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { ModuleGuard } from '@/components/auth/ModuleGuard';

const RealisationsPage = lazy(() => import('@/realisations/pages/RealisationsPage'));
const RealisationDetailPage = lazy(() => import('@/realisations/pages/RealisationDetailPage'));
const RealisationCreatePage = lazy(() => import('@/realisations/pages/RealisationCreatePage'));

export function RealisationsRoutes() {
  return (
    <>
      <Route
        path="/realisations"
        element={
          <MinimalLayout backTab="outils" backLabel="Retour aux outils">
            <RoleGuard minRole="franchisee_user">
              <ModuleGuard moduleKey="realisations" showError>
                <RealisationsPage />
              </ModuleGuard>
            </RoleGuard>
          </MinimalLayout>
        }
      />
      <Route
        path="/realisations/new"
        element={
          <MinimalLayout backTab="outils" backLabel="Retour aux réalisations">
            <RoleGuard minRole="franchisee_user">
              <ModuleGuard moduleKey="realisations" showError>
                <RealisationCreatePage />
              </ModuleGuard>
            </RoleGuard>
          </MinimalLayout>
        }
      />
      <Route
        path="/realisations/:id"
        element={
          <MinimalLayout backTab="outils" backLabel="Retour aux réalisations">
            <RoleGuard minRole="franchisee_user">
              <ModuleGuard moduleKey="realisations" showError>
                <RealisationDetailPage />
              </ModuleGuard>
            </RoleGuard>
          </MinimalLayout>
        }
      />
    </>
  );
}
