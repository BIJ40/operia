import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import GuideApogee from "./pages/GuideApogee";
import ApporteursNationaux from "./pages/ApporteursNationaux";
import InformationsUtiles from "./pages/InformationsUtiles";
import Category from "./pages/Category";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import { EditorProvider } from "./contexts/EditorContext";
import { Layout } from "./components/Layout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <EditorProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout showHeader showSidebar={false}><Home /></Layout>} />
              <Route path="/guide-apogee" element={<Layout showHeader showSidebar={true} sidebarScope="guide-apogee"><GuideApogee /></Layout>} />
              <Route path="/guide-apogee/category/:slug" element={<Layout showHeader showSidebar={true} sidebarScope="guide-apogee"><Category /></Layout>} />
              <Route path="/apporteurs-nationaux" element={<Layout showHeader showSidebar={true} sidebarScope="apporteurs-nationaux"><ApporteursNationaux /></Layout>} />
              <Route path="/apporteurs-nationaux/category/:slug" element={<Layout showHeader showSidebar={true} sidebarScope="apporteurs-nationaux"><Category /></Layout>} />
              <Route path="/informations-utiles" element={<Layout showHeader showSidebar={true} sidebarScope="informations-utiles"><InformationsUtiles /></Layout>} />
              <Route path="/informations-utiles/category/:slug" element={<Layout showHeader showSidebar={true} sidebarScope="informations-utiles"><Category /></Layout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </EditorProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
