export const ElectricityTile = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/60 bg-card/90 shadow-lg p-4 md:p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/30 dark:to-slate-800/20">
      <div className="flex items-center gap-3">
        <div>
          <h3 className="text-base md:text-lg font-semibold text-foreground">
            Électricité
          </h3>
          <p className="text-xs md:text-sm text-muted-foreground">
            Pannes, disjonctions, sécurisation
          </p>
        </div>
      </div>

      <div className="mt-3 md:mt-4 text-xs md:text-sm text-muted-foreground">
        <p>
          Recherche de panne, remise en service, mise en sécurité et remplacement
          d'appareillages défectueux.
        </p>
      </div>
    </div>
  );
};
