/**
 * BD Story — Test Generator (industrial batch)
 * Generates 20, 60, or 120 stories with full quality report
 * Usage: npx tsx src/modules/bd-story/test/generateTestBatch.ts [20|60|120]
 */

import { generateStory } from '../engine/storyOrchestrator';
import { auditCoverage } from '../engine/copyEngine';
import { checkStoryBible } from '../data/storyBible';
import { narrativeDistance } from '../data/storyBible';
import { AtomUsageState, BatchUniverseQuota, BdStoryGenerationInput, GeneratedStory, ProblemUniverse, ValidationIssue } from '../types/bdStory.types';
import { DEFAULT_BATCH_UNIVERSE_QUOTAS } from '../engine/selectionEngine';

// ============================================================================
// CONFIG
// ============================================================================

const BATCH_SIZE = parseInt(process.argv[2] || '20', 10);
const AGENCY_ID = 'test-agency';

const ALL_UNIVERSES: ProblemUniverse[] = [
  'plomberie', 'electricite', 'serrurerie', 'vitrerie', 'menuiserie', 'peinture_renovation'
];

// ============================================================================
// UNIVERSE DISTRIBUTION TARGETS (percentage)
// ============================================================================

const UNIVERSE_QUOTAS: Record<ProblemUniverse, BatchUniverseQuota> = DEFAULT_BATCH_UNIVERSE_QUOTAS;

// ============================================================================
// GENERATE
// ============================================================================

interface StoryResult {
  idx: number;
  title: string;
  universe: string;
  template: string;
  storyFamily: string;
  technician: string;
  client: string;
  room: string;
  tone: string;
  cta: string;
  panelTexts: string[];
  wordCounts: number[];
  bibleViolations: number;
   bibleViolationCodes: string[];
   validatorIssueCodes: string[];
  diversityScore: number;
  valid: boolean;
}

interface ViolationReport {
  code: string;
  count: number;
  examples: Array<{
    storyIndex: number;
    storyKey: string;
    details: string;
  }>;
}

function createEmptyUniverseCounts(): Record<ProblemUniverse, number> {
  return {
    plomberie: 0,
    electricite: 0,
    serrurerie: 0,
    vitrerie: 0,
    menuiserie: 0,
    peinture_renovation: 0,
  };
}

function aggregateViolations(
  entries: Array<{ storyIndex: number; storyKey: string; code: string; details: string }>
): ViolationReport[] {
  const map = new Map<string, ViolationReport>();

  for (const entry of entries) {
    if (!map.has(entry.code)) {
      map.set(entry.code, { code: entry.code, count: 0, examples: [] });
    }

    const report = map.get(entry.code)!;
    report.count += 1;
    if (report.examples.length < 5) {
      report.examples.push({
        storyIndex: entry.storyIndex,
        storyKey: entry.storyKey,
        details: entry.details,
      });
    }
  }

  return [...map.values()].sort((a, b) => b.count - a.count);
}

function getGapPriority(gap: { universe: string; tone?: string; narrativeFunction: string }): number {
  let priority = 0;
  if (['proximite', 'rassurant'].includes(gap.tone || '')) priority += 3;
  if (['inspection_diagnosis', 'repair_action', 'problem_worsens'].includes(gap.narrativeFunction)) priority += 3;
  if (['plomberie', 'electricite', 'serrurerie', 'vitrerie', 'menuiserie'].includes(gap.universe)) priority += 2;
  return priority;
}

function run() {
  console.log('═══════════════════════════════════════════════════');
  console.log(`  BD STORY — TEST DE GÉNÉRATION (${BATCH_SIZE} histoires)`);
  console.log('═══════════════════════════════════════════════════\n');

  const stories: GeneratedStory[] = [];
  const results: StoryResult[] = [];
  const batchCounts = createEmptyUniverseCounts();
  const atomUsageState: AtomUsageState = { atomUsageCount: {}, recentAtomTexts: [] };
  const bibleViolationEntries: Array<{ storyIndex: number; storyKey: string; code: string; details: string }> = [];
  const validatorViolationEntries: Array<{ storyIndex: number; storyKey: string; code: string; details: string }> = [];

  for (let i = 0; i < BATCH_SIZE; i++) {
    const input: BdStoryGenerationInput = {
      agencyId: AGENCY_ID,
      season: (['printemps', 'ete', 'automne', 'hiver'] as const)[i % 4],
      tone: (['rassurant', 'pedagogique', 'reactif', 'proximite'] as const)[i % 4],
      avoidRecentProblemSlugs: stories.slice(-5).map(s => s.problemSlug),
      avoidRecentTechnicianSlugs: stories.slice(-3).map(s => s.assignedCharacters.technician),
      avoidRecentStoryKeys: stories.slice(-10).map(s => s.storyKey),
      batchState: {
        generatedCount: i,
        countsByUniverse: { ...batchCounts },
        targetSize: BATCH_SIZE,
      },
      batchUniverseQuotas: UNIVERSE_QUOTAS,
      atomUsageState,
    };

    const output = generateStory(input, stories);
    const story = output.story;
    stories.push(story);
    batchCounts[story.universe] = (batchCounts[story.universe] || 0) + 1;

    const bibleCheck = checkStoryBible(story);
    const validatorIssues = story.validation.issues;
    const wordCounts = story.panels.map(p => p.text.trim().split(/\s+/).length);

    for (const violation of bibleCheck) {
      bibleViolationEntries.push({
        storyIndex: i + 1,
        storyKey: story.storyKey,
        code: violation.rule,
        details: violation.detail,
      });
    }

    for (const issue of validatorIssues) {
      validatorViolationEntries.push({
        storyIndex: i + 1,
        storyKey: story.storyKey,
        code: issue.code,
        details: issue.message,
      });
    }

    results.push({
      idx: i + 1,
      title: story.title,
      universe: story.universe,
      template: story.templateKey,
      storyFamily: story.storyFamily,
      technician: story.assignedCharacters.technician,
      client: story.clientProfileSlug,
      room: story.locationContext.room,
      tone: story.tone,
      cta: story.ctaText,
      panelTexts: story.panels.map(p => p.text),
      wordCounts,
      bibleViolations: bibleCheck.length,
      bibleViolationCodes: bibleCheck.map(v => v.rule),
      validatorIssueCodes: validatorIssues.map(v => v.code),
      diversityScore: story.diversityScore.totalScore,
      valid: story.validation.isValid,
    });

    // Progress indicator for large batches
    if (BATCH_SIZE >= 60 && (i + 1) % 20 === 0) {
      console.log(`  ⏳ ${i + 1}/${BATCH_SIZE} histoires générées...`);
    }
  }

  // ============================================================================
  // DETAILED REPORT (only first 20 for large batches)
  // ============================================================================

  const detailCount = Math.min(20, BATCH_SIZE);
  console.log(`\n📋 DÉTAIL DES ${detailCount} PREMIÈRES HISTOIRES\n`);
  console.log('─'.repeat(120));

  for (const r of results.slice(0, detailCount)) {
    const status = r.valid ? '✅' : '❌';
    const bible = r.bibleViolations === 0 ? '✅' : `⚠️ ${r.bibleViolations}`;

    console.log(`\n${status} #${r.idx} — ${r.title}`);
    console.log(`   Univers: ${r.universe} | Template: ${r.template} | Family: ${r.storyFamily}`);
    console.log(`   Tech: ${r.technician} | Client: ${r.client} | Pièce: ${r.room} | Ton: ${r.tone}`);
    console.log(`   Bible: ${bible} | Diversité: ${r.diversityScore.toFixed(2)}`);
    console.log(`   CTA: "${r.cta}"`);
    console.log(`   Cases:`);
    for (let p = 0; p < r.panelTexts.length; p++) {
      const wc = r.wordCounts[p];
      const wcFlag = (wc < 3 || wc > 8) ? ' ⚠️' : '';
      console.log(`     ${(p + 1).toString().padStart(2)}. "${r.panelTexts[p]}" (${wc} mots)${wcFlag}`);
    }
  }

  // ============================================================================
  // GLOBAL SUMMARY
  // ============================================================================

  console.log('\n\n═══════════════════════════════════════════════════');
  console.log('  RÉSUMÉ GLOBAL');
  console.log('═══════════════════════════════════════════════════\n');

  const validCount = results.filter(r => r.valid).length;
  const bibleClean = results.filter(r => r.bibleViolations === 0).length;
  const avgDiversity = results.reduce((s, r) => s + r.diversityScore, 0) / results.length;
  const bibleReports = aggregateViolations(bibleViolationEntries);
  const validatorReports = aggregateViolations(validatorViolationEntries);

  console.log(`✅ Histoires valides:      ${validCount}/${BATCH_SIZE} (${(validCount/BATCH_SIZE*100).toFixed(0)}%)`);
  console.log(`✅ Bible respectée:        ${bibleClean}/${BATCH_SIZE} (${(bibleClean/BATCH_SIZE*100).toFixed(0)}%)`);
  console.log(`📊 Score diversité moyen:  ${avgDiversity.toFixed(3)}`);

  // ============================================================================
  // DISTRIBUTIONS
  // ============================================================================

  const univDist: Record<string, number> = {};
  const techDist: Record<string, number> = {};
  const tmplDist: Record<string, number> = {};
  const familyDist: Record<string, number> = {};
  const roomDist: Record<string, number> = {};
  const toneDist: Record<string, number> = {};

  for (const r of results) {
    univDist[r.universe] = (univDist[r.universe] || 0) + 1;
    techDist[r.technician] = (techDist[r.technician] || 0) + 1;
    tmplDist[r.template] = (tmplDist[r.template] || 0) + 1;
    familyDist[r.storyFamily] = (familyDist[r.storyFamily] || 0) + 1;
    roomDist[r.room] = (roomDist[r.room] || 0) + 1;
    toneDist[r.tone] = (toneDist[r.tone] || 0) + 1;
  }

  console.log('\n📊 DISTRIBUTION UNIVERS:');
  for (const u of ALL_UNIVERSES) {
    const count = univDist[u] || 0;
    const pct = (count / BATCH_SIZE * 100).toFixed(1);
    const minOk = parseFloat(pct) >= UNIVERSE_QUOTAS[u].minPct;
    const maxOk = parseFloat(pct) <= UNIVERSE_QUOTAS[u].maxPct;
    const flag = minOk && maxOk ? '✅' : '⚠️';
    const bar = '█'.repeat(Math.round(parseFloat(pct) / 2));
    console.log(`   ${flag} ${u.padEnd(20)} ${count.toString().padStart(3)} (${pct.padStart(5)}%) ${bar}`);
  }

  if (bibleReports.length > 0 || validatorReports.length > 0) {
    console.log('\n📋 VIOLATIONS BIBLE PAR TYPE:');
    if (bibleReports.length === 0) {
      console.log('   ✅ Aucune violation bible');
    } else {
      for (const report of bibleReports) {
        console.log(`   ❌ ${report.code}: ${report.count}`);
        for (const example of report.examples) {
          console.log(`      - #${example.storyIndex} ${example.storyKey}: ${example.details}`);
        }
      }
    }

    console.log('\n📋 VIOLATIONS VALIDATEUR PAR TYPE:');
    if (validatorReports.length === 0) {
      console.log('   ✅ Aucune violation validateur');
    } else {
      for (const report of validatorReports) {
        console.log(`   ❌ ${report.code}: ${report.count}`);
        for (const example of report.examples) {
          console.log(`      - #${example.storyIndex} ${example.storyKey}: ${example.details}`);
        }
      }
    }
  }

  console.log('\n📊 DISTRIBUTION TECHNICIENS:');
  const sortedTech = Object.entries(techDist).sort((a, b) => b[1] - a[1]);
  for (const [tech, count] of sortedTech) {
    const pct = (count / BATCH_SIZE * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(parseFloat(pct) / 2));
    console.log(`   ${tech.padEnd(20)} ${count.toString().padStart(3)} (${pct.padStart(5)}%) ${bar}`);
  }

  console.log('\n📊 DISTRIBUTION TEMPLATES:');
  const sortedTmpl = Object.entries(tmplDist).sort((a, b) => b[1] - a[1]);
  for (const [tmpl, count] of sortedTmpl) {
    const pct = (count / BATCH_SIZE * 100).toFixed(1);
    console.log(`   ${tmpl.padEnd(28)} ${count.toString().padStart(3)} (${pct.padStart(5)}%)`);
  }

  console.log('\n📊 DISTRIBUTION FAMILLES:');
  const sortedFamily = Object.entries(familyDist).sort((a, b) => b[1] - a[1]);
  for (const [fam, count] of sortedFamily) {
    const pct = (count / BATCH_SIZE * 100).toFixed(1);
    console.log(`   ${fam.padEnd(28)} ${count.toString().padStart(3)} (${pct.padStart(5)}%)`);
  }

  console.log('\n📊 DISTRIBUTION TONS:');
  for (const [tone, count] of Object.entries(toneDist).sort((a, b) => b[1] - a[1])) {
    const pct = (count / BATCH_SIZE * 100).toFixed(1);
    console.log(`   ${tone.padEnd(20)} ${count.toString().padStart(3)} (${pct.padStart(5)}%)`);
  }

  // ============================================================================
  // REPETITION ANALYSIS
  // ============================================================================

  console.log('\n\n═══════════════════════════════════════════════════');
  console.log('  ANALYSE DE RÉPÉTITION');
  console.log('═══════════════════════════════════════════════════\n');

  // Consecutive same universe
  let consecutiveUniverse = 0;
  for (let i = 1; i < results.length; i++) {
    if (results[i].universe === results[i - 1].universe) consecutiveUniverse++;
  }
  console.log(`🔄 Univers consécutifs identiques: ${consecutiveUniverse} (${(consecutiveUniverse/(BATCH_SIZE-1)*100).toFixed(1)}%)`);

  // Consecutive same technician
  let consecutiveTech = 0;
  for (let i = 1; i < results.length; i++) {
    if (results[i].technician === results[i - 1].technician) consecutiveTech++;
  }
  console.log(`🔄 Techniciens consécutifs identiques: ${consecutiveTech} (${(consecutiveTech/(BATCH_SIZE-1)*100).toFixed(1)}%)`);

  // Same technician 3+ times in window of 5
  let techClumps = 0;
  for (let i = 0; i < results.length - 4; i++) {
    const window = results.slice(i, i + 5);
    const counts: Record<string, number> = {};
    for (const r of window) {
      counts[r.technician] = (counts[r.technician] || 0) + 1;
    }
    if (Object.values(counts).some(c => c >= 3)) techClumps++;
  }
  console.log(`⚠️ Fenêtres de 5 avec même technicien ≥3 fois: ${techClumps}`);

  // Narrative distance between consecutive stories
  console.log('\n📏 Distance narrative entre histoires consécutives:');
  let totalDist = 0;
  let distCounts = [0, 0, 0, 0, 0]; // 0,1,2,3,4
  for (let i = 1; i < results.length; i++) {
    const dist = narrativeDistance(results[i - 1].template, results[i].template);
    totalDist += dist;
    distCounts[dist]++;
  }
  const avgDist = totalDist / (results.length - 1);
  console.log(`   Moyenne: ${avgDist.toFixed(2)}/4`);
  console.log(`   Distribution: 0=${distCounts[0]} | 1=${distCounts[1]} | 2=${distCounts[2]} | 3=${distCounts[3]} | 4=${distCounts[4]}`);
  if (distCounts[0] > 0) {
    console.log(`   ⚠️ ${distCounts[0]} paires avec distance 0 (templates identiques consécutifs)`);
  }

  // ============================================================================
  // TEXT QUALITY
  // ============================================================================

  console.log('\n\n═══════════════════════════════════════════════════');
  console.log('  QUALITÉ TEXTE');
  console.log('═══════════════════════════════════════════════════\n');

  // Word count issues
  const wordIssues = results.flatMap(r =>
    r.wordCounts.map((wc, i) => ({ story: r.idx, panel: i + 1, wc }))
      .filter(x => x.wc < 3 || x.wc > 8)
  );

  if (wordIssues.length > 0) {
    console.log(`⚠️ Phrases hors longueur 3-8 mots: ${wordIssues.length}`);
    for (const issue of wordIssues.slice(0, 10)) {
      console.log(`   Histoire #${issue.story}, case ${issue.panel}: ${issue.wc} mots`);
    }
    if (wordIssues.length > 10) console.log(`   ... et ${wordIssues.length - 10} autres`);
  } else {
    console.log('✅ Toutes les phrases respectent la longueur 3-8 mots');
  }

  // Duplicate texts across stories
  const allTexts = results.flatMap(r => r.panelTexts);
  const textFreq: Record<string, number> = {};
  for (const t of allTexts) {
    textFreq[t] = (textFreq[t] || 0) + 1;
  }
  const duplicates = Object.entries(textFreq)
    .filter(([, count]) => count > 5)
    .sort((a, b) => b[1] - a[1]);

  if (duplicates.length > 0) {
    console.log(`\n⚠️ Phrases les plus répétées (>5 fois):`);
    for (const [text, count] of duplicates.slice(0, 15)) {
      console.log(`   ${count}× "${text}"`);
    }
  } else {
    console.log('\n✅ Pas de phrase utilisée plus de 5 fois');
  }

  // ============================================================================
  // COVERAGE AUDIT
  // ============================================================================

  const coverage = auditCoverage();
  console.log(`\n\n═══════════════════════════════════════════════════`);
  console.log(`  COUVERTURE TEXTATOMS`);
  console.log(`═══════════════════════════════════════════════════\n`);
  console.log(`📚 Couverture: ${coverage.coveragePercent}% (${coverage.coveredCombinations}/${coverage.totalPossibleCombinations})`);
  console.log(`   Total phrases: ${coverage.totalAtoms}`);
  const prioritizedZeroGaps = [...coverage.gaps].sort((a, b) => getGapPriority(b) - getGapPriority(a));
  const prioritizedWeakGaps = [...coverage.weakGaps].sort((a, b) => getGapPriority(b) - getGapPriority(a));
  if (prioritizedZeroGaps.length > 0) {
    console.log(`   Trous critiques (0 phrase): ${prioritizedZeroGaps.length}`);
    for (const gap of prioritizedZeroGaps.slice(0, 20)) {
      console.log(`     ❌ ${gap.universe} / ${gap.narrativeFunction} / ${gap.tone}`);
    }
    if (prioritizedZeroGaps.length > 20) {
      console.log(`     ... et ${prioritizedZeroGaps.length - 20} autres`);
    }
  } else {
    console.log('   ✅ Aucun trou de couverture critique !');
  }

  if (prioritizedWeakGaps.length > 0) {
    console.log(`   Couverture faible (1 phrase): ${prioritizedWeakGaps.length}`);
    for (const gap of prioritizedWeakGaps.slice(0, 12)) {
      console.log(`     ⚠️ ${gap.universe} / ${gap.narrativeFunction} / ${gap.tone}`);
    }
  }

  // ============================================================================
  // FINAL VERDICT
  // ============================================================================

  console.log('\n\n═══════════════════════════════════════════════════');
  console.log('  VERDICT');
  console.log('═══════════════════════════════════════════════════\n');

  const issues: string[] = [];
  if (validCount < BATCH_SIZE) issues.push(`${BATCH_SIZE - validCount} histoires invalides`);
  if (bibleClean < BATCH_SIZE) issues.push(`${BATCH_SIZE - bibleClean} violations bible`);
  if (wordIssues.length > 0) issues.push(`${wordIssues.length} phrases hors longueur`);
  if (consecutiveUniverse > BATCH_SIZE * 0.15) issues.push(`Trop d'univers consécutifs identiques`);
  if (consecutiveTech > BATCH_SIZE * 0.1) issues.push(`Trop de techniciens consécutifs identiques`);
  if (coverage.coveragePercent < 90) issues.push(`Couverture textAtoms ${coverage.coveragePercent}% < 90%`);
  if (prioritizedZeroGaps.length > 0) issues.push(`${prioritizedZeroGaps.length} trous textAtoms critiques`);

  // Check universe distribution
  for (const u of ALL_UNIVERSES) {
    const pct = ((univDist[u] || 0) / BATCH_SIZE) * 100;
    if (pct < UNIVERSE_QUOTAS[u].minPct) issues.push(`${u}: ${pct.toFixed(1)}% < min ${UNIVERSE_QUOTAS[u].minPct}%`);
    if (pct > UNIVERSE_QUOTAS[u].maxPct) issues.push(`${u}: ${pct.toFixed(1)}% > max ${UNIVERSE_QUOTAS[u].maxPct}%`);
  }

  if (issues.length === 0) {
    console.log('🟢 TOUS LES TESTS PASSENT — Moteur prêt pour DB/UI');
  } else {
    console.log('🟡 PROBLÈMES DÉTECTÉS:');
    for (const issue of issues) {
      console.log(`   ⚠️ ${issue}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  FIN DU TEST');
  console.log('═══════════════════════════════════════════════════');
}

run();
