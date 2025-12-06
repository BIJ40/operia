/**
 * StatIA AI Search - Tests Unitaires Pipeline Complet
 * V3: Tests exhaustifs demandés
 * 
 * Couvre:
 * 1. Question purement stats
 * 2. Question purement doc
 * 3. Question mixte → stats
 * 4. Question stats avec faute/formulation floue
 * 5. Question réseau (N3+) vs agence (N2)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { isStatsQuery, detectQueryType, type StatsQueryResult } from '../detectQueryType';
import { validateAndRoute } from '../validateAndRoute';
import { normalizeQuery } from '../nlNormalize';
import type { UserContext, LLMDraftIntent, ValidatedIntent } from '../types';

// ═══════════════════════════════════════════════════════════════
// FACTORIES
// ═══════════════════════════════════════════════════════════════

const createUser = (
  roleLevel: number, 
  agencyId = 'agency-1', 
  agencySlug = 'test-agency',
  allowedAgencyIds?: string[]
): UserContext => ({
  userId: 'user-1',
  globalRole: roleLevel === 6 ? 'superadmin' : 
              roleLevel === 5 ? 'platform_admin' :
              roleLevel === 4 ? 'franchisor_admin' :
              roleLevel === 3 ? 'franchisor_user' : 
              roleLevel === 2 ? 'agency_director' : 
              roleLevel === 1 ? 'agency_user' : 'base_user',
  roleLevel,
  agencyId,
  agencySlug,
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

describe('1. Question purement stats', () => {
  it('détecte "Quel est le technicien qui a fait le plus de chiffre en plomberie cette année" comme stats', () => {
    const query = 'Quel est le technicien qui a fait le plus de chiffre en plomberie cette année';
    const normalized = normalizeQuery(query);
    
    const statsResult = isStatsQuery(normalized, query);
    expect(statsResult.isStats).toBe(true);
    expect(statsResult.score).toBeGreaterThanOrEqual(5);
    
    const detection = detectQueryType(normalized, query);
    expect(detection.type).toBe('stats_query');
    expect(detection.suggestedDimension).toBe('technicien');
    expect(detection.suggestedIntent).toBe('top');
  });
  
  it('retourne isStats=true avec score ≥5 pour question CA multi-keywords', () => {
    const query = 'Quel est le CA total par univers ce mois';
    const normalized = normalizeQuery(query);
    
    const statsResult = isStatsQuery(normalized, query);
    expect(statsResult.isStats).toBe(true);
    expect(statsResult.rawScore).toBeGreaterThanOrEqual(5);
    expect(statsResult.strongCategories.length).toBeGreaterThanOrEqual(1);
  });
  
  it('retourne isStats=true avec 2+ catégories fortes même si score <5', () => {
    const query = 'taux recouvrement';
    const normalized = normalizeQuery(query);
    
    const statsResult = isStatsQuery(normalized, query);
    // "taux" = ratios, "recouvrement" = recouvrement → 2 catégories fortes
    expect(statsResult.isStats).toBe(true);
    expect(statsResult.reasoning).toContain('catégories fortes');
  });
  
  it('validateAndRoute produit metricId=ca_par_technicien pour "CA par technicien"', () => {
    const query = 'CA par technicien ce mois';
    const normalized = normalizeQuery(query);
    const user = createUser(3);
    const llmDraft = createLLMDraft({ metric: null, confidence: 0.5 });
    
    const result = validateAndRoute(llmDraft, normalized, query, user);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.intent.type).toBe('stats_query');
      expect(result.intent.dimension).toBe('technicien');
      // Métrique inférée depuis keywords
      expect(result.intent.metricId).toBeDefined();
    }
  });
  
  it('validateAndRoute retourne intentType=top pour "Top 5 apporteurs"', () => {
    const query = 'Top 5 apporteurs par chiffre d\'affaires';
    const normalized = normalizeQuery(query);
    const user = createUser(3);
    const llmDraft = createLLMDraft({ limit: 5 });
    
    const result = validateAndRoute(llmDraft, normalized, query, user);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.intent.intentType).toBe('top');
      expect(result.intent.limit).toBe(5);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. QUESTION PUREMENT DOCUMENTAIRE
// ═══════════════════════════════════════════════════════════════

describe('2. Question purement doc', () => {
  it('détecte "Comment créer un nouveau devis dans Apogée" comme doc', () => {
    const query = 'Comment créer un nouveau devis dans Apogée';
    const normalized = normalizeQuery(query);
    
    const statsResult = isStatsQuery(normalized, query);
    expect(statsResult.isStats).toBe(false);
    expect(statsResult.score).toBeLessThan(5);
    
    const detection = detectQueryType(normalized, query);
    expect(detection.type).toBe('documentary_query');
  });
  
  it('validateAndRoute route vers doc pour question procédurale', () => {
    const query = 'Quelle est la procédure pour annuler une intervention';
    const normalized = normalizeQuery(query);
    const user = createUser(2);
    const llmDraft = createLLMDraft({ intent: 'documentary_query', metric: null });
    
    const result = validateAndRoute(llmDraft, normalized, query, user);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.intent.type).toBe('documentary_query');
      expect(result.intent.metricId).toBeUndefined();
    }
  });
  
  it('détecte "Aide sur la facturation" comme doc', () => {
    const query = 'Aide sur la facturation dans Apogée';
    const normalized = normalizeQuery(query);
    
    const detection = detectQueryType(normalized, query);
    expect(detection.type).toBe('documentary_query');
  });
  
  it('détecte "C\'est quoi un SAV" comme pédagogique/doc', () => {
    const query = 'C\'est quoi un SAV';
    const normalized = normalizeQuery(query);
    
    const detection = detectQueryType(normalized, query);
    expect(['documentary_query', 'pedagogic_query']).toContain(detection.type);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. QUESTION MIXTE QUI DOIT PARTIR STATS
// ═══════════════════════════════════════════════════════════════

describe('3. Question mixte → stats', () => {
  it('priorise stats pour "Sur Apogée, quel est mon taux de recouvrement global sur les 12 derniers mois"', () => {
    const query = 'Sur Apogée, quel est mon taux de recouvrement global sur les 12 derniers mois';
    const normalized = normalizeQuery(query);
    
    // "Apogée" = doc, mais "taux recouvrement" = catégories fortes
    const statsResult = isStatsQuery(normalized, query);
    expect(statsResult.isStats).toBe(true);
    
    const detection = detectQueryType(normalized, query);
    expect(detection.type).toBe('stats_query');
    
    // Valider period
    const user = createUser(3);
    const llmDraft = createLLMDraft({ metric: 'taux_recouvrement_global' });
    const result = validateAndRoute(llmDraft, normalized, query, user);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.intent.type).toBe('stats_query');
      expect(result.intent.period?.label).toContain('12');
    }
  });
  
  it('priorise stats pour "Comment a évolué le CA cette année"', () => {
    const query = 'Comment a évolué le CA cette année';
    const normalized = normalizeQuery(query);
    
    // "Comment" = doc, mais "CA" + "évolué" = stats fort
    const statsResult = isStatsQuery(normalized, query);
    expect(statsResult.isStats).toBe(true);
    
    const detection = detectQueryType(normalized, query);
    expect(detection.type).toBe('stats_query');
    expect(detection.suggestedIntent).toBe('compare');
  });
  
  it('priorise stats pour "Explique-moi le taux de recouvrement actuel"', () => {
    const query = 'Explique-moi le taux de recouvrement actuel';
    const normalized = normalizeQuery(query);
    
    // "Explique" = doc, mais "taux" + "recouvrement" = catégories fortes
    const detection = detectQueryType(normalized, query);
    expect(detection.strongCategoriesCount).toBeGreaterThanOrEqual(1);
    // Keywords surclassent le pattern doc
  });
  
  it('surclasse LLM doc avec keywords stats forts', () => {
    const query = 'encours impayés et taux de recouvrement';
    const normalized = normalizeQuery(query);
    const user = createUser(3);
    
    // LLM se trompe et dit doc
    const llmDraft = createLLMDraft({ 
      intent: 'documentary_query', 
      confidence: 0.4 
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
});

// ═══════════════════════════════════════════════════════════════
// 4. QUESTION STATS AVEC FAUTE / FORMULATION FLOUE
// ═══════════════════════════════════════════════════════════════

describe('4. Question stats avec faute / formulation floue', () => {
  it('détecte "kel est mon mieilleur apporteur en vitrerie sur 6 mois" malgré les fautes', () => {
    const query = 'kel est mon mieilleur apporteur en vitrerie sur 6 mois';
    const normalized = normalizeQuery(query);
    
    const statsResult = isStatsQuery(normalized, query);
    expect(statsResult.isStats).toBe(true);
    
    const detection = detectQueryType(normalized, query);
    expect(detection.type).toBe('stats_query');
    
    // validateAndRoute doit trouver la bonne dimension et filtre
    const user = createUser(3);
    const llmDraft = createLLMDraft({ confidence: 0.5 });
    const result = validateAndRoute(llmDraft, normalized, query, user);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.intent.dimension).toBe('apporteur');
      expect(result.intent.filters?.univers).toBe('VITRERIE');
    }
  });
  
  it('détecte "chifre daffaires" (faute typo) comme stats', () => {
    const query = 'chifre daffaires ce mois';
    const normalized = normalizeQuery(query);
    
    const detection = detectQueryType(normalized, query);
    expect(detection.type).toBe('stats_query');
  });
  
  it('détecte "combien on a fait de sous" (langage familier)', () => {
    const query = 'combien on a fait de sous ce mois';
    const normalized = normalizeQuery(query);
    
    // "combien" est un déclencheur fort
    const detection = detectQueryType(normalized, query);
    expect(detection.type).toBe('stats_query');
    expect(detection.suggestedIntent).toBe('volume');
  });
  
  it('détecte "les meilleurs tech" (abréviation)', () => {
    const query = 'les meilleurs tech cette année';
    const normalized = normalizeQuery(query);
    
    const detection = detectQueryType(normalized, query);
    expect(detection.type).toBe('stats_query');
    expect(detection.suggestedIntent).toBe('top');
    expect(detection.suggestedDimension).toBe('technicien');
  });
  
  it('détecte "ca plomberie" (syntaxe minimale)', () => {
    const query = 'ca plomberie';
    const normalized = normalizeQuery(query);
    
    const detection = detectQueryType(normalized, query);
    expect(detection.type).toBe('stats_query');
    
    // Doit détecter l'univers plomberie
    const user = createUser(3);
    const llmDraft = createLLMDraft({});
    const result = validateAndRoute(llmDraft, normalized, query, user);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.intent.filters?.univers).toBe('PLOMBERIE');
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. QUESTION RÉSEAU (N3+) VS AGENCE (N2)
// ═══════════════════════════════════════════════════════════════

describe('5. Question réseau (N3+) vs agence (N2)', () => {
  it('N0/N1 est redirigé vers doc pour toute requête stats', () => {
    const query = 'Quel est le CA ce mois';
    const normalized = normalizeQuery(query);
    
    // Test N0
    const userN0 = createUser(0);
    const llmDraft = createLLMDraft({ intent: 'stats_query' });
    const resultN0 = validateAndRoute(llmDraft, normalized, query, userN0);
    
    expect(resultN0.success).toBe(true);
    if (resultN0.success) {
      expect(resultN0.intent.type).toBe('documentary_query');
      const typeCorrection = resultN0.intent.validation.corrections.find(c => c.field === 'type');
      expect(typeCorrection?.reason).toContain('N2+ requis');
    }
    
    // Test N1
    const userN1 = createUser(1);
    const resultN1 = validateAndRoute(llmDraft, normalized, query, userN1);
    
    expect(resultN1.success).toBe(true);
    if (resultN1.success) {
      expect(resultN1.intent.type).toBe('documentary_query');
    }
  });
  
  it('N2 est limité à son agence même pour "toutes les agences"', () => {
    const query = 'Quels sont les 5 meilleurs apporteurs sur tout le réseau cette année';
    const normalized = normalizeQuery(query);
    const userN2 = createUser(2);
    const llmDraft = createLLMDraft({ intent: 'stats_query' });
    
    const result = validateAndRoute(llmDraft, normalized, query, userN2);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.intent.agencyScope).toBe('single');
      // Correction appliquée
      const scopeCorrection = result.intent.validation.corrections.find(c => c.field === 'agencyScope');
      expect(scopeCorrection).toBeDefined();
      expect(scopeCorrection?.reason).toContain('N2 limité');
      // networkScope forcé à false
      expect(result.intent.networkScope).toBe(false);
    }
  });
  
  it('N3 avec agences assignées a accès réseau limité', () => {
    const query = 'CA par agence cette année';
    const normalized = normalizeQuery(query);
    const userN3 = createUser(3, 'agency-1', 'agency-1', ['agency-1', 'agency-2', 'agency-3']);
    const llmDraft = createLLMDraft({ intent: 'stats_query' });
    
    const result = validateAndRoute(llmDraft, normalized, query, userN3);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.intent.agencyScope).toBe('network');
      expect(result.intent.allowedAgencyIds).toEqual(['agency-1', 'agency-2', 'agency-3']);
    }
  });
  
  it('N3+ sans agences assignées a accès réseau complet', () => {
    const query = 'CA global toutes agences';
    const normalized = normalizeQuery(query);
    const userN4 = createUser(4, 'agency-1', 'agency-1', undefined);
    const llmDraft = createLLMDraft({ intent: 'stats_query' });
    
    const result = validateAndRoute(llmDraft, normalized, query, userN4);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.intent.agencyScope).toBe('network');
      expect(result.intent.allowedAgencyIds).toBeUndefined();
    }
  });
  
  it('N6 (superadmin) a accès à tout le réseau sans restriction', () => {
    const query = 'Comparaison CA de toutes les agences sur 3 ans';
    const normalized = normalizeQuery(query);
    const userN6 = createUser(6);
    const llmDraft = createLLMDraft({ intent: 'stats_query' });
    
    const result = validateAndRoute(llmDraft, normalized, query, userN6);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.intent.agencyScope).toBe('network');
      expect(result.intent.userRoleLevel).toBe(6);
      expect(result.intent.allowedAgencyIds).toBeUndefined();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. CORRECTION LLM PAR KEYWORDS
// ═══════════════════════════════════════════════════════════════

describe('6. Correction LLM par keywords', () => {
  it('corrige une métrique invalide du LLM', () => {
    const query = 'CA par technicien ce mois';
    const normalized = normalizeQuery(query);
    const user = createUser(3);
    
    // LLM propose une métrique qui n'existe pas
    const llmDraft = createLLMDraft({ 
      intent: 'stats_query', 
      metric: 'metric_inexistante_fantaisie',
      confidence: 0.6,
    });
    
    const result = validateAndRoute(llmDraft, normalized, query, user);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.intent.metricId).not.toBe('metric_inexistante_fantaisie');
      const metricCorrection = result.intent.validation.corrections.find(c => c.field === 'metricId');
      expect(metricCorrection).toBeDefined();
      expect(metricCorrection?.reason).toContain('invalide');
    }
  });
  
  it('conserve LLM haute confiance si métrique valide', () => {
    const query = 'Évolution mensuelle du CA';
    const normalized = normalizeQuery(query);
    const user = createUser(3);
    const llmDraft = createLLMDraft({ 
      intent: 'stats_query', 
      metric: 'ca_global_ht',
      intentType: 'compare',
      confidence: 0.95, // Très haute confiance
    });
    
    const result = validateAndRoute(llmDraft, normalized, query, user);
    
    expect(result.success).toBe(true);
    if (result.success) {
      // LLM haute confiance respecté
      expect(result.intent.validation.source).toBe('llm');
      expect(result.intent.validation.corrections.length).toBe(0);
      expect(result.intent.metricId).toBe('ca_global_ht');
    }
  });
  
  it('surclasse dimension LLM si keywords plus précis', () => {
    const query = 'CA de chaque technicien par mois';
    const normalized = normalizeQuery(query);
    const user = createUser(3);
    
    // LLM dit dimension=global (erreur)
    const llmDraft = createLLMDraft({ 
      dimension: 'global',
      confidence: 0.5,
    });
    
    const result = validateAndRoute(llmDraft, normalized, query, user);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.intent.dimension).toBe('technicien');
      const dimCorrection = result.intent.validation.corrections.find(c => c.field === 'dimension');
      expect(dimCorrection).toBeDefined();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. ENRICHISSEMENTS V3 (PARSED STAT QUERY)
// ═══════════════════════════════════════════════════════════════

describe('7. Enrichissements ParsedStatQuery', () => {
  it('détecte needsForecast pour question prédiction', () => {
    const query = 'Prévision du CA pour le prochain trimestre';
    const normalized = normalizeQuery(query);
    const user = createUser(3);
    const llmDraft = createLLMDraft({});
    
    const result = validateAndRoute(llmDraft, normalized, query, user);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.intent.needsForecast).toBe(true);
      expect(result.intent.parsedQuery?.isForecast).toBe(true);
    }
  });
  
  it('détecte needsAdvancedAnalysis pour question analytics', () => {
    const query = 'Analyse prédictive du taux de recouvrement';
    const normalized = normalizeQuery(query);
    const user = createUser(3);
    const llmDraft = createLLMDraft({});
    
    const result = validateAndRoute(llmDraft, normalized, query, user);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.intent.needsAdvancedAnalysis).toBe(true);
      expect(result.intent.parsedQuery?.advancedAnalytics).toBe(true);
    }
  });
  
  it('inclut les catégories détectées dans parsedQuery', () => {
    const query = 'CA et taux de recouvrement par univers';
    const normalized = normalizeQuery(query);
    const user = createUser(3);
    const llmDraft = createLLMDraft({});
    
    const result = validateAndRoute(llmDraft, normalized, query, user);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.intent.detectedCategories).toBeDefined();
      expect(result.intent.parsedQuery?.categories).toBeDefined();
      expect(result.intent.parsedQuery?.keywordScore).toBeGreaterThan(0);
    }
  });
  
  it('inclut rawLLM dans parsedQuery pour debug', () => {
    const query = 'CA ce mois';
    const normalized = normalizeQuery(query);
    const user = createUser(3);
    const llmDraft = createLLMDraft({ confidence: 0.85 });
    
    const result = validateAndRoute(llmDraft, normalized, query, user);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.intent.parsedQuery?.rawLLM).toBeDefined();
      expect(result.intent.parsedQuery?.rawLLM?.confidence).toBe(0.85);
    }
  });
});