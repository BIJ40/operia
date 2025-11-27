export const PaintingTile = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/60 bg-card/90 shadow-lg p-4 md:p-5 bg-gradient-to-br from-rose-50 via-orange-50 to-yellow-50 dark:from-rose-950/30 dark:via-orange-950/20 dark:to-yellow-950/20">
      <div className="flex items-center gap-3">
        <div>
          <h3 className="text-base md:text-lg font-semibold text-foreground">
            Peinture & Finitions
          </h3>
          <p className="text-xs md:text-sm text-muted-foreground">
            Reprises après sinistre, retouches, finitions
          </p>
        </div>
      </div>

      <div className="mt-3 md:mt-4 text-xs md:text-sm text-muted-foreground">
        <p>
          Reprises de peinture après dégâts, retouches localisées et
          harmonisation des teintes pour une finition propre.
        </p>
      </div>
    </div>
  );
};
