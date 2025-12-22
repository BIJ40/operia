import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { SupportConsoleGuard } from "@/components/auth/SupportConsoleGuard";

// Lazy loaded pages
const SupportIndex = lazy(() => import("@/pages/SupportIndex"));
const Faq = lazy(() => import("@/pages/Faq"));
const AdminSupportTickets = lazy(() => import("@/pages/AdminSupportTickets"));

export function SupportRoutes() {
  return (
    <>
      {/* Support HUB */}
      <Route path="/support" element={<MainLayout><RoleGuard><SupportIndex /></RoleGuard></MainLayout>} />
      
      {/* Legacy routes */}
      <Route path="/support/mes-demandes" element={<Navigate to="/support" replace />} />
      <Route path="/mes-demandes" element={<Navigate to="/support" replace />} />
      
      {/* FAQ - accessible à tous */}
      <Route path="/support/faq" element={<MainLayout><Faq /></MainLayout>} />
      
      {/* Console Support - N5+ */}
      <Route path="/support/console" element={<MainLayout><SupportConsoleGuard><AdminSupportTickets /></SupportConsoleGuard></MainLayout>} />
    </>
  );
}
