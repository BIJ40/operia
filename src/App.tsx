import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";

import { MinimalLayout } from "./components/layout";
import { Loader2 } from "lucide-react";
import { RoleGuard } from "./components/auth/RoleGuard";
import { AuthRouter } from "./components/auth/AuthRouter";

// Critical pages - loaded immediately
import NotFound from "./pages/NotFound";
import Error401 from "./pages/Error401";
import Error403 from "./pages/Error403";
import Error500 from "./pages/Error500";

// Dashboard & core pages
const UnifiedWorkspace = lazy(() => import("./pages/UnifiedWorkspace"));
const Dashboard = lazy(() => import("./pages/DashboardStatic"));
const Profile = lazy(() => import("./pages/Profile"));
const Agency = lazy(() => import("./pages/Agency"));
const Changelog = lazy(() => import("./pages/Changelog"));
const Roadmap = lazy(() => import("./pages/Roadmap"));
const QrAssetPage = lazy(() => import("./pages/QrAssetPage"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// Dev pages
const UnifiedSearchAnimationPlayground = lazy(() => import("./pages/dev/UnifiedSearchAnimationPlayground"));
const PermissionsProofPage = lazy(() => import("./pages/dev/PermissionsProofPage"));
// Suivi pages (origin-box)
const SuiviIndex = lazy(() => import("./suivi/pages/Index"));
const SuiviAgencyPage = lazy(() => import("./suivi/pages/SuiviAgencyPage"));
const SuiviPaymentSuccess = lazy(() => import("./suivi/pages/PaymentSuccessPage"));
const SuiviPaymentCancel = lazy(() => import("./suivi/pages/PaymentCancelPage"));
const SuiviSecurityReport = lazy(() => import("./suivi/pages/SecurityReportPage"));
import { AgencyProvider } from "./suivi/contexts/AgencyContext";

// Providers
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { EditorProvider } from "./contexts/EditorContext";
import { ApporteurEditorProvider } from "./contexts/ApporteurEditorContext";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import { DataPreloadProvider } from "./contexts/DataPreloadContext";
import { ThemeProvider } from "./contexts/ThemeContext";
// REMOVED: RoleSimulatorProvider - fonctionnalité supprimée (simulation non fonctionnelle)
// ChangePasswordDialog is now integrated into WelcomeWizardGate
import { ImpersonationBanner } from "./components/ImpersonationBanner";
import { GlobalErrorBoundary } from "./components/system/GlobalErrorBoundary";
import { WelcomeWizardGate } from "./components/onboarding";
import { ReadOnlyEnforcer } from "./components/ReadOnlyEnforcer";
import { DataPreloadPopup } from "./components/preload/DataPreloadPopup";
// REMOVED: AnnouncementGate - No auto-popup policy (see NO_POPUP_POLICY.md)
// REMOVED: LiveSupportProvider - Simplifié en V3 (plus de live chat)
// REMOVED: N1Redirect - Module technicien /t supprimé

// Route modules
import {
  AcademyRoutes,
  PilotageRoutes,
  RHRoutes,
  AdminRoutes,
  FranchiseurRoutes,
  SupportRoutes,
  ProjectsRoutes,
  ApporteurRoutes,
  PublicRoutes,
  RealisationsRoutes,
} from "./routes";

// Optimized QueryClient with caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: (failureCount, error) => {
        // Don't retry on auth errors or not-found
        const status = (error as any)?.status ?? (error as any)?.code;
        if (status === 401 || status === 403 || status === 404) return false;
        // Max 2 retries with exponential backoff
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
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

import { supabase } from "@/integrations/supabase/client";
import { useMaintenanceMode } from "./hooks/useMaintenanceMode";
import { MaintenanceBlock } from "./components/maintenance/MaintenanceBlock";
import { PWAInstallPrompt } from "./components/pwa/PWAInstallPrompt";
import { useVersionCheck } from "./hooks/useVersionCheck";


// Detect if we are on suivi.helpconfort.services subdomain
const isSuiviDomain = typeof window !== "undefined" && window.location.hostname === "suivi.helpconfort.services";

function SuiviApp() {
  return (
    <div className="suivi-theme min-h-screen">
    <AgencyProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<SuiviIndex />} />
          <Route path="/rapport-securite" element={<SuiviSecurityReport />} />
          <Route path="/:agencySlug/paiement/success" element={<SuiviPaymentSuccess />} />
          <Route path="/:agencySlug/paiement/cancel" element={<SuiviPaymentCancel />} />
          <Route path="/paiement/success" element={<SuiviPaymentSuccess />} />
          <Route path="/paiement/cancel" element={<SuiviPaymentCancel />} />
          <Route path="/:agencySlug/:ref/:hash" element={<SuiviAgencyPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AgencyProvider>
    </div>
  );
}

function AppContent() {
  const { user, isAuthLoading } = useAuth();
  const { isBlocked, message, isLoading: isMaintenanceLoading } = useMaintenanceMode();
  const navigate = useNavigate();

  // Auto-check for app updates and force refresh if needed
  useVersionCheck();

  // Listen for PASSWORD_RECOVERY event from Supabase and redirect to reset page
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password', { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Afficher le blocage maintenance si l'utilisateur n'est pas dans la whitelist
  if (!isAuthLoading && !isMaintenanceLoading && user && isBlocked) {
    return <MaintenanceBlock message={message} />;
  }

  return (
    <>
      {/* REMOVED: AnnouncementGate - No auto-popup policy */}
      
      {/* Welcome Wizard - First-login onboarding (exception to NO_POPUP_POLICY) */}
      {!isAuthLoading && user && <WelcomeWizardGate />}
      
      {/* Data Preload Popup - Préchargement des données pour utilisateurs avec stats */}
      {/* DataPreloadPopup removed per user request */}
      
      {/* AuthRouter - Redirige automatiquement les apporteurs vers leur espace */}
      <AuthRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ============================================ */}
            {/* PUBLIC ROUTES - No auth required */}
            {/* ============================================ */}
            {PublicRoutes()}
            
            {/* ============================================ */}
            {/* CORE ROUTES */}
            {/* ============================================ */}
            <Route path="/" element={<UnifiedWorkspace />} />
            <Route path="/profile" element={<MinimalLayout backTab="accueil" backLabel="Retour à l'accueil"><RoleGuard><Profile /></RoleGuard></MinimalLayout>} />
            <Route path="/agence" element={<MinimalLayout backTab="accueil" backLabel="Retour à l'accueil"><RoleGuard><Agency /></RoleGuard></MinimalLayout>} />
            <Route path="/changelog" element={<MinimalLayout backTab="accueil" backLabel="Retour à l'accueil"><Changelog /></MinimalLayout>} />
            <Route path="/roadmap" element={<MinimalLayout backTab="accueil" backLabel="Retour à l'accueil"><Roadmap /></MinimalLayout>} />
            
            {/* ============================================ */}
            {/* DOMAIN ROUTES - Imported from modules */}
            {/* ============================================ */}
            {AcademyRoutes()}
            {PilotageRoutes()}
            {RHRoutes()}
            {AdminRoutes()}
            {FranchiseurRoutes()}
            {SupportRoutes()}
            {ProjectsRoutes()}
            {ApporteurRoutes()}
            {RealisationsRoutes()}
            
            {/* ============================================ */}
            {/* DEV PAGES - Admin only (N5/N6) */}
            {/* ============================================ */}
            <Route path="/dev/unified-search-animations" element={<RoleGuard minRole="platform_admin"><UnifiedSearchAnimationPlayground /></RoleGuard>} />
            {import.meta.env.DEV && (
              <Route path="/dev/permissions-proof" element={<PermissionsProofPage />} />
            )}
            
            {/* ============================================ */}
            {/* PUBLIC PAGES */}
            {/* ============================================ */}
            <Route path="/qr/:token" element={<QrAssetPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* ============================================ */}
            {/* ERROR PAGES */}
            {/* ============================================ */}
            <Route path="/401" element={<Error401 />} />
            <Route path="/403" element={<Error403 />} />
            <Route path="/500" element={<Error500 />} />
            

            {/* ============================================ */}
            {/* SUIVI ROUTES (origin-box) */}
            {/* ============================================ */}
            <Route path="/suivi" element={<AgencyProvider><SuiviIndex /></AgencyProvider>} />
            <Route path="/suivi/rapport-securite" element={<AgencyProvider><SuiviSecurityReport /></AgencyProvider>} />
            <Route path="/suivi/:agencySlug/paiement/success" element={<AgencyProvider><SuiviPaymentSuccess /></AgencyProvider>} />
            <Route path="/suivi/:agencySlug/paiement/cancel" element={<AgencyProvider><SuiviPaymentCancel /></AgencyProvider>} />
            <Route path="/suivi/paiement/success" element={<AgencyProvider><SuiviPaymentSuccess /></AgencyProvider>} />
            <Route path="/suivi/paiement/cancel" element={<AgencyProvider><SuiviPaymentCancel /></AgencyProvider>} />
            <Route path="/suivi/:agencySlug/:ref/:hash" element={<AgencyProvider><SuiviAgencyPage /></AgencyProvider>} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthRouter>
      
      {/* ChangePasswordDialog is now integrated into WelcomeWizardGate */}
      <ImpersonationBanner />
      <ReadOnlyEnforcer />
      <PWAInstallPrompt />
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
              <DataPreloadProvider>
                <ThemeProvider>
                  <EditorProvider>
                    <ApporteurEditorProvider>
                      <GlobalErrorBoundary>
                        {isSuiviDomain ? <SuiviApp /> : <AppContent />}
                      </GlobalErrorBoundary>
                      <Toaster />
                      <Sonner />
                    </ApporteurEditorProvider>
                  </EditorProvider>
                </ThemeProvider>
              </DataPreloadProvider>
            </ImpersonationProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
