import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout";
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
const UnifiedManagementPage = lazy(() => import("@/pages/admin/UnifiedManagementPage"));
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
const AdminApporteurs = lazy(() => import("@/pages/admin/AdminApporteurs"));
const ReportActivityPage = lazy(() => import("@/pages/admin/ReportActivityPage"));
const FranchiseurLayout = lazy(() => import("@/franchiseur/components/layout/FranchiseurLayout"));
const FranchiseurAgencyProfile = lazy(() => import("@/franchiseur/pages/FranchiseurAgencyProfile"));
const HiddenFeaturesPage = lazy(() => import("@/pages/admin/HiddenFeaturesPage"));
const AdminSitemap = lazy(() => import("@/pages/admin/AdminSitemap"));
const AdminNotificationSender = lazy(() => import("@/pages/admin/AdminNotificationSender"));

export function AdminRoutes() {
  return (
    <>
      {/* Index - redirect to unified interface */}
      <Route path="/admin" element={<Navigate to="/?tab=admin" replace />} />
      
      {/* Redirects legacy */}
      <Route path="/admin/documents" element={<Navigate to="/admin/helpi" replace />} />
      <Route path="/admin/chatbot-rag" element={<Navigate to="/admin/helpi" replace />} />
      
      {/* Support - All redirected to projects (V3) */}
      <Route path="/admin/support-tickets" element={<Navigate to="/projects/kanban" replace />} />
      <Route path="/admin/support-stats" element={<Navigate to="/projects/kanban" replace />} />
      <Route path="/admin/escalation-history" element={<Navigate to="/projects/kanban" replace />} />
      <Route path="/admin/support/settings" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><SupportSettings /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Backup & Storage */}
      <Route path="/admin/backup" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminBackup /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/admin/helpconfort-backup" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminHelpConfortBackup /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/admin/storage-quota" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminStorageQuota /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/admin/cache-backup" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminCacheBackup /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Agencies */}
      <Route path="/admin/agencies" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminAgencies /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/admin/agencies/:agencyId" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><FranchiseurLayout /></ModuleGuard></RoleGuard></MainLayout>}>
        <Route index element={<FranchiseurAgencyProfile />} />
      </Route>
      
      {/* Monitoring */}
      <Route path="/admin/user-activity" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminUserActivity /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/admin/system-health" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminSystemHealth /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Content Management */}
      <Route path="/admin/page-metadata" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminPageMetadata /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/admin/apogee-guides" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminApogeeGuides /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/admin/helpi" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminHelpi /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/admin/announcements" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminAnnouncements /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/admin/faq" element={<MainLayout><FaqAdminGuard><AdminFaq /></FaqAdminGuard></MainLayout>} />
      <Route path="/admin/formation-generator" element={<Navigate to="/admin" replace />} />
      
      {/* Legacy apogee-tickets redirects */}
      <Route path="/admin/apogee-tickets" element={<Navigate to="/projects/kanban" replace />} />
      <Route path="/admin/apogee-tickets/incomplets" element={<Navigate to="/projects/incomplets" replace />} />
      <Route path="/admin/apogee-tickets/review" element={<Navigate to="/projects/review" replace />} />
      <Route path="/admin/apogee-tickets/permissions" element={<Navigate to="/projects/permissions" replace />} />
      
      {/* StatIA */}
      <Route path="/admin/statia-by-bij" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><StatiaBuilderAdminPage /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/admin/statia-validator" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><StatiaValidatorPage /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/admin/statia-builder" element={<Navigate to="/admin/statia-by-bij" replace />} />
      
      {/* Feature flags & Permissions */}
      <Route path="/admin/feature-flags" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminFeatureFlags /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/admin/modules" element={<Navigate to="/admin/feature-flags" replace />} />
      <Route path="/admin/permissions-center" element={<Navigate to="/admin/gestion" replace />} />
      <Route path="/admin/droits" element={<Navigate to="/admin/gestion" replace />} />
      <Route path="/admin/gestion" element={<MainLayout><RoleGuard minRole="franchisee_admin"><UnifiedManagementPage /></RoleGuard></MainLayout>} />
      
      {/* Reports & Tools */}
      <Route path="/admin/apogee-report" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminApogeeReport /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/admin/flow" element={<MainLayout><RoleGuard minRole="franchisor_admin"><AdminFlow /></RoleGuard></MainLayout>} />
      <Route path="/admin/templates" element={<MainLayout><RoleGuard minRole="franchisor_admin"><ModuleGuard moduleKey="admin_plateforme"><DocTemplatesPage /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/admin/apporteurs" element={<MainLayout><RoleGuard minRole="franchisee_admin"><AdminApporteurs /></RoleGuard></MainLayout>} />
      <Route path="/admin/rapportactivite" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ReportActivityPage /></RoleGuard></MainLayout>} />
      
      {/* Fonctionnalités masquées */}
      <Route path="/admin/hidden-features" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><HiddenFeaturesPage /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Sitemap - Visualisation des routes */}
      <Route path="/admin/sitemap" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminSitemap /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* Envoi de notifications admin */}
      <Route path="/admin/notifications" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminNotificationSender /></ModuleGuard></RoleGuard></MainLayout>} />
      
      {/* gestionV2 supprimée - redirige vers gestion */}
      <Route path="/admin/gestionV2" element={<Navigate to="/admin/gestion" replace />} />
    </>
  );
}
