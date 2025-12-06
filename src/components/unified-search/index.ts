/**
 * Index des composants de recherche unifiée
 */

export { UnifiedSearchProvider, useUnifiedSearch } from './UnifiedSearchContext';
export { UnifiedSearchFloatingBar } from './UnifiedSearchFloatingBar';
export { UnifiedSearchResultOverlay } from './UnifiedSearchResultOverlay';
export * from './types';
export { parseStatQuery, detectStatsIntent, STAT_NL_MAPPING } from './statNlMapping';
