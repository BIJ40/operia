import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { MinimalLayout } from "@/components/layout";

// Lazy loaded pages
const SupportIndex = lazy(() => import("@/pages/SupportIndex"));
const Faq = lazy(() => import("@/pages/Faq"));

// Helper pour créer les layouts Support
function SupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <MinimalLayout backTab="support" backLabel="Retour au Support">
      {children}
    </MinimalLayout>
  );
}

export function SupportRoutes() {
  return (
    <>
      {/* Support HUB - redirect to unified interface */}
      <Route path="/support" element={<Navigate to="/?tab=support" replace />} />
      
      {/* Legacy routes */}
      <Route path="/support/mes-demandes" element={<Navigate to="/?tab=support" replace />} />
      <Route path="/mes-demandes" element={<Navigate to="/?tab=support" replace />} />
      
      {/* Console Support - Redirected to Gestion de Projet */}
      <Route path="/support/console" element={<Navigate to="/projects/kanban" replace />} />
      
      {/* FAQ - accessible à tous */}
      <Route path="/support/faq" element={<SupportLayout><Faq /></SupportLayout>} />
    </>
  );
}
