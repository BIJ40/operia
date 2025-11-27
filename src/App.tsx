import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";
import { CacheBackupNotification } from "./components/CacheBackupNotification";
import { MainLayout } from "./components/layout";
import { Loader2 } from "lucide-react";

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
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminUsersList = lazy(() => import("./pages/AdminUsersList"));
const AdminRolePermissions = lazy(() => import("./pages/AdminRolePermissions"));
const AdminAgencies = lazy(() => import("./pages/AdminAgencies"));
const AdminStorageQuota = lazy(() => import("./pages/AdminStorageQuota"));
const AdminCacheBackup = lazy(() => import("./pages/AdminCacheBackup"));
const AdminUserActivity = lazy(() => import("./pages/AdminUserActivity"));

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
          {/* Dashboard / Home */}
          <Route path="/" element={<MainLayout><Landing /></MainLayout>} />
          
          {/* HELP Academy */}
          <Route path="/apogee" element={<MainLayout><ApogeeGuide /></MainLayout>} />
          <Route path="/apogee/category/:slug" element={<MainLayout><Category /></MainLayout>} />
          <Route path="/apporteurs" element={<MainLayout><ApporteurGuide /></MainLayout>} />
          <Route path="/apporteurs/category/:slug" element={<MainLayout><ApporteurSubcategories /></MainLayout>} />
          <Route path="/apporteurs/category/:slug/sub/:subslug" element={<MainLayout><CategoryApporteur /></MainLayout>} />
          <Route path="/helpconfort" element={<MainLayout><HelpConfort /></MainLayout>} />
          <Route path="/helpconfort/category/:slug" element={<MainLayout><CategoryHelpConfort /></MainLayout>} />
          <Route path="/documents" element={<MainLayout><Documents /></MainLayout>} />
          
          {/* Pilotage Agence */}
          <Route path="/mes-indicateurs" element={<MainLayout><IndicateursLayout /></MainLayout>}>
            <Route index element={<IndicateursAccueil />} />
            <Route path="apporteurs" element={<IndicateursApporteurs />} />
            <Route path="univers" element={<IndicateursUnivers />} />
            <Route path="techniciens" element={<IndicateursTechniciens />} />
            <Route path="sav" element={<IndicateursSAV />} />
          </Route>
          <Route path="/actions-a-mener" element={<MainLayout><ActionsAMener /></MainLayout>} />
          <Route path="/actions-a-mener/category/:slug" element={<MainLayout><CategoryActionsAMener /></MainLayout>} />
          <Route path="/diffusion" element={<DiffusionDashboard />} />
          
          {/* Support */}
          <Route path="/support" element={<MainLayout><Support /></MainLayout>} />
          <Route path="/support-tickets" element={<MainLayout><UserTickets /></MainLayout>} />
          <Route path="/mes-demandes" element={<MainLayout><UserDemands /></MainLayout>} />
          
          {/* Franchiseur */}
          <Route path="/tete-de-reseau" element={<MainLayout><FranchiseurLayout /></MainLayout>}>
            <Route index element={<FranchiseurHome />} />
            <Route path="agences" element={<FranchiseurAgencies />} />
            <Route path="agences/:agencyId" element={<FranchiseurAgencyProfile />} />
            <Route path="stats" element={<FranchiseurStats />} />
            <Route path="comparatifs" element={<FranchiseurComparison />} />
            <Route path="redevances" element={<FranchiseurRoyalties />} />
            <Route path="parametres" element={<FranchiseurSettings />} />
          </Route>
          
          {/* Administration */}
          <Route path="/admin" element={<MainLayout><AdminIndex /></MainLayout>} />
          <Route path="/admin/documents" element={<MainLayout><AdminDocuments /></MainLayout>} />
          <Route path="/admin/support" element={<MainLayout><AdminSupportTickets /></MainLayout>} />
          <Route path="/admin/support-levels" element={<MainLayout><AdminSupportLevels /></MainLayout>} />
          <Route path="/admin/escalation-history" element={<MainLayout><AdminEscalationHistory /></MainLayout>} />
          <Route path="/admin/tickets" element={<MainLayout><AdminSupportTickets /></MainLayout>} />
          <Route path="/admin/backup" element={<MainLayout><AdminBackup /></MainLayout>} />
          <Route path="/admin/helpconfort-backup" element={<MainLayout><AdminHelpConfortBackup /></MainLayout>} />
          <Route path="/admin/users" element={<MainLayout><AdminUsers /></MainLayout>} />
          <Route path="/admin/users-list" element={<MainLayout><AdminUsersList /></MainLayout>} />
          <Route path="/admin/role-permissions" element={<MainLayout><AdminRolePermissions /></MainLayout>} />
          <Route path="/admin/agencies" element={<MainLayout><AdminAgencies /></MainLayout>} />
          <Route path="/admin/storage-quota" element={<MainLayout><AdminStorageQuota /></MainLayout>} />
          <Route path="/admin/cache-backup" element={<MainLayout><AdminCacheBackup /></MainLayout>} />
          <Route path="/admin/user-activity" element={<MainLayout><AdminUserActivity /></MainLayout>} />
          
          {/* User pages */}
          <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
          <Route path="/favorites" element={<MainLayout><Favorites /></MainLayout>} />
          
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