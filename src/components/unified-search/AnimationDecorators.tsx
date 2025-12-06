/**
 * Composants décoratifs pour les animations de la barre de recherche
 */

import { motion } from 'framer-motion';

interface DecoratorProps {
  glowColor?: string;
}

/**
 * Halo lumineux autour du bouton
 */
export function GlowDecorator({ glowColor = 'hsl(var(--helpconfort-blue))' }: DecoratorProps) {
  return (
    <motion.div
      className="absolute inset-0 rounded-full pointer-events-none"
      initial={{ opacity: 0.3 }}
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
        filter: 'blur(12px)',
        transform: 'scale(1.5)',
      }}
    />
  );
}

/**
 * Point lumineux qui orbite autour du bouton
 */
export function OrbitDecorator({ glowColor = 'hsl(var(--helpconfort-blue))' }: DecoratorProps) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full pointer-events-none"
      style={{
        background: glowColor,
        boxShadow: `0 0 8px ${glowColor}`,
        top: '50%',
        left: '50%',
      }}
      animate={{
        rotate: 360,
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'linear',
      }}
      // Position sur l'orbite
      initial={{ x: 28, y: -28 }}
    >
      <motion.div
        className="w-2 h-2 rounded-full"
        style={{ background: glowColor }}
        animate={{ scale: [1, 1.5, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    </motion.div>
  );
}

/**
 * Trois points animés style "IA en réflexion"
 */
export function WaveDotsDecorator({ glowColor = 'hsl(var(--helpconfort-orange))' }: DecoratorProps) {
  return (
    <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-none">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: glowColor }}
          animate={{
            y: [0, -4, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/**
 * Anneau néon pulsant
 */
export function NeonRingDecorator({ glowColor = 'hsl(var(--primary))' }: DecoratorProps) {
  return (
    <>
      {/* Ring 1 */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          border: `2px solid ${glowColor}`,
          opacity: 0.6,
        }}
        animate={{
          scale: [1, 1.4, 1.4],
          opacity: [0.6, 0, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeOut',
        }}
      />
      {/* Ring 2 (décalé) */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          border: `2px solid ${glowColor}`,
          opacity: 0.6,
        }}
        animate={{
          scale: [1, 1.4, 1.4],
          opacity: [0.6, 0, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeOut',
          delay: 1,
        }}
      />
    </>
  );
}
