/**
 * Index des composants de recherche unifiée
 */

export { UnifiedSearchProvider, useUnifiedSearch } from './UnifiedSearchContext';
export { UnifiedSearchFloatingBar } from './UnifiedSearchFloatingBar';
export { UnifiedSearchResultOverlay } from './UnifiedSearchResultOverlay';
export * from './types';
export { parseStatQuery, detectStatsIntent, STAT_NL_MAPPING } from './statNlMapping';

// Animations
export { UNIFIED_SEARCH_ANIMATIONS, DEFAULT_ANIMATION_PRESET } from './unifiedSearchAnimations';
export type { UnifiedSearchAnimationId, UnifiedSearchAnimationPreset } from './unifiedSearchAnimations';
export { loadUnifiedSearchAnimationSettings, saveUnifiedSearchAnimationSettings } from './unifiedSearchAnimationSettings';
export { useUnifiedSearchAnimation } from './useUnifiedSearchAnimation';
export { AnimationPreviewButton } from './AnimationPreviewButton';
export { GlowDecorator, OrbitDecorator, WaveDotsDecorator, NeonRingDecorator } from './AnimationDecorators';
