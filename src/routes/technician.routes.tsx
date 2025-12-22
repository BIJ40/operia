import { lazy } from "react";
import { Route } from "react-router-dom";
import { RoleGuard } from "@/components/auth/RoleGuard";

// Lazy loaded pages
const TechnicianPWALayout = lazy(() => import("@/pages/technician/TechnicianLayout"));
const TechnicianPlanningPage = lazy(() => import("@/pages/technician/TechnicianPlanningPage"));
const TechnicianOfflinePage = lazy(() => import("@/pages/technician/TechnicianOfflinePage"));
const TechnicianRdvPage = lazy(() => import("@/pages/technician/TechnicianRdvPage"));
const TechPlanning = lazy(() => import("@/pages/technician/TechPlanning"));
const TechPointage = lazy(() => import("@/pages/technician/TechPointage"));
const TechDocuments = lazy(() => import("@/pages/technician/TechDocuments"));
const TechProfil = lazy(() => import("@/pages/technician/TechProfil"));

export function TechnicianRoutes() {
  return (
    <>
      <Route path="/t" element={<RoleGuard minRole="franchisee_user"><TechnicianPWALayout /></RoleGuard>}>
        <Route index element={<TechnicianPlanningPage />} />
        <Route path="planning" element={<TechPlanning />} />
        <Route path="pointage" element={<TechPointage />} />
        <Route path="documents" element={<TechDocuments />} />
        <Route path="profil" element={<TechProfil />} />
        <Route path="offline" element={<TechnicianOfflinePage />} />
        <Route path="rdv/:id" element={<TechnicianRdvPage />} />
      </Route>
    </>
  );
}
