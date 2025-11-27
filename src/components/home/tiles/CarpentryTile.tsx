import { ServiceTile } from "./ServiceTile";

export const CarpentryTile = () => {
  return (
    <ServiceTile
      title="Menuiserie"
      subtitle="Portes, fenêtres, volets, ajustements"
      className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20"
    >
      <p>
        Réglage de menuiseries, remplacement de serrures, reprises d'ajustement
        et sécurisation des accès.
      </p>
    </ServiceTile>
  );
};
