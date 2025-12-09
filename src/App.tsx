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
const Documents = lazy(() => import("./pages/Documents"));
const FormationApogee = lazy(() => import("./pages/FormationApogee"));

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
const StatiaValidatorPage = lazy(() => import("./statia/pages/StatiaValidatorPage"));
const StatiaBuilderAgencyPage = lazy(() => import("./statia/pages/StatiaBuilderAgencyPage"));

// Lazy loaded pages - Gestion de Projet (ex Apogée Tickets)
const ProjectsIndex = lazy(() => import("./pages/ProjectsIndex"));
const ApogeeTicketsKanban = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsKanban"));
const ApogeeTicketsList = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsList"));
const ApogeeTicketsImport = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsImport"));
const ApogeeTicketsImportPriorities = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsImportPriorities"));
const ApogeeTicketsImportEvaluated = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsImportEvaluated"));
const ApogeeTicketsImportTraite = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsImportTraite"));
const ApogeeTicketsImportBugs = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsImportBugs"));
const ApogeeTicketsImportV1 = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsImportV1"));
const ApogeeTicketsImportDysfonctionnements = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsImportDysfonctionnements"));
const ApogeeTicketsIncomplete = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsIncomplete"));
const ApogeeTicketsClassify = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsClassify"));
const ApogeeTicketsReview = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsReview"));
const ApogeeTicketsAdmin = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsAdmin"));
const ApogeeTicketsDuplicates = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsDuplicates"));
const ApogeeTicketsAutoClassify = lazy(() => import("./apogee-tickets/pages/ApogeeTicketsAutoClassify"));

// Lazy loaded pages - User
const Profile = lazy(() => import("./pages/Profile"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Changelog = lazy(() => import("./pages/Changelog"));
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
          
          {/* Hub Statistiques */}
          <Route path="/hc-agency/statistiques" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence"><PilotageStatsHub /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* Indicateurs détaillés */}
          <Route path="/hc-agency/indicateurs" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence"><IndicateursLayout /></ModuleGuard></RoleGuard></MainLayout>}>
            <Route index element={<IndicateursAccueil />} />
            <Route path="apporteurs" element={<IndicateursApporteurs />} />
            <Route path="univers" element={<IndicateursUnivers />} />
            <Route path="techniciens" element={<IndicateursTechniciens />} />
            <Route path="sav" element={<IndicateursSAV />} />
          </Route>
          
          {/* Actions à Mener */}
          <Route path="/hc-agency/actions" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence"><ActionsAMener /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/hc-agency/actions/category/:slug" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence"><CategoryActionsAMener /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* Diffusion (sous statistiques) */}
          <Route path="/hc-agency/statistiques/diffusion" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence"><DiffusionDashboard /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* RH Tech */}
          <Route path="/hc-agency/rh-tech" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence"><PlanningHebdo /></ModuleGuard></RoleGuard></MainLayout>} />
          
          
          {/* Équipe (legacy - redirects to collaborateurs) */}
          <Route path="/hc-agency/equipe" element={<Navigate to="/hc-agency/collaborateurs" replace />} />
          
          {/* Collaborateurs (Module RH & Parc - Phase 1) */}
          <Route path="/hc-agency/collaborateurs" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="pilotage_agence"><CollaborateursPage /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/hc-agency/collaborateurs/:id" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="pilotage_agence"><CollaborateurProfilePage /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* Coffre-fort RH - Vue salarié (nécessite module rh avec option coffre) */}
          <Route path="/pilotage/mon-coffre-rh" element={<MainLayout><RoleGuard><ModuleGuard moduleKey="rh" requiredOption="coffre"><MonCoffreRH /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/mon-coffre-rh" element={<Navigate to="/pilotage/mon-coffre-rh" replace />} />
          
          {/* Page Index RH */}
          <Route path="/rh" element={<MainLayout><RoleGuard><ModuleGuard moduleKey="rh"><RHIndex /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* Faire une demande RH - Vue salarié (nécessite module rh avec option coffre) */}
          <Route path="/faire-une-demande" element={<MainLayout><RoleGuard><ModuleGuard moduleKey="rh" requiredOption="coffre"><FaireUneDemande /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* Demandes RH - Vue agence (Dirigeant/RH avec option rh_viewer OU rh_admin) */}
          <Route path="/hc-agency/demandes-rh" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="rh" requiredOptions={['rh_viewer', 'rh_admin']}><DemandesRHPage /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* Gestion des congés - Vue agence (N2+) */}
          <Route path="/hc-agency/gestion-conges" element={<MainLayout><RoleGuard minRole="franchisee_admin"><GestionConges /></RoleGuard></MainLayout>} />
          
          {/* Dashboard RH - Statistiques RH (Dirigeant/RH avec option rh_admin) */}
          <Route path="/hc-agency/dashboard-rh" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="rh" requiredOption="rh_admin"><RHDashboardPage /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* StatIA Builder - Construction de métriques personnalisées (Admin N5+ uniquement) */}
          <Route path="/hc-agency/statia-builder" element={<MainLayout><RoleGuard minRole="platform_admin"><StatiaBuilderAgencyPage /></RoleGuard></MainLayout>} />
          
          {/* Commercial - Outils commerciaux agence */}
          <Route path="/hc-agency/commercial" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence"><CommercialPage /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/hc-agency/commercial/support-pptx" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence"><CommercialSupportPptx /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* Maintenance Préventive (Module Parc) */}
          <Route path="/hc-agency/maintenance" element={<MainLayout><RoleGuard minRole="franchisee_admin"><ModuleGuard moduleKey="pilotage_agence"><MaintenancePreventivePage /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* ============================================ */}
          {/* SUPPORT V2 - Unified Support System */}
          {/* ============================================ */}
          {/* Support HUB - Accessible à tous les utilisateurs authentifiés */}
          <Route path="/support" element={<MainLayout><RoleGuard><SupportIndex /></RoleGuard></MainLayout>} />
          {/* Help Center - 3 columns (FAQ | Chat | Demands) */}
          <Route path="/support/helpcenter" element={<MainLayout><RoleGuard><SupportUser /></RoleGuard></MainLayout>} />
          {/* User Tickets - Full ticket management */}
          <Route path="/support/mes-demandes" element={<MainLayout><RoleGuard><UserTickets /></RoleGuard></MainLayout>} />
          {/* Legacy route - redirect */}
          <Route path="/mes-demandes" element={<Navigate to="/support/mes-demandes" replace />} />
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
          <Route path="/admin/apogee-tickets/import" element={<Navigate to="/projects/import" replace />} />
          <Route path="/admin/apogee-tickets/import-priorities" element={<Navigate to="/projects/import-priorities" replace />} />
          <Route path="/admin/apogee-tickets/import-evaluated" element={<Navigate to="/projects/import-evaluated" replace />} />
          <Route path="/admin/apogee-tickets/import-bugs" element={<Navigate to="/projects/import-bugs" replace />} />
          <Route path="/admin/apogee-tickets/import-v1" element={<Navigate to="/projects/import-v1" replace />} />
          <Route path="/admin/apogee-tickets/incomplets" element={<Navigate to="/projects/incomplets" replace />} />
          <Route path="/admin/apogee-tickets/classifier" element={<Navigate to="/projects/classifier" replace />} />
          <Route path="/admin/apogee-tickets/review" element={<Navigate to="/projects/review" replace />} />
          <Route path="/admin/apogee-tickets/permissions" element={<Navigate to="/projects/permissions" replace />} />
          <Route path="/admin/system-health" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminSystemHealth /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/statia-by-bij" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><StatiaBuilderAdminPage /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/statia-validator" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><StatiaValidatorPage /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/statia-builder" element={<Navigate to="/admin/statia-by-bij" replace />} />
          <Route path="/admin/formation-generator" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><FormationGenerator /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/widgets" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminWidgets /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/admin/feature-flags" element={<MainLayout><RoleGuard minRole="platform_admin"><ModuleGuard moduleKey="admin_plateforme"><AdminFeatureFlags /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* ============================================ */}
          {/* GESTION DE PROJET (ex Apogée Tickets) */}
          {/* ============================================ */}
          <Route path="/projects" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ProjectsIndex /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/projects/kanban" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsKanban /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/projects/list" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsList /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/projects/import" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsImport /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/projects/import-priorities" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsImportPriorities /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/projects/import-evaluated" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsImportEvaluated /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/projects/import-traite" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsImportTraite /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/projects/import-bugs" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsImportBugs /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/projects/import-v1" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsImportV1 /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/projects/import-dysfonctionnements" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsImportDysfonctionnements /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/projects/incomplets" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsIncomplete /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/projects/classifier" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsClassify /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/projects/review" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsReview /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/projects/permissions" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsAdmin /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/projects/doublons" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsDuplicates /></ModuleGuard></RoleGuard></MainLayout>} />
          <Route path="/projects/auto-classify" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsAutoClassify /></ModuleGuard></RoleGuard></MainLayout>} />
          
          {/* ============================================ */}
          {/* USER PAGES - Accessible à tous les connectés */}
          {/* ============================================ */}
          <Route path="/profile" element={<MainLayout><RoleGuard><Profile /></RoleGuard></MainLayout>} />
          <Route path="/favorites" element={<MainLayout><RoleGuard><Favorites /></RoleGuard></MainLayout>} />
          <Route path="/changelog" element={<MainLayout><Changelog /></MainLayout>} />
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
