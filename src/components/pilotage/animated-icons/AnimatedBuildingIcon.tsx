import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface AnimatedBuildingIconProps {
  isHovered?: boolean;
  size?: number;
  className?: string;
}

export function AnimatedBuildingIcon({ isHovered = false, size = 20, className = '' }: AnimatedBuildingIconProps) {
  // Grille de fenêtres 3x4
  const windows = useMemo(() => {
    const result = [];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        result.push({
          x: 6 + col * 4,
          y: 4 + row * 4,
          delay: Math.random() * 2,
        });
      }
    }
    return result;
  }, []);

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      animate={isHovered ? { scale: 1.12, rotateY: 5 } : { scale: 1, rotateY: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Structure du bâtiment */}
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      
      {/* Fenêtres animées */}
      {windows.map((win, i) => (
        <motion.rect
          key={i}
          x={win.x}
          y={win.y}
          width={2.5}
          height={2.5}
          rx={0.3}
          fill="currentColor"
          stroke="none"
          animate={
            isHovered
              ? { opacity: 1 }
              : {
                  opacity: [0.15, 0.7, 0.15],
                }
          }
          transition={
            isHovered
              ? { duration: 0.2 }
              : {
                  duration: 2 + Math.random(),
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: win.delay,
                }
          }
        />
      ))}
      
      {/* Petites fenêtres extensions */}
      <motion.rect
        x={3}
        y={15}
        width={1.5}
        height={1.5}
        rx={0.2}
        fill="currentColor"
        stroke="none"
        animate={isHovered ? { opacity: 1 } : { opacity: [0.2, 0.6, 0.2] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />
      <motion.rect
        x={19.5}
        y={12}
        width={1.5}
        height={1.5}
        rx={0.2}
        fill="currentColor"
        stroke="none"
        animate={isHovered ? { opacity: 1 } : { opacity: [0.2, 0.8, 0.2] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
    </motion.svg>
  );
}
