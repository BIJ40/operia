/**
 * Service de stockage des préférences d'animation
 * V1: localStorage, peut évoluer vers Supabase
 */

import { UnifiedSearchAnimationId } from './unifiedSearchAnimations';

const STORAGE_KEY = 'unified_search_animation_settings';

export type UnifiedSearchAnimationSettings = {
  activeAnimationIds: UnifiedSearchAnimationId[];
};

const DEFAULT_SETTINGS: UnifiedSearchAnimationSettings = {
  activeAnimationIds: ['breathing']
};

/**
 * Charge les settings depuis localStorage
 */
export function loadUnifiedSearchAnimationSettings(): UnifiedSearchAnimationSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    
    const parsed = JSON.parse(stored) as UnifiedSearchAnimationSettings;
    
    // Validation basique
    if (!Array.isArray(parsed.activeAnimationIds) || parsed.activeAnimationIds.length === 0) {
      return DEFAULT_SETTINGS;
    }
    
    return parsed;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Sauvegarde les settings dans localStorage
 */
export function saveUnifiedSearchAnimationSettings(settings: UnifiedSearchAnimationSettings): void {
  try {
    // S'assurer qu'il y a au moins une animation active
    const safeSettings: UnifiedSearchAnimationSettings = {
      activeAnimationIds: settings.activeAnimationIds.length > 0 
        ? settings.activeAnimationIds 
        : DEFAULT_SETTINGS.activeAnimationIds
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeSettings));
  } catch (error) {
    console.error('[AnimationSettings] Failed to save:', error);
  }
}

/**
 * Réinitialise les settings aux valeurs par défaut
 */
export function resetUnifiedSearchAnimationSettings(): void {
  saveUnifiedSearchAnimationSettings(DEFAULT_SETTINGS);
}

export { DEFAULT_SETTINGS };
