import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { MinimalLayout } from "@/components/layout";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ModuleGuard } from "@/components/auth/ModuleGuard";
import { MfaGuard } from "@/components/auth/MfaGuard";

// Lazy loaded pages - Only those still needed for standalone routes
const SupportSettings = lazy(() => import("@/pages/admin/SupportSettings"));
const FranchiseurLayout = lazy(() => import("@/franchiseur/components/layout/FranchiseurLayout"));
const FranchiseurAgencyProfile = lazy(() => import("@/franchiseur/pages/FranchiseurAgencyProfile"));
const ReportActivityPage = lazy(() => import("@/pages/admin/ReportActivityPage"));

// Helper pour créer les layouts admin standalone
function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <MinimalLayout backTab="admin" backLabel="Retour à l'administration">
      {children}
    </MinimalLayout>
  );
}

export function AdminRoutes() {
  return (
    <>
      {/* Index - redirect to unified interface */}
      <Route path="/admin" element={<Navigate to="/?tab=admin" replace />} />
      
      {/* ===== REDIRECTIONS VERS LE WORKSPACE UNIFIÉ ===== */}
      
      {/* Accès */}
      <Route path="/admin/gestion" element={<Navigate to="/?tab=admin&adminTab=acces&adminView=users" replace />} />
      <Route path="/admin/user-activity" element={<Navigate to="/?tab=admin&adminTab=acces&adminView=activity" replace />} />
      <Route path="/admin/permissions-center" element={<Navigate to="/?tab=admin&adminTab=acces&adminView=users" replace />} />
      <Route path="/admin/droits" element={<Navigate to="/?tab=admin&adminTab=acces&adminView=users" replace />} />
      <Route path="/admin/gestionV2" element={<Navigate to="/?tab=admin&adminTab=acces&adminView=users" replace />} />
      
      {/* Réseau */}
      <Route path="/admin/agencies" element={<Navigate to="/?tab=admin&adminTab=reseau" replace />} />
      
      {/* IA */}
      <Route path="/admin/helpi" element={<Navigate to="/?tab=admin&adminTab=ia&adminView=helpi" replace />} />
      <Route path="/admin/statia-by-bij" element={<Navigate to="/?tab=admin&adminTab=ia&adminView=statia" replace />} />
      <Route path="/admin/statia-validator" element={<Navigate to="/?tab=admin&adminTab=ia&adminView=validator" replace />} />
      <Route path="/admin/statia-builder" element={<Navigate to="/?tab=admin&adminTab=ia&adminView=statia" replace />} />
      
      {/* Contenu */}
      <Route path="/admin/apogee-guides" element={<Navigate to="/?tab=admin&adminTab=contenu&adminView=guides" replace />} />
      <Route path="/admin/faq" element={<Navigate to="/?tab=admin&adminTab=contenu&adminView=faq" replace />} />
      <Route path="/admin/templates" element={<Navigate to="/?tab=admin&adminTab=contenu&adminView=templates" replace />} />
      <Route path="/admin/announcements" element={<Navigate to="/?tab=admin&adminTab=contenu&adminView=annonces" replace />} />
      <Route path="/admin/notifications" element={<Navigate to="/?tab=admin&adminTab=contenu&adminView=notifs" replace />} />
      <Route path="/admin/page-metadata" element={<Navigate to="/?tab=admin&adminTab=contenu&adminView=metadata" replace />} />
      <Route path="/admin/formation-generator" element={<Navigate to="/?tab=admin&adminTab=contenu" replace />} />
      
      {/* Ops */}
      <Route path="/admin/backup" element={<Navigate to="/?tab=admin&adminTab=ops&adminView=backup" replace />} />
      <Route path="/admin/helpconfort-backup" element={<Navigate to="/?tab=admin&adminTab=ops&adminView=imports" replace />} />
      <Route path="/admin/cache-backup" element={<Navigate to="/?tab=admin&adminTab=ops&adminView=cache" replace />} />
      <Route path="/admin/apogee-report" element={<Navigate to="/?tab=admin&adminTab=ops&adminView=report" replace />} />
      <Route path="/admin/storage-quota" element={<Navigate to="/?tab=admin&adminTab=ops&adminView=quota" replace />} />
      
      {/* Plateforme */}
      <Route path="/admin/system-health" element={<Navigate to="/?tab=admin&adminTab=plateforme&adminView=health" replace />} />
      <Route path="/admin/feature-flags" element={<Navigate to="/?tab=admin&adminTab=plateforme&adminView=modules" replace />} />
      <Route path="/admin/modules" element={<Navigate to="/?tab=admin&adminTab=plateforme&adminView=modules" replace />} />
      <Route path="/admin/sitemap" element={<Navigate to="/?tab=admin&adminTab=plateforme&adminView=sitemap" replace />} />
      <Route path="/admin/hidden-features" element={<Navigate to="/?tab=admin&adminTab=plateforme&adminView=lab" replace />} />
      <Route path="/admin/flow" element={<Navigate to="/?tab=admin&adminTab=plateforme&adminView=flow" replace />} />
      
      {/* ===== ROUTES STANDALONE (MinimalLayout) - Gardées pour cas spéciaux ===== */}
      
      {/* Agency detail page - ouvre en standalone */}
      <Route path="/admin/agencies/:agencyId" element={<AdminLayout><RoleGuard minRole="platform_admin"><MfaGuard><ModuleGuard moduleKey="admin_plateforme"><FranchiseurLayout /></ModuleGuard></MfaGuard></RoleGuard></AdminLayout>}>
        <Route index element={<FranchiseurAgencyProfile />} />
      </Route>
      
      {/* Support settings - standalone */}
      <Route path="/admin/support/settings" element={<AdminLayout><RoleGuard minRole="platform_admin"><MfaGuard><ModuleGuard moduleKey="admin_plateforme"><SupportSettings /></ModuleGuard></MfaGuard></RoleGuard></AdminLayout>} />
      
      {/* Rapport activité - standalone (nécessite contexte agence) */}
      <Route path="/admin/rapportactivite" element={<AdminLayout><RoleGuard minRole="franchisee_admin"><ReportActivityPage /></RoleGuard></AdminLayout>} />
      
      {/* ===== REDIRECTIONS LEGACY ===== */}
      <Route path="/admin/documents" element={<Navigate to="/?tab=admin" replace />} />
      <Route path="/admin/chatbot-rag" element={<Navigate to="/?tab=admin&adminTab=ia&adminView=helpi" replace />} />
      
      {/* Support - All redirected to projects (V3) */}
      <Route path="/admin/support-tickets" element={<Navigate to="/projects/kanban" replace />} />
      <Route path="/admin/support-stats" element={<Navigate to="/projects/kanban" replace />} />
      <Route path="/admin/escalation-history" element={<Navigate to="/projects/kanban" replace />} />
      
      {/* Legacy apogee-tickets redirects */}
      <Route path="/admin/apogee-tickets" element={<Navigate to="/projects/kanban" replace />} />
      <Route path="/admin/apogee-tickets/incomplets" element={<Navigate to="/projects/incomplets" replace />} />
      <Route path="/admin/apogee-tickets/review" element={<Navigate to="/projects/review" replace />} />
      <Route path="/admin/apogee-tickets/permissions" element={<Navigate to="/projects/permissions" replace />} />
    </>
  );
}
