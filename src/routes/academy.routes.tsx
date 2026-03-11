import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { MinimalLayout } from "@/components/layout";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ModuleGuard } from "@/components/auth/ModuleGuard";
import { HcServicesEditorProvider } from "@/contexts/HcServicesEditorContext";

// Lazy loaded pages
const Category = lazy(() => import("@/pages/Category"));
const CategoryApporteur = lazy(() => import("@/pages/CategoryApporteur"));
const CategoryHelpConfort = lazy(() => import("@/pages/CategoryHelpConfort"));
const CategoryHcServices = lazy(() => import("@/pages/CategoryHcServices"));
const ApporteurSubcategories = lazy(() => import("@/pages/ApporteurSubcategories"));

// Helper pour créer les layouts Academy
function GuidesLayout({ children }: { children: React.ReactNode }) {
  return (
    <MinimalLayout backTab="guides" backLabel="Retour aux Guides">
      {children}
    </MinimalLayout>
  );
}

export function AcademyRoutes() {
  return (
    <>
      {/* Section Index - Redirige vers onglet guides unifié */}
      <Route path="/academy" element={<Navigate to="/?tab=aide" replace />} />
      
      {/* Guide Apogée - Index redirige, détails restent */}
      <Route path="/academy/apogee" element={<Navigate to="/?tab=aide" replace />} />
      <Route path="/academy/apogee/category/:slug" element={<GuidesLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="guides"><Category /></ModuleGuard></RoleGuard></GuidesLayout>} />
      
      {/* Guide Apporteurs */}
      <Route path="/academy/apporteurs" element={<Navigate to="/?tab=aide" replace />} />
      <Route path="/academy/apporteurs/category/:slug" element={<GuidesLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="guides"><ApporteurSubcategories /></ModuleGuard></RoleGuard></GuidesLayout>} />
      <Route path="/academy/apporteurs/category/:slug/sub/:subslug" element={<GuidesLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="guides"><CategoryApporteur /></ModuleGuard></RoleGuard></GuidesLayout>} />
      
      {/* Guide HC Services (ex-OPERIA) */}
      <Route path="/academy/hc-services" element={<Navigate to="/?tab=aide" replace />} />
      <Route path="/academy/hc-services/category/:slug" element={<GuidesLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="guides"><HcServicesEditorProvider><CategoryHcServices /></HcServicesEditorProvider></ModuleGuard></RoleGuard></GuidesLayout>} />
      {/* Legacy OPERIA redirects */}
      <Route path="/academy/operia" element={<Navigate to="/?tab=guides" replace />} />
      <Route path="/academy/operia/category/:slug" element={<Navigate to="/?tab=guides" replace />} />
      
      {/* Base Documentaire */}
      <Route path="/academy/hc-base" element={<Navigate to="/?tab=guides" replace />} />
      <Route path="/academy/hc-base/category/:slug" element={<GuidesLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="guides"><CategoryHelpConfort /></ModuleGuard></RoleGuard></GuidesLayout>} />
    </>
  );
}
