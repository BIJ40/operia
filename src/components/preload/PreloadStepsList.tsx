/**
 * PreloadStepsList - Liste des étapes de préchargement avec statuts visuels
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Loader2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PreloadStep, StepStatus } from '@/contexts/DataPreloadContext';

interface PreloadStepsListProps {
  steps: PreloadStep[];
  className?: string;
}

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case 'done':
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-warm-green"
        >
          <Check className="h-4 w-4" />
        </motion.div>
      );
    case 'error':
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-warm-orange"
        >
          <X className="h-4 w-4" />
        </motion.div>
      );
    case 'active':
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="text-warm-blue"
        >
          <Loader2 className="h-4 w-4" />
        </motion.div>
      );
    default:
      return <Circle className="h-4 w-4 text-muted-foreground/50" />;
  }
}

function getStatusLabel(status: StepStatus): string {
  switch (status) {
    case 'done':
      return 'terminé';
    case 'error':
      return 'erreur';
    case 'active':
      return 'en cours';
    default:
      return 'en attente';
  }
}

export function PreloadStepsList({ steps, className }: PreloadStepsListProps) {
  const activeCount = steps.filter(s => s.status === 'active').length;
  
  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Header avec compteur */}
      {activeCount > 1 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-muted-foreground mb-2 px-1"
        >
          {activeCount} synchronisations en cours...
        </motion.div>
      )}
      
      {/* Liste des steps */}
      <AnimatePresence mode="sync">
        {steps.map((step, index) => (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              'flex items-center justify-between px-3 py-2 rounded-lg transition-colors',
              step.status === 'active' && 'bg-warm-blue/5',
              step.status === 'done' && 'bg-warm-green/5',
              step.status === 'error' && 'bg-warm-orange/5',
              step.status === 'pending' && 'opacity-60'
            )}
          >
            <div className="flex items-center gap-2.5">
              <StepIcon status={step.status} />
              <span className={cn(
                'text-sm font-medium',
                step.status === 'done' && 'text-warm-green',
                step.status === 'error' && 'text-warm-orange',
                step.status === 'active' && 'text-warm-blue',
                step.status === 'pending' && 'text-muted-foreground'
              )}>
                {step.label}
              </span>
            </div>
            
            <span className={cn(
              'text-xs',
              step.status === 'done' && 'text-warm-green/70',
              step.status === 'error' && 'text-warm-orange/70',
              step.status === 'active' && 'text-warm-blue/70',
              step.status === 'pending' && 'text-muted-foreground/50'
            )}>
              {step.error ? 'erreur' : getStatusLabel(step.status)}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
