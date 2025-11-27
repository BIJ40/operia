import { motion } from "framer-motion";
import { PlumbingTile } from "./tiles/PlumbingTile";
import { ElectricityTile } from "./tiles/ElectricityTile";
import { CarpentryTile } from "./tiles/CarpentryTile";
import { PaintingTile } from "./tiles/PaintingTile";

const tilesContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.3 },
  },
};

export const HomeTilesSection = () => {
  return (
    <motion.div
      variants={tilesContainerVariants}
      initial="hidden"
      animate="visible"
      className="grid gap-6 md:grid-cols-2 xl:grid-cols-4"
    >
      <PlumbingTile />
      <ElectricityTile />
      <CarpentryTile />
      <PaintingTile />
    </motion.div>
  );
};
