import { motion } from "framer-motion";
import { ServiceTile } from "./ServiceTile";

export const ElectricityTile = () => {
  return (
    <motion.div 
      initial={{ boxShadow: "0 0 0 rgba(56,189,248,0)" }}
      animate={{ boxShadow: "0 0 24px rgba(56,189,248,0.7)" }}
      transition={{ delay: 1.1, duration: 0.3 }}
      className="rounded-2xl"
    >
      <ServiceTile
        title="Électricité"
        subtitle="Pannes, disjonctions, sécurisation"
        className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/30 dark:to-slate-800/20"
      >
        <p className="relative z-10">
          Recherche de panne, remise en service, mise en sécurité et remplacement
          d'appareillages défectueux.
        </p>

        {/* Contour "mis sous tension" */}
        <motion.div className="pointer-events-none absolute inset-0">
          <svg
            className="h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <motion.rect
              x="3"
              y="3"
              width="94"
              height="94"
              rx="14"
              ry="14"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="6 4"
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: 1, pathLength: 1 }}
              transition={{ delay: 0.4, duration: 0.7, ease: "easeInOut" }}
            />
          </svg>
        </motion.div>

        {/* Icône éclair */}
        <motion.div
          className="pointer-events-none absolute -right-1 -top-1 h-10 w-10 rounded-full bg-slate-900 text-yellow-300 flex items-center justify-center text-xl"
          initial={{ scale: 0.2, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
        >
          ⚡
        </motion.div>
      </ServiceTile>
    </motion.div>
  );
};
