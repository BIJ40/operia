/**
 * PreloadTipsCarousel - Carrousel d'astuces contextuelles
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/contexts/PermissionsContext';

// Astuces par module (clés hiérarchiques alignées MODULE_DEFINITIONS)
const TIPS_BY_MODULE: Record<string, string[]> = {
  'pilotage.statistiques': [
    '💡 Consultez le CA par technicien depuis l\'onglet Stats',
    '📊 Filtrez les données par période pour affiner l\'analyse',
    '📈 Comparez les performances mois par mois',
  ],
  'pilotage.agence': [
    '🎯 Les indicateurs clés sont visibles sur le tableau de bord',
    '📈 Suivez l\'évolution du CA mensuel en temps réel',
    '🔍 Cliquez sur un graphique pour voir les détails',
  ],
  'organisation.salaries': [
    '👥 Gérez vos collaborateurs depuis l\'espace RH',
    '📅 Planifiez les congés et absences facilement',
  ],
  'support.guides': [
    '🎓 Accédez aux formations depuis les Guides',
    '📚 Consultez les guides et ressources disponibles',
  ],
};

// Astuces générales (fallback)
const GENERAL_TIPS = [
  '💡 Naviguez entre les onglets pour explorer toutes les fonctionnalités',
  '🚀 Vos données sont synchronisées pour une navigation fluide',
  '✨ L\'application s\'adapte à vos droits d\'accès',
  '🔒 Vos données sont sécurisées et chiffrées',
];

interface PreloadTipsCarouselProps {
  className?: string;
  intervalMs?: number;
}

export function PreloadTipsCarousel({ 
  className, 
  intervalMs = 8000 
}: PreloadTipsCarouselProps) {
  const { hasModule, hasModuleOption } = usePermissions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tips, setTips] = useState<string[]>(GENERAL_TIPS);
  
  // Construire la liste des tips contextuelles
  useEffect(() => {
    const contextualTips: string[] = [];
    
    // Ajouter les tips des modules actifs (clés hiérarchiques)
    if (hasModule('pilotage.statistiques') || hasModuleOption('pilotage.agence', 'indicateurs')) {
      contextualTips.push(...(TIPS_BY_MODULE['pilotage.statistiques'] || []));
    }
    
    if (hasModuleOption('organisation.salaries', 'rh_viewer')) {
      contextualTips.push(...(TIPS_BY_MODULE['organisation.salaries'] || []));
    }
    
    if (hasModuleOption('support.guides', 'apogee')) {
      contextualTips.push(...(TIPS_BY_MODULE['support.guides'] || []));
    }
    
    // Fallback sur les tips générales si aucune contextuelle
    if (contextualTips.length === 0) {
      setTips(GENERAL_TIPS);
    } else {
      // Mélanger et limiter
      const shuffled = [...contextualTips].sort(() => Math.random() - 0.5);
      setTips(shuffled.slice(0, 6));
    }
  }, [hasModuleOption]);
  
  // Rotation automatique
  useEffect(() => {
    if (tips.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % tips.length);
    }, intervalMs);
    
    return () => clearInterval(interval);
  }, [tips.length, intervalMs]);
  
  if (tips.length === 0) return null;
  
  return (
    <div className={cn(
      'relative overflow-hidden rounded-xl bg-warm-blue/5 border border-warm-blue/20 px-4 py-3',
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Lightbulb className="h-4 w-4 text-warm-blue" />
        </div>
        
        <div className="flex-1 min-h-[2.5rem] relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-foreground/80"
            >
              {tips[currentIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
      
      {/* Indicateurs de pagination */}
      {tips.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {tips.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-all',
                index === currentIndex 
                  ? 'bg-warm-blue w-3' 
                  : 'bg-warm-blue/30 hover:bg-warm-blue/50'
              )}
              aria-label={`Tip ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
