/**
 * Routes du module RH (Ressources Humaines)
 * 
 * SIMPLIFICATION v0.9: Navigation unifiée via onglets.
 * Les routes principales redirigent vers l'interface unifiée.
 * Les sous-pages de détail conservent MainLayout.
 */
import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ModuleGuard } from "@/components/auth/ModuleGuard";

// Pages détail - Lazy loaded
const RHSuiviIndex = lazy(() => import("@/pages/rh/RHSuiviIndex"));
const MaintenancePreventivePage = lazy(() => import("@/pages/MaintenancePreventivePage"));
const DocGenPage = lazy(() => import("@/pages/rh/DocGenPage"));
const RHMeetingsPage = lazy(() => import("@/pages/rh/RHMeetingsPage"));
const PlanningHebdo = lazy(() => import("@/pages/PlanningTechniciensSemaine"));

export function RHRoutes() {
  return (
    <>
      {/* ============================================ */}
      {/* REDIRECTIONS VERS INTERFACE UNIFIEE */}
      {/* ============================================ */}
      <Route path="/rh" element={<Navigate to="/?tab=salaries" replace />} />
      <Route path="/rh/parc" element={<Navigate to="/?tab=parc" replace />} />

      {/* ============================================ */}
      {/* SUIVI RH - COCKPIT (N2 back-office) */}
      {/* ============================================ */}
      <Route 
        path="/rh/suivi" 
        element={
          <MainLayout>
            <RoleGuard minRole="franchisee_admin">
              <RHSuiviIndex />
            </RoleGuard>
          </MainLayout>
        } 
      />
      {/* Legacy: /rh/suivi/:id redirige vers le cockpit */}
      <Route path="/rh/suivi/:id" element={<Navigate to="/rh/suivi" replace />} />
      
      <Route 
        path="/rh/suivi/plannings" 
        element={
          <MainLayout>
            <RoleGuard minRole="franchisee_admin">
              <ModuleGuard moduleKey="rh" requiredOptions={['rh_viewer', 'rh_admin']}>
                <PlanningHebdo />
              </ModuleGuard>
            </RoleGuard>
          </MainLayout>
        } 
      />

      {/* Route /rh/epi supprimée - redirection vers onglet parc */}
      <Route path="/rh/epi" element={<Navigate to="/?tab=parc" replace />} />

      {/* ============================================ */}
      {/* OUTILS RH (N2) */}
      {/* ============================================ */}
      <Route 
        path="/rh/docgen" 
        element={
          <MainLayout>
            <RoleGuard minRole="franchisee_admin">
              <ModuleGuard moduleKey="rh" requiredOptions={['rh_viewer', 'rh_admin']}>
                <DocGenPage />
              </ModuleGuard>
            </RoleGuard>
          </MainLayout>
        } 
      />
      <Route 
        path="/rh/reunions" 
        element={
          <MainLayout>
            <RoleGuard minRole="franchisee_admin">
              <ModuleGuard moduleKey="rh" requiredOptions={['rh_viewer', 'rh_admin']}>
                <RHMeetingsPage />
              </ModuleGuard>
            </RoleGuard>
          </MainLayout>
        } 
      />

      {/* ============================================ */}
      {/* LEGACY REDIRECTS */}
      {/* Toutes les anciennes routes redirigent vers le cockpit */}
      {/* ============================================ */}
      <Route path="/rh/equipe" element={<Navigate to="/rh/suivi" replace />} />
      <Route path="/rh/equipe/plannings" element={<Navigate to="/rh/suivi/plannings" replace />} />
      <Route path="/rh/equipe/heures" element={<Navigate to="/rh/suivi" replace />} />
      <Route path="/rh/equipe/:id" element={<Navigate to="/rh/suivi" replace />} />
      
      {/* Legacy redirects maintenus pour bookmarks existants */}
      <Route path="/hc-agency/equipe" element={<Navigate to="/rh/suivi" replace />} />
      <Route path="/hc-agency/collaborateurs" element={<Navigate to="/rh/suivi" replace />} />
      <Route path="/hc-agency/collaborateurs/:id" element={<Navigate to="/rh/suivi" replace />} />
      <Route path="/hc-agency/demandes-rh" element={<Navigate to="/rh" replace />} />
      <Route path="/hc-agency/gestion-conges" element={<Navigate to="/rh" replace />} />
      <Route path="/hc-agency/dashboard-rh" element={<Navigate to="/rh" replace />} />
    </>
  );
}
