export const PlumbingTile = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/60 bg-card/90 shadow-lg p-4 md:p-5 bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-950/30 dark:to-sky-900/20">
      <div className="flex items-center gap-3">
        <div>
          <h3 className="text-base md:text-lg font-semibold text-foreground">
            Plomberie
          </h3>
          <p className="text-xs md:text-sm text-muted-foreground">
            Fuites, robinets, WC, chauffe-eau
          </p>
        </div>
      </div>

      <div className="mt-3 md:mt-4 text-xs md:text-sm text-muted-foreground">
        <p>
          Intervention rapide sur les fuites, débouchages, remplacements de
          robinetterie et réparations urgentes.
        </p>
      </div>
    </div>
  );
};
