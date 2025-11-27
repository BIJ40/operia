import { motion } from "framer-motion";
import { baseTileVariants } from "./ServiceTile";

export const PaintingTile = () => {
  return (
    <motion.div
      variants={baseTileVariants}
      className="relative overflow-hidden rounded-2xl border border-accent/60 bg-card/90 shadow-lg p-4 md:p-5 bg-gradient-to-br from-rose-50 via-orange-50 to-yellow-50 dark:from-rose-950/30 dark:via-orange-950/20 dark:to-yellow-950/20"
    >
      {/* Bande de peinture */}
      <motion.div
        className="pointer-events-none absolute top-2 left-0 right-0 h-4 bg-gradient-to-r from-accent via-amber-300 to-yellow-300/90"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        style={{ transformOrigin: "left center" }}
        transition={{ delay: 0.45, duration: 0.7, ease: "easeInOut" as const }}
      />

      {/* Pinceau */}
      <motion.div
        className="pointer-events-none absolute top-1 left-0 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 shadow text-lg z-10"
        initial={{ x: "-10%", opacity: 0 }}
        animate={{ x: "calc(100% + 200px)", opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8, ease: "easeInOut" as const }}
      >
        🖌️
      </motion.div>

      {/* Contenu révélé */}
      <motion.div
        initial={{ clipPath: "inset(0 0 100% 0)" }}
        animate={{ clipPath: "inset(0 0 0 0)" }}
        transition={{ delay: 0.4, duration: 0.8, ease: "easeInOut" as const }}
      >
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-foreground">
              Peinture & Finitions
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Reprises après sinistre, retouches, finitions
            </p>
          </div>
        </div>

        <div className="mt-3 md:mt-4 text-xs md:text-sm text-muted-foreground">
          <p>
            Reprises de peinture après dégâts, retouches localisées et
            harmonisation des teintes pour une finition propre.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};
