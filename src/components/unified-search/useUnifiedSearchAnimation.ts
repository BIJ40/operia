/**
 * Hook pour sélectionner l'animation active au runtime
 * Si plusieurs animations sont actives, en choisit une aléatoirement au mount
 */

import { useState, useEffect } from 'react';
import { 
  UNIFIED_SEARCH_ANIMATIONS, 
  DEFAULT_ANIMATION_PRESET,
  UnifiedSearchAnimationPreset 
} from './unifiedSearchAnimations';
import { loadUnifiedSearchAnimationSettings } from './unifiedSearchAnimationSettings';

export function useUnifiedSearchAnimation(): UnifiedSearchAnimationPreset {
  const [preset, setPreset] = useState<UnifiedSearchAnimationPreset>(DEFAULT_ANIMATION_PRESET);

  useEffect(() => {
    const settings = loadUnifiedSearchAnimationSettings();
    
    // Filtrer les presets correspondant aux IDs actifs
    const candidates = UNIFIED_SEARCH_ANIMATIONS.filter(a =>
      settings.activeAnimationIds.includes(a.id)
    );
    
    // Choisir aléatoirement parmi les candidats, ou fallback
    const chosen = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : DEFAULT_ANIMATION_PRESET;
    
    setPreset(chosen);
  }, []);

  return preset;
}

/**
 * Hook pour obtenir un preset spécifique (pour le playground)
 */
export function useAnimationPreset(id: string): UnifiedSearchAnimationPreset {
  return UNIFIED_SEARCH_ANIMATIONS.find(a => a.id === id) || DEFAULT_ANIMATION_PRESET;
}
