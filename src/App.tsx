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
import Admin from "./pages/Admin";
import Documents from "./pages/Documents";
import Auth from "./pages/Auth";
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
              <Route path="/" element={<Layout showHeader><Home /></Layout>} />
              <Route path="/guide-apogee" element={<Layout showHeader><GuideApogee /></Layout>} />
              <Route path="/guide-apogee/category/:slug" element={<Layout showHeader><Category /></Layout>} />
              <Route path="/apporteurs-nationaux" element={<Layout showHeader><ApporteursNationaux /></Layout>} />
              <Route path="/apporteurs-nationaux/category/:slug" element={<Layout showHeader><Category /></Layout>} />
              <Route path="/informations-utiles" element={<Layout showHeader><InformationsUtiles /></Layout>} />
              <Route path="/informations-utiles/category/:slug" element={<Layout showHeader><Category /></Layout>} />
              <Route path="/admin" element={<Layout showHeader><Admin /></Layout>} />
              <Route path="/documents" element={<Layout showHeader><Documents /></Layout>} />
              <Route path="/auth" element={<Auth />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </EditorProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
