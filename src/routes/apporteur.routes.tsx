import { lazy } from "react";
import { Route } from "react-router-dom";
import { ApporteurSessionProvider } from "@/apporteur/contexts/ApporteurSessionContext";
import { ApporteurLayout } from "@/apporteur/components/ApporteurLayout";

export function ApporteurRoutes() {
  return (
    <>
      {/* Toutes les routes Apporteur pointent vers le même layout unifié avec onglets */}
      <Route path="/apporteur" element={<ApporteurSessionProvider><ApporteurLayout /></ApporteurSessionProvider>} />
      <Route path="/apporteur/dashboard" element={<ApporteurSessionProvider><ApporteurLayout /></ApporteurSessionProvider>} />
      <Route path="/apporteur/dossiers" element={<ApporteurSessionProvider><ApporteurLayout /></ApporteurSessionProvider>} />
      <Route path="/apporteur/demandes" element={<ApporteurSessionProvider><ApporteurLayout /></ApporteurSessionProvider>} />
      <Route path="/apporteur/nouvelle-demande" element={<ApporteurSessionProvider><ApporteurLayout /></ApporteurSessionProvider>} />
    </>
  );
}
