import { motion } from "framer-motion";
import { ServiceTile } from "./ServiceTile";

export const CarpentryTile = () => {
  return (
    <motion.div
      initial={{ rotate: 0 }}
      animate={{ rotate: [0, -1.5, 1.5, -1, 1, 0] }}
      transition={{ delay: 0.55, duration: 0.4 }}
    >
      <ServiceTile
        title="Menuiserie"
        subtitle="Portes, fenêtres, volets, ajustements"
        className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20"
      >
        <p className="relative z-10">
          Réglage de menuiseries, remplacement de serrures, reprises d'ajustement
          et sécurisation des accès.
        </p>

        {/* "Planche" */}
        <div className="pointer-events-none absolute left-4 right-4 bottom-4 h-2 rounded-full bg-amber-300/70" />

        {/* Scie qui traverse */}
        <motion.div
          className="pointer-events-none absolute left-2 bottom-2 h-8 px-3 rounded-full bg-amber-500/90 text-xs text-white font-semibold flex items-center gap-1"
          initial={{ x: -40, y: 4, rotate: -10, opacity: 0 }}
          animate={{ x: 60, y: 8, rotate: 8, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.7, ease: "easeInOut" }}
        >
          🪚
          <span className="hidden md:inline">Découpe</span>
        </motion.div>
      </ServiceTile>
    </motion.div>
  );
};
