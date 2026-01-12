import { motion } from 'framer-motion';

interface AnimatedMapPinIconProps {
  isHovered?: boolean;
  size?: number;
  className?: string;
}

export function AnimatedMapPinIcon({ isHovered = false, size = 20, className = '' }: AnimatedMapPinIconProps) {
  return (
    <motion.div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
      animate={isHovered ? { scale: 1.15 } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Cercles radar pulsants */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2 border-current opacity-0"
          style={{
            top: '50%',
            left: '50%',
            width: size * 0.4,
            height: size * 0.4,
            transform: 'translate(-50%, -50%)',
          }}
          animate={{
            scale: [1, 2.5, 3],
            opacity: [0.6, 0.3, 0],
          }}
          transition={{
            duration: isHovered ? 1.2 : 2.5,
            repeat: Infinity,
            ease: 'easeOut',
            delay: i * (isHovered ? 0.4 : 0.8),
          }}
        />
      ))}
      
      {/* Pin SVG avec bounce */}
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
        animate={{
          y: isHovered ? [0, -3, 0] : [0, -1.5, 0],
        }}
        transition={{
          duration: isHovered ? 0.4 : 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
        <circle cx="12" cy="10" r="3" />
      </motion.svg>
    </motion.div>
  );
}
