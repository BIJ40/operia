import { lazy } from "react";
import { Route } from "react-router-dom";
import { MainLayout } from "@/components/layout";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ModuleGuard } from "@/components/auth/ModuleGuard";

// Lazy loaded pages
const ReseauIndex = lazy(() => import("@/pages/ReseauIndex"));
const FranchiseurLayout = lazy(() => import("@/franchiseur/components/layout/FranchiseurLayout"));
const FranchiseurHome = lazy(() => import("@/franchiseur/pages/FranchiseurHome"));
const FranchiseurAgencies = lazy(() => import("@/franchiseur/pages/FranchiseurAgencies"));
const FranchiseurAgencyProfile = lazy(() => import("@/franchiseur/pages/FranchiseurAgencyProfile"));
const FranchiseurStats = lazy(() => import("@/franchiseur/pages/FranchiseurStats"));
const FranchiseurComparison = lazy(() => import("@/franchiseur/pages/FranchiseurComparison"));
const ComparatifAgencesPage = lazy(() => import("@/franchiseur/pages/ComparatifAgencesPage"));
const ReseauGraphiquesPage = lazy(() => import("@/franchiseur/pages/ReseauGraphiquesPage"));
const FranchiseurRoyalties = lazy(() => import("@/franchiseur/pages/FranchiseurRoyalties"));
const FranchiseurAnimateurs = lazy(() => import("@/franchiseur/pages/FranchiseurAnimateurs"));
const AnimatorProfile = lazy(() => import("@/franchiseur/pages/AnimatorProfile"));
const TDRUsersPage = lazy(() => import("@/pages/TDRUsersPage"));

export function FranchiseurRoutes() {
  return (
    <>
      {/* Section Index */}
      <Route path="/hc-reseau" element={<MainLayout><RoleGuard minRole="franchisor_user"><ModuleGuard moduleKey="reseau_franchiseur"><ReseauIndex /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Dashboard */}
      <Route path="/hc-reseau/dashboard" element={<MainLayout><RoleGuard minRole="franchisor_user"><ModuleGuard moduleKey="reseau_franchiseur"><FranchiseurLayout /></ModuleGuard></RoleGuard></MainLayout>}>
        <Route index element={<FranchiseurHome />} />
      </Route>
      
      {/* Agences */}
      <Route path="/hc-reseau/agences" element={<MainLayout><RoleGuard minRole="franchisor_user"><ModuleGuard moduleKey="reseau_franchiseur"><FranchiseurLayout /></ModuleGuard></RoleGuard></MainLayout>}>
        <Route index element={<FranchiseurAgencies />} />
        <Route path=":agencyId" element={<FranchiseurAgencyProfile />} />
      </Route>
      
      {/* Animateurs */}
      <Route path="/hc-reseau/animateurs" element={<MainLayout><RoleGuard minRole="franchisor_user"><ModuleGuard moduleKey="reseau_franchiseur"><FranchiseurLayout /></ModuleGuard></RoleGuard></MainLayout>}>
        <Route index element={<FranchiseurAnimateurs />} />
        <Route path=":animatorId" element={<AnimatorProfile />} />
      </Route>
      
      {/* Tableaux & Stats */}
      <Route path="/hc-reseau/tableaux" element={<MainLayout><RoleGuard minRole="franchisor_user"><ModuleGuard moduleKey="reseau_franchiseur"><FranchiseurLayout /></ModuleGuard></RoleGuard></MainLayout>}>
        <Route index element={<FranchiseurStats />} />
      </Route>
      
      {/* Comparatifs */}
      <Route path="/hc-reseau/periodes" element={<MainLayout><RoleGuard minRole="franchisor_user"><ModuleGuard moduleKey="reseau_franchiseur"><FranchiseurLayout /></ModuleGuard></RoleGuard></MainLayout>}>
        <Route index element={<FranchiseurComparison />} />
      </Route>
      <Route path="/hc-reseau/comparatif" element={<MainLayout><RoleGuard minRole="franchisor_user"><ModuleGuard moduleKey="reseau_franchiseur"><FranchiseurLayout /></ModuleGuard></RoleGuard></MainLayout>}>
        <Route index element={<ComparatifAgencesPage />} />
      </Route>
      <Route path="/hc-reseau/graphiques" element={<MainLayout><RoleGuard minRole="franchisor_user"><ModuleGuard moduleKey="reseau_franchiseur"><FranchiseurLayout /></ModuleGuard></RoleGuard></MainLayout>}>
        <Route index element={<ReseauGraphiquesPage />} />
      </Route>
      
      {/* Redevances */}
      <Route path="/hc-reseau/redevances" element={<MainLayout><RoleGuard minRole="franchisor_admin"><ModuleGuard moduleKey="reseau_franchiseur"><FranchiseurLayout /></ModuleGuard></RoleGuard></MainLayout>}>
        <Route index element={<FranchiseurRoyalties />} />
      </Route>
      
      {/* Utilisateurs TDR */}
      <Route path="/hc-reseau/utilisateurs" element={<MainLayout><RoleGuard minRole="franchisor_user"><ModuleGuard moduleKey="reseau_franchiseur"><TDRUsersPage /></ModuleGuard></RoleGuard></MainLayout>} />
    </>
  );
}
