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

// Lazy loaded pages - Section Index Pages
const AcademyIndex = lazy(() => import("./pages/AcademyIndex"));
const PilotageIndex = lazy(() => import("./pages/PilotageIndex"));
const SupportIndex = lazy(() => import("./pages/SupportIndex"));
const ReseauIndex = lazy(() => import("./pages/ReseauIndex"));

// Lazy loaded pages - Help Academy (Guides)
const ApogeeGuide = lazy(() => import("./pages/ApogeeGuide"));
const ApporteurGuide = lazy(() => import("./pages/ApporteurGuide"));
const ApporteurSubcategories = lazy(() => import("./pages/ApporteurSubcategories"));
const Category = lazy(() => import("./pages/Category"));
const CategoryApporteur = lazy(() => import("./pages/CategoryApporteur"));
const HelpConfort = lazy(() => import("./pages/HelpConfort"));
const CategoryHelpConfort = lazy(() => import("./pages/CategoryHelpConfort"));
const Documents = lazy(() => import("./pages/Documents"));

// Lazy loaded pages - Pilotage Agence
const ActionsAMener = lazy(() => import("./pages/ActionsAMener"));
const CategoryActionsAMener = lazy(() => import("./pages/CategoryActionsAMener"));
const DiffusionDashboard = lazy(() => import("./pages/DiffusionDashboard"));

// Lazy loaded pages - Indicateurs
const IndicateursLayout = lazy(() => import("./apogee-connect/pages/IndicateursLayout"));
const IndicateursAccueil = lazy(() => import("./apogee-connect/pages/IndicateursAccueil"));
const IndicateursApporteurs = lazy(() => import("./apogee-connect/pages/IndicateursApporteurs"));
const IndicateursUnivers = lazy(() => import("./apogee-connect/pages/IndicateursUnivers"));
const IndicateursTechniciens = lazy(() => import("./apogee-connect/pages/IndicateursTechniciens"));
const IndicateursSAV = lazy(() => import("./apogee-connect/pages/IndicateursSAV"));
const PlanningHebdo = lazy(() => import("./apogee-connect/pages/PlanningHebdo"));

// Lazy loaded pages - Support
const UserDemands = lazy(() => import("./pages/UserDemands"));

// Lazy loaded pages - Franchiseur (Réseau)
const FranchiseurLayout = lazy(() => import("./franchiseur/components/layout/FranchiseurLayout"));
const FranchiseurHome = lazy(() => import("./franchiseur/pages/FranchiseurHome"));
const FranchiseurAgencies = lazy(() => import("./franchiseur/pages/FranchiseurAgencies"));
const FranchiseurAgencyProfile = lazy(() => import("./franchiseur/pages/FranchiseurAgencyProfile"));
const FranchiseurStats = lazy(() => import("./franchiseur/pages/FranchiseurStats"));
const FranchiseurComparison = lazy(() => import("./franchiseur/pages/FranchiseurComparison"));
const FranchiseurRoyalties = lazy(() => import("./franchiseur/pages/FranchiseurRoyalties"));
const FranchiseurSettings = lazy(() => import("./franchiseur/pages/FranchiseurSettings"));
const FranchiseurAnimateurs = lazy(() => import("./franchiseur/pages/FranchiseurAnimateurs"));

// Lazy loaded pages - Admin
const AdminIndex = lazy(() => import("./pages/AdminIndex"));
const AdminDocuments = lazy(() => import("./pages/AdminDocuments"));
const AdminSupportTickets = lazy(() => import("./pages/AdminSupportTickets"));
const AdminEscalationHistory = lazy(() => import("./pages/AdminEscalationHistory"));
const AdminBackup = lazy(() => import("./pages/AdminBackup"));
const AdminHelpConfortBackup = lazy(() => import("./pages/AdminHelpConfortBackup"));
const AdminAgencies = lazy(() => import("./pages/AdminAgencies"));
const AdminStorageQuota = lazy(() => import("./pages/AdminStorageQuota"));
const AdminCacheBackup = lazy(() => import("./pages/AdminCacheBackup"));
const AdminUserActivity = lazy(() => import("./pages/AdminUserActivity"));
const AdminUsersUnified = lazy(() => import("./pages/AdminUsersUnified"));

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
          
          {/* ============================================ */}
          {/* HELP ACADEMY - Section Index + Sous-pages */}
          {/* ============================================ */}
          <Route path="/academy" element={<MainLayout><RoleGuard minRole="franchisee_user"><AcademyIndex /></RoleGuard></MainLayout>} />
          
          {/* Guide Apogée */}
          <Route path="/academy/apogee" element={<MainLayout><RoleGuard minRole="franchisee_user"><ApogeeGuide /></RoleGuard></MainLayout>} />
          <Route path="/academy/apogee/category/:slug" element={<MainLayout><RoleGuard minRole="franchisee_user"><Category /></RoleGuard></MainLayout>} />
          
          {/* Guide Apporteurs */}
          <Route path="/academy/apporteurs" element={<MainLayout><RoleGuard minRole="franchisee_user"><ApporteurGuide /></RoleGuard></MainLayout>} />
          <Route path="/academy/apporteurs/category/:slug" element={<MainLayout><RoleGuard minRole="franchisee_user"><ApporteurSubcategories /></RoleGuard></MainLayout>} />
          <Route path="/academy/apporteurs/category/:slug/sub/:subslug" element={<MainLayout><RoleGuard minRole="franchisee_user"><CategoryApporteur /></RoleGuard></MainLayout>} />
          
          {/* Base Documentaire */}
          <Route path="/academy/documents" element={<MainLayout><RoleGuard minRole="franchisee_user"><HelpConfort /></RoleGuard></MainLayout>} />
          <Route path="/academy/documents/category/:slug" element={<MainLayout><RoleGuard minRole="franchisee_user"><CategoryHelpConfort /></RoleGuard></MainLayout>} />
          
          {/* ============================================ */}
          {/* PILOTAGE AGENCE - Section Index + Sous-pages */}
          {/* ============================================ */}
          <Route path="/pilotage" element={<MainLayout><RoleGuard minRole="franchisee_admin"><PilotageIndex /></RoleGuard></MainLayout>} />
          
          {/* Statistiques / Indicateurs */}
          <Route path="/pilotage/indicateurs" element={<MainLayout><RoleGuard minRole="franchisee_admin"><IndicateursLayout /></RoleGuard></MainLayout>}>
            <Route index element={<IndicateursAccueil />} />
            <Route path="apporteurs" element={<IndicateursApporteurs />} />
            <Route path="univers" element={<IndicateursUnivers />} />
            <Route path="techniciens" element={<IndicateursTechniciens />} />
            <Route path="sav" element={<IndicateursSAV />} />
          </Route>
          
          {/* Actions à Mener */}
          <Route path="/pilotage/actions" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ActionsAMener /></RoleGuard></MainLayout>} />
          <Route path="/pilotage/actions/category/:slug" element={<MainLayout><RoleGuard minRole="franchisee_admin"><CategoryActionsAMener /></RoleGuard></MainLayout>} />
          
          {/* Diffusion */}
          <Route path="/pilotage/diffusion" element={<MainLayout><RoleGuard minRole="franchisee_admin"><DiffusionDashboard /></RoleGuard></MainLayout>} />
          
          {/* RH Tech */}
          <Route path="/pilotage/rh-tech" element={<MainLayout><RoleGuard minRole="franchisee_admin"><PlanningHebdo /></RoleGuard></MainLayout>} />
          
          {/* ============================================ */}
          {/* SUPPORT - Section Index + Sous-pages */}
          {/* ============================================ */}
          <Route path="/support" element={<MainLayout><RoleGuard><SupportIndex /></RoleGuard></MainLayout>} />
          <Route path="/support/mes-demandes" element={<MainLayout><RoleGuard><UserDemands /></RoleGuard></MainLayout>} />
          <Route path="/support/console" element={<MainLayout><RoleGuard minRole="franchisor_user"><AdminSupportTickets /></RoleGuard></MainLayout>} />
          
          {/* ============================================ */}
          {/* RÉSEAU FRANCHISEUR - Section Index + Sous-pages */}
          {/* ============================================ */}
          <Route path="/reseau" element={<MainLayout><RoleGuard minRole="franchisor_user"><ReseauIndex /></RoleGuard></MainLayout>} />
          
          <Route path="/reseau/dashboard" element={<MainLayout><RoleGuard minRole="franchisor_user"><FranchiseurLayout /></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurHome />} />
          </Route>
          <Route path="/reseau/agences" element={<MainLayout><RoleGuard minRole="franchisor_user"><FranchiseurLayout /></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurAgencies />} />
            <Route path=":agencyId" element={<FranchiseurAgencyProfile />} />
          </Route>
          <Route path="/reseau/animateurs" element={<MainLayout><RoleGuard minRole="franchisor_admin"><FranchiseurLayout /></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurAnimateurs />} />
          </Route>
          <Route path="/reseau/stats" element={<MainLayout><RoleGuard minRole="franchisor_user"><FranchiseurLayout /></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurStats />} />
          </Route>
          <Route path="/reseau/comparatifs" element={<MainLayout><RoleGuard minRole="franchisor_user"><FranchiseurLayout /></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurComparison />} />
          </Route>
          <Route path="/reseau/redevances" element={<MainLayout><RoleGuard minRole="franchisor_admin"><FranchiseurLayout /></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurRoyalties />} />
          </Route>
          <Route path="/reseau/parametres" element={<MainLayout><RoleGuard minRole="franchisor_user"><FranchiseurLayout /></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurSettings />} />
          </Route>
          
          {/* ============================================ */}
          {/* ADMINISTRATION - Section Index + Sous-pages */}
          {/* ============================================ */}
          <Route path="/admin" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminIndex /></RoleGuard></MainLayout>} />
          <Route path="/admin/documents" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminDocuments /></RoleGuard></MainLayout>} />
          <Route path="/admin/support" element={<MainLayout><RoleGuard minRole="franchisor_user"><AdminSupportTickets /></RoleGuard></MainLayout>} />
          <Route path="/admin/escalation-history" element={<MainLayout><RoleGuard minRole="franchisor_user"><AdminEscalationHistory /></RoleGuard></MainLayout>} />
          <Route path="/admin/backup" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminBackup /></RoleGuard></MainLayout>} />
          <Route path="/admin/helpconfort-backup" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminHelpConfortBackup /></RoleGuard></MainLayout>} />
          <Route path="/admin/users" element={<MainLayout><RoleGuard minRole="franchisor_user"><AdminUsersUnified /></RoleGuard></MainLayout>} />
          <Route path="/admin/agencies" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminAgencies /></RoleGuard></MainLayout>} />
          <Route path="/admin/storage-quota" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminStorageQuota /></RoleGuard></MainLayout>} />
          <Route path="/admin/cache-backup" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminCacheBackup /></RoleGuard></MainLayout>} />
          <Route path="/admin/user-activity" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminUserActivity /></RoleGuard></MainLayout>} />
          
          {/* ============================================ */}
          {/* USER PAGES - Accessible à tous les connectés */}
          {/* ============================================ */}
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
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
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
