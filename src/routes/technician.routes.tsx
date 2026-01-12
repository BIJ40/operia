import { lazy } from "react";
import { Route } from "react-router-dom";
import { RoleGuard } from "@/components/auth/RoleGuard";

// Lazy loaded pages
const TechnicianPWALayout = lazy(() => import("@/pages/technician/TechnicianLayout"));
const TechDashboard = lazy(() => import("@/pages/technician/TechDashboard"));
const TechnicianPlanningPage = lazy(() => import("@/pages/technician/TechnicianPlanningPage"));
const TechnicianOfflinePage = lazy(() => import("@/pages/technician/TechnicianOfflinePage"));
const TechnicianRdvPage = lazy(() => import("@/pages/technician/TechnicianRdvPage"));
const TechPlanning = lazy(() => import("@/pages/technician/TechPlanning"));
const TechPointage = lazy(() => import("@/pages/technician/TechPointage"));
const TechProfil = lazy(() => import("@/pages/technician/TechProfil"));

// RH & Maintenance pages
const TechRHParcHub = lazy(() => import("@/pages/technician/TechRHParcHub"));
const TechDocumentsPage = lazy(() => import("@/pages/technician/TechDocumentsPage"));
const TechVehiculePage = lazy(() => import("@/pages/technician/TechVehiculePage"));
const TechMaterielPage = lazy(() => import("@/pages/technician/TechMaterielPage"));
const TechDemandesPage = lazy(() => import("@/pages/technician/TechDemandesPage"));

export function TechnicianRoutes() {
  return (
    <>
      <Route path="/t" element={<RoleGuard minRole="franchisee_user"><TechnicianPWALayout /></RoleGuard>}>
        <Route index element={<TechDashboard />} />
        <Route path="planning" element={<TechnicianPlanningPage />} />
        <Route path="planning-list" element={<TechPlanning />} />
        <Route path="pointage" element={<TechPointage />} />
        {/* Hub RH & Maintenance avec 4 sous-pages */}
        <Route path="rh-parc" element={<TechRHParcHub />} />
        <Route path="documents" element={<TechDocumentsPage />} />
        <Route path="vehicule" element={<TechVehiculePage />} />
        <Route path="materiel" element={<TechMaterielPage />} />
        <Route path="demandes" element={<TechDemandesPage />} />
        <Route path="profil" element={<TechProfil />} />
        <Route path="offline" element={<TechnicianOfflinePage />} />
        <Route path="rdv/:id" element={<TechnicianRdvPage />} />
      </Route>
    </>
  );
}
