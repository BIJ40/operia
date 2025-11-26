import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Landing from "./pages/Landing";
import ApogeeGuide from "./pages/ApogeeGuide";
import ApporteurGuide from "./pages/ApporteurGuide";
import ApporteurSubcategories from "./pages/ApporteurSubcategories";
import Category from "./pages/Category";
import CategoryApporteur from "./pages/CategoryApporteur";
import HelpConfort from "./pages/HelpConfort";
import CategoryHelpConfort from "./pages/CategoryHelpConfort";
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
import NotFound from "./pages/NotFound";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { EditorProvider } from "./contexts/EditorContext";
import { ApporteurEditorProvider } from "./contexts/ApporteurEditorContext";
import { Layout } from "./components/Layout";
import { ChangePasswordDialog } from "./components/ChangePasswordDialog";

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
        <Route path="/admin/storage-quota" element={<Layout showHeader showSidebar={true} sidebarType="admin"><AdminStorageQuota /></Layout>} />
        <Route path="/admin/user-activity" element={<Layout showHeader showSidebar={true} sidebarType="admin"><AdminUserActivity /></Layout>} />
        <Route path="/mes-indicateurs" element={<Layout showHeader showSidebar={false}><IndicateursLayout /></Layout>}>
          <Route index element={<IndicateursAccueil />} />
          <Route path="apporteurs" element={<IndicateursApporteurs />} />
          <Route path="univers" element={<IndicateursUnivers />} />
          <Route path="techniciens" element={<IndicateursTechniciens />} />
          <Route path="sav" element={<IndicateursSAV />} />
        </Route>
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
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <EditorProvider>
            <ApporteurEditorProvider>
              <AppContent />
            </ApporteurEditorProvider>
          </EditorProvider>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
