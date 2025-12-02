/**
 * Calcule la priorité thermique (0-12) basée sur l'onglet source et la priorité brute
 * 
 * Règles:
 * - Priorités A: Ax1=10, Ax2=9, Ax3=8
 * - Priorités B: Bx1=7, Bx2=6, Bx3=5
 * - Liste évaluée: C=4, sans prio=3
 * - LISTE V1: doublons ignorés (déjà dans A/B)
 * - Défaut: 3
 */

export function calculateHeatPriority(
  sourceSheet: string | null | undefined,
  priority: string | null | undefined
): number {
  const sheet = (sourceSheet || '').toLowerCase().trim();
  const prio = (priority || '').toLowerCase().trim();

  // Priorités A (onglet "priorités a" ou similaire)
  if (sheet.includes('priorit') && sheet.includes('a')) {
    if (prio.includes('x1') || prio === '1' || prio === 'a1') return 10;
    if (prio.includes('x2') || prio === '2' || prio === 'a2') return 9;
    if (prio.includes('x3') || prio === '3' || prio === 'a3') return 8;
    // Par défaut pour priorité A sans numéro
    return 9;
  }

  // Priorités B (onglet "priorités b" ou similaire)
  if (sheet.includes('priorit') && sheet.includes('b')) {
    if (prio.includes('x1') || prio === '1' || prio === 'b1') return 7;
    if (prio.includes('x2') || prio === '2' || prio === 'b2') return 6;
    if (prio.includes('x3') || prio === '3' || prio === 'b3') return 5;
    // Par défaut pour priorité B sans numéro
    return 6;
  }

  // Liste évaluée à prioriser
  if (sheet.includes('evalué') || sheet.includes('prioriser') || sheet.includes('évalué')) {
    if (prio.includes('c') || prio === 'c') return 4;
    // Sans priorité dans liste évaluée
    return 3;
  }

  // LISTE V1 - généralement des doublons, priorité basse
  if (sheet.includes('v1') || sheet.includes('liste v1')) {
    return 3;
  }

  // Bugs sheet - priorité moyenne par défaut
  if (sheet.includes('bug')) {
    // Vérifier si une priorité est indiquée
    if (prio.includes('urgent') || prio.includes('bloquant') || prio === 'p0') return 11;
    if (prio.includes('critique') || prio === 'p1') return 9;
    if (prio.includes('important') || prio === 'p2') return 7;
    if (prio.includes('normal') || prio === 'p3') return 5;
    if (prio.includes('mineur') || prio === 'p4') return 3;
    return 5;
  }

  // Création manuelle - priorité par défaut
  if (sheet === 'manual' || !sheet) {
    return 5;
  }

  // Défaut général
  return 3;
}

