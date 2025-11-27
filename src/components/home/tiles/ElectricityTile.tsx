import { motion } from "framer-motion";
import { ServiceTile } from "./ServiceTile";

export const ElectricityTile = () => {
  return (
    <ServiceTile
      title="Électricité"
      subtitle="Pannes, disjonctions, sécurisation"
      className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/30 dark:to-slate-800/20"
    >
      <p>
        Recherche de panne, remise en service, mise en sécurité et remplacement
        d'appareillages défectueux.
      </p>

      {/* Surcouche vitre */}
      <div className="pointer-events-none absolute inset-2 rounded-xl border border-cyan-200/60 dark:border-cyan-700/40 bg-cyan-50/10 dark:bg-cyan-900/10" />

      {/* Éclats de verre */}
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.6, x: 0, y: 0 }}
          animate={{ 
            opacity: [0, 1, 0], 
            scale: [0.6, 1, 0.8],
            x: (i - 1.5) * 15,
            y: i % 2 === 0 ? -12 : 12
          }}
          transition={{ delay: 0.5 + i * 0.08, duration: 0.6, ease: "easeOut" as const }}
          className="pointer-events-none absolute h-2 w-3 rotate-12 bg-cyan-200/80 dark:bg-cyan-600/60"
          style={{
            top: `${24 + (i % 2) * 8}%`,
            left: `${35 + i * 8}%`,
          }}
        />
      ))}

      {/* Point d'impact */}
      <motion.div
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 1, 0.5], scale: [0, 1.2, 1] }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <div className="h-4 w-4 rounded-full border-2 border-cyan-400/60 dark:border-cyan-500/60" />
      </motion.div>
    </ServiceTile>
  );
};
