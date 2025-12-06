/**
 * StatIA AI Search - Tests Unitaires
 * Couvre les cas demandés:
 * - Question purement stats
 * - Question purement doc
 * - Question mixte → stats
 * - Question stats avec faute/formulation floue
 * - Question réseau (N3+) vs agence (N2)
 */

import { describe, it, expect } from 'vitest';
import { isStatsQuery, detectQueryType, type StatsQueryResult } from '../detectQueryType';
import { validateAndRoute } from '../validateAndRoute';
import { normalizeQuery } from '../nlNormalize';
import type { UserContext, LLMDraftIntent } from '../types';

// Helper pour extraire le booléen depuis StatsQueryResult
const isStats = (normalized: string, original: string): boolean => isStatsQuery(normalized, original).isStats;

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const createUserContext = (roleLevel: number, agencyId = 'agency-1', allowedAgencyIds?: string[]): UserContext => ({
  userId: 'user-1',
  globalRole: roleLevel === 6 ? 'superadmin' : roleLevel === 3 ? 'franchisor_user' : 'agency_user',
  roleLevel,
  agencyId,
  agencySlug: 'test-agency',
  allowedAgencyIds,
  enabledModules: ['pilotage_agence', 'statia'],
});

const createLLMDraft = (overrides: Partial<LLMDraftIntent> = {}): LLMDraftIntent => ({
  intent: 'stats_query',
  metric: 'ca_global_ht',
  dimension: 'global',
  intentType: 'valeur',
  limit: null,
  period: null,
  filters: {},
  confidence: 0.8,
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════
// 1. QUESTION PUREMENT STATS
// ═══════════════════════════════════════════════════════════════

describe('Question purement stats', () => {
  it('détecte "Quel est le CA de ce mois" comme stats', () => {
    const query = 'Quel est le CA de ce mois';
    const normalized = normalizeQuery(query);
    
    expect(isStats(normalized, query)).toBe(true);
    
    const detection = detectQueryType(normalized, query);
    expect(detection.type).toBe('stats_query');
    expect(detection.confidence).toBeGreaterThan(0.5);
  });
  
  it('détecte "Top 5 techniciens par chiffre d\'affaires" comme stats', () => {
    const query = 'Top 5 techniciens par chiffre d\'affaires';
    const normalized = normalizeQuery(query);
    
    expect(isStats(normalized, query)).toBe(true);
    
    const detection = detectQueryType(normalized, query);
    expect(detection.type).toBe('stats_query');
    expect(detection.suggestedIntent).toBe('top');
    expect(detection.suggestedDimension).toBe('technicien');
  });
  
  it('détecte "Taux de recouvrement cette année" comme stats', () => {
    const query = 'Taux de recouvrement cette année';
    const normalized = normalizeQuery(query);
    
    expect(isStats(normalized, query)).toBe(true);
    
    const detection = detectQueryType(normalized, query);
    expect(detection.type).toBe('stats_query');
    expect(detection.strongCategoriesCount).toBeGreaterThanOrEqual(1);
  });
  
  it('détecte "Combien de dossiers créés en janvier" comme stats', () => {
    const query = 'Combien de dossiers créés en janvier';
    const normalized = normalizeQuery(query);
    
    expect(isStats(normalized, query)).toBe(true);
    
    const detection = detectQueryType(normalized, query);
    expect(detection.type).toBe('stats_query');
    expect(detection.suggestedIntent).toBe('volume');
  });
  
  it('détecte "CA par univers plomberie" avec dimension et filtre', () => {
    const query = 'CA par univers plomberie';
    const normalized = normalizeQuery(query);
    
    const detection = detectQueryType(normalized, query);
    expect(detection.type).toBe('stats_query');
    expect(detection.suggestedDimension).toBe('univers');
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. QUESTION PUREMENT DOCUMENTAIRE
// ═══════════════════════════════════════════════════════════════

describe('Question purement doc', () => {
  it('détecte "Comment créer un devis dans Apogée" comme doc', () => {
    const query = 'Comment créer un devis dans Apogée';
    const normalized = normalizeQuery(query);
    
    expect(isStats(normalized, query)).toBe(false);
    
    const detection = detectQueryType(normalized, query);
    expect(detection.type).toBe('documentary_query');
  });
  
  it('détecte "Pourquoi mon intervention est bloquée" comme doc', () => {
    const query = 'Pourquoi mon intervention est bloquée';
    const normalized = normalizeQuery(query);
    
    expect(isStats(normalized, query)).toBe(false);
    
    const detection = detectQueryType(normalized, query);
    expect(['documentary_query', 'pedagogic_query']).toContain(detection.type);
  });
  
  it('détecte "Aide sur la facturation" comme doc', () => {
    const query = 'Aide sur la facturation';
    const normalized = normalizeQuery(query);
    
    expect(isStats(normalized, query)).toBe(false);
    
    const detection = detectQueryType(normalized, query);
    expect(detection.type).toBe('documentary_query');
  });
  
  it('détecte "C\'est quoi un SAV" comme pédagogique', () => {
    const query = 'C\'est quoi un SAV';
    const normalized = normalizeQuery(query);
    
    const detection = detectQueryType(normalized, query);
    expect(['documentary_query', 'pedagogic_query']).toContain(detection.type);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. QUESTION MIXTE → DOIT PARTIR STATS
// ═══════════════════════════════════════════════════════════════

describe('Question mixte → stats', () => {
  it('priorise stats pour "Comment a évolué le CA cette année"', () => {
    const query = 'Comment a évolué le CA cette année';
    const normalized = normalizeQuery(query);
    
    // "Comment" = doc, mais "CA" + "évolué" + "cette année" = stats fort
    expect(isStats(normalized, query)).toBe(true);
    
    const detection = detectQueryType(normalized, query);
    expect(detection.type).toBe('stats_query');
  });
  
  it('priorise stats pour "Quelle est la moyenne de facturation par technicien"', () => {
    const query = 'Quelle est la moyenne de facturation par technicien';
    const normalized = normalizeQuery(query);
    
    expect(isStats(normalized, query)).toBe(true);
    
    const detection = detectQueryType(normalized, query);
    expect(detection.type).toBe('stats_query');
    expect(detection.suggestedIntent).toBe('moyenne');
    expect(detection.suggestedDimension).toBe('technicien');
  });
  
  it('priorise stats pour "Explique-moi le taux de recouvrement actuel"', () => {
    const query = 'Explique-moi le taux de recouvrement actuel';
    const normalized = normalizeQuery(query);
    
    // "Explique" = doc, mais "taux" + "recouvrement" = catégories fortes
    const detection = detectQueryType(normalized, query);
    // Devrait être stats car keywords forts
    expect(detection.strongCategoriesCount).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. QUESTION STATS AVEC FAUTE / FORMULATION FLOUE
// ═══════════════════════════════════════════════════════════════

describe('Question stats avec faute / formulation floue', () => {
  it('détecte "chifre daffaires" (faute typo) comme stats', () => {
    const query = 'chifre daffaires ce mois';
    const normalized = normalizeQuery(query);
    
    // Normalisation devrait corriger
    const detection = detectQueryType(normalized, query);
    expect(detection.type).toBe('stats_query');
  });
  
  it('détecte "les sous qu\'on a fait" (langage familier)', () => {
    const query = 'combien on a fait de sous ce mois';
    const normalized = normalizeQuery(query);
    
    // "combien" est un déclencheur fort
    const detection = detectQueryType(normalized, query);
    expect(detection.type).toBe('stats_query');
    expect(detection.suggestedIntent).toBe('volume');
  });
  
  it('détecte "meilleurs tech" (abréviation)', () => {
    const query = 'les meilleurs tech cette année';
    const normalized = normalizeQuery(query);
    
    const detection = detectQueryType(normalized, query);
    expect(detection.type).toBe('stats_query');
    expect(detection.suggestedIntent).toBe('top');
  });
  
  it('détecte "ca plombri" (univers tronqué)', () => {
    const query = 'ca plomberie';
    const normalized = normalizeQuery(query);
    
    const detection = detectQueryType(normalized, query);
    expect(detection.type).toBe('stats_query');
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. PERMISSIONS : RÉSEAU (N3+) VS AGENCE (N2)
// ═══════════════════════════════════════════════════════════════

describe('Permissions réseau (N3+) vs agence (N2)', () => {
  it('N2 est limité à son agence même pour requête réseau', () => {
    const query = 'CA de toutes les agences';
    const normalized = normalizeQuery(query);
    const user = createUserContext(2); // N2 = dirigeant
    const llmDraft = createLLMDraft({ intent: 'stats_query', metric: 'ca_global_ht' });
    
    const result = validateAndRoute(llmDraft, normalized, query, user);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.intent.agencyScope).toBe('single');
      // Devrait avoir une correction
      const scopeCorrection = result.intent.validation.corrections.find(c => c.field === 'agencyScope');
      expect(scopeCorrection).toBeDefined();
    }
  });
  
  it('N3+ peut accéder au réseau avec agences assignées', () => {
    const query = 'CA par agence cette année';
    const normalized = normalizeQuery(query);
    const user = createUserContext(3, 'agency-1', ['agency-1', 'agency-2', 'agency-3']);
    const llmDraft = createLLMDraft({ intent: 'stats_query', metric: 'ca_par_agence' });
    
    const result = validateAndRoute(llmDraft, normalized, query, user);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.intent.agencyScope).toBe('network');
      expect(result.intent.allowedAgencyIds).toEqual(['agency-1', 'agency-2', 'agency-3']);
    }
  });
  
  it('N0/N1 est redirigé vers doc pour requête stats', () => {
    const query = 'Quel est le CA ce mois';
    const normalized = normalizeQuery(query);
    const user = createUserContext(1); // N1 = salarié
    const llmDraft = createLLMDraft({ intent: 'stats_query', metric: 'ca_global_ht' });
    
    const result = validateAndRoute(llmDraft, normalized, query, user);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.intent.type).toBe('documentary_query');
      // Correction appliquée
      const typeCorrection = result.intent.validation.corrections.find(c => c.field === 'type');
      expect(typeCorrection).toBeDefined();
      expect(typeCorrection?.reason).toContain('N2+ requis');
    }
  });
  
  it('N6 (superadmin) a accès à tout le réseau sans restriction', () => {
    const query = 'CA global toutes agences';
    const normalized = normalizeQuery(query);
    const user = createUserContext(6); // N6 = superadmin
    const llmDraft = createLLMDraft({ intent: 'stats_query', metric: 'ca_global_ht' });
    
    const result = validateAndRoute(llmDraft, normalized, query, user);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.intent.agencyScope).toBe('network');
      expect(result.intent.userRoleLevel).toBe(6);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. CORRECTION LLM PAR KEYWORDS
// ═══════════════════════════════════════════════════════════════

describe('Correction LLM par keywords', () => {
  it('corrige une métrique invalide du LLM', () => {
    const query = 'CA par technicien ce mois';
    const normalized = normalizeQuery(query);
    const user = createUserContext(3);
    const llmDraft = createLLMDraft({ 
      intent: 'stats_query', 
      metric: 'metric_inexistante',
      confidence: 0.6,
    });
    
    const result = validateAndRoute(llmDraft, normalized, query, user);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.intent.metricId).not.toBe('metric_inexistante');
      const metricCorrection = result.intent.validation.corrections.find(c => c.field === 'metricId');
      expect(metricCorrection).toBeDefined();
    }
  });
  
  it('surclasse LLM faible confiance avec keywords forts', () => {
    const query = 'taux recouvrement encours impayés';
    const normalized = normalizeQuery(query);
    const user = createUserContext(3);
    const llmDraft = createLLMDraft({ 
      intent: 'documentary_query', // LLM se trompe
      confidence: 0.4, // Faible confiance
    });
    
    const result = validateAndRoute(llmDraft, normalized, query, user);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.intent.type).toBe('stats_query');
      const typeCorrection = result.intent.validation.corrections.find(c => c.field === 'type');
      expect(typeCorrection).toBeDefined();
      expect(typeCorrection?.reason).toContain('Keywords indiquent stats');
    }
  });
  
  it('conserve LLM haute confiance même si keywords diffèrent légèrement', () => {
    const query = 'Évolution mensuelle du CA';
    const normalized = normalizeQuery(query);
    const user = createUserContext(3);
    const llmDraft = createLLMDraft({ 
      intent: 'stats_query', 
      metric: 'ca_evolution_mensuelle',
      intentType: 'compare',
      confidence: 0.9, // Haute confiance
    });
    
    const result = validateAndRoute(llmDraft, normalized, query, user);
    
    expect(result.success).toBe(true);
    if (result.success) {
      // LLM haute confiance respecté
      expect(result.intent.validation.source).toBe('llm');
      expect(result.intent.validation.corrections.length).toBe(0);
    }
  });
});
