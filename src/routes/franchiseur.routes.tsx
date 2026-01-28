import { Navigate } from "react-router-dom";

/**
 * Routes Franchiseur Legacy - DEPRECATED
 * 
 * Ces routes ne sont plus utilisées car le module Franchiseur
 * est maintenant intégré dans UnifiedWorkspace via FranchiseurView.
 * 
 * Les pages de détail (agences, animateurs) utilisent maintenant
 * des panneaux/sheets au sein de la vue unifiée.
 */
export function FranchiseurRoutes() {
  return (
    <>
      {/* Toutes les routes redirigent vers la vue unifiée */}
      {/* Main route */}
      {/* <Route path="/hc-reseau" element={<Navigate to="/?tab=franchiseur" replace />} /> */}
      
      {/* Les anciennes routes de détail ne sont plus nécessaires */}
      {/* Le profil d'agence s'affiche dans un Sheet au sein de FranchiseurView */}
    </>
  );
}
