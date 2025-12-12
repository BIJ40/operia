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
import { SupportConsoleGuard } from "./components/auth/SupportConsoleGuard";
import { FaqAdminGuard } from "./components/auth/FaqAdminGuard";

// Critical pages - loaded immediately
import NotFound from "./pages/NotFound";
import Error401 from "./pages/Error401";
import Error403 from "./pages/Error403";

// Dashboard
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DashboardWidgets = lazy(() => import("./pages/DashboardWidgets"));
import Error500 from "./pages/Error500";

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
// Documents removed - redirects to Helpi
const FormationApogee = lazy(() => import("./pages/FormationApogee"));

// Lazy loaded pages - Pilotage Agence
const ActionsAMener = lazy(() => import("./pages/ActionsAMener"));
const CategoryActionsAMener = lazy(() => import("./pages/CategoryActionsAMener"));
const DiffusionDashboard = lazy(() => import("./pages/DiffusionDashboard"));

// Lazy loaded pages - Indicateurs
const IndicateursLayout = lazy(() => import("./apogee-connect/pages/IndicateursLayout"));
const IndicateursAccueil = lazy(() => import("./apogee-connect/pages/IndicateursAccueil"));
const StatsHub = lazy(() => import("./apogee-connect/pages/StatsHub"));
const VeilleApporteursPage = lazy(() => import("./pages/VeilleApporteursPage"));
const PlanningHebdo = lazy(() => import("./apogee-connect/pages/PlanningHebdo"));
// RH Tech hub page
const RHTech = lazy(() => import("./pages/RHTechPage"));
const EquipePage = lazy(() => import("./pages/EquipePage"));
const Messages = lazy(() => import("./pages/Messages"));

// Lazy loaded pages - Collaborateurs (Module RH & Parc)
const CollaborateursPage = lazy(() => import("./pages/CollaborateursPage"));
const CollaborateurProfilePage = lazy(() => import("./pages/CollaborateurProfilePage"));
const MonCoffreRH = lazy(() => import("./pages/MonCoffreRH"));
const FaireUneDemande = lazy(() => import("./pages/FaireUneDemande"));
const GestionConges = lazy(() => import("./pages/GestionConges"));
const DemandesRHPage = lazy(() => import("./pages/DemandesRHPage"));
const RHDashboardPage = lazy(() => import("./pages/RHDashboardPage"));
const RHIndex = lazy(() => import("./pages/RHIndex"));
const CommercialPage = lazy(() => import("./pages/CommercialPage"));
const CommercialSupportPptx = lazy(() => import("./commercial/pages/CommercialSupportPptx"));
const MaintenancePreventivePage = lazy(() => import("./pages/MaintenancePreventivePage"));
const QrAssetPage = lazy(() => import("./pages/QrAssetPage"));

// Lazy loaded pages - Support
const SupportIndex = lazy(() => import("./pages/SupportIndex"));
const Faq = lazy(() => import("./pages/Faq"));

// Lazy loaded pages - Franchiseur (Réseau)
const FranchiseurLayout = lazy(() => import("./franchiseur/components/layout/FranchiseurLayout"));
const FranchiseurHome = lazy(() => import("./franchiseur/pages/FranchiseurHome"));
const FranchiseurAgencies = lazy(() => import("./franchiseur/pages/FranchiseurAgencies"));
const FranchiseurAgencyProfile = lazy(() => import("./franchiseur/pages/FranchiseurAgencyProfile"));
const FranchiseurStats = lazy(() => import("./franchiseur/pages/FranchiseurStats"));
const FranchiseurComparison = lazy(() => import("./franchiseur/pages/FranchiseurComparison"));
const ComparatifAgencesPage = lazy(() => import("./franchiseur/pages/ComparatifAgencesPage"));
const ReseauGraphiquesPage = lazy(() => import("./franchiseur/pages/ReseauGraphiquesPage"));
const FranchiseurRoyalties = lazy(() => import("./franchiseur/pages/FranchiseurRoyalties"));
const FranchiseurAnimateurs = lazy(() => import("./franchiseur/pages/FranchiseurAnimateurs"));
const AnimatorProfile = lazy(() => import("./franchiseur/pages/AnimatorProfile"));
const TDRUsersPage = lazy(() => import("./pages/TDRUsersPage"));

// Lazy loaded pages - Admin
const AdminIndex = lazy(() => import("./pages/AdminIndex"));
const AdminSupportTickets = lazy(() => import("./pages/AdminSupportTickets"));
const SupportSettings = lazy(() => import("./pages/admin/SupportSettings"));
const AdminSupportStats = lazy(() => import("./pages/AdminSupportStats"));
const AdminEscalationHistory = lazy(() => import("./pages/AdminEscalationHistory"));
const AdminBackup = lazy(() => import("./pages/AdminBackup"));
const AdminHelpConfortBackup = lazy(() => import("./pages/AdminHelpConfortBackup"));
const AdminAgencies = lazy(() => import("./pages/AdminAgencies"));
const AdminStorageQuota = lazy(() => import("./pages/AdminStorageQuota"));
const AdminCacheBackup = lazy(() => import("./pages/AdminCacheBackup"));
const AdminUserActivity = lazy(() => import("./pages/AdminUserActivity"));
const AdminUsersUnified = lazy(() => import("./pages/AdminUsersUnified"));
const AdminPageMetadata = lazy(() => import("./pages/AdminPageMetadata"));
const AdminApogeeGuides = lazy(() => import("./pages/AdminApogeeGuides"));
const AdminHelpi = lazy(() => import("./pages/AdminHelpi"));
const AdminSystemHealth = lazy(() => import("./pages/AdminSystemHealth"));
const AdminAnnouncements = lazy(() => import("./pages/admin/AdminAnnouncements"));
const AdminFaq = lazy(() => import("./pages/admin/AdminFaq"));
const FormationGenerator = lazy(() => import("./pages/admin/FormationGenerator"));
const AdminWidgets = lazy(() => import("./pages/admin/AdminWidgets"));
const AdminFeatureFlags = lazy(() => import("./pages/admin/AdminFeatureFlags"));
const StatiaBuilderAdminPage = lazy(() => import("./statia/pages/StatiaBuilderAdminPage"));
const PermissionsCenterPage = lazy(() => import("./components/admin/permissions-center/PermissionsCenterPage"));
const StatiaValidatorPage = lazy(() => import("./statia/pages/StatiaValidatorPage"));

// Lazy loaded pages - Gestion de Projet (ex Apogée Tickets)
const ProjectsIndex = lazy(() => import("./pages/ProjectsIndex"));
const ApogeeTicketsKanban = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsKanban"));
const ApogeeTicketsHistory = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsHistory"));
const ApogeeTicketsList = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsList"));
const ApogeeTicketsIncomplete = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsIncomplete"));
const ApogeeTicketsReview = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsReview"));
const ApogeeTicketsAdmin = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsAdmin"));
const ApogeeTicketsDuplicates = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsDuplicates"));


// Lazy loaded pages - User
const Profile = lazy(() => import("./pages/Profile"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Changelog = lazy(() => import("./pages/Changelog"));
const Roadmap = lazy(() => import("./pages/Roadmap"));
const SecurityAuditReport = lazy(() => import("./pages/SecurityAuditReport"));
const SecurityDocumentation = lazy(() => import("./pages/SecurityDocumentation"));

// Dev pages (Admin only)
const UnifiedSearchAnimationPlayground = lazy(() => import("./pages/dev/UnifiedSearchAnimationPlayground"));

// Providers
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { EditorProvider } from "./contexts/EditorContext";
import { ApporteurEditorProvider } from "./contexts/ApporteurEditorContext";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import { LiveSupportProvider } from "./contexts/LiveSupportContext";
import { ChangePasswordDialog } from "./components/ChangePasswordDialog";
import { ImpersonationBanner } from "./components/ImpersonationBanner";
import { GlobalErrorBoundary } from "./components/system/GlobalErrorBoundary";
import { AnnouncementGate } from "./components/announcements/AnnouncementGate";

// Optimized QueryClient with caching - NO automatic refetching on tab switch
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
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
  const { mustChangePassword, user, isAuthLoading } = useAuth();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  useEffect(() => {
    setShowPasswordDialog(mustChangePassword);
  }, [mustChangePassword]);

  return (
    <>
      {/* Annonces prioritaires - affichées après chargement auth */}
      {!isAuthLoading && user && <AnnouncementGate userId={user.id} />}
      
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Dashboard / Home - Le dashboard personnalisable est la page d'accueil */}
          <Route path="/" element={<MainLayout><RoleGuard minRole="franchisee_user"><Dashboard /></RoleGuard></MainLayout>} />
          <Route path="/widgets" element={<MainLayout><RoleGuard minRole="franchisee_user"><DashboardWidgets /></RoleGuard></MainLayout>} />
          
          {/* Messages - Discussion interne */}
          <Route path="/messages" element={<MainLayout><RoleGuard minRole="franchisee_user"><Messages /></RoleGuard></MainLayout>} />
          
          {/* ============================================ */}
          {/* HELP ACADEMY - Section Index + Sous-pages */}
          {/* ============================================ */}
          <Route path="/academy" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><AcademyIndex /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* Guide Apogée */}
          <Route path="/academy/apogee" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><ApogeeGuide /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/academy/apogee/category/:slug" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><Category /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/academy/formation" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><FormationApogee /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* Guide Apporteurs */}
          <Route path="/academy/apporteurs" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><ApporteurGuide /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/academy/apporteurs/category/:slug" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><ApporteurSubcategories /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/academy/apporteurs/category/:slug/sub/:subslug" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><CategoryApporteur /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* Base Documentaire */}
          <Route path="/academy/hc-base" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><HelpConfort /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/academy/hc-base/category/:slug" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="help_academy"><CategoryHelpConfort /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* ============================================ */}
          {/* PILOTAGE AGENCE - Section Index + Sous-pages */}
          {/* ============================================ */}
          <Route path="/hc-agency" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="pilotage_agence"><PilotageIndex /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* Hub Statistiques - Nouvelle page unifiée (requiert option stats_hub) */}
          <Route path="/hc-agency/stats-hub" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence" requiredOption="stats_hub"><StatsHub /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/hc-agency/statistiques" element={<Navigate to="/hc-agency/indicateurs" replace />} />
          
          {/* Indicateurs détaillés (option indicateurs) */}
          <Route path="/hc-agency/indicateurs" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence" requiredOption="indicateurs"><IndicateursLayout /></ModuleGuard></RoleGuard></MainLayout>}>
            <Route index element={<IndicateursAccueil />} />
          </Route>
          {/* Legacy routes - redirect to StatsHub */}
          <Route path="/hc-agency/indicateurs/apporteurs" element={<Navigate to="/hc-agency/stats-hub" replace />} />
          <Route path="/hc-agency/indicateurs/univers" element={<Navigate to="/hc-agency/stats-hub" replace />} />
          <Route path="/hc-agency/indicateurs/techniciens" element={<Navigate to="/hc-agency/stats-hub" replace />} />
          <Route path="/hc-agency/indicateurs/sav" element={<Navigate to="/hc-agency/stats-hub" replace />} />
          
          {/* Veille Apporteurs (option veille_apporteurs) */}
          <Route path="/hc-agency/veille-apporteurs" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence" requiredOption="veille_apporteurs"><VeilleApporteursPage /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* Actions à Mener (option actions_a_mener) */}
          <Route path="/hc-agency/actions" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence" requiredOption="actions_a_mener"><ActionsAMener /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/hc-agency/actions/category/:slug" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence" requiredOption="actions_a_mener"><CategoryActionsAMener /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* Diffusion (option diffusion) */}
          <Route path="/hc-agency/statistiques/diffusion" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence" requiredOption="diffusion"><DiffusionDashboard /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* RH Tech */}
          <Route path="/pilotage/rh-tech" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence"><RHTech /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/pilotage/rh-tech/planning" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence"><PlanningHebdo /></ModuleGuard></RoleGuard></MainLayout>} />
          
          
          {/* ============================================ */}
          {/* RH - Toutes les pages RH unifiées */}
          {/* ============================================ */}
          <Route path="/rh" element={<MainLayout><RoleGuard><ModuleGuard moduleKey="rh"><RHIndex /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/rh/coffre" element={<MainLayout><RoleGuard><ModuleGuard moduleKey="rh" requiredOption="coffre"><MonCoffreRH /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/rh/demande" element={<MainLayout><RoleGuard><ModuleGuard moduleKey="rh" requiredOption="coffre"><FaireUneDemande /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/rh/equipe" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="rh" requiredOptions={['rh_viewer', 'rh_admin']}><CollaborateursPage /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/rh/equipe/:id" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="rh" requiredOptions={['rh_viewer', 'rh_admin']}><CollaborateurProfilePage /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/rh/demandes" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="rh" requiredOptions={['rh_viewer', 'rh_admin']}><DemandesRHPage /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/rh/conges" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="rh" requiredOptions={['rh_viewer', 'rh_admin']}><GestionConges /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/rh/dashboard" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="rh" requiredOption="rh_admin"><RHDashboardPage /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* Legacy RH redirects */}
          <Route path="/pilotage/mon-coffre-rh" element={<Navigate to="/rh/coffre" replace />} />
          <Route path="/mon-coffre-rh" element={<Navigate to="/rh/coffre" replace />} />
          <Route path="/faire-une-demande" element={<Navigate to="/rh/demande" replace />} />
          <Route path="/hc-agency/equipe" element={<Navigate to="/rh/equipe" replace />} />
          <Route path="/hc-agency/collaborateurs" element={<Navigate to="/rh/equipe" replace />} />
          <Route path="/hc-agency/collaborateurs/:id" element={<Navigate to="/rh/equipe/:id" replace />} />
          <Route path="/hc-agency/demandes-rh" element={<Navigate to="/rh/demandes" replace />} />
          <Route path="/hc-agency/gestion-conges" element={<Navigate to="/rh/conges" replace />} />
          <Route path="/hc-agency/dashboard-rh" element={<Navigate to="/rh/dashboard" replace />} />
          
          {/* Redirect legacy StatIA Builder route to admin */}
          <Route path="/hc-agency/statia-builder" element={<Navigate to="/admin/statia-by-bij" replace />} />
          
          {/* Commercial - Outils commerciaux agence */}
          <Route path="/hc-agency/commercial" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence"><CommercialPage /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/hc-agency/commercial/support-pptx" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence"><CommercialSupportPptx /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* Maintenance Préventive (Module Parc) */}
          <Route path="/hc-agency/maintenance" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence"><MaintenancePreventivePage /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* ============================================ */}
          {/* SUPPORT V2 - Unified Support System */}
          {/* ============================================ */}
          {/* Support HUB - Accessible à tous les utilisateurs authentifiés (avec Chat IA + Tickets intégrés) */}
          <Route path="/support" element={<MainLayout><RoleGuard><SupportIndex /></RoleGuard></MainLayout>} />
          {/* Legacy routes - redirect */}
          <Route path="/support/mes-demandes" element={<Navigate to="/support" replace />} />
          <Route path="/mes-demandes" element={<Navigate to="/support" replace />} />
          {/* FAQ - accessible à tous, pas de ModuleGuard */}
          <Route path="/support/faq" element={<MainLayout><Faq /></MainLayout>} />
          {/* SU Console - Support agents (N5+ strictement) - FIX F-PERM-3 */}
          <Route path="/support/console" element={<MainLayout><SupportConsoleGuard><AdminSupportTickets /></SupportConsoleGuard></MainLayout>} />
          {/* Support Settings - Admin only */}
          <Route path="/admin/support/settings" element={<MainLayout><SupportConsoleGuard><SupportSettings /></SupportConsoleGuard></MainLayout>} />
          
          {/* ============================================ */}
          {/* RÉSEAU FRANCHISEUR - Section Index + Sous-pages */}
          {/* ============================================ */}
          <Route path="/hc-reseau" element={<MainLayout><RoleGuard minRole="franchisor_user"><ModuleGuard moduleKey="reseau_franchiseur"><ReseauIndex /></ModuleGuard></RoleGuard></MainLayout>} />
          
          <Route path="/hc-reseau/dashboard" element={<MainLayout><RoleGuard minRole="franchisor_user"><ModuleGuard moduleKey="reseau_franchiseur"><FranchiseurLayout /></ModuleGuard></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurHome />} />
          </Route>
          <Route path="/hc-reseau/agences" element={<MainLayout><RoleGuard minRole="franchisor_user"><ModuleGuard moduleKey="reseau_franchiseur"><FranchiseurLayout /></ModuleGuard></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurAgencies />} />
            <Route path=":agencyId" element={<FranchiseurAgencyProfile />} />
          </Route>
          <Route path="/hc-reseau/animateurs" element={<MainLayout><RoleGuard minRole="franchisor_user"><ModuleGuard moduleKey="reseau_franchiseur"><FranchiseurLayout /></ModuleGuard></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurAnimateurs />} />
            <Route path=":animatorId" element={<AnimatorProfile />} />
          </Route>
          <Route path="/hc-reseau/tableaux" element={<MainLayout><RoleGuard minRole="franchisor_user"><ModuleGuard moduleKey="reseau_franchiseur"><FranchiseurLayout /></ModuleGuard></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurStats />} />
          </Route>
          <Route path="/hc-reseau/periodes" element={<MainLayout><RoleGuard minRole="franchisor_user"><ModuleGuard moduleKey="reseau_franchiseur"><FranchiseurLayout /></ModuleGuard></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurComparison />} />
          </Route>
          <Route path="/hc-reseau/comparatif" element={<MainLayout><RoleGuard minRole="franchisor_user"><ModuleGuard moduleKey="reseau_franchiseur"><FranchiseurLayout /></ModuleGuard></RoleGuard></MainLayout>}>
            <Route index element={<ComparatifAgencesPage />} />
          </Route>
          <Route path="/hc-reseau/graphiques" element={<MainLayout><RoleGuard minRole="franchisor_user"><ModuleGuard moduleKey="reseau_franchiseur"><FranchiseurLayout /></ModuleGuard></RoleGuard></MainLayout>}>
            <Route index element={<ReseauGraphiquesPage />} />
          </Route>
          <Route path="/hc-reseau/redevances" element={<MainLayout><RoleGuard minRole="franchisor_admin"><ModuleGuard moduleKey="reseau_franchiseur"><FranchiseurLayout /></ModuleGuard></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurRoyalties />} />
          </Route>
          <Route path="/hc-reseau/utilisateurs" element={<MainLayout><RoleGuard minRole="franchisor_user"><ModuleGuard moduleKey="reseau_franchiseur"><TDRUsersPage /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* ============================================ */}
          {/* ADMINISTRATION - Section Index + Sous-pages */}
          {/* ============================================ */}
          <Route path="/admin" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminIndex /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/documents" element={<Navigate to="/admin/helpi" replace />} />
          <Route path="/admin/chatbot-rag" element={<Navigate to="/admin/helpi" replace />} />
          <Route path="/admin/support-tickets" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminSupportTickets /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/support-stats" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminSupportStats /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/escalation-history" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminEscalationHistory /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/backup" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminBackup /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/helpconfort-backup" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminHelpConfortBackup /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/users" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminUsersUnified /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/agencies" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminAgencies /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/agencies/:agencyId" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><FranchiseurLayout /></ModuleGuard></RoleGuard></MainLayout>}>
            <Route index element={<FranchiseurAgencyProfile />} />
          </Route>
          <Route path="/admin/storage-quota" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminStorageQuota /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/cache-backup" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminCacheBackup /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/user-activity" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminUserActivity /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/page-metadata" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminPageMetadata /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/apogee-guides" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminApogeeGuides /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/helpi" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminHelpi /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/announcements" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminAnnouncements /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/faq" element={<MainLayout><FaqAdminGuard><AdminFaq /></FaqAdminGuard></MainLayout>} />
          {/* Legacy admin/apogee-tickets - Redirect to /projects */}
          <Route path="/admin/apogee-tickets" element={<Navigate to="/projects/kanban" replace />} />
          <Route path="/admin/apogee-tickets/incomplets" element={<Navigate to="/projects/incomplets" replace />} />
          <Route path="/admin/apogee-tickets/review" element={<Navigate to="/projects/review" replace />} />
          <Route path="/admin/apogee-tickets/permissions" element={<Navigate to="/projects/permissions" replace />} />
          <Route path="/admin/system-health" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminSystemHealth /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/statia-by-bij" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><StatiaBuilderAdminPage /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/statia-validator" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><StatiaValidatorPage /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/statia-builder" element={<Navigate to="/admin/statia-by-bij" replace />} />
          <Route path="/admin/formation-generator" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><FormationGenerator /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/widgets" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminWidgets /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/feature-flags" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminFeatureFlags /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/modules" element={<Navigate to="/admin/feature-flags" replace />} />
          <Route path="/admin/permissions-center" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><PermissionsCenterPage /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* ============================================ */}
          {/* GESTION DE PROJET (ex Apogée Tickets) */}
          {/* ============================================ */}
          <Route path="/projects" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ProjectsIndex /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/projects/kanban" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsKanban /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/projects/historique" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsHistory /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/projects/list" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsList /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/projects/incomplets" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsIncomplete /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/projects/review" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsReview /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/projects/permissions" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsAdmin /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/projects/doublons" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsDuplicates /></ModuleGuard></RoleGuard></MainLayout>} />
          
          
          {/* ============================================ */}
          {/* USER PAGES - Accessible à tous les connectés */}
          {/* ============================================ */}
          <Route path="/profile" element={<MainLayout><RoleGuard><Profile /></RoleGuard></MainLayout>} />
          <Route path="/favorites" element={<Navigate to="/academy/favoris" replace />} />
          <Route path="/academy/favoris" element={<MainLayout><RoleGuard><ModuleGuard moduleKey="help_academy"><Favorites /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/changelog" element={<MainLayout><Changelog /></MainLayout>} />
          <Route path="/roadmap" element={<MainLayout><Roadmap /></MainLayout>} />
          <Route path="/security-audit-report" element={<MainLayout><RoleGuard minRole="platform_admin"><SecurityAuditReport /></RoleGuard></MainLayout>} />
          <Route path="/security-documentation" element={<MainLayout><RoleGuard minRole="platform_admin"><SecurityDocumentation /></RoleGuard></MainLayout>} />
          
          {/* ============================================ */}
          {/* DEV PAGES - Admin only (N5/N6) */}
          {/* ============================================ */}
          <Route path="/dev/unified-search-animations" element={<RoleGuard minRole="platform_admin"><UnifiedSearchAnimationPlayground /></RoleGuard>} />
          
          {/* ============================================ */}
          {/* PUBLIC PAGES - Pas d'auth requise */}
          {/* ============================================ */}
          <Route path="/qr/:token" element={<QrAssetPage />} />
          
          {/* Error Pages */}
          <Route path="/401" element={<Error401 />} />
          <Route path="/403" element={<Error403 />} />
          <Route path="/500" element={<Error500 />} />
          
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
              <LiveSupportProvider>
                <EditorProvider>
                <ApporteurEditorProvider>
                    <GlobalErrorBoundary>
                      <AppContent />
                    </GlobalErrorBoundary>
                    <Toaster />
                    <Sonner />
                  </ApporteurEditorProvider>
                </EditorProvider>
              </LiveSupportProvider>
            </ImpersonationProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
