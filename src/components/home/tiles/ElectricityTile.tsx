import { ServiceTile } from "./ServiceTile";

export const ElectricityTile = () => {
  return (
    <ServiceTile
      title="Électricité"
      subtitle="Pannes, disjonctions, sécurisation"
      className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/30 dark:to-slate-800/20"
    >
      <p>
        Recherche de panne, remise en service, mise en sécurité et remplacement
        d'appareillages défectueux.
      </p>
    </ServiceTile>
  );
};
