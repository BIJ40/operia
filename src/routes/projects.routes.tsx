import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ModuleGuard } from "@/components/auth/ModuleGuard";

// Lazy loaded pages
const ProjectsIndex = lazy(() => import("@/pages/ProjectsIndex"));
const ApogeeTicketsKanban = lazy(() => import("@/apogee-tickets/pages/ApogeeTicketsKanban"));
const ApogeeTicketsHistory = lazy(() => import("@/apogee-tickets/pages/ApogeeTicketsHistory"));
const ApogeeTicketsList = lazy(() => import("@/apogee-tickets/pages/ApogeeTicketsList"));
const ApogeeTicketsIncomplete = lazy(() => import("@/apogee-tickets/pages/ApogeeTicketsIncomplete"));
const ApogeeTicketsReview = lazy(() => import("@/apogee-tickets/pages/ApogeeTicketsReview"));
const ApogeeTicketsAdmin = lazy(() => import("@/apogee-tickets/pages/ApogeeTicketsAdmin"));

export function ProjectsRoutes() {
  return (
    <>
      {/* Index - redirect to ticketing tab */}
      <Route path="/projects" element={<Navigate to="/?tab=ticketing" replace />} />
      
      {/* Detail pages keep their routes */}
      <Route path="/projects/kanban" element={<MainLayout><RoleGuard minRole="base_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsKanban /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/projects/historique" element={<MainLayout><RoleGuard minRole="base_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsHistory /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/projects/list" element={<MainLayout><RoleGuard minRole="base_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsList /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/projects/incomplets" element={<MainLayout><RoleGuard minRole="base_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsIncomplete /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/projects/review" element={<MainLayout><RoleGuard minRole="base_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsReview /></ModuleGuard></RoleGuard></MainLayout>} />
      <Route path="/projects/permissions" element={<MainLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="apogee_tickets"><ApogeeTicketsAdmin /></ModuleGuard></RoleGuard></MainLayout>} />
    </>
  );
}
