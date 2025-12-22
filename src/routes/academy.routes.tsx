import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ModuleGuard } from "@/components/auth/ModuleGuard";

// Lazy loaded pages
const AcademyIndex = lazy(() => import("@/pages/AcademyIndex"));
const ApogeeGuide = lazy(() => import("@/pages/ApogeeGuide"));
const ApporteurGuide = lazy(() => import("@/pages/ApporteurGuide"));
const ApporteurSubcategories = lazy(() => import("@/pages/ApporteurSubcategories"));
const Category = lazy(() => import("@/pages/Category"));
const CategoryApporteur = lazy(() => import("@/pages/CategoryApporteur"));
const HelpConfort = lazy(() => import("@/pages/HelpConfort"));
const CategoryHelpConfort = lazy(() => import("@/pages/CategoryHelpConfort"));
const Favorites = lazy(() => import("@/pages/Favorites"));

export function AcademyRoutes() {
  return (
    <>
      {/* Section Index */}
      <Route path="/academy" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><AcademyIndex /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Guide Apogée */}
      <Route path="/academy/apogee" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><ApogeeGuide /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/academy/apogee/category/:slug" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><Category /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Guide Apporteurs */}
      <Route path="/academy/apporteurs" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><ApporteurGuide /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/academy/apporteurs/category/:slug" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><ApporteurSubcategories /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/academy/apporteurs/category/:slug/sub/:subslug" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><CategoryApporteur /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Base Documentaire */}
      <Route path="/academy/hc-base" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><HelpConfort /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/academy/hc-base/category/:slug" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><CategoryHelpConfort /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Favoris */}
      <Route path="/academy/favoris" element={<MainLayout><RoleGuard><ModuleGuard moduleKey="help_academy"><Favorites /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/favorites" element={<Navigate to="/academy/favoris" replace />} />
    </>
  );
}
