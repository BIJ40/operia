import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";

import { MinimalLayout } from "./components/layout";
import { Loader2 } from "lucide-react";
import { RoleGuard } from "./components/auth/RoleGuard";

// Critical pages - loaded immediately
import NotFound from "./pages/NotFound";
import Error401 from "./pages/Error401";
import Error403 from "./pages/Error403";
import Error500 from "./pages/Error500";

// Dashboard & core pages
const UnifiedWorkspace = lazy(() => import("./pages/UnifiedWorkspace"));
const Dashboard = lazy(() => import("./pages/DashboardStatic"));
const Profile = lazy(() => import("./pages/Profile"));
const Changelog = lazy(() => import("./pages/Changelog"));
const Roadmap = lazy(() => import("./pages/Roadmap"));
const QrAssetPage = lazy(() => import("./pages/QrAssetPage"));

// Dev pages
const UnifiedSearchAnimationPlayground = lazy(() => import("./pages/dev/UnifiedSearchAnimationPlayground"));

// Providers
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { EditorProvider } from "./contexts/EditorContext";
import { ApporteurEditorProvider } from "./contexts/ApporteurEditorContext";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
// REMOVED: RoleSimulatorProvider - fonctionnalité supprimée (simulation non fonctionnelle)
import { ChangePasswordDialog } from "./components/ChangePasswordDialog";
import { ImpersonationBanner } from "./components/ImpersonationBanner";
import { GlobalErrorBoundary } from "./components/system/GlobalErrorBoundary";
import { WelcomeWizardGate } from "./components/onboarding";
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

import { useMaintenanceMode } from "./hooks/useMaintenanceMode";
import { MaintenanceBlock } from "./components/maintenance/MaintenanceBlock";
import { PWAInstallPrompt } from "./components/pwa/PWAInstallPrompt";

function AppContent() {
  const { mustChangePassword, user, isAuthLoading } = useAuth();
  const { isBlocked, message, isLoading: isMaintenanceLoading } = useMaintenanceMode();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  useEffect(() => {
    setShowPasswordDialog(mustChangePassword);
  }, [mustChangePassword]);

  // Afficher le blocage maintenance si l'utilisateur n'est pas dans la whitelist
  if (!isAuthLoading && !isMaintenanceLoading && user && isBlocked) {
    return <MaintenanceBlock message={message} />;
  }

  return (
    <>
      {/* REMOVED: AnnouncementGate - No auto-popup policy */}
      
      {/* Welcome Wizard - First-login onboarding (exception to NO_POPUP_POLICY) */}
      {!isAuthLoading && user && <WelcomeWizardGate />}
      
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
          
          {/* ============================================ */}
          {/* DEV PAGES - Admin only (N5/N6) */}
          {/* ============================================ */}
          <Route path="/dev/unified-search-animations" element={<RoleGuard minRole="platform_admin"><UnifiedSearchAnimationPlayground /></RoleGuard>} />
          
          {/* ============================================ */}
          {/* PUBLIC PAGES */}
          {/* ============================================ */}
          <Route path="/qr/:token" element={<QrAssetPage />} />
          
          {/* ============================================ */}
          {/* ERROR PAGES */}
          {/* ============================================ */}
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
