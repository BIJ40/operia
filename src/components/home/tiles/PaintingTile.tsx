import { motion } from "framer-motion";
import { ServiceTile } from "./ServiceTile";

export const PaintingTile = () => {
  return (
    <ServiceTile
      title="Peinture & Finitions"
      subtitle="Reprises après sinistre, retouches, finitions"
      className="bg-gradient-to-br from-rose-50 via-orange-50 to-yellow-50 dark:from-rose-950/30 dark:via-orange-950/20 dark:to-yellow-950/20 overflow-hidden"
    >
      {/* Couche de "peinture fraîche" qui révèle le contenu */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-accent via-amber-300 to-yellow-200 z-20"
        initial={{ x: 0 }}
        animate={{ x: "100%" }}
        transition={{ delay: 0.5, duration: 1.2, ease: "easeInOut" }}
      />

      {/* Contenu révélé par la peinture */}
      <motion.div
        className="relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <p className="text-muted-foreground">
          Reprises de peinture après dégâts, retouches localisées et
          harmonisation des teintes pour une finition propre.
        </p>
      </motion.div>

      {/* Bande de peinture appliquée */}
      <motion.div
        className="pointer-events-none absolute left-0 right-0 top-8 h-3 bg-gradient-to-r from-accent/80 via-amber-300/60 to-yellow-300/40"
        initial={{ scaleX: 0, transformOrigin: "left center" }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.5, duration: 1, ease: "easeInOut" }}
      />

      {/* Pinceau qui peint */}
      <motion.div
        className="pointer-events-none absolute top-6 h-9 w-9 rounded-full bg-card shadow-md flex items-center justify-center text-xl z-30"
        initial={{ left: "-10%", rotate: -15 }}
        animate={{ left: "85%", rotate: 15 }}
        transition={{ delay: 0.4, duration: 1.2, ease: "easeInOut" }}
      >
        🖌️
      </motion.div>

      {/* Gouttes de peinture */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute w-2 h-2 rounded-full bg-accent/70"
          style={{ top: 40, left: `${20 + i * 20}%` }}
          initial={{ opacity: 0, scale: 0, y: 0 }}
          animate={{ 
            opacity: [0, 1, 0.8],
            scale: [0, 1, 0.8],
            y: [0, 8 + Math.random() * 6]
          }}
          transition={{ 
            delay: 0.7 + i * 0.15, 
            duration: 0.6,
            ease: "easeOut"
          }}
        />
      ))}
    </ServiceTile>
  );
};
