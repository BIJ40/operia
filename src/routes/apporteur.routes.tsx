import { lazy } from "react";
import { Route } from "react-router-dom";
import { ApporteurAuthProvider } from "@/contexts/ApporteurAuthContext";
import { ApporteurLayout } from "@/apporteur/components/ApporteurLayout";

// Lazy loaded pages
const ApporteurDashboard = lazy(() => import("@/apporteur/pages/ApporteurDashboard"));
const ApporteurDossiers = lazy(() => import("@/apporteur/pages/ApporteurDossiers"));
const ApporteurDemandes = lazy(() => import("@/apporteur/pages/ApporteurDemandes"));
const ApporteurNouvelleDemande = lazy(() => import("@/apporteur/pages/ApporteurNouvelleDemande"));

export function ApporteurRoutes() {
  return (
    <>
      <Route path="/apporteur" element={<ApporteurAuthProvider><ApporteurLayout><ApporteurDashboard /></ApporteurLayout></ApporteurAuthProvider>} />
      <Route path="/apporteur/dashboard" element={<ApporteurAuthProvider><ApporteurLayout><ApporteurDashboard /></ApporteurLayout></ApporteurAuthProvider>} />
      <Route path="/apporteur/dossiers" element={<ApporteurAuthProvider><ApporteurLayout><ApporteurDossiers /></ApporteurLayout></ApporteurAuthProvider>} />
      <Route path="/apporteur/demandes" element={<ApporteurAuthProvider><ApporteurLayout><ApporteurDemandes /></ApporteurLayout></ApporteurAuthProvider>} />
      <Route path="/apporteur/nouvelle-demande" element={<ApporteurAuthProvider><ApporteurLayout><ApporteurNouvelleDemande /></ApporteurLayout></ApporteurAuthProvider>} />
    </>
  );
}
