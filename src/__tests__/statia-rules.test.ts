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
// resolveInterventionType — uses diagnostic resolution path
// ============================================================================

describe('resolveInterventionType', () => {
  it('returns type2 directly when not A DEFINIR', () => {
    const result = resolveInterventionType({ type2: 'depannage' });
    expect(result).toBe('depannage');
  });

  it('resolves via diagnostic when type2 is A DEFINIR', () => {
    // Path: biDepan.items.isValidated
    const result = resolveInterventionType({ type2: 'A DEFINIR', biDepan: { items: { isValidated: true } } });
    expect(result).toBe('depannage');
  });

  it('returns non_defini when no path matches', () => {
    const result = resolveInterventionType({ data: {} });
    expect(result).toBe('non_defini');
  });

  it('handles RT via data.type2', () => {
    const result = resolveInterventionType({ data: { type2: 'RT' } });
    expect(result).toBe('RT');
  });
});

// ============================================================================
// isProductiveIntervention
// ============================================================================

describe('isProductiveIntervention', () => {
  it('depannage type2 is productive', () => {
    expect(isProductiveIntervention({ type2: 'depannage' })).toBe(true);
  });

  it('travaux type2 is productive', () => {
    expect(isProductiveIntervention({ type2: 'travaux' })).toBe(true);
  });

  it('RT is not productive', () => {
    expect(isProductiveIntervention({ type2: 'RT' })).toBe(false);
  });

  it('empty data is not productive', () => {
    expect(isProductiveIntervention({ data: {} })).toBe(false);
  });
});

// ============================================================================
// isSAVIntervention
// ============================================================================

describe('isSAVIntervention', () => {
  it('detects SAV from type2 exact match', () => {
    expect(isSAVIntervention({ type2: 'sav' })).toBe(true);
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
  it('normalizes known synonyms', () => {
    const result = normalizeSynonym('commanditaire');
    expect(result).toBe('apporteur');
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
// parseNLPGroupBy — returns array of group keys
// ============================================================================

describe('parseNLPGroupBy', () => {
  it('parses "par mois"', () => {
    const result = parseNLPGroupBy('par mois');
    expect(result).toContain('mois');
  });

  it('parses "par univers"', () => {
    const result = parseNLPGroupBy('par univers');
    expect(result).toContain('univers');
  });

  it('returns empty array for empty string', () => {
    const result = parseNLPGroupBy('');
    expect(result).toEqual([]);
  });
});

// ============================================================================
// getGroupByConfig
// ============================================================================

describe('getGroupByConfig', () => {
  it('returns config for mois', () => {
    const config = getGroupByConfig('mois');
    expect(config).toBeDefined();
  });

  it('returns config for univers', () => {
    const config = getGroupByConfig('univers');
    expect(config).toBeDefined();
  });
});
