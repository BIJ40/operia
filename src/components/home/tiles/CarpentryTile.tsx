export const CarpentryTile = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/60 bg-card/90 shadow-lg p-4 md:p-5 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20">
      <div className="flex items-center gap-3">
        <div>
          <h3 className="text-base md:text-lg font-semibold text-foreground">
            Menuiserie
          </h3>
          <p className="text-xs md:text-sm text-muted-foreground">
            Portes, fenêtres, volets, ajustements
          </p>
        </div>
      </div>

      <div className="mt-3 md:mt-4 text-xs md:text-sm text-muted-foreground">
        <p>
          Réglage de menuiseries, remplacement de serrures, reprises d'ajustement
          et sécurisation des accès.
        </p>
      </div>
    </div>
  );
};
