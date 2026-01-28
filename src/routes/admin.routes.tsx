import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { MinimalLayout } from "@/components/layout";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ModuleGuard } from "@/components/auth/ModuleGuard";
import { FaqAdminGuard } from "@/components/auth/FaqAdminGuard";

// Lazy loaded pages
const AdminIndex = lazy(() => import("@/pages/AdminIndex"));
const SupportSettings = lazy(() => import("@/pages/admin/SupportSettings"));
// Legacy support pages removed - redirecting to Gestion de Projet
const AdminBackup = lazy(() => import("@/pages/AdminBackup"));
const AdminHelpConfortBackup = lazy(() => import("@/pages/AdminHelpConfortBackup"));
const AdminAgencies = lazy(() => import("@/pages/AdminAgencies"));
const AdminStorageQuota = lazy(() => import("@/pages/AdminStorageQuota"));
const TDRUsersPage = lazy(() => import("@/pages/TDRUsersPage"));
const AdminCacheBackup = lazy(() => import("@/pages/AdminCacheBackup"));
const AdminUserActivity = lazy(() => import("@/pages/AdminUserActivity"));
const AdminPageMetadata = lazy(() => import("@/pages/AdminPageMetadata"));
const AdminApogeeGuides = lazy(() => import("@/pages/AdminApogeeGuides"));
const AdminHelpi = lazy(() => import("@/pages/AdminHelpi"));
const AdminSystemHealth = lazy(() => import("@/pages/AdminSystemHealth"));
const AdminAnnouncements = lazy(() => import("@/pages/admin/AdminAnnouncements"));
const AdminFaq = lazy(() => import("@/pages/admin/AdminFaq"));

const AdminFeatureFlags = lazy(() => import("@/pages/admin/AdminFeatureFlags"));
const StatiaBuilderAdminPage = lazy(() => import("@/statia/pages/StatiaBuilderAdminPage"));
const StatiaValidatorPage = lazy(() => import("@/statia/pages/StatiaValidatorPage"));
const AdminApogeeReport = lazy(() => import("@/pages/admin/AdminApogeeReport"));
const AdminFlow = lazy(() => import("@/pages/admin/AdminFlow"));
const DocTemplatesPage = lazy(() => import("@/pages/admin/DocTemplatesPage"));
// AdminApporteurs supprimé - fonctionnalité non utilisée
const ReportActivityPage = lazy(() => import("@/pages/admin/ReportActivityPage"));
const FranchiseurLayout = lazy(() => import("@/franchiseur/components/layout/FranchiseurLayout"));
const FranchiseurAgencyProfile = lazy(() => import("@/franchiseur/pages/FranchiseurAgencyProfile"));
const HiddenFeaturesPage = lazy(() => import("@/pages/admin/HiddenFeaturesPage"));
const AdminSitemap = lazy(() => import("@/pages/admin/AdminSitemap"));
const AdminNotificationSender = lazy(() => import("@/pages/admin/AdminNotificationSender"));

// Helper pour créer les layouts admin
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
      
      {/* Redirects legacy */}
      <Route path="/admin/documents" element={<Navigate to="/?tab=admin" replace />} />
      <Route path="/admin/chatbot-rag" element={<Navigate to="/?tab=admin" replace />} />
      
      {/* Support - All redirected to projects (V3) */}
      <Route path="/admin/support-tickets" element={<Navigate to="/projects/kanban" replace />} />
      <Route path="/admin/support-stats" element={<Navigate to="/projects/kanban" replace />} />
      <Route path="/admin/escalation-history" element={<Navigate to="/projects/kanban" replace />} />
      <Route path="/admin/support/settings" element={<AdminLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><SupportSettings /></ModuleGuard></RoleGuard></AdminLayout>} />
      
      {/* Backup & Storage */}
      <Route path="/admin/backup" element={<AdminLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminBackup /></ModuleGuard></RoleGuard></AdminLayout>} />
      <Route path="/admin/helpconfort-backup" element={<AdminLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminHelpConfortBackup /></ModuleGuard></RoleGuard></AdminLayout>} />
      <Route path="/admin/storage-quota" element={<AdminLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminStorageQuota /></ModuleGuard></RoleGuard></AdminLayout>} />
      <Route path="/admin/cache-backup" element={<AdminLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminCacheBackup /></ModuleGuard></RoleGuard></AdminLayout>} />
      
      {/* Agencies */}
      <Route path="/admin/agencies" element={<AdminLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminAgencies /></ModuleGuard></RoleGuard></AdminLayout>} />
      <Route path="/admin/agencies/:agencyId" element={<AdminLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><FranchiseurLayout /></ModuleGuard></RoleGuard></AdminLayout>}>
        <Route index element={<FranchiseurAgencyProfile />} />
      </Route>
      
      {/* Monitoring */}
      <Route path="/admin/user-activity" element={<AdminLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminUserActivity /></ModuleGuard></RoleGuard></AdminLayout>} />
      <Route path="/admin/system-health" element={<AdminLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminSystemHealth /></ModuleGuard></RoleGuard></AdminLayout>} />
      
      {/* Content Management */}
      <Route path="/admin/page-metadata" element={<AdminLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminPageMetadata /></ModuleGuard></RoleGuard></AdminLayout>} />
      <Route path="/admin/apogee-guides" element={<AdminLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminApogeeGuides /></ModuleGuard></RoleGuard></AdminLayout>} />
      <Route path="/admin/helpi" element={<AdminLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminHelpi /></ModuleGuard></RoleGuard></AdminLayout>} />
      <Route path="/admin/announcements" element={<AdminLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminAnnouncements /></ModuleGuard></RoleGuard></AdminLayout>} />
      <Route path="/admin/faq" element={<AdminLayout><FaqAdminGuard><AdminFaq /></FaqAdminGuard></AdminLayout>} />
      <Route path="/admin/formation-generator" element={<Navigate to="/?tab=admin" replace />} />
      
      {/* Legacy apogee-tickets redirects */}
      <Route path="/admin/apogee-tickets" element={<Navigate to="/projects/kanban" replace />} />
      <Route path="/admin/apogee-tickets/incomplets" element={<Navigate to="/projects/incomplets" replace />} />
      <Route path="/admin/apogee-tickets/review" element={<Navigate to="/projects/review" replace />} />
      <Route path="/admin/apogee-tickets/permissions" element={<Navigate to="/projects/permissions" replace />} />
      
      {/* StatIA */}
      <Route path="/admin/statia-by-bij" element={<AdminLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><StatiaBuilderAdminPage /></ModuleGuard></RoleGuard></AdminLayout>} />
      <Route path="/admin/statia-validator" element={<AdminLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><StatiaValidatorPage /></ModuleGuard></RoleGuard></AdminLayout>} />
      <Route path="/admin/statia-builder" element={<Navigate to="/admin/statia-by-bij" replace />} />
      
      {/* Feature flags & Permissions */}
      <Route path="/admin/feature-flags" element={<AdminLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminFeatureFlags /></ModuleGuard></RoleGuard></AdminLayout>} />
      <Route path="/admin/modules" element={<Navigate to="/admin/feature-flags" replace />} />
      <Route path="/admin/permissions-center" element={<Navigate to="/admin/gestion" replace />} />
      <Route path="/admin/droits" element={<Navigate to="/admin/gestion" replace />} />
      <Route path="/admin/gestion" element={<AdminLayout><RoleGuard minRole="franchisee_admin"><TDRUsersPage /></RoleGuard></AdminLayout>} />
      
      {/* Reports & Tools */}
      <Route path="/admin/apogee-report" element={<AdminLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminApogeeReport /></ModuleGuard></RoleGuard></AdminLayout>} />
      <Route path="/admin/flow" element={<AdminLayout><RoleGuard minRole="franchisor_admin"><AdminFlow /></RoleGuard></AdminLayout>} />
      <Route path="/admin/templates" element={<AdminLayout><RoleGuard minRole="franchisor_admin"><ModuleGuard moduleKey="admin_plateforme"><DocTemplatesPage /></ModuleGuard></RoleGuard></AdminLayout>} />
      {/* /admin/apporteurs supprimé - fonctionnalité non utilisée */}
      <Route path="/admin/rapportactivite" element={<AdminLayout><RoleGuard minRole="franchisee_admin"><ReportActivityPage /></RoleGuard></AdminLayout>} />
      
      {/* Fonctionnalités masquées */}
      <Route path="/admin/hidden-features" element={<AdminLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><HiddenFeaturesPage /></ModuleGuard></RoleGuard></AdminLayout>} />
      
      {/* Sitemap - Visualisation des routes */}
      <Route path="/admin/sitemap" element={<AdminLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminSitemap /></ModuleGuard></RoleGuard></AdminLayout>} />
      
      {/* Envoi de notifications admin */}
      <Route path="/admin/notifications" element={<AdminLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminNotificationSender /></ModuleGuard></RoleGuard></AdminLayout>} />
      
      {/* gestionV2 supprimée - redirige vers gestion */}
      <Route path="/admin/gestionV2" element={<Navigate to="/admin/gestion" replace />} />
    </>
  );
}
