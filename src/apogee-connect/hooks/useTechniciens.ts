import { useState, useMemo } from "react";
import { buildTechMap, resolveTech, TechnicienInfo } from "@/apogee-connect/utils/techTools";

/**
 * Hook complet pour la gestion des techniciens
 * Gère automatiquement actifs/inactifs + filtrage + mapping
 */
export function useTechniciens(usersData: any[]) {
  const [showInactive, setShowInactive] = useState(false);

  const TECHS = useMemo(() => buildTechMap(usersData), [usersData]);

  const techniciensList = useMemo(() => {
    return Object.values(TECHS)
      .filter(t => showInactive ? true : t.actif)
      .sort((a, b) => a.prenom.localeCompare(b.prenom));
  }, [TECHS, showInactive]);

  return {
    TECHS,
    techniciensList,
    resolve: (id: number | string) => resolveTech(id, TECHS),
    showInactive,
    setShowInactive
  };
}
