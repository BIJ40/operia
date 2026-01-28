import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ModuleGuard } from "@/components/auth/ModuleGuard";
import { HcServicesEditorProvider } from "@/contexts/HcServicesEditorContext";

// Lazy loaded pages
const AcademyIndex = lazy(() => import("@/pages/AcademyIndex"));
const ApogeeGuide = lazy(() => import("@/pages/ApogeeGuide"));
const ApporteurGuide = lazy(() => import("@/pages/ApporteurGuide"));
const ApporteurSubcategories = lazy(() => import("@/pages/ApporteurSubcategories"));
const Category = lazy(() => import("@/pages/Category"));
const CategoryApporteur = lazy(() => import("@/pages/CategoryApporteur"));
const HelpConfort = lazy(() => import("@/pages/HelpConfort"));
const CategoryHelpConfort = lazy(() => import("@/pages/CategoryHelpConfort"));
const HcServicesGuide = lazy(() => import("@/pages/HcServicesGuide"));
const CategoryHcServices = lazy(() => import("@/pages/CategoryHcServices"));

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
      
      {/* Guide HC Services (ex-OPERIA) */}
      <Route path="/academy/hc-services" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><HcServicesEditorProvider><HcServicesGuide /></HcServicesEditorProvider></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/academy/hc-services/category/:slug" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><HcServicesEditorProvider><CategoryHcServices /></HcServicesEditorProvider></ModuleGuard></RoleGuard></MainLayout>} />
      {/* Legacy OPERIA redirects */}
      <Route path="/academy/operia" element={<Navigate to="/academy/hc-services" replace />} />
      <Route path="/academy/operia/category/:slug" element={<Navigate to="/academy/hc-services" replace />} />
      
      {/* Base Documentaire */}
      <Route path="/academy/hc-base" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><HelpConfort /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/academy/hc-base/category/:slug" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><CategoryHelpConfort /></ModuleGuard></RoleGuard></MainLayout>} />
    </>
  );
}
