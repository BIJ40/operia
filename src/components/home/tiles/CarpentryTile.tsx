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

        {/* Planche qui se fait découper */}
        <div className="pointer-events-none absolute left-4 right-4 bottom-4 h-3 rounded-full bg-amber-300/70 overflow-hidden">
          {/* Trait de coupe qui traverse */}
          <motion.div
            className="absolute top-0 bottom-0 w-1 bg-amber-900/60"
            initial={{ left: "-10%" }}
            animate={{ left: "110%" }}
            transition={{ delay: 0.6, duration: 1.2, ease: "easeInOut" }}
          />
        </div>

        {/* Copeaux qui volent */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="pointer-events-none absolute w-1 h-1 rounded-full bg-amber-400"
            style={{ bottom: 16, left: `${30 + i * 8}%` }}
            initial={{ opacity: 0, y: 0, x: 0 }}
            animate={{ 
              opacity: [0, 1, 0],
              y: [-5, -15 - Math.random() * 10],
              x: [0, (Math.random() - 0.5) * 20]
            }}
            transition={{ 
              delay: 0.7 + i * 0.1, 
              duration: 0.5,
              ease: "easeOut"
            }}
          />
        ))}

        {/* Scie qui traverse */}
        <motion.div
          className="pointer-events-none absolute left-2 bottom-2 h-8 w-8 rounded-full bg-amber-500/90 flex items-center justify-center text-lg"
          initial={{ x: -40, rotate: -10, opacity: 0 }}
          animate={{ x: 120, rotate: 10, opacity: 1 }}
          transition={{ delay: 0.5, duration: 1.2, ease: "easeInOut" }}
        >
          🪚
        </motion.div>
      </ServiceTile>
    </motion.div>
  );
};
