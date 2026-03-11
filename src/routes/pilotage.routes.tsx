import { lazy, Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import { MinimalLayout } from "@/components/layout";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ModuleGuard } from "@/components/auth/ModuleGuard";
import { Loader2 } from "lucide-react";

// Lazy loaded pages
const PilotageIndex = lazy(() => import("@/pages/PilotageIndex"));
const IndicateursLayout = lazy(() => import("@/apogee-connect/pages/IndicateursLayout"));
const IndicateursAccueil = lazy(() => import("@/apogee-connect/pages/IndicateursAccueil"));
const StatsHub = lazy(() => import("@/apogee-connect/pages/StatsHub"));
const PlanningHebdo = lazy(() => import("@/pages/PlanningTechniciensSemaine"));

const MesApporteursPage = lazy(() => import("@/pages/agency/ApporteursPage"));
const RdvMapPage = lazy(() => import("@/pages/agency/CartePage"));
const ActionsAMener = lazy(() => import("@/pages/ActionsAMener"));
const CategoryActionsAMener = lazy(() => import("@/pages/CategoryActionsAMener"));
const DiffusionDashboard = lazy(() => import("@/pages/DiffusionDashboard"));
const TvDisplayEntry = lazy(() => import("@/pages/TvDisplayEntry"));
const CommercialPage = lazy(() => import("@/pages/CommercialPage"));
const CommercialSupportPptx = lazy(() => import("@/commercial/pages/CommercialSupportPptx"));
const PlanningV2Shell = lazy(() => import("@/planning-v2/components/PlanningV2Shell"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

// Helper pour créer les layouts pilotage
function AgencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <MinimalLayout backTab="agence" backLabel="Retour à Mon Agence">
      {children}
    </MinimalLayout>
  );
}

export function PilotageRoutes() {
  return (
    <>
      {/* ============================================ */}
      {/* REDIRECTIONS VERS INTERFACE UNIFIEE */}
      {/* ============================================ */}
      <Route path="/agency" element={<Navigate to="/?tab=pilotage" replace />} />
      <Route path="/agency/stats-hub" element={<Navigate to="/?tab=pilotage" replace />} />
      <Route path="/agency/statistiques" element={<Navigate to="/?tab=pilotage" replace />} />
      
      {/* Indicateurs détaillés */}
      <Route path="/agency/indicateurs" element={<AgencyLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage.agence" requiredOption="indicateurs"><IndicateursLayout /></ModuleGuard></RoleGuard></AgencyLayout>}>
        <Route index element={<IndicateursAccueil />} />
      </Route>
      {/* Legacy routes - redirect to StatsHub */}
      <Route path="/agency/indicateurs/apporteurs" element={<Navigate to="/agency/stats-hub" replace />} />
      <Route path="/agency/indicateurs/univers" element={<Navigate to="/agency/stats-hub" replace />} />
      <Route path="/agency/indicateurs/techniciens" element={<Navigate to="/agency/stats-hub" replace />} />
      <Route path="/agency/indicateurs/sav" element={<Navigate to="/agency/stats-hub" replace />} />
      
      {/* Veille Apporteurs - Redirige vers sous-onglet Divers */}
      <Route path="/agency/veille-apporteurs" element={<Navigate to="/?tab=organisation" replace />} />
      
      {/* Actions à Mener */}
      <Route path="/agency/actions" element={<AgencyLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage.agence" requiredOption="actions_a_mener"><ActionsAMener /></ModuleGuard></RoleGuard></AgencyLayout>} />
      <Route path="/agency/actions/category/:slug" element={<AgencyLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage.agence" requiredOption="actions_a_mener"><CategoryActionsAMener /></ModuleGuard></RoleGuard></AgencyLayout>} />
      
      {/* Diffusion */}
      <Route
        path="/agency/diffusion"
        element={
          <AgencyLayout>
            <RoleGuard
              minRole="franchisee_admin"
              showError
              errorMessage="Accès réservé : rôle insuffisant pour la Diffusion TV."
            >
              <ModuleGuard
                moduleKey="pilotage.agence"
                requiredOption="diffusion"
                showError
                errorMessage="Module Diffusion TV non activé pour votre profil."
              >
                <DiffusionDashboard />
              </ModuleGuard>
            </RoleGuard>
          </AgencyLayout>
        }
      />
      
      {/* TV Display - Route sans layout pour affichage plein écran TV */}
      <Route
        path="/tv-display"
        element={
          <RoleGuard
            minRole="franchisee_admin"
            showError
            errorMessage="Accès réservé : rôle insuffisant pour l'affichage TV."
          >
            <TvDisplayEntry />
          </RoleGuard>
        }
      />
      
      {/* RH Tech - redirige vers RH principal */}
      <Route path="/agency/rh-tech" element={<Navigate to="/rh/suivi" replace />} />
      <Route path="/agency/rh-tech/planning" element={<AgencyLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage.agence"><PlanningHebdo /></ModuleGuard></RoleGuard></AgencyLayout>} />
      
      {/* Mes Apporteurs */}
      <Route path="/agency/apporteurs" element={<AgencyLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage.agence" requiredOption="mes_apporteurs"><Suspense fallback={<PageLoader />}><MesApporteursPage /></Suspense></ModuleGuard></RoleGuard></AgencyLayout>} />
      
      {/* Carte des RDV */}
      <Route path="/agency/carte" element={<AgencyLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage.agence" requiredOption="carte_rdv"><Suspense fallback={<PageLoader />}><RdvMapPage /></Suspense></ModuleGuard></RoleGuard></AgencyLayout>} />
      
      {/* Commercial */}
      <Route path="/agency/commercial" element={<AgencyLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="agence"><CommercialPage /></ModuleGuard></RoleGuard></AgencyLayout>} />
      <Route path="/agency/commercial/support-pptx" element={<AgencyLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="agence"><CommercialSupportPptx /></ModuleGuard></RoleGuard></AgencyLayout>} />
      
      {/* Planning V2 Dispatch Board */}
      <Route path="/planning-v2" element={<AgencyLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="agence"><Suspense fallback={<PageLoader />}><PlanningV2Shell /></Suspense></ModuleGuard></RoleGuard></AgencyLayout>} />
      {/* Legacy /hc-agency redirects */}
      <Route path="/hc-agency" element={<Navigate to="/?tab=pilotage" replace />} />
      <Route path="/hc-agency/*" element={<Navigate to="/?tab=pilotage" replace />} />
      
      {/* Legacy redirects */}
      <Route path="/agency/statia-builder" element={<Navigate to="/?tab=admin&adminTab=ia&adminView=statia" replace />} />
      <Route path="/agency/maintenance" element={<Navigate to="/?tab=organisation" replace />} />
    </>
  );
}
