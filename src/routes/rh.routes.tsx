import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ModuleGuard } from "@/components/auth/ModuleGuard";

// Lazy loaded pages
const RHIndex = lazy(() => import("@/pages/RHIndex"));
const RHSuiviIndex = lazy(() => import("@/pages/rh/RHSuiviIndex"));
const GestionHeuresPage = lazy(() => import("@/pages/rh/GestionHeuresPage"));
const TimesheetsValidationPage = lazy(() => import("@/pages/rh/TimesheetsValidationPage"));
const RHCollaborateurPage = lazy(() => import("@/pages/rh/RHCollaborateurPage"));
// CollaborateursPage SUPPRIMÉE - fusionnée dans RHSuiviIndex
const CollaborateurProfilePage = lazy(() => import("@/pages/CollaborateurProfilePage"));
const MesCoffreRHPage = lazy(() => import("@/pages/rh-employee/MesCoffreRHPage"));
const MesDemandesPage = lazy(() => import("@/pages/rh-employee/MesDemandesPage"));
const MonPlanningPage = lazy(() => import("@/pages/rh-employee/MonPlanningPage"));
const MonVehiculePage = lazy(() => import("@/pages/rh-employee/MonVehiculePage"));
const MonMaterielPage = lazy(() => import("@/pages/rh-employee/MonMaterielPage"));
const MaSignaturePage = lazy(() => import("@/pages/rh-employee/MaSignaturePage"));
const DemandesRHPage = lazy(() => import("@/pages/rh/DemandesRHUnifiedPage"));
const MaintenancePreventivePage = lazy(() => import("@/pages/MaintenancePreventivePage"));
const EPIPage = lazy(() => import("@/pages/EPIPage"));
const DocGenPage = lazy(() => import("@/pages/rh/DocGenPage"));
const RHMeetingsPage = lazy(() => import("@/pages/rh/RHMeetingsPage"));
const PlanningHebdo = lazy(() => import("@/pages/PlanningTechniciensSemaine"));

export function RHRoutes() {
  return (
    <>
      {/* Index */}
      <Route path="/rh" element={<MainLayout><RoleGuard><ModuleGuard moduleKey="rh"><RHIndex /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Suivi RH - Back-office N2 */}
      <Route path="/rh/suivi" element={<MainLayout><RoleGuard minRole="franchisee_admin"><RHSuiviIndex /></RoleGuard></MainLayout>} />
      <Route path="/rh/suivi/:id" element={<MainLayout><RoleGuard minRole="franchisee_admin"><RHCollaborateurPage /></RoleGuard></MainLayout>} />
      <Route path="/rh/suivi/plannings" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="rh" requiredOptions={['rh_viewer', 'rh_admin']}><PlanningHebdo /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/rh/suivi/heures" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="rh" requiredOptions={['rh_viewer', 'rh_admin']}><GestionHeuresPage /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Portail Salarié */}
      <Route path="/rh/coffre" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="rh" requiredOptions={['coffre']}><MesCoffreRHPage /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/rh/demande" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="rh" requiredOptions={['coffre']}><MesDemandesPage /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/rh/mon-planning" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="rh" requiredOptions={['mon_planning']}><MonPlanningPage /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/rh/mon-vehicule" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="rh" requiredOptions={['mon_vehicule']}><MonVehiculePage /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/rh/mon-materiel" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="rh" requiredOptions={['mon_materiel']}><MonMaterielPage /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/rh/signature" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="rh"><MaSignaturePage /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Gestion équipe - FUSIONNÉE DANS /rh/suivi */}
      <Route path="/rh/equipe" element={<Navigate to="/rh/suivi" replace />} />
      <Route path="/rh/equipe/plannings" element={<Navigate to="/rh/suivi/plannings" replace />} />
      <Route path="/rh/equipe/heures" element={<Navigate to="/rh/suivi/heures" replace />} />
      <Route path="/rh/timesheets" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="rh" requiredOptions={['rh_viewer', 'rh_admin']}><TimesheetsValidationPage /></ModuleGuard></RoleGuard></MainLayout>} />
      {/* Redirection dynamique /rh/equipe/:id -> /rh/suivi/:id via même composant */}
      <Route path="/rh/equipe/:id" element={<MainLayout><RoleGuard minRole="franchisee_admin"><RHCollaborateurPage /></RoleGuard></MainLayout>} />
      <Route path="/rh/demandes" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="rh" requiredOptions={['rh_viewer', 'rh_admin']}><DemandesRHPage /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Parc & EPI */}
      <Route path="/rh/parc" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="rh"><MaintenancePreventivePage /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/rh/epi" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="rh"><EPIPage /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Outils RH */}
      <Route path="/rh/docgen" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="rh" requiredOptions={['rh_viewer', 'rh_admin']}><DocGenPage /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/rh/reunions" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="rh" requiredOptions={['rh_viewer', 'rh_admin']}><RHMeetingsPage /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Legacy redirects */}
      <Route path="/rh/conges" element={<Navigate to="/rh/demandes" replace />} />
      <Route path="/rh/dashboard" element={<Navigate to="/rh" replace />} />
      <Route path="/pilotage/mon-coffre-rh" element={<Navigate to="/rh/coffre" replace />} />
      <Route path="/mon-coffre-rh" element={<Navigate to="/rh/coffre" replace />} />
      <Route path="/faire-une-demande" element={<Navigate to="/rh/demande" replace />} />
      <Route path="/hc-agency/equipe" element={<Navigate to="/rh/suivi" replace />} />
      <Route path="/hc-agency/collaborateurs" element={<Navigate to="/rh/suivi" replace />} />
      <Route path="/hc-agency/collaborateurs/:id" element={<MainLayout><RoleGuard minRole="franchisee_admin"><RHCollaborateurPage /></RoleGuard></MainLayout>} />
      <Route path="/hc-agency/demandes-rh" element={<Navigate to="/rh/demandes" replace />} />
      <Route path="/hc-agency/gestion-conges" element={<Navigate to="/rh/demandes" replace />} />
      <Route path="/hc-agency/dashboard-rh" element={<Navigate to="/rh/dashboard" replace />} />
    </>
  );
}
