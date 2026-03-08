/**
 * Tests: StatIA rules — business rules engine
 */
import { describe, it, expect } from 'vitest';
import {
  STATIA_RULES_JSON,
  resolveInterventionType,
  isProductiveIntervention,
  isSAVIntervention,
  getDateField,
  normalizeSynonym,
  parseNLPGroupBy,
  isFactureStateIncluded as isFactureStateIncludedRule,
  getGroupByConfig,
} from '@/statia/rules/rules';

// ============================================================================
// STATIA_RULES_JSON structure
// ============================================================================

describe('STATIA_RULES_JSON', () => {
  it('has CA rules defined', () => {
    expect(STATIA_RULES_JSON.CA).toBeDefined();
    expect(STATIA_RULES_JSON.CA.source).toContain('totalHT');
  });

  it('has includeStates for CA', () => {
    expect(STATIA_RULES_JSON.CA.includeStates).toBeInstanceOf(Array);
    expect(STATIA_RULES_JSON.CA.includeStates.length).toBeGreaterThan(5);
  });

  it('has excludeStates for CA', () => {
    expect(STATIA_RULES_JSON.CA.excludeStates).toBeInstanceOf(Array);
    expect(STATIA_RULES_JSON.CA.excludeStates).toContain('draft');
    expect(STATIA_RULES_JSON.CA.excludeStates).toContain('cancelled');
  });

  it('avoirs are subtracted', () => {
    expect(STATIA_RULES_JSON.CA.avoir).toBe('subtract');
  });

  it('has technician rules', () => {
    expect(STATIA_RULES_JSON.technicians).toBeDefined();
    expect(STATIA_RULES_JSON.technicians.productiveTypes).toBeInstanceOf(Array);
    expect(STATIA_RULES_JSON.technicians.nonProductiveTypes).toBeInstanceOf(Array);
  });

  it('RT generates no CA', () => {
    expect(STATIA_RULES_JSON.technicians.RT_generates_NO_CA).toBe(true);
  });

  it('has devis transformation rules', () => {
    expect(STATIA_RULES_JSON.devis).toBeDefined();
    expect(STATIA_RULES_JSON.devis.transformation).toBeDefined();
  });
});

// ============================================================================
// resolveInterventionType
// ============================================================================

describe('resolveInterventionType', () => {
  it('identifies depannage', () => {
    const result = resolveInterventionType({ data: { biDepan: true } });
    expect(result).toBe('depannage');
  });

  it('identifies travaux', () => {
    const result = resolveInterventionType({ data: { biTvx: true } });
    expect(result).toBe('travaux');
  });

  it('identifies RT', () => {
    const result = resolveInterventionType({ data: { biRt: { isValidated: true } } });
    expect(result).toBe('RT');
  });

  it('returns unknown for unrecognized data', () => {
    const result = resolveInterventionType({ data: {} });
    expect(result).toBe('unknown');
  });
});

// ============================================================================
// isProductiveIntervention
// ============================================================================

describe('isProductiveIntervention', () => {
  it('depannage is productive', () => {
    expect(isProductiveIntervention({ data: { biDepan: true } })).toBe(true);
  });

  it('travaux is productive', () => {
    expect(isProductiveIntervention({ data: { biTvx: true } })).toBe(true);
  });

  it('RT is not productive', () => {
    expect(isProductiveIntervention({ data: { biRt: { isValidated: true } } })).toBe(false);
  });

  it('empty data is not productive', () => {
    expect(isProductiveIntervention({ data: {} })).toBe(false);
  });
});

// ============================================================================
// isSAVIntervention
// ============================================================================

describe('isSAVIntervention', () => {
  it('detects SAV from type2', () => {
    expect(isSAVIntervention({ type2: 'SAV' })).toBe(true);
    expect(isSAVIntervention({ type2: 'sav_garantie' })).toBe(true);
  });

  it('non-SAV is not SAV', () => {
    expect(isSAVIntervention({ type2: 'depannage' })).toBe(false);
  });

  it('handles missing type2', () => {
    expect(isSAVIntervention({})).toBe(false);
  });
});

// ============================================================================
// getDateField
// ============================================================================

describe('getDateField', () => {
  it('returns correct field for factures', () => {
    const field = getDateField('factures');
    expect(field).toBeDefined();
    expect(typeof field).toBe('string');
  });

  it('returns correct field for interventions', () => {
    const field = getDateField('interventions');
    expect(field).toBeDefined();
  });

  it('returns fallback for unknown source', () => {
    const field = getDateField('unknown_source');
    expect(field).toBeDefined();
  });
});

// ============================================================================
// normalizeSynonym
// ============================================================================

describe('normalizeSynonym', () => {
  it('normalizes CA synonyms', () => {
    expect(normalizeSynonym('chiffre_affaires')).toBe('ca');
    expect(normalizeSynonym('revenue')).toBe('ca');
  });

  it('passes through unknown terms', () => {
    expect(normalizeSynonym('xyz_unknown')).toBe('xyz_unknown');
  });
});

// ============================================================================
// isFactureStateIncludedRule
// ============================================================================

describe('isFactureStateIncludedRule', () => {
  it('includes sent invoices', () => {
    expect(isFactureStateIncludedRule('sent')).toBe(true);
  });

  it('includes paid invoices', () => {
    expect(isFactureStateIncludedRule('paid')).toBe(true);
  });

  it('excludes draft invoices', () => {
    expect(isFactureStateIncludedRule('draft')).toBe(false);
  });

  it('excludes cancelled invoices', () => {
    expect(isFactureStateIncludedRule('cancelled')).toBe(false);
  });

  it('excludes proforma invoices', () => {
    expect(isFactureStateIncludedRule('pro_forma')).toBe(false);
  });
});

// ============================================================================
// parseNLPGroupBy
// ============================================================================

describe('parseNLPGroupBy', () => {
  it('parses "par mois"', () => {
    const result = parseNLPGroupBy('par mois');
    expect(result).toBe('month');
  });

  it('parses "par univers"', () => {
    const result = parseNLPGroupBy('par univers');
    expect(result).toBe('univers');
  });

  it('returns null for empty', () => {
    const result = parseNLPGroupBy('');
    expect(result).toBeNull();
  });
});

// ============================================================================
// getGroupByConfig
// ============================================================================

describe('getGroupByConfig', () => {
  it('returns config for month', () => {
    const config = getGroupByConfig('month');
    expect(config).toBeDefined();
    expect(config.field).toBeDefined();
  });

  it('returns config for univers', () => {
    const config = getGroupByConfig('univers');
    expect(config).toBeDefined();
  });
});
