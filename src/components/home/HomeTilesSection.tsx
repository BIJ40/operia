import { motion } from "framer-motion";
import { PlumbingTile } from "./tiles/PlumbingTile";
import { ElectricityTile } from "./tiles/ElectricityTile";
import { CarpentryTile } from "./tiles/CarpentryTile";
import { PaintingTile } from "./tiles/PaintingTile";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.4,
    },
  },
};

export const HomeTilesSection = () => {
  return (
    <motion.div
      className="grid gap-6 md:grid-cols-2 xl:grid-cols-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <PlumbingTile />
      <ElectricityTile />
      <CarpentryTile />
      <PaintingTile />
    </motion.div>
  );
};
