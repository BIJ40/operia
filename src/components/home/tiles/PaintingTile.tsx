import { ServiceTile } from "./ServiceTile";

export const PaintingTile = () => {
  return (
    <ServiceTile
      title="Peinture & Finitions"
      subtitle="Reprises après sinistre, retouches, finitions"
      className="bg-gradient-to-br from-rose-50 via-orange-50 to-yellow-50 dark:from-rose-950/30 dark:via-orange-950/20 dark:to-yellow-950/20"
    >
      <p>
        Reprises de peinture après dégâts, retouches localisées et
        harmonisation des teintes pour une finition propre.
      </p>
    </ServiceTile>
  );
};
