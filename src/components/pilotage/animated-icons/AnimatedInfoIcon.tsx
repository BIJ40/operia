import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';

interface AnimatedInfoIconProps {
  isHovered?: boolean;
  size?: number;
  className?: string;
}

export function AnimatedInfoIcon({ isHovered = false, size = 28, className = '' }: AnimatedInfoIconProps) {
  return (
    <motion.div
      className={`relative ${className}`}
      animate={
        isHovered
          ? { scale: 1.1 }
          : {
              scale: [1, 1.06, 1],
            }
      }
      transition={
        isHovered
          ? { type: 'spring', stiffness: 300, damping: 20 }
          : {
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }
      }
    >
      {/* Glow effect au hover */}
      <motion.div
        className="absolute inset-0 rounded-full bg-helpconfort-blue/30 blur-md"
        animate={{
          opacity: isHovered ? 0.6 : 0,
          scale: isHovered ? 1.3 : 1,
        }}
        transition={{ duration: 0.3 }}
      />
      
      <Building2
        className="relative z-10 text-helpconfort-blue"
        style={{ width: size, height: size }}
      />
    </motion.div>
  );
}
