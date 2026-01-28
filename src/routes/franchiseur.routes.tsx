import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ModuleGuard } from "@/components/auth/ModuleGuard";

// Lazy loaded pages for detail views only
const FranchiseurLayout = lazy(() => import("@/franchiseur/components/layout/FranchiseurLayout"));
const FranchiseurAgencyProfile = lazy(() => import("@/franchiseur/pages/FranchiseurAgencyProfile"));
const AnimatorProfile = lazy(() => import("@/franchiseur/pages/AnimatorProfile"));

export function FranchiseurRoutes() {
  return (
    <>
      {/* Main route - redirect to unified interface */}
      <Route path="/hc-reseau" element={<Navigate to="/?tab=franchiseur" replace />} />
      
      {/* Detail pages that need their own routes */}
      <Route path="/hc-reseau/agences/:agencyId" element={<MainLayout><RoleGuard minRole="franchisor_user"><ModuleGuard moduleKey="reseau_franchiseur"><FranchiseurLayout /></ModuleGuard></RoleGuard></MainLayout>}>
        <Route index element={<FranchiseurAgencyProfile />} />
      </Route>
      
      <Route path="/hc-reseau/animateurs/:animatorId" element={<MainLayout><RoleGuard minRole="franchisor_user"><ModuleGuard moduleKey="reseau_franchiseur"><FranchiseurLayout /></ModuleGuard></RoleGuard></MainLayout>}>
        <Route index element={<AnimatorProfile />} />
      </Route>
    </>
  );
}
