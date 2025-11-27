import { ServiceTile } from "./ServiceTile";

export const PlumbingTile = () => {
  return (
    <ServiceTile
      title="Plomberie"
      subtitle="Fuites, robinets, WC, chauffe-eau"
      className="bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-950/30 dark:to-sky-900/20"
    >
      <p>
        Intervention rapide sur les fuites, débouchages, remplacements de
        robinetterie et réparations urgentes.
      </p>
    </ServiceTile>
  );
};
