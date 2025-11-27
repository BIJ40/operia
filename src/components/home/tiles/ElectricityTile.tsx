import { motion } from "framer-motion";

const electricTileVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 140,
      damping: 18,
    },
  },
};

export const ElectricityTile = () => {
  return (
    <motion.div
      variants={electricTileVariants}
      className="relative overflow-hidden rounded-2xl border border-accent/60 bg-card/90 shadow-lg p-4 md:p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/30 dark:to-slate-800/20"
      animate={{ rotate: [0, -1.2, 1.2, -0.8, 0.8, 0] }}
      transition={{ delay: 0.5, duration: 0.35 }}
    >
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

      {/* Bord lumineux */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl border border-sky-300/70"
        initial={{ opacity: 0, boxShadow: "0 0 0px rgba(56,189,248,0)" }}
        animate={{ opacity: 1, boxShadow: "0 0 22px rgba(56,189,248,0.7)" }}
        transition={{ delay: 0.6, duration: 0.3 }}
      />

      {/* Pastille éclair en haut à droite */}
      <motion.div
        className="pointer-events-none absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 dark:bg-slate-800 text-yellow-300 text-lg shadow"
        initial={{ scale: 0, rotate: -20, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ delay: 0.6, type: "spring" as const, stiffness: 200 }}
      >
        ⚡
      </motion.div>
    </motion.div>
  );
};
