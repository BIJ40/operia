import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import ApogeeGuide from "./pages/ApogeeGuide";
import ApporteurGuide from "./pages/ApporteurGuide";
import ApporteurSubcategories from "./pages/ApporteurSubcategories";
import Category from "./pages/Category";
import CategoryApporteur from "./pages/CategoryApporteur";
import Documents from "./pages/Documents";
import AdminDocuments from "./pages/AdminDocuments";
import AdminBackup from "./pages/AdminBackup";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import { EditorProvider } from "./contexts/EditorContext";
import { ApporteurEditorProvider } from "./contexts/ApporteurEditorContext";
import { Layout } from "./components/Layout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <EditorProvider>
            <ApporteurEditorProvider>
              <Routes>
                <Route path="/" element={<Layout showHeader showSidebar={false}><Landing /></Layout>} />
                <Route path="/apogee" element={<Layout showHeader showSidebar={true} sidebarType="apogee"><ApogeeGuide /></Layout>} />
                <Route path="/apogee/category/:slug" element={<Layout showHeader showSidebar={true} sidebarType="apogee"><Category /></Layout>} />
                <Route path="/apporteurs" element={<Layout showHeader showSidebar={true} sidebarType="apporteur"><ApporteurGuide /></Layout>} />
                <Route path="/apporteurs/category/:slug" element={<Layout showHeader showSidebar={true} sidebarType="apporteur"><ApporteurSubcategories /></Layout>} />
                <Route path="/apporteurs/category/:slug/sub/:subslug" element={<Layout showHeader showSidebar={true} sidebarType="apporteur"><CategoryApporteur /></Layout>} />
                <Route path="/documents" element={<Layout showHeader showSidebar={false}><Documents /></Layout>} />
                <Route path="/admin/documents" element={<Layout showHeader showSidebar={false}><AdminDocuments /></Layout>} />
                <Route path="/admin/backup" element={<Layout showHeader showSidebar={false}><AdminBackup /></Layout>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ApporteurEditorProvider>
          </EditorProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
