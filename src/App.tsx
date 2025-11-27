import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { CacheBackupNotification } from "./components/CacheBackupNotification";
import { MainLayout } from "./components/layout";

// Pages
import Landing from "./pages/Landing";
import ApogeeGuide from "./pages/ApogeeGuide";
import ApporteurGuide from "./pages/ApporteurGuide";
import ApporteurSubcategories from "./pages/ApporteurSubcategories";
import Category from "./pages/Category";
import CategoryApporteur from "./pages/CategoryApporteur";
import HelpConfort from "./pages/HelpConfort";
import CategoryHelpConfort from "./pages/CategoryHelpConfort";
import ActionsAMener from "./pages/ActionsAMener";
import CategoryActionsAMener from "./pages/CategoryActionsAMener";
import Documents from "./pages/Documents";
import AdminDocuments from "./pages/AdminDocuments";
import AdminSupportTickets from "./pages/AdminSupportTickets";
import AdminSupportLevels from "./pages/AdminSupportLevels";
import AdminEscalationHistory from "./pages/AdminEscalationHistory";
import Support from "./pages/Support";
import AdminBackup from "./pages/AdminBackup";
import AdminHelpConfortBackup from "./pages/AdminHelpConfortBackup";
import AdminUsers from "./pages/AdminUsers";
import AdminUsersList from "./pages/AdminUsersList";
import AdminIndex from "./pages/AdminIndex";
import AdminRolePermissions from "./pages/AdminRolePermissions";
import Profile from "./pages/Profile";
import Favorites from "./pages/Favorites";
import IndicateursLayout from "./apogee-connect/pages/IndicateursLayout";
import IndicateursAccueil from "./apogee-connect/pages/IndicateursAccueil";
import IndicateursApporteurs from "./apogee-connect/pages/IndicateursApporteurs";
import IndicateursUnivers from "./apogee-connect/pages/IndicateursUnivers";
import IndicateursTechniciens from "./apogee-connect/pages/IndicateursTechniciens";
import IndicateursSAV from "./apogee-connect/pages/IndicateursSAV";
import AdminAgencies from "./pages/AdminAgencies";
import AdminStorageQuota from "./pages/AdminStorageQuota";
import AdminCacheBackup from "./pages/AdminCacheBackup";
import AdminUserActivity from "./pages/AdminUserActivity";
import UserTickets from "./pages/UserTickets";
import UserDemands from "./pages/UserDemands";
import FranchiseurLayout from "./franchiseur/components/layout/FranchiseurLayout";
import FranchiseurHome from "./franchiseur/pages/FranchiseurHome";
import FranchiseurAgencies from "./franchiseur/pages/FranchiseurAgencies";
import FranchiseurAgencyProfile from "./franchiseur/pages/FranchiseurAgencyProfile";
import FranchiseurStats from "./franchiseur/pages/FranchiseurStats";
import FranchiseurComparison from "./franchiseur/pages/FranchiseurComparison";
import FranchiseurRoyalties from "./franchiseur/pages/FranchiseurRoyalties";
import FranchiseurSettings from "./franchiseur/pages/FranchiseurSettings";
import DiffusionDashboard from "./pages/DiffusionDashboard";
import NotFound from "./pages/NotFound";

// Providers
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { EditorProvider } from "./contexts/EditorContext";
import { ApporteurEditorProvider } from "./contexts/ApporteurEditorContext";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import { ChangePasswordDialog } from "./components/ChangePasswordDialog";
import { ImpersonationBanner } from "./components/ImpersonationBanner";

const queryClient = new QueryClient();

function AppContent() {
  const { mustChangePassword } = useAuth();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  useEffect(() => {
    setShowPasswordDialog(mustChangePassword);
  }, [mustChangePassword]);

  return (
    <>
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
        <Route path="/mes-indicateurs" element={<MainLayout showSidebar={false}><IndicateursLayout /></MainLayout>}>
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
        <Route path="/tete-de-reseau" element={<FranchiseurLayout />}>
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
      
      <ChangePasswordDialog 
        open={showPasswordDialog} 
        onOpenChange={(open) => {
          if (!open && mustChangePassword) return;
          setShowPasswordDialog(open);
        }}
        onSuccess={() => {
          setShowPasswordDialog(false);
          window.location.reload();
        }}
      />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <ImpersonationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <CacheBackupNotification />
            <ImpersonationBanner />
            <EditorProvider>
              <ApporteurEditorProvider>
                <AppContent />
              </ApporteurEditorProvider>
            </EditorProvider>
          </TooltipProvider>
        </ImpersonationProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
