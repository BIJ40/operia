import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout";
import { RoleGuard } from "@/components/auth/RoleGuard";

// Lazy loaded pages
const SupportIndex = lazy(() => import("@/pages/SupportIndex"));
const Faq = lazy(() => import("@/pages/Faq"));

export function SupportRoutes() {
  return (
    <>
      {/* Support HUB - redirect to unified interface */}
      <Route path="/support" element={<Navigate to="/?tab=aide" replace />} />
      
      {/* Legacy routes */}
      <Route path="/support/mes-demandes" element={<Navigate to="/?tab=aide" replace />} />
      <Route path="/mes-demandes" element={<Navigate to="/?tab=aide" replace />} />
      
      {/* Console Support - Redirected to Gestion de Projet */}
      <Route path="/support/console" element={<Navigate to="/projects/kanban" replace />} />
      
      {/* FAQ - accessible à tous */}
      <Route path="/support/faq" element={<MainLayout><Faq /></MainLayout>} />
    </>
  );
}
