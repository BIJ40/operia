import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ModuleGuard } from "@/components/auth/ModuleGuard";
import { HcServicesEditorProvider } from "@/contexts/HcServicesEditorContext";

// Lazy loaded pages
const Category = lazy(() => import("@/pages/Category"));
const CategoryApporteur = lazy(() => import("@/pages/CategoryApporteur"));
const CategoryHelpConfort = lazy(() => import("@/pages/CategoryHelpConfort"));
const CategoryHcServices = lazy(() => import("@/pages/CategoryHcServices"));
const ApporteurSubcategories = lazy(() => import("@/pages/ApporteurSubcategories"));

export function AcademyRoutes() {
  return (
    <>
      {/* Section Index - Redirige vers onglet guides unifié */}
      <Route path="/academy" element={<Navigate to="/?tab=guides" replace />} />
      
      {/* Guide Apogée - Index redirige, détails restent */}
      <Route path="/academy/apogee" element={<Navigate to="/?tab=guides" replace />} />
      <Route path="/academy/apogee/category/:slug" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><Category /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Guide Apporteurs */}
      <Route path="/academy/apporteurs" element={<Navigate to="/?tab=guides" replace />} />
      <Route path="/academy/apporteurs/category/:slug" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><ApporteurSubcategories /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/academy/apporteurs/category/:slug/sub/:subslug" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><CategoryApporteur /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Guide HC Services (ex-OPERIA) */}
      <Route path="/academy/hc-services" element={<Navigate to="/?tab=guides" replace />} />
      <Route path="/academy/hc-services/category/:slug" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><HcServicesEditorProvider><CategoryHcServices /></HcServicesEditorProvider></ModuleGuard></RoleGuard></MainLayout>} />
      {/* Legacy OPERIA redirects */}
      <Route path="/academy/operia" element={<Navigate to="/?tab=guides" replace />} />
      <Route path="/academy/operia/category/:slug" element={<Navigate to="/?tab=guides" replace />} />
      
      {/* Base Documentaire */}
      <Route path="/academy/hc-base" element={<Navigate to="/?tab=guides" replace />} />
      <Route path="/academy/hc-base/category/:slug" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><CategoryHelpConfort /></ModuleGuard></RoleGuard></MainLayout>} />
    </>
  );
}
