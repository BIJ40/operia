import { motion } from 'framer-motion';

interface AnimatedStatsIconProps {
  isHovered?: boolean;
  size?: number;
  className?: string;
}

export function AnimatedStatsIcon({ isHovered = false, size = 20, className = '' }: AnimatedStatsIconProps) {
  const barHeights = [14, 20, 10]; // Hauteurs max des 3 barres
  const barWidth = 4;
  const gap = 3;
  const viewBox = 24;
  
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBox} ${viewBox}`}
      fill="none"
      className={className}
      animate={isHovered ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Barre 1 - gauche */}
      <motion.rect
        x={4}
        y={viewBox - 4}
        width={barWidth}
        rx={1.5}
        fill="currentColor"
        animate={{
          height: [barHeights[0] * 0.3, barHeights[0], barHeights[0] * 0.5, barHeights[0] * 0.8, barHeights[0] * 0.3],
          y: [viewBox - 4 - barHeights[0] * 0.3, viewBox - 4 - barHeights[0], viewBox - 4 - barHeights[0] * 0.5, viewBox - 4 - barHeights[0] * 0.8, viewBox - 4 - barHeights[0] * 0.3],
        }}
        transition={{
          duration: isHovered ? 0.8 : 2,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0,
        }}
      />
      
      {/* Barre 2 - centre */}
      <motion.rect
        x={4 + barWidth + gap}
        y={viewBox - 4}
        width={barWidth}
        rx={1.5}
        fill="currentColor"
        animate={{
          height: [barHeights[1] * 0.5, barHeights[1] * 0.3, barHeights[1], barHeights[1] * 0.6, barHeights[1] * 0.5],
          y: [viewBox - 4 - barHeights[1] * 0.5, viewBox - 4 - barHeights[1] * 0.3, viewBox - 4 - barHeights[1], viewBox - 4 - barHeights[1] * 0.6, viewBox - 4 - barHeights[1] * 0.5],
        }}
        transition={{
          duration: isHovered ? 0.8 : 2,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.3,
        }}
      />
      
      {/* Barre 3 - droite */}
      <motion.rect
        x={4 + (barWidth + gap) * 2}
        y={viewBox - 4}
        width={barWidth}
        rx={1.5}
        fill="currentColor"
        animate={{
          height: [barHeights[2] * 0.7, barHeights[2], barHeights[2] * 0.4, barHeights[2] * 0.9, barHeights[2] * 0.7],
          y: [viewBox - 4 - barHeights[2] * 0.7, viewBox - 4 - barHeights[2], viewBox - 4 - barHeights[2] * 0.4, viewBox - 4 - barHeights[2] * 0.9, viewBox - 4 - barHeights[2] * 0.7],
        }}
        transition={{
          duration: isHovered ? 0.8 : 2,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.6,
        }}
      />
    </motion.svg>
  );
}
