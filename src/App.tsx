import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import ApogeeGuide from "./pages/ApogeeGuide";
import GuideApporteurs from "./pages/GuideApporteurs";
import HelpConfort from "./pages/HelpConfort";
import Category from "./pages/Category";
import CategoryView from "./pages/CategoryView";
import Documents from "./pages/Documents";
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
              <Route path="/" element={<Layout showHeader showSidebar={false}><Landing /></Layout>} />
              <Route path="/apogee" element={<Layout showHeader showSidebar={true}><ApogeeGuide /></Layout>} />
              <Route path="/apogee/category/:slug" element={<Layout showHeader showSidebar={true}><Category /></Layout>} />
              <Route path="/guide-apporteurs" element={<Layout showHeader showSidebar={true}><GuideApporteurs /></Layout>} />
              <Route path="/guide-apporteurs/category/:id" element={<Layout showHeader showSidebar={true}><CategoryView /></Layout>} />
              <Route path="/help-confort" element={<Layout showHeader showSidebar={true}><HelpConfort /></Layout>} />
              <Route path="/help-confort/category/:id" element={<Layout showHeader showSidebar={true}><CategoryView /></Layout>} />
              <Route path="/documents" element={<Layout showHeader showSidebar={false}><Documents /></Layout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </EditorProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
