import { motion } from "framer-motion";
import { ServiceTile } from "./ServiceTile";

export const PlumbingTile = () => {
  return (
    <ServiceTile
      title="Plomberie"
      subtitle="Fuites, robinets, WC, chauffe-eau"
      className="bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-950/30 dark:to-sky-900/20"
    >
      <p className="relative z-10">
        Intervention rapide sur les fuites, débouchages, remplacements de
        robinetterie et réparations urgentes.
      </p>

      {/* Tuyau en haut + gouttes */}
      <div className="pointer-events-none absolute inset-x-4 top-3 flex justify-end gap-1">
        <div className="h-2 w-20 rounded-full bg-sky-300/70" />
        <motion.div
          className="h-2 w-10 rounded-full bg-sky-400/80"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Gouttes */}
      <motion.div
        className="pointer-events-none absolute right-8 top-6 h-2 w-2 rounded-full bg-sky-500"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 18, opacity: [0, 1, 0] }}
        transition={{ delay: 0.3, duration: 0.7, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute right-11 top-7 h-2 w-2 rounded-full bg-sky-400"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 18, opacity: [0, 1, 0] }}
        transition={{ delay: 0.35, duration: 0.7, ease: "easeInOut" }}
      />

      {/* Clé à molette qui "répare" */}
      <motion.div
        className="pointer-events-none absolute -left-6 bottom-2 h-10 w-10 rounded-full bg-sky-200/90 dark:bg-sky-800/50 flex items-center justify-center text-xl"
        initial={{ x: -80, y: -10, rotate: -20, opacity: 0 }}
        animate={{ x: 20, y: 10, rotate: 10, opacity: 1 }}
        transition={{
          delay: 0.5,
          duration: 0.8,
          type: "spring",
          stiffness: 160,
          damping: 14,
        }}
      >
        🔧
      </motion.div>
    </ServiceTile>
  );
};
