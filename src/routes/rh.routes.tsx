/**
 * Routes du module RH (Ressources Humaines)
 * 
 * SIMPLIFICATION: Le portail salarié N1 a été supprimé.
 * Seules les fonctionnalités N2 (back-office franchisé) sont conservées.
 */
import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ModuleGuard } from "@/components/auth/ModuleGuard";

// Pages N2 (back-office) - Lazy loaded
const RHIndex = lazy(() => import("@/pages/RHIndex"));
const RHSuiviIndex = lazy(() => import("@/pages/rh/RHSuiviIndex"));
const RHCollaborateurPage = lazy(() => import("@/pages/rh/RHCollaborateurPage"));
const CollaborateurProfilePage = lazy(() => import("@/pages/CollaborateurProfilePage"));
// GestionHeuresPage et TimesheetsValidationPage supprimés (legacy N1 v0.8.3)
const MaintenancePreventivePage = lazy(() => import("@/pages/MaintenancePreventivePage"));
// EPIPage supprimée - fonctionnalités intégrées dans le Parc
const DocGenPage = lazy(() => import("@/pages/rh/DocGenPage"));
const RHMeetingsPage = lazy(() => import("@/pages/rh/RHMeetingsPage"));
const PlanningHebdo = lazy(() => import("@/pages/PlanningTechniciensSemaine"));

export function RHRoutes() {
  return (
    <>
      {/* ============================================ */}
      {/* RH INDEX - N2+ uniquement */}
      {/* ============================================ */}
      <Route 
        path="/rh" 
        element={
          <MainLayout>
            <RoleGuard minRole="franchisee_admin">
              <ModuleGuard moduleKey="rh">
                <RHIndex />
              </ModuleGuard>
            </RoleGuard>
          </MainLayout>
        } 
      />

      {/* ============================================ */}
      {/* SUIVI RH (N2 back-office) */}
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
      <Route 
        path="/rh/suivi/:id" 
        element={
          <MainLayout>
            <RoleGuard minRole="franchisee_admin">
              <RHCollaborateurPage />
            </RoleGuard>
          </MainLayout>
        } 
      />
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
      {/* Routes GestionHeuresPage et TimesheetsValidationPage supprimées (legacy N1 v0.8.3) */}

      {/* ============================================ */}
      {/* MAINTENANCE (N2) */}
      {/* ============================================ */}
      <Route 
        path="/rh/parc" 
        element={
          <MainLayout>
            <RoleGuard minRole="franchisee_admin">
              <ModuleGuard moduleKey="rh">
                <MaintenancePreventivePage />
              </ModuleGuard>
            </RoleGuard>
          </MainLayout>
        } 
      />
      {/* Route /rh/epi supprimée - redirection vers /rh/parc */}
      <Route path="/rh/epi" element={<Navigate to="/rh/parc" replace />} />

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
      {/* ============================================ */}
      {/* Anciennes routes équipe → suivi */}
      <Route path="/rh/equipe" element={<Navigate to="/rh/suivi" replace />} />
      <Route path="/rh/equipe/plannings" element={<Navigate to="/rh/suivi/plannings" replace />} />
      <Route path="/rh/equipe/heures" element={<Navigate to="/rh/suivi/heures" replace />} />
      <Route 
        path="/rh/equipe/:id" 
        element={
          <MainLayout>
            <RoleGuard minRole="franchisee_admin">
              <RHCollaborateurPage />
            </RoleGuard>
          </MainLayout>
        } 
      />
      
      {/* Legacy redirects maintenus pour bookmarks existants */}
      <Route path="/hc-agency/equipe" element={<Navigate to="/rh/suivi" replace />} />
      <Route path="/hc-agency/collaborateurs" element={<Navigate to="/rh/suivi" replace />} />
      <Route 
        path="/hc-agency/collaborateurs/:id" 
        element={
          <MainLayout>
            <RoleGuard minRole="franchisee_admin">
              <RHCollaborateurPage />
            </RoleGuard>
          </MainLayout>
        } 
      />
      <Route path="/hc-agency/demandes-rh" element={<Navigate to="/rh" replace />} />
      <Route path="/hc-agency/gestion-conges" element={<Navigate to="/rh" replace />} />
      <Route path="/hc-agency/dashboard-rh" element={<Navigate to="/rh" replace />} />
    </>
  );
}
