/**
 * BD Story — Rule Validator
 * Bloque les incohérences métier avec niveaux de sévérité
 */

import { GeneratedStory, ValidationIssue, ValidationResult } from '../types/bdStory.types';
import { getCrewForUniverse } from '../data/crewPools';

// ============================================================================
// VALIDATION CODES
// ============================================================================

export const VALIDATION_CODES = {
  TECHNICIAN_BEFORE_CALL: 'TECHNICIAN_BEFORE_CALL',
  AMANDINE_OUTSIDE_OFFICE: 'AMANDINE_OUTSIDE_OFFICE',
  MISSING_CTA_PANEL_12: 'MISSING_CTA_PANEL_12',
  INVALID_TEXT_LENGTH: 'INVALID_TEXT_LENGTH',
  INCOMPATIBLE_TECHNICIAN: 'INCOMPATIBLE_TECHNICIAN',
  INVALID_LOCATION_FOR_PROBLEM: 'INVALID_LOCATION_FOR_PROBLEM',
  DUPLICATE_RECENT_PATTERN: 'DUPLICATE_RECENT_PATTERN',
  MISSING_ASSISTANTE: 'MISSING_ASSISTANTE',
  WRONG_PANEL_COUNT: 'WRONG_PANEL_COUNT',
  EMPTY_TEXT: 'EMPTY_TEXT',
  CLIENT_MISSING_EARLY: 'CLIENT_MISSING_EARLY',
  TECHNICIAN_AS_CLIENT: 'TECHNICIAN_AS_CLIENT',
} as const;

// ============================================================================
// INDIVIDUAL CHECKS
// ============================================================================

function checkPanelCount(story: GeneratedStory): ValidationIssue[] {
  if (story.panels.length !== 12) {
    return [{
      code: VALIDATION_CODES.WRONG_PANEL_COUNT,
      severity: 'blocking',
      message: `Histoire a ${story.panels.length} cases au lieu de 12`,
    }];
  }
  return [];
}

function checkTextLengths(story: GeneratedStory): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const panel of story.panels) {
    const wordCount = panel.text.trim().split(/\s+/).length;
    if (wordCount < 3 && panel.text !== '…') {
      issues.push({
        code: VALIDATION_CODES.INVALID_TEXT_LENGTH,
        severity: 'major',
        message: `Case ${panel.number}: "${panel.text}" — ${wordCount} mots (min 3)`,
        panelNumber: panel.number,
      });
    }
    if (wordCount > 8) {
      issues.push({
        code: VALIDATION_CODES.INVALID_TEXT_LENGTH,
        severity: 'minor',
        message: `Case ${panel.number}: "${panel.text}" — ${wordCount} mots (max 8)`,
        panelNumber: panel.number,
      });
    }
    if (!panel.text || panel.text.trim() === '') {
      issues.push({
        code: VALIDATION_CODES.EMPTY_TEXT,
        severity: 'blocking',
        message: `Case ${panel.number}: texte vide`,
        panelNumber: panel.number,
      });
    }
  }
  return issues;
}

function checkTechnicianBeforeCall(story: GeneratedStory): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const techSlug = story.assignedCharacters.technician;

  // Find first call_received panel
  const callPanel = story.panels.find(p => p.narrativeFunction === 'call_received');
  const callIndex = callPanel ? callPanel.number : 7;

  for (const panel of story.panels) {
    if (panel.number < callIndex && panel.actors.includes(techSlug)) {
      issues.push({
        code: VALIDATION_CODES.TECHNICIAN_BEFORE_CALL,
        severity: 'blocking',
        message: `Case ${panel.number}: technicien ${techSlug} apparaît avant l'appel (case ${callIndex})`,
        panelNumber: panel.number,
      });
    }
  }
  return issues;
}

function checkAmandineLocation(story: GeneratedStory): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const panel of story.panels) {
    if (panel.actors.includes('amandine') && !['bureau', 'general'].includes(panel.location)) {
      issues.push({
        code: VALIDATION_CODES.AMANDINE_OUTSIDE_OFFICE,
        severity: 'blocking',
        message: `Case ${panel.number}: Amandine en "${panel.location}" au lieu du bureau`,
        panelNumber: panel.number,
      });
    }
  }
  return issues;
}

function checkCtaPanel12(story: GeneratedStory): ValidationIssue[] {
  const panel12 = story.panels.find(p => p.number === 12);
  if (!panel12 || panel12.narrativeFunction !== 'cta_moral') {
    return [{
      code: VALIDATION_CODES.MISSING_CTA_PANEL_12,
      severity: 'blocking',
      message: 'Case 12 doit être cta_moral',
      panelNumber: 12,
    }];
  }
  if (!story.ctaText || story.ctaText.trim() === '') {
    return [{
      code: VALIDATION_CODES.MISSING_CTA_PANEL_12,
      severity: 'blocking',
      message: 'CTA absent en case 12',
      panelNumber: 12,
    }];
  }
  return [];
}

function checkTechnicianCompatibility(story: GeneratedStory): ValidationIssue[] {
  const techSlug = story.assignedCharacters.technician;
  // Map universe to crew pool key
  const universeMap: Record<string, string> = {
    plomberie: 'plomberie',
    electricite: 'electricite',
    serrurerie: 'serrurerie',
    vitrerie: 'vitrerie',
    menuiserie: 'menuiserie',
    peinture_renovation: 'peinture',
  };
  const poolKey = universeMap[story.universe] || story.universe;
  const crew = getCrewForUniverse(poolKey);

  if (!crew.includes(techSlug)) {
    return [{
      code: VALIDATION_CODES.INCOMPATIBLE_TECHNICIAN,
      severity: 'blocking',
      message: `Technicien ${techSlug} non compatible avec univers ${story.universe}`,
    }];
  }
  return [];
}

function checkAssistantePresence(story: GeneratedStory): ValidationIssue[] {
  const hasAssistante = story.panels.some(p => p.actors.includes('amandine'));
  if (!hasAssistante) {
    return [{
      code: VALIDATION_CODES.MISSING_ASSISTANTE,
      severity: 'major',
      message: 'Amandine n\'apparaît dans aucune case',
    }];
  }
  return [];
}

function checkClientPresenceEarly(story: GeneratedStory): ValidationIssue[] {
  const firstTwo = story.panels.filter(p => p.number <= 2);
  const hasClient = firstTwo.some(p => p.actors.includes('client'));
  if (!hasClient) {
    return [{
      code: VALIDATION_CODES.CLIENT_MISSING_EARLY,
      severity: 'major',
      message: 'Client absent des cases 1-2',
    }];
  }
  return [];
}

// ============================================================================
// MAIN — validateStory
// ============================================================================

export function validateStory(story: GeneratedStory): ValidationResult {
  const allIssues: ValidationIssue[] = [
    ...checkPanelCount(story),
    ...checkTextLengths(story),
    ...checkTechnicianBeforeCall(story),
    ...checkAmandineLocation(story),
    ...checkCtaPanel12(story),
    ...checkTechnicianCompatibility(story),
    ...checkAssistantePresence(story),
    ...checkClientPresenceEarly(story),
  ];

  const isValid = !allIssues.some(i => i.severity === 'blocking');

  return { isValid, issues: allIssues };
}

// ============================================================================
// HELPERS
// ============================================================================

export function getBlockingIssues(result: ValidationResult): ValidationIssue[] {
  return result.issues.filter(i => i.severity === 'blocking');
}

export function getMajorIssues(result: ValidationResult): ValidationIssue[] {
  return result.issues.filter(i => i.severity === 'major');
}
