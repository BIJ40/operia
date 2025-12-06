/**
 * Bouton flottant IA + Overlay de recherche
 * Animation breathing/pulse + ouverture overlay
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { AiSearchOverlay, AiSearchResult } from './AiSearchOverlay';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AiSearchLauncherProps {
  userRole: number; // global role N0..N6
  agencySlug?: string;
}

// Animations variées pour le bouton flottant
const ANIM_VARIANTS = [
  {
    name: 'breathing',
    animate: {
      scale: [1, 1.05, 1],
      boxShadow: [
        '0 0 0 0 rgba(56,189,248,0.4)',
        '0 0 0 10px rgba(56,189,248,0)',
        '0 0 0 0 rgba(56,189,248,0.4)',
      ],
    },
    transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' as const },
  },
  {
    name: 'pulse',
    animate: {
      y: [0, -3, 0],
      boxShadow: [
        '0 4px 20px rgba(56,189,248,0.3)',
        '0 8px 30px rgba(56,189,248,0.5)',
        '0 4px 20px rgba(56,189,248,0.3)',
      ],
    },
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' as const },
  },
  {
    name: 'glow',
    animate: {
      boxShadow: [
        '0 0 15px rgba(56,189,248,0.4)',
        '0 0 25px rgba(56,189,248,0.6)',
        '0 0 15px rgba(56,189,248,0.4)',
      ],
    },
    transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' as const },
  },
];

export const AiSearchLauncher: React.FC<AiSearchLauncherProps> = ({ 
  userRole, 
  agencySlug 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AiSearchResult | null>(null);

  // Sélection aléatoire d'animation au mount
  const [animIndex] = useState(() => Math.floor(Math.random() * ANIM_VARIANTS.length));
  const selectedAnim = ANIM_VARIANTS[animIndex];

  // Raccourci clavier Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setResult(null);
        setQuestion('');
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    if (!question.trim()) return;
    
    setIsSubmitting(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('unified-search', {
        body: { 
          query: question,
          agencySlug,
        },
      });

      if (error) {
        console.error('AI Search error:', error);
        setResult({
          type: 'unknown',
          error: error.message || 'Erreur lors de la recherche IA',
        });
        toast.error('Erreur lors de la recherche');
        return;
      }

      setResult(data as AiSearchResult);
    } catch (err) {
      console.error('AI Search exception:', err);
      setResult({
        type: 'unknown',
        error: 'Erreur inattendue lors de la recherche',
      });
      toast.error('Erreur inattendue');
    } finally {
      setIsSubmitting(false);
    }
  }, [question, agencySlug]);

  const handleOpen = () => {
    setIsOpen(true);
    setResult(null);
    setQuestion('');
  };

  return (
    <>
      {/* Bouton flottant IA */}
      <motion.button
        onClick={handleOpen}
        className={cn(
          'fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full px-5 py-3',
          'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg',
          'hover:from-sky-400 hover:to-blue-500 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900'
        )}
        animate={selectedAnim.animate}
        transition={selectedAnim.transition}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Ouvrir la recherche IA"
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">Recherche IA</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">
          <span>⌘</span>
          <span>K</span>
        </kbd>
      </motion.button>

      {/* Overlay + barre flottante */}
      <AiSearchOverlay
        open={isOpen}
        onOpenChange={setIsOpen}
        question={question}
        onQuestionChange={setQuestion}
        onSubmit={handleSubmit}
        loading={isSubmitting}
        result={result}
        userRole={userRole}
      />
    </>
  );
};
