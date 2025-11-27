import { motion } from "framer-motion";
import { ServiceTile } from "./ServiceTile";

export const PlumbingTile = () => {
  return (
    <ServiceTile
      title="Plomberie"
      subtitle="Fuites, robinets, WC, chauffe-eau"
      className="bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-950/30 dark:to-sky-900/20"
    >
      <p>
        Intervention rapide sur les fuites, débouchages, remplacements de
        robinetterie et réparations urgentes.
      </p>

      {/* Gouttes d'eau */}
      <motion.div
        className="pointer-events-none absolute right-6 top-6 h-2 w-2 rounded-full bg-sky-500"
        initial={{ y: -6, opacity: 0 }}
        animate={{ y: 10, opacity: [0, 1, 0] }}
        transition={{ duration: 0.7, ease: "easeInOut" as const, repeat: 1 }}
      />
      <motion.div
        className="pointer-events-none absolute right-9 top-7 h-2 w-2 rounded-full bg-sky-300"
        initial={{ y: -6, opacity: 0 }}
        animate={{ y: 10, opacity: [0, 1, 0] }}
        transition={{ duration: 0.6, delay: 0.15, ease: "easeInOut" as const, repeat: 1 }}
      />

      {/* Clé à molette */}
      <motion.div
        className="pointer-events-none absolute -bottom-3 left-4 flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50 text-lg shadow"
        initial={{ x: -40, y: 6, rotate: -15, opacity: 0 }}
        animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.7, ease: "easeOut" as const }}
      >
        🔧
      </motion.div>
    </ServiceTile>
  );
};
