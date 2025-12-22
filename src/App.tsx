import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";

import { MainLayout } from "./components/layout";
import { Loader2 } from "lucide-react";
import { RoleGuard } from "./components/auth/RoleGuard";

// Critical pages - loaded immediately
import NotFound from "./pages/NotFound";
import Error401 from "./pages/Error401";
import Error403 from "./pages/Error403";
import Error500 from "./pages/Error500";

// Dashboard & core pages
const Dashboard = lazy(() => import("./pages/DashboardStatic"));
const Messages = lazy(() => import("./pages/Messages"));
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
import { LiveSupportProvider } from "./contexts/LiveSupportContext";
import { ChangePasswordDialog } from "./components/ChangePasswordDialog";
import { ImpersonationBanner } from "./components/ImpersonationBanner";
import { GlobalErrorBoundary } from "./components/system/GlobalErrorBoundary";
import { AnnouncementGate } from "./components/announcements/AnnouncementGate";

// Route modules
import {
  AcademyRoutes,
  PilotageRoutes,
  RHRoutes,
  AdminRoutes,
  FranchiseurRoutes,
  SupportRoutes,
  ProjectsRoutes,
  TechnicianRoutes,
  ApporteurRoutes,
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
      {/* Annonces prioritaires */}
      {!isAuthLoading && user && <AnnouncementGate userId={user.id} />}
      
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ============================================ */}
          {/* CORE ROUTES */}
          {/* ============================================ */}
          <Route path="/" element={<MainLayout><RoleGuard minRole="franchisee_user"><Dashboard /></RoleGuard></MainLayout>} />
          <Route path="/messages" element={<MainLayout><RoleGuard minRole="franchisee_user"><Messages /></RoleGuard></MainLayout>} />
          <Route path="/profile" element={<MainLayout><RoleGuard><Profile /></RoleGuard></MainLayout>} />
          <Route path="/changelog" element={<MainLayout><Changelog /></MainLayout>} />
          <Route path="/roadmap" element={<MainLayout><Roadmap /></MainLayout>} />
          
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
          {TechnicianRoutes()}
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
