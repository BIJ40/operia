import { motion } from 'framer-motion';

interface AnimatedTvIconProps {
  isHovered?: boolean;
  size?: number;
  className?: string;
}

export function AnimatedTvIcon({ isHovered = false, size = 20, className = '' }: AnimatedTvIconProps) {
  return (
    <motion.div
      className={`relative ${className}`}
      style={{ width: size * 1.4, height: size }}
      animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* TV principale */}
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative z-10"
      >
        {/* Cadre TV */}
        <rect width="20" height="15" x="2" y="7" rx="2" ry="2" />
        <polyline points="17 2 12 7 7 2" />
        
        {/* Écran animé (luminosité) */}
        <motion.rect
          x="4"
          y="9"
          width="16"
          height="11"
          rx="1"
          fill="currentColor"
          animate={{
            opacity: isHovered ? [0.3, 0.5, 0.3] : [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: isHovered ? 0.5 : 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.svg>
      
      {/* Ondes de diffusion */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            right: -size * 0.15,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        >
          <motion.svg
            width={size * 0.4}
            height={size * 0.6}
            viewBox="0 0 12 18"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
          >
            <motion.path
              d={`M2 ${9 - (i + 1) * 2} Q8 9 2 ${9 + (i + 1) * 2}`}
              animate={{
                opacity: [0, 0.7, 0],
                pathLength: [0, 1, 1],
              }}
              transition={{
                duration: isHovered ? 0.8 : 1.8,
                repeat: Infinity,
                ease: 'easeOut',
                delay: i * (isHovered ? 0.2 : 0.5),
              }}
            />
          </motion.svg>
        </motion.div>
      ))}
    </motion.div>
  );
}
