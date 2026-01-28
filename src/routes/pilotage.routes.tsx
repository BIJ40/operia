import { lazy, Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ModuleGuard } from "@/components/auth/ModuleGuard";
import { Loader2 } from "lucide-react";

// Lazy loaded pages
const PilotageIndex = lazy(() => import("@/pages/PilotageIndex"));
const IndicateursLayout = lazy(() => import("@/apogee-connect/pages/IndicateursLayout"));
const IndicateursAccueil = lazy(() => import("@/apogee-connect/pages/IndicateursAccueil"));
const StatsHub = lazy(() => import("@/apogee-connect/pages/StatsHub"));
const VeilleApporteursPage = lazy(() => import("@/pages/VeilleApporteursPage"));
const PlanningHebdo = lazy(() => import("@/pages/PlanningTechniciensSemaine"));

const MesApporteursPage = lazy(() => import("@/pages/hc-agency/MesApporteursPage"));
const RdvMapPage = lazy(() => import("@/pages/hc-agency/RdvMapPage"));
const ActionsAMener = lazy(() => import("@/pages/ActionsAMener"));
const CategoryActionsAMener = lazy(() => import("@/pages/CategoryActionsAMener"));
const DiffusionDashboard = lazy(() => import("@/pages/DiffusionDashboard"));
const CommercialPage = lazy(() => import("@/pages/CommercialPage"));
const CommercialSupportPptx = lazy(() => import("@/commercial/pages/CommercialSupportPptx"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

export function PilotageRoutes() {
  return (
    <>
      {/* Section Index */}
      <Route path="/hc-agency" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="pilotage_agence"><PilotageIndex /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Hub Statistiques */}
      <Route path="/hc-agency/stats-hub" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence" requiredOption="stats_hub"><StatsHub /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/hc-agency/statistiques" element={<Navigate to="/hc-agency/indicateurs" replace />} />
      
      {/* Indicateurs détaillés */}
      <Route path="/hc-agency/indicateurs" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence" requiredOption="indicateurs"><IndicateursLayout /></ModuleGuard></RoleGuard></MainLayout>}>
        <Route index element={<IndicateursAccueil />} />
      </Route>
      {/* Legacy routes - redirect to StatsHub */}
      <Route path="/hc-agency/indicateurs/apporteurs" element={<Navigate to="/hc-agency/stats-hub" replace />} />
      <Route path="/hc-agency/indicateurs/univers" element={<Navigate to="/hc-agency/stats-hub" replace />} />
      <Route path="/hc-agency/indicateurs/techniciens" element={<Navigate to="/hc-agency/stats-hub" replace />} />
      <Route path="/hc-agency/indicateurs/sav" element={<Navigate to="/hc-agency/stats-hub" replace />} />
      
      {/* Veille Apporteurs */}
      <Route path="/hc-agency/veille-apporteurs" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence" requiredOption="veille_apporteurs"><VeilleApporteursPage /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Actions à Mener */}
      <Route path="/hc-agency/actions" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence" requiredOption="actions_a_mener"><ActionsAMener /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/hc-agency/actions/category/:slug" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence" requiredOption="actions_a_mener"><CategoryActionsAMener /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Diffusion */}
      <Route path="/hc-agency/statistiques/diffusion" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence" requiredOption="diffusion"><DiffusionDashboard /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* RH Tech - redirige vers RH principal */}
      <Route path="/hc-agency/rh-tech" element={<Navigate to="/rh/suivi" replace />} />
      <Route path="/hc-agency/rh-tech/planning" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence"><PlanningHebdo /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Mes Apporteurs */}
      <Route path="/hc-agency/mes-apporteurs" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence" requiredOption="mes_apporteurs"><Suspense fallback={<PageLoader />}><MesApporteursPage /></Suspense></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Carte des RDV */}
      <Route path="/hc-agency/map" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence" requiredOption="carte_rdv"><Suspense fallback={<PageLoader />}><RdvMapPage /></Suspense></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Commercial */}
      <Route path="/hc-agency/commercial" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence"><CommercialPage /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/hc-agency/commercial/support-pptx" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence"><CommercialSupportPptx /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Legacy redirects */}
      <Route path="/hc-agency/statia-builder" element={<Navigate to="/admin/statia-by-bij" replace />} />
      <Route path="/hc-agency/maintenance" element={<Navigate to="/rh/parc" replace />} />
    </>
  );
}
