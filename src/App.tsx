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
import AdminSupport from "./pages/AdminSupport";
import Support from "./pages/Support";
import AdminBackup from "./pages/AdminBackup";
import AdminHelpConfortBackup from "./pages/AdminHelpConfortBackup";
import AdminUsers from "./pages/AdminUsers";
import AdminUsersList from "./pages/AdminUsersList";
import AdminIndex from "./pages/AdminIndex";
import AdminRolePermissions from "./pages/AdminRolePermissions";
import Profile from "./pages/Profile";
import Favorites from "./pages/Favorites";
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
        <Route path="/admin/support" element={<Layout showHeader showSidebar={true} sidebarType="admin"><AdminSupport /></Layout>} />
        <Route path="/support" element={<Layout showHeader showSidebar={false}><Support /></Layout>} />
        <Route path="/admin/backup" element={<Layout showHeader showSidebar={true} sidebarType="admin"><AdminBackup /></Layout>} />
        <Route path="/admin/helpconfort-backup" element={<Layout showHeader showSidebar={true} sidebarType="admin"><AdminHelpConfortBackup /></Layout>} />
        <Route path="/admin/users" element={<Layout showHeader showSidebar={true} sidebarType="admin"><AdminUsers /></Layout>} />
        <Route path="/admin/users-list" element={<Layout showHeader showSidebar={true} sidebarType="admin"><AdminUsersList /></Layout>} />
        <Route path="/admin/role-permissions" element={<Layout showHeader showSidebar={true} sidebarType="admin"><AdminRolePermissions /></Layout>} />
        <Route path="/profile" element={<Layout showHeader={false} showSidebar={false}><Profile /></Layout>} />
        <Route path="/favorites" element={<Layout showHeader showSidebar={true} sidebarType="apogee"><Favorites /></Layout>} />
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
