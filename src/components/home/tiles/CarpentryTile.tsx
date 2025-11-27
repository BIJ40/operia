import { motion } from "framer-motion";
import { baseTileVariants } from "./PlumbingTile";

export const CarpentryTile = () => {
  return (
    <motion.div
      variants={baseTileVariants}
      className="relative overflow-hidden rounded-2xl border border-accent/60 bg-card/90 shadow-lg p-4 md:p-5 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20"
    >
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

      {/* Planche en bas */}
      <div className="pointer-events-none absolute left-6 right-6 bottom-4 h-2 rounded-full bg-amber-300/70" />

      {/* Scie qui passe */}
      <motion.div
        className="pointer-events-none absolute bottom-3 left-6 flex h-6 px-3 items-center justify-center rounded-full bg-orange-400/90 text-xs text-white shadow"
        initial={{ x: -40, y: 4, rotate: -10, opacity: 0 }}
        animate={{ x: 80, y: 4, rotate: 8, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.7, ease: "easeInOut" as const }}
      >
        🪚
      </motion.div>
    </motion.div>
  );
};
