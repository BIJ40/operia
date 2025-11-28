import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";
import { CacheBackupNotification } from "./components/CacheBackupNotification";
import { MainLayout } from "./components/layout";
import { Loader2 } from "lucide-react";
import { RoleGuard } from "./components/auth/RoleGuard";

// Critical pages - loaded immediately
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

// Lazy loaded pages - Guides
const ApogeeGuide = lazy(() => import("./pages/ApogeeGuide"));
const ApporteurGuide = lazy(() => import("./pages/ApporteurGuide"));
const ApporteurSubcategories = lazy(() => import("./pages/ApporteurSubcategories"));
const Category = lazy(() => import("./pages/Category"));
const CategoryApporteur = lazy(() => import("./pages/CategoryApporteur"));
const HelpConfort = lazy(() => import("./pages/HelpConfort"));
const CategoryHelpConfort = lazy(() => import("./pages/CategoryHelpConfort"));

// Lazy loaded pages - Pilotage
const ActionsAMener = lazy(() => import("./pages/ActionsAMener"));
const CategoryActionsAMener = lazy(() => import("./pages/CategoryActionsAMener"));
const Documents = lazy(() => import("./pages/Documents"));
const DiffusionDashboard = lazy(() => import("./pages/DiffusionDashboard"));

// Lazy loaded pages - Indicateurs
const IndicateursLayout = lazy(() => import("./apogee-connect/pages/IndicateursLayout"));
const IndicateursAccueil = lazy(() => import("./apogee-connect/pages/IndicateursAccueil"));
const IndicateursApporteurs = lazy(() => import("./apogee-connect/pages/IndicateursApporteurs"));
const IndicateursUnivers = lazy(() => import("./apogee-connect/pages/IndicateursUnivers"));
const IndicateursTechniciens = lazy(() => import("./apogee-connect/pages/IndicateursTechniciens"));
const IndicateursSAV = lazy(() => import("./apogee-connect/pages/IndicateursSAV"));

// Lazy loaded pages - Support
const Support = lazy(() => import("./pages/Support"));
const UserTickets = lazy(() => import("./pages/UserTickets"));
const UserDemands = lazy(() => import("./pages/UserDemands"));

// Lazy loaded pages - Franchiseur
const FranchiseurLayout = lazy(() => import("./franchiseur/components/layout/FranchiseurLayout"));
const FranchiseurHome = lazy(() => import("./franchiseur/pages/FranchiseurHome"));
const FranchiseurAgencies = lazy(() => import("./franchiseur/pages/FranchiseurAgencies"));
const FranchiseurAgencyProfile = lazy(() => import("./franchiseur/pages/FranchiseurAgencyProfile"));
const FranchiseurStats = lazy(() => import("./franchiseur/pages/FranchiseurStats"));
const FranchiseurComparison = lazy(() => import("./franchiseur/pages/FranchiseurComparison"));
const FranchiseurRoyalties = lazy(() => import("./franchiseur/pages/FranchiseurRoyalties"));
const FranchiseurSettings = lazy(() => import("./franchiseur/pages/FranchiseurSettings"));

// Lazy loaded pages - Admin
const AdminIndex = lazy(() => import("./pages/AdminIndex"));
const AdminDocuments = lazy(() => import("./pages/AdminDocuments"));
const AdminSupportTickets = lazy(() => import("./pages/AdminSupportTickets"));
const AdminSupportLevels = lazy(() => import("./pages/AdminSupportLevels"));
const AdminEscalationHistory = lazy(() => import("./pages/AdminEscalationHistory"));
const AdminBackup = lazy(() => import("./pages/AdminBackup"));
const AdminHelpConfortBackup = lazy(() => import("./pages/AdminHelpConfortBackup"));
const AdminRolePermissions = lazy(() => import("./pages/AdminRolePermissions"));
const AdminAgencies = lazy(() => import("./pages/AdminAgencies"));
const AdminStorageQuota = lazy(() => import("./pages/AdminStorageQuota"));
const AdminCacheBackup = lazy(() => import("./pages/AdminCacheBackup"));
const AdminUserActivity = lazy(() => import("./pages/AdminUserActivity"));
const AdminRolesV2 = lazy(() => import("./pages/AdminRolesV2"));
const AdminPermissionsV2 = lazy(() => import("./pages/AdminPermissionsV2"));
const AdminUsersUnified = lazy(() => import("./pages/AdminUsersUnified"));

// Lazy loaded pages - Permissions
const PermissionsGroups = lazy(() => import("./pages/admin/permissions/PermissionsGroups"));
const PermissionsUsers = lazy(() => import("./pages/admin/permissions/PermissionsUsers"));
const PermissionsMatrix = lazy(() => import("./pages/admin/permissions/PermissionsMatrix"));

// Lazy loaded pages - User
const Profile = lazy(() => import("./pages/Profile"));
const Favorites = lazy(() => import("./pages/Favorites"));

// Providers
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { EditorProvider } from "./contexts/EditorContext";
import { ApporteurEditorProvider } from "./contexts/ApporteurEditorContext";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import { ChangePasswordDialog } from "./components/ChangePasswordDialog";
import { ImpersonationBanner } from "./components/ImpersonationBanner";

// Optimized QueryClient with caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

function AppContent() {
  const { mustChangePassword } = useAuth();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  useEffect(() => {
    setShowPasswordDialog(mustChangePassword);
  }, [mustChangePassword]);

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Dashboard / Home - Accessible à tous les utilisateurs connectés */}
          <Route path="/" element={<MainLayout><Landing /></MainLayout>} />
          
          {/* HELP Academy - Accessible à tous les utilisateurs connectés (N0+) */}
          <Route path="/apogee" element={<MainLayout><RoleGuard><ApogeeGuide /></RoleGuard></MainLayout>} />
          <Route path="/apogee/category/:slug" element={<MainLayout><RoleGuard><Category /></RoleGuard></MainLayout>} />
          <Route path="/apporteurs" element={<MainLayout><RoleGuard><ApporteurGuide /></RoleGuard></MainLayout>} />
          <Route path="/apporteurs/category/:slug" element={<MainLayout><RoleGuard><ApporteurSubcategories /></RoleGuard></MainLayout>} />
          <Route path="/apporteurs/category/:slug/sub/:subslug" element={<MainLayout><RoleGuard><CategoryApporteur /></RoleGuard></MainLayout>} />
          <Route path="/helpconfort" element={<MainLayout><RoleGuard><HelpConfort /></RoleGuard></MainLayout>} />
          <Route path="/helpconfort/category/:slug" element={<MainLayout><RoleGuard><CategoryHelpConfort /></RoleGuard></MainLayout>} />
          <Route path="/documents" element={<MainLayout><RoleGuard><Documents /></RoleGuard></MainLayout>} />
          
          {/* Pilotage Agence - N2+ (franchisee_admin) */}
          <Route path="/mes-indicateurs" element={<MainLayout><RoleGuard minRole="franchisee_admin"><IndicateursLayout /></RoleGuard></MainLayout>}>
            <Route index element={<IndicateursAccueil />} />
            <Route path="apporteurs" element={<IndicateursApporteurs />} />
            <Route path="univers" element={<IndicateursUnivers />} />
            <Route path="techniciens" element={<IndicateursTechniciens />} />
            <Route path="sav" element={<IndicateursSAV />} />
          </Route>
          <Route path="/actions-a-mener" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ActionsAMener /></RoleGuard></MainLayout>} />
          <Route path="/actions-a-mener/category/:slug" element={<MainLayout><RoleGuard minRole="franchisee_admin"><CategoryActionsAMener /></RoleGuard></MainLayout>} />
          <Route path="/diffusion" element={<RoleGuard minRole="franchisee_admin"><DiffusionDashboard /></RoleGuard>} />
          
          {/* Support - Accessible à tous les utilisateurs connectés */}
          <Route path="/support" element={<MainLayout><RoleGuard><Support /></RoleGuard></MainLayout>} />
          <Route path="/support-tickets" element={<MainLayout><RoleGuard><UserTickets /></RoleGuard></MainLayout>} />
          <Route path="/mes-demandes" element={<MainLayout><RoleGuard><UserDemands /></RoleGuard></MainLayout>} />
          
          {/* Franchiseur - N3+ (franchisor_user) */}
          <Route path="/tete-de-reseau" element={<MainLayout><RoleGuard minRole="franchisor_user"><FranchiseurLayout /></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurHome />} />
            <Route path="agences" element={<FranchiseurAgencies />} />
            <Route path="agences/:agencyId" element={<FranchiseurAgencyProfile />} />
            <Route path="stats" element={<FranchiseurStats />} />
            <Route path="comparatifs" element={<FranchiseurComparison />} />
            <Route path="redevances" element={<FranchiseurRoyalties />} />
            <Route path="parametres" element={<FranchiseurSettings />} />
          </Route>
          
          {/* Administration - Gestion utilisateurs N3+, Plateforme N5+ */}
          <Route path="/admin" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminIndex /></RoleGuard></MainLayout>} />
          <Route path="/admin/documents" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminDocuments /></RoleGuard></MainLayout>} />
          <Route path="/admin/support" element={<MainLayout><RoleGuard minRole="franchisor_user"><AdminSupportTickets /></RoleGuard></MainLayout>} />
          <Route path="/admin/support-levels" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminSupportLevels /></RoleGuard></MainLayout>} />
          <Route path="/admin/escalation-history" element={<MainLayout><RoleGuard minRole="franchisor_user"><AdminEscalationHistory /></RoleGuard></MainLayout>} />
          <Route path="/admin/tickets" element={<MainLayout><RoleGuard minRole="franchisor_user"><AdminSupportTickets /></RoleGuard></MainLayout>} />
          <Route path="/admin/backup" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminBackup /></RoleGuard></MainLayout>} />
          <Route path="/admin/helpconfort-backup" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminHelpConfortBackup /></RoleGuard></MainLayout>} />
          {/* User Management - All routes point to V2 unified page */}
          <Route path="/admin/users" element={<MainLayout><RoleGuard minRole="franchisor_user"><AdminUsersUnified /></RoleGuard></MainLayout>} />
          <Route path="/admin/users-unified" element={<MainLayout><RoleGuard minRole="franchisor_user"><AdminUsersUnified /></RoleGuard></MainLayout>} />
          <Route path="/admin/role-permissions" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminRolePermissions /></RoleGuard></MainLayout>} />
          <Route path="/admin/agencies" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminAgencies /></RoleGuard></MainLayout>} />
          <Route path="/admin/storage-quota" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminStorageQuota /></RoleGuard></MainLayout>} />
          <Route path="/admin/cache-backup" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminCacheBackup /></RoleGuard></MainLayout>} />
          <Route path="/admin/user-activity" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminUserActivity /></RoleGuard></MainLayout>} />
          <Route path="/admin/roles-v2" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminRolesV2 /></RoleGuard></MainLayout>} />
          <Route path="/admin/permissions-v2" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminPermissionsV2 /></RoleGuard></MainLayout>} />
          
          {/* Permissions Management - N5+ */}
          <Route path="/admin/permissions/groups" element={<MainLayout><RoleGuard minRole="platform_admin"><PermissionsGroups /></RoleGuard></MainLayout>} />
          <Route path="/admin/permissions/users" element={<MainLayout><RoleGuard minRole="platform_admin"><PermissionsUsers /></RoleGuard></MainLayout>} />
          <Route path="/admin/permissions/matrix" element={<MainLayout><RoleGuard minRole="platform_admin"><PermissionsMatrix /></RoleGuard></MainLayout>} />
          
          {/* User pages - Accessible à tous les utilisateurs connectés */}
          <Route path="/profile" element={<MainLayout><RoleGuard><Profile /></RoleGuard></MainLayout>} />
          <Route path="/favorites" element={<MainLayout><RoleGuard><Favorites /></RoleGuard></MainLayout>} />
          
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      
      <ChangePasswordDialog 
        open={showPasswordDialog} 
        onOpenChange={(open) => {
          if (!open && mustChangePassword) return;
          setShowPasswordDialog(open);
        }}
        onSuccess={() => setShowPasswordDialog(false)}
      />
      <ImpersonationBanner />
      <CacheBackupNotification />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <ImpersonationProvider>
              <EditorProvider>
                <ApporteurEditorProvider>
                  <AppContent />
                  <Toaster />
                  <Sonner />
                </ApporteurEditorProvider>
              </EditorProvider>
            </ImpersonationProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;