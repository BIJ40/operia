import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { CacheBackupNotification } from "./components/CacheBackupNotification";
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
import AdminFranchiseurRoles from "./pages/AdminFranchiseurRoles";
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
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { EditorProvider } from "./contexts/EditorContext";
import { ApporteurEditorProvider } from "./contexts/ApporteurEditorContext";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import { Layout } from "./components/Layout";
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
        <Route path="/" element={<Layout showHeader={false} showSidebar={false}><Landing /></Layout>} />
        <Route path="/apogee" element={<Layout showHeader showSidebar={true} sidebarType="apogee"><ApogeeGuide /></Layout>} />
        <Route path="/apogee/category/:slug" element={<Layout showHeader showSidebar={true} sidebarType="apogee"><Category /></Layout>} />
        <Route path="/actions-a-mener" element={<Layout showHeader showSidebar={true} sidebarType="actions"><ActionsAMener /></Layout>} />
        <Route path="/actions-a-mener/category/:slug" element={<Layout showHeader showSidebar={true} sidebarType="actions"><CategoryActionsAMener /></Layout>} />
        <Route path="/apporteurs" element={<Layout showHeader showSidebar={true} sidebarType="apporteur"><ApporteurGuide /></Layout>} />
        <Route path="/apporteurs/category/:slug" element={<Layout showHeader showSidebar={true} sidebarType="apporteur"><ApporteurSubcategories /></Layout>} />
        <Route path="/apporteurs/category/:slug/sub/:subslug" element={<Layout showHeader showSidebar={true} sidebarType="apporteur"><CategoryApporteur /></Layout>} />
        <Route path="/helpconfort" element={<Layout showHeader showSidebar={true} sidebarType="helpconfort"><HelpConfort /></Layout>} />
        <Route path="/helpconfort/category/:slug" element={<Layout showHeader showSidebar={true} sidebarType="helpconfort"><CategoryHelpConfort /></Layout>} />
        <Route path="/documents" element={<Layout showHeader showSidebar={false}><Documents /></Layout>} />
        <Route path="/admin" element={<Layout showHeader showSidebar={true} sidebarType="admin"><AdminIndex /></Layout>} />
        <Route path="/admin/documents" element={<Layout showHeader showSidebar={true} sidebarType="admin"><AdminDocuments /></Layout>} />
        <Route path="/admin/support" element={<AdminSupportTickets />} />
          <Route path="/admin/support-levels" element={<AdminSupportLevels />} />
          <Route path="/admin/escalation-history" element={<AdminEscalationHistory />} />
        <Route path="/admin/tickets" element={<AdminSupportTickets />} />
        <Route path="/support" element={<Support />} />
        <Route path="/support-tickets" element={<Layout showHeader showSidebar={false}><UserTickets /></Layout>} />
        <Route path="/mes-demandes" element={<Layout showHeader showSidebar={false}><UserDemands /></Layout>} />
        <Route path="/admin/backup" element={<Layout showHeader showSidebar={true} sidebarType="admin"><AdminBackup /></Layout>} />
        <Route path="/admin/helpconfort-backup" element={<Layout showHeader showSidebar={true} sidebarType="admin"><AdminHelpConfortBackup /></Layout>} />
        <Route path="/admin/users" element={<Layout showHeader showSidebar={true} sidebarType="admin"><AdminUsers /></Layout>} />
        <Route path="/admin/users-list" element={<Layout showHeader showSidebar={false}><AdminUsersList /></Layout>} />
        <Route path="/admin/role-permissions" element={<Layout showHeader showSidebar={true} sidebarType="admin"><AdminRolePermissions /></Layout>} />
        <Route path="/admin/agencies" element={<Layout showHeader showSidebar={true} sidebarType="admin"><AdminAgencies /></Layout>} />
        <Route path="/admin/franchiseur-roles" element={<Layout showHeader showSidebar={true} sidebarType="admin"><AdminFranchiseurRoles /></Layout>} />
        <Route path="/admin/storage-quota" element={<Layout showHeader showSidebar={true} sidebarType="admin"><AdminStorageQuota /></Layout>} />
        <Route path="/admin/cache-backup" element={<Layout showHeader showSidebar={true} sidebarType="admin"><AdminCacheBackup /></Layout>} />
        <Route path="/admin/user-activity" element={<Layout showHeader showSidebar={true} sidebarType="admin"><AdminUserActivity /></Layout>} />
        <Route path="/mes-indicateurs" element={<Layout showHeader showSidebar={false}><IndicateursLayout /></Layout>}>
          <Route index element={<IndicateursAccueil />} />
          <Route path="apporteurs" element={<IndicateursApporteurs />} />
          <Route path="univers" element={<IndicateursUnivers />} />
          <Route path="techniciens" element={<IndicateursTechniciens />} />
          <Route path="sav" element={<IndicateursSAV />} />
        </Route>
        <Route path="/tete-de-reseau" element={<FranchiseurLayout />}>
          <Route index element={<FranchiseurHome />} />
          <Route path="agences" element={<FranchiseurAgencies />} />
          <Route path="agences/:agencyId" element={<FranchiseurAgencyProfile />} />
          <Route path="stats" element={<FranchiseurStats />} />
          <Route path="comparatifs" element={<FranchiseurComparison />} />
          <Route path="redevances" element={<FranchiseurRoyalties />} />
          <Route path="parametres" element={<FranchiseurSettings />} />
        </Route>
        <Route path="/diffusion" element={<DiffusionDashboard />} />
        <Route path="/profile" element={<Layout showHeader={false} showSidebar={false}><Profile /></Layout>} />
        <Route path="/favorites" element={<Layout showHeader showSidebar={false}><Favorites /></Layout>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      <ChangePasswordDialog 
        open={showPasswordDialog} 
        onOpenChange={(open) => {
          if (!open && mustChangePassword) {
            // Ne pas permettre de fermer le dialog si le changement est obligatoire
            return;
          }
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
