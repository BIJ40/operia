import { motion } from 'framer-motion';

interface AnimatedListIconProps {
  isHovered?: boolean;
  size?: number;
  className?: string;
}

export function AnimatedListIcon({ isHovered = false, size = 20, className = '' }: AnimatedListIconProps) {
  const lineY = [6, 12, 18];
  const cycleDuration = isHovered ? 1.5 : 4;
  
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
      animate={isHovered ? { scale: 1.12 } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {lineY.map((y, i) => (
        <g key={i}>
          {/* Checkbox */}
          <motion.rect
            x={3}
            y={y - 2}
            width={4}
            height={4}
            rx={0.5}
            strokeWidth={1.5}
            animate={{
              stroke: ['currentColor', 'currentColor'],
            }}
          />
          
          {/* Checkmark animé */}
          <motion.path
            d={`M4 ${y} L5 ${y + 1} L7 ${y - 1}`}
            strokeWidth={1.5}
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: [0, 1, 1, 0],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: cycleDuration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * (cycleDuration / 3),
              times: [0, 0.3, 0.7, 1],
            }}
          />
          
          {/* Ligne de texte */}
          <motion.line
            x1={11}
            y1={y}
            x2={21}
            y2={y}
            strokeWidth={2}
            initial={{ pathLength: 0 }}
            animate={{
              pathLength: [0, 1, 1, 0.5],
              opacity: [0.3, 1, 1, 0.5],
            }}
            transition={{
              duration: cycleDuration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * (cycleDuration / 3),
              times: [0, 0.2, 0.8, 1],
            }}
          />
        </g>
      ))}
    </motion.svg>
  );
}
