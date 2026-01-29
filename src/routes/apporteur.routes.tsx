import { lazy } from "react";
import { Route } from "react-router-dom";
import { ApporteurAuthProvider } from "@/contexts/ApporteurAuthContext";
import { ApporteurLayout } from "@/apporteur/components/ApporteurLayout";

export function ApporteurRoutes() {
  return (
    <>
      {/* Toutes les routes Apporteur pointent vers le même layout unifié avec onglets */}
      <Route path="/apporteur" element={<ApporteurAuthProvider><ApporteurLayout /></ApporteurAuthProvider>} />
      <Route path="/apporteur/dashboard" element={<ApporteurAuthProvider><ApporteurLayout /></ApporteurAuthProvider>} />
      <Route path="/apporteur/dossiers" element={<ApporteurAuthProvider><ApporteurLayout /></ApporteurAuthProvider>} />
      <Route path="/apporteur/demandes" element={<ApporteurAuthProvider><ApporteurLayout /></ApporteurAuthProvider>} />
      <Route path="/apporteur/nouvelle-demande" element={<ApporteurAuthProvider><ApporteurLayout /></ApporteurAuthProvider>} />
    </>
  );
}
