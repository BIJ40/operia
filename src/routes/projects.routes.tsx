import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { MinimalLayout } from "@/components/layout";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ModuleGuard } from "@/components/auth/ModuleGuard";

// Lazy loaded pages

const ApogeeTicketsKanban = lazy(() => import("@/apogee-tickets/pages/ApogeeTicketsKanban"));
const ApogeeTicketsHistory = lazy(() => import("@/apogee-tickets/pages/ApogeeTicketsHistory"));
const ApogeeTicketsList = lazy(() => import("@/apogee-tickets/pages/ApogeeTicketsList"));
const ApogeeTicketsIncomplete = lazy(() => import("@/apogee-tickets/pages/ApogeeTicketsIncomplete"));
const ApogeeTicketsReview = lazy(() => import("@/apogee-tickets/pages/ApogeeTicketsReview"));
const ApogeeTicketsAdmin = lazy(() => import("@/apogee-tickets/pages/ApogeeTicketsAdmin"));

// Helper pour créer les layouts Projects
function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <MinimalLayout backTab="support" backLabel="Support">
      {children}
    </MinimalLayout>
  );
}

export function ProjectsRoutes() {
  return (
    <>
      {/* Index - redirect to ticketing tab */}
      <Route path="/projects" element={<Navigate to="/?tab=support" replace />} />
      
      {/* Detail pages — Ticketing strictement protégé par module overwrite-only */}
      <Route path="/projects/kanban" element={<ProjectsLayout><RoleGuard minRole="base_user"><ModuleGuard moduleKey="ticketing"><ApogeeTicketsKanban /></ModuleGuard></RoleGuard></ProjectsLayout>} />
      <Route path="/projects/historique" element={<ProjectsLayout><RoleGuard minRole="base_user"><ModuleGuard moduleKey="ticketing"><ApogeeTicketsHistory /></ModuleGuard></RoleGuard></ProjectsLayout>} />
      <Route path="/projects/list" element={<ProjectsLayout><RoleGuard minRole="base_user"><ModuleGuard moduleKey="ticketing"><ApogeeTicketsList /></ModuleGuard></RoleGuard></ProjectsLayout>} />
      <Route path="/projects/incomplets" element={<ProjectsLayout><RoleGuard minRole="base_user"><ModuleGuard moduleKey="ticketing"><ApogeeTicketsIncomplete /></ModuleGuard></RoleGuard></ProjectsLayout>} />
      <Route path="/projects/review" element={<ProjectsLayout><RoleGuard minRole="base_user"><ModuleGuard moduleKey="ticketing"><ApogeeTicketsReview /></ModuleGuard></RoleGuard></ProjectsLayout>} />
      <Route path="/projects/permissions" element={<ProjectsLayout><RoleGuard minRole="franchisee_user"><ModuleGuard moduleKey="ticketing"><ApogeeTicketsAdmin /></ModuleGuard></RoleGuard></ProjectsLayout>} />
    </>
  );
}
