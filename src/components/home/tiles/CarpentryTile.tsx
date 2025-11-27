import { motion } from "framer-motion";
import { baseTileVariants } from "./ServiceTile";

export const CarpentryTile = () => {
  return (
    <motion.div
      variants={baseTileVariants}
      className="relative overflow-hidden rounded-2xl border border-accent/60 bg-card/90 shadow-lg p-4 md:p-5 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20"
      animate={{ rotate: [0, -1.2, 1.2, -0.8, 0.8, 0] }}
      transition={{ delay: 0.5, duration: 0.35 }}
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

      {/* Bordure électrique lumineuse */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl border border-yellow-400/70 dark:border-yellow-500/50"
        initial={{ opacity: 0, boxShadow: "0 0 0px rgba(250,204,21,0)" }}
        animate={{ opacity: 1, boxShadow: "0 0 22px rgba(250,204,21,0.5)" }}
        transition={{ delay: 0.6, duration: 0.3 }}
      />

      {/* Icône éclair */}
      <motion.div
        className="pointer-events-none absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 dark:bg-slate-800 text-yellow-300 text-lg shadow"
        initial={{ scale: 0, rotate: -20, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
      >
        ⚡
      </motion.div>

      {/* Arc électrique */}
      <motion.div
        className="pointer-events-none absolute bottom-4 right-4 h-6 w-1 bg-yellow-400/80 rounded-full"
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: [0, 1, 0.5, 1, 0], opacity: [0, 1, 1, 1, 0] }}
        transition={{ delay: 0.7, duration: 0.4, repeat: 1 }}
      />
    </motion.div>
  );
};
