import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";

import { MainLayout } from "./components/layout";
import { Loader2 } from "lucide-react";
import { RoleGuard } from "./components/auth/RoleGuard";
import { ModuleGuard } from "./components/auth/ModuleGuard";

// Critical pages - loaded immediately
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

// Lazy loaded pages - Section Index Pages
const AcademyIndex = lazy(() => import("./pages/AcademyIndex"));
const PilotageIndex = lazy(() => import("./pages/PilotageIndex"));
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
const PilotageStatsHub = lazy(() => import("./pages/PilotageStatsHub"));
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
const TeamPage = lazy(() => import("./pages/TeamPage"));

// Lazy loaded pages - Support
const SupportIndex = lazy(() => import("./pages/SupportIndex"));
const SupportUser = lazy(() => import("./pages/SupportUser"));
const UserTickets = lazy(() => import("./pages/UserTickets"));
const Faq = lazy(() => import("./pages/Faq"));

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
const AnimatorProfile = lazy(() => import("./franchiseur/pages/AnimatorProfile"));
const FranchiseurUsers = lazy(() => import("./franchiseur/pages/FranchiseurUsers"));

// Lazy loaded pages - Admin
const AdminIndex = lazy(() => import("./pages/AdminIndex"));
// AdminDocuments supprimé - redirigé vers AdminChatbotRag
const AdminSupportTickets = lazy(() => import("./pages/AdminSupportTickets"));
const AdminSupportStats = lazy(() => import("./pages/AdminSupportStats"));
const AdminEscalationHistory = lazy(() => import("./pages/AdminEscalationHistory"));
const AdminBackup = lazy(() => import("./pages/AdminBackup"));
const AdminHelpConfortBackup = lazy(() => import("./pages/AdminHelpConfortBackup"));
const AdminAgencies = lazy(() => import("./pages/AdminAgencies"));
const AdminStorageQuota = lazy(() => import("./pages/AdminStorageQuota"));
const AdminCacheBackup = lazy(() => import("./pages/AdminCacheBackup"));
const AdminUserActivity = lazy(() => import("./pages/AdminUserActivity"));
const AdminUsersUnified = lazy(() => import("./pages/AdminUsersUnified"));
const AdminCollaborators = lazy(() => import("./pages/AdminCollaborators"));
const AdminPageMetadata = lazy(() => import("./pages/AdminPageMetadata"));
const AdminApogeeGuides = lazy(() => import("./pages/AdminApogeeGuides"));
const AdminChatbotRag = lazy(() => import("./pages/AdminChatbotRag"));
const AdminSystemHealth = lazy(() => import("./pages/AdminSystemHealth"));
const AdminAnnouncementsPage = lazy(() => import("./pages/admin/AdminAnnouncementsPage"));

// Lazy loaded pages - Gestion de Projet (ex Apogée Tickets)
const ProjectsIndex = lazy(() => import("./pages/ProjectsIndex"));
const ApogeeTicketsKanban = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsKanban"));
const ApogeeTicketsList = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsList"));
const ApogeeTicketsImport = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsImport"));
const ApogeeTicketsImportPriorities = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsImportPriorities"));
const ApogeeTicketsImportEvaluated = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsImportEvaluated"));
const ApogeeTicketsImportBugs = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsImportBugs"));
const ApogeeTicketsImportV1 = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsImportV1"));
const ApogeeTicketsIncomplete = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsIncomplete"));
const ApogeeTicketsClassify = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsClassify"));
const ApogeeTicketsReview = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsReview"));
const ApogeeTicketsAdmin = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsAdmin"));

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
import { GlobalErrorBoundary } from "./components/system/GlobalErrorBoundary";

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
          <Route path="/academy/hc-base" element={<MainLayout><RoleGuard minRole="franchisee_user"><HelpConfort /></RoleGuard></MainLayout>} />
          <Route path="/academy/hc-base/category/:slug" element={<MainLayout><RoleGuard minRole="franchisee_user"><CategoryHelpConfort /></RoleGuard></MainLayout>} />
          
          {/* ============================================ */}
          {/* PILOTAGE AGENCE - Section Index + Sous-pages */}
          {/* ============================================ */}
          <Route path="/hc-agency" element={<MainLayout><RoleGuard minRole="franchisee_admin"><PilotageIndex /></RoleGuard></MainLayout>} />
          
          {/* Hub Statistiques */}
          <Route path="/hc-agency/statistiques" element={<MainLayout><RoleGuard minRole="franchisee_admin"><PilotageStatsHub /></RoleGuard></MainLayout>} />
          
          {/* Indicateurs détaillés */}
          <Route path="/hc-agency/indicateurs" element={<MainLayout><RoleGuard minRole="franchisee_admin"><IndicateursLayout /></RoleGuard></MainLayout>}>
            <Route index element={<IndicateursAccueil />} />
            <Route path="apporteurs" element={<IndicateursApporteurs />} />
            <Route path="univers" element={<IndicateursUnivers />} />
            <Route path="techniciens" element={<IndicateursTechniciens />} />
            <Route path="sav" element={<IndicateursSAV />} />
          </Route>
          
          {/* Actions à Mener */}
          <Route path="/hc-agency/actions" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ActionsAMener /></RoleGuard></MainLayout>} />
          <Route path="/hc-agency/actions/category/:slug" element={<MainLayout><RoleGuard minRole="franchisee_admin"><CategoryActionsAMener /></RoleGuard></MainLayout>} />
          
          {/* Diffusion */}
          <Route path="/hc-agency/diffusion" element={<MainLayout><RoleGuard minRole="franchisee_admin"><DiffusionDashboard /></RoleGuard></MainLayout>} />
          
          {/* RH Tech */}
          <Route path="/hc-agency/rh-tech" element={<MainLayout><RoleGuard minRole="franchisee_admin"><PlanningHebdo /></RoleGuard></MainLayout>} />
          
          {/* Équipe */}
          <Route path="/hc-agency/equipe" element={<MainLayout><RoleGuard minRole="franchisee_admin"><TeamPage /></RoleGuard></MainLayout>} />
          
          {/* ============================================ */}
          {/* SUPPORT V2 - Unified Support System */}
          {/* ============================================ */}
          {/* Support HUB */}
          <Route path="/support" element={<MainLayout><RoleGuard><SupportIndex /></RoleGuard></MainLayout>} />
          {/* Help Center - 3 columns (FAQ | Chat | Demands) */}
          <Route path="/support/helpcenter" element={<MainLayout><RoleGuard><SupportUser /></RoleGuard></MainLayout>} />
          {/* User Tickets - Full ticket management */}
          <Route path="/support/mes-demandes" element={<MainLayout><RoleGuard><UserTickets /></RoleGuard></MainLayout>} />
          {/* Legacy route - redirect */}
          <Route path="/mes-demandes" element={<Navigate to="/support/mes-demandes" replace />} />
          {/* FAQ */}
          <Route path="/support/faq" element={<MainLayout><Faq /></MainLayout>} />
          {/* SU Console - Support agents (N1/N2/N5) */}
          <Route path="/support/console" element={<MainLayout><RoleGuard minRole="franchisee_user"><AdminSupportTickets /></RoleGuard></MainLayout>} />
          
          {/* ============================================ */}
          {/* RÉSEAU FRANCHISEUR - Section Index + Sous-pages */}
          {/* ============================================ */}
          <Route path="/hc-reseau" element={<MainLayout><RoleGuard minRole="franchisor_user"><ReseauIndex /></RoleGuard></MainLayout>} />
          
          <Route path="/hc-reseau/dashboard" element={<MainLayout><RoleGuard minRole="franchisor_user"><FranchiseurLayout /></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurHome />} />
          </Route>
          <Route path="/hc-reseau/agences" element={<MainLayout><RoleGuard minRole="franchisor_user"><FranchiseurLayout /></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurAgencies />} />
            <Route path=":agencyId" element={<FranchiseurAgencyProfile />} />
          </Route>
          <Route path="/hc-reseau/animateurs" element={<MainLayout><RoleGuard minRole="franchisor_user"><FranchiseurLayout /></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurAnimateurs />} />
            <Route path=":animatorId" element={<AnimatorProfile />} />
          </Route>
          <Route path="/hc-reseau/stats" element={<MainLayout><RoleGuard minRole="franchisor_user"><FranchiseurLayout /></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurStats />} />
          </Route>
          <Route path="/hc-reseau/comparatifs" element={<MainLayout><RoleGuard minRole="franchisor_user"><FranchiseurLayout /></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurComparison />} />
          </Route>
          <Route path="/hc-reseau/redevances" element={<MainLayout><RoleGuard minRole="franchisor_admin"><FranchiseurLayout /></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurRoyalties />} />
          </Route>
          <Route path="/hc-reseau/parametres" element={<MainLayout><RoleGuard minRole="franchisor_user"><FranchiseurLayout /></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurSettings />} />
          </Route>
          <Route path="/hc-reseau/utilisateurs" element={<MainLayout><RoleGuard minRole="franchisor_user"><FranchiseurLayout /></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurUsers />} />
          </Route>
          
          {/* ============================================ */}
          {/* ADMINISTRATION - Section Index + Sous-pages */}
          {/* ============================================ */}
          <Route path="/admin" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminIndex /></RoleGuard></MainLayout>} />
          <Route path="/admin/documents" element={<Navigate to="/admin/chatbot-rag" replace />} />
          <Route path="/admin/support-tickets" element={<MainLayout><RoleGuard minRole="franchisor_user"><AdminSupportTickets /></RoleGuard></MainLayout>} />
          <Route path="/admin/support-stats" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminSupportStats /></RoleGuard></MainLayout>} />
          <Route path="/admin/escalation-history" element={<MainLayout><RoleGuard minRole="franchisor_user"><AdminEscalationHistory /></RoleGuard></MainLayout>} />
          <Route path="/admin/backup" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminBackup /></RoleGuard></MainLayout>} />
          <Route path="/admin/helpconfort-backup" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminHelpConfortBackup /></RoleGuard></MainLayout>} />
          <Route path="/admin/users" element={<MainLayout><RoleGuard minRole="franchisor_user"><AdminUsersUnified /></RoleGuard></MainLayout>} />
          <Route path="/admin/agencies" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminAgencies /></RoleGuard></MainLayout>} />
          <Route path="/admin/agencies/:agencyId" element={<MainLayout><RoleGuard minRole="platform_admin"><FranchiseurLayout /></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurAgencyProfile />} />
          </Route>
          <Route path="/admin/storage-quota" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminStorageQuota /></RoleGuard></MainLayout>} />
          <Route path="/admin/cache-backup" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminCacheBackup /></RoleGuard></MainLayout>} />
          <Route path="/admin/user-activity" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminUserActivity /></RoleGuard></MainLayout>} />
          <Route path="/admin/collaborateurs" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminCollaborators /></RoleGuard></MainLayout>} />
          <Route path="/admin/page-metadata" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminPageMetadata /></RoleGuard></MainLayout>} />
          <Route path="/admin/apogee-guides" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminApogeeGuides /></RoleGuard></MainLayout>} />
          <Route path="/admin/chatbot-rag" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminChatbotRag /></RoleGuard></MainLayout>} />
          <Route path="/admin/announcements" element={<MainLayout><RoleGuard minRole="franchisor_user"><AdminAnnouncementsPage /></RoleGuard></MainLayout>} />
          {/* Legacy admin/apogee-tickets - Redirect to /projects */}
          <Route path="/admin/apogee-tickets" element={<Navigate to="/projects/kanban" replace />} />
          <Route path="/admin/apogee-tickets/import" element={<Navigate to="/projects/import" replace />} />
          <Route path="/admin/apogee-tickets/import-priorities" element={<Navigate to="/projects/import-priorities" replace />} />
          <Route path="/admin/apogee-tickets/import-evaluated" element={<Navigate to="/projects/import-evaluated" replace />} />
          <Route path="/admin/apogee-tickets/import-bugs" element={<Navigate to="/projects/import-bugs" replace />} />
          <Route path="/admin/apogee-tickets/import-v1" element={<Navigate to="/projects/import-v1" replace />} />
          <Route path="/admin/apogee-tickets/incomplets" element={<Navigate to="/projects/incomplets" replace />} />
          <Route path="/admin/apogee-tickets/classifier" element={<Navigate to="/projects/classifier" replace />} />
          <Route path="/admin/apogee-tickets/review" element={<Navigate to="/projects/review" replace />} />
          <Route path="/admin/apogee-tickets/permissions" element={<Navigate to="/projects/permissions" replace />} />
          <Route path="/admin/system-health" element={<MainLayout><RoleGuard minRole="platform_admin"><AdminSystemHealth /></RoleGuard></MainLayout>} />
          
          {/* ============================================ */}
          {/* GESTION DE PROJET (ex Apogée Tickets) */}
          {/* ============================================ */}
          <Route path="/projects" element={<MainLayout><ModuleGuard moduleKey="apogee_tickets"><ProjectsIndex /></ModuleGuard></MainLayout>} />
          <Route path="/projects/kanban" element={<MainLayout><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsKanban /></ModuleGuard></MainLayout>} />
          <Route path="/projects/list" element={<MainLayout><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsList /></ModuleGuard></MainLayout>} />
          <Route path="/projects/import" element={<MainLayout><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsImport /></ModuleGuard></MainLayout>} />
          <Route path="/projects/import-priorities" element={<MainLayout><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsImportPriorities /></ModuleGuard></MainLayout>} />
          <Route path="/projects/import-evaluated" element={<MainLayout><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsImportEvaluated /></ModuleGuard></MainLayout>} />
          <Route path="/projects/import-bugs" element={<MainLayout><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsImportBugs /></ModuleGuard></MainLayout>} />
          <Route path="/projects/import-v1" element={<MainLayout><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsImportV1 /></ModuleGuard></MainLayout>} />
          <Route path="/projects/incomplets" element={<MainLayout><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsIncomplete /></ModuleGuard></MainLayout>} />
          <Route path="/projects/classifier" element={<MainLayout><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsClassify /></ModuleGuard></MainLayout>} />
          <Route path="/projects/review" element={<MainLayout><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsReview /></ModuleGuard></MainLayout>} />
          <Route path="/projects/permissions" element={<MainLayout><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsAdmin /></ModuleGuard></MainLayout>} />
          
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
                  <GlobalErrorBoundary>
                    <AppContent />
                  </GlobalErrorBoundary>
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
