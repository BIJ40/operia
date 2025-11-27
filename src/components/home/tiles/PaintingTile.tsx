import { motion } from "framer-motion";
import { ServiceTile } from "./ServiceTile";

export const PaintingTile = () => {
  return (
    <ServiceTile
      title="Peinture & Finitions"
      subtitle="Reprises après sinistre, retouches, finitions"
      className="bg-gradient-to-br from-rose-50 via-orange-50 to-yellow-50 dark:from-rose-950/30 dark:via-orange-950/20 dark:to-yellow-950/20"
    >
      {/* Zone "révélée" */}
      <motion.div
        initial={{ clipPath: "inset(0 100% 0 0)" }}
        animate={{ clipPath: "inset(0 0 0 0)" }}
        transition={{ delay: 0.45, duration: 0.8, ease: "easeInOut" }}
        className="relative z-10"
      >
        <p className="text-muted-foreground">
          Reprises de peinture après dégâts, retouches localisées et
          harmonisation des teintes pour une finition propre.
        </p>
      </motion.div>

      {/* Bande de peinture */}
      <motion.div
        className="pointer-events-none absolute left-0 right-0 top-6 h-4 bg-gradient-to-r from-accent via-amber-300 to-yellow-300/80"
        initial={{ scaleX: 0, transformOrigin: "left center" }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.5, duration: 0.7, ease: "easeInOut" }}
      />

      {/* Pinceau qui fait le trait */}
      <motion.div
        className="pointer-events-none absolute top-4 left-0 h-7 w-7 rounded-full bg-card/90 shadow flex items-center justify-center text-lg"
        initial={{ x: "-20%", y: 0, opacity: 0 }}
        animate={{ x: "90%", opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8, ease: "easeInOut" }}
      >
        🖌️
      </motion.div>
    </ServiceTile>
  );
};
