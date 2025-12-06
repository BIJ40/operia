/**
 * Composants décoratifs pour les animations de la barre de recherche
 * Version amplifiée pour une meilleure visibilité
 */

import { motion } from 'framer-motion';

interface DecoratorProps {
  glowColor?: string;
  intensity?: 'low' | 'medium' | 'high';
}

const intensityConfig = {
  low: { blur: 8, scale: 1.3, opacity: [0.2, 0.4, 0.2] },
  medium: { blur: 16, scale: 1.6, opacity: [0.3, 0.6, 0.3] },
  high: { blur: 24, scale: 2, opacity: [0.4, 0.8, 0.4] },
};

/**
 * Halo lumineux autour du bouton - Version amplifiée
 */
export function GlowDecorator({ 
  glowColor = 'hsl(var(--helpconfort-blue))', 
  intensity = 'medium' 
}: DecoratorProps) {
  const config = intensityConfig[intensity];
  
  return (
    <motion.div
      className="absolute inset-0 rounded-full pointer-events-none"
      initial={{ opacity: config.opacity[0] }}
      animate={{ opacity: config.opacity }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        background: `radial-gradient(circle, ${glowColor} 0%, transparent 60%)`,
        filter: `blur(${config.blur}px)`,
        transform: `scale(${config.scale})`,
      }}
    />
  );
}

/**
 * Point lumineux qui orbite autour du bouton - Version amplifiée
 */
export function OrbitDecorator({ glowColor = 'hsl(var(--helpconfort-blue))' }: DecoratorProps) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
      }}
      animate={{ rotate: 360 }}
      transition={{
        duration: 2.5,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      {/* Point principal */}
      <motion.div
        className="absolute w-3 h-3 rounded-full"
        style={{
          background: glowColor,
          boxShadow: `0 0 12px 4px ${glowColor}`,
          top: '-8px',
          left: '50%',
          marginLeft: '-6px',
        }}
        animate={{ scale: [1, 1.4, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
      {/* Trail */}
      <motion.div
        className="absolute w-2 h-2 rounded-full"
        style={{
          background: glowColor,
          boxShadow: `0 0 8px 2px ${glowColor}`,
          top: '-4px',
          left: '30%',
          opacity: 0.5,
        }}
      />
    </motion.div>
  );
}

/**
 * Trois points animés style "IA en réflexion" - Version amplifiée
 */
export function WaveDotsDecorator({ glowColor = 'hsl(var(--helpconfort-orange))' }: DecoratorProps) {
  return (
    <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2.5 h-2.5 rounded-full"
          style={{ 
            background: glowColor,
            boxShadow: `0 0 8px 2px ${glowColor}`,
          }}
          animate={{
            y: [0, -8, 0],
            scale: [1, 1.3, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.12,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/**
 * Anneau néon pulsant - Version subtile
 */
export function NeonRingDecorator({ glowColor = 'hsl(var(--primary))' }: DecoratorProps) {
  return (
    <>
      {/* Ring unique, subtil */}
      <motion.div
        className="absolute inset-[-2px] rounded-full pointer-events-none"
        style={{
          border: `1px solid ${glowColor}`,
          boxShadow: `0 0 6px ${glowColor}`,
        }}
        animate={{
          scale: [1, 1.4, 1.4],
          opacity: [0.5, 0, 0],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeOut',
        }}
      />
      {/* Static inner glow */}
      <motion.div
        className="absolute inset-[-1px] rounded-full pointer-events-none"
        style={{
          border: `1px solid ${glowColor}`,
          opacity: 0.3,
        }}
        animate={{
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </>
  );
}

/**
 * Anneaux de pulse concentriques
 */
export function PulseRingsDecorator({ glowColor = 'hsl(var(--helpconfort-blue))' }: DecoratorProps) {
  return (
    <>
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          border: `2px solid ${glowColor}`,
        }}
        animate={{
          scale: [1, 1.6],
          opacity: [0.6, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeOut',
        }}
      />
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          border: `2px solid ${glowColor}`,
        }}
        animate={{
          scale: [1, 1.6],
          opacity: [0.6, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeOut',
          delay: 0.5,
        }}
      />
    </>
  );
}
