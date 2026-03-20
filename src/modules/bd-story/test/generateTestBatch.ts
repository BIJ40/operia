/**
 * BD Story — Test Generator
 * Génère 20 histoires et affiche un rapport de qualité
 * Usage: npx tsx src/modules/bd-story/test/generateTestBatch.ts
 */

import { generateStory } from '../engine/storyOrchestrator';
import { auditCoverage } from '../engine/copyEngine';
import { checkStoryBible } from '../data/storyBible';
import { narrativeDistance } from '../data/storyBible';
import { BdStoryGenerationInput, GeneratedStory } from '../types/bdStory.types';
import { STORY_TEMPLATES } from '../data/templates';

// ============================================================================
// CONFIG
// ============================================================================

const TOTAL_STORIES = 20;
const AGENCY_ID = 'test-agency';

// ============================================================================
// GENERATE
// ============================================================================

function run() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  BD STORY — TEST DE GÉNÉRATION (20 histoires)');
  console.log('═══════════════════════════════════════════════════\n');

  const stories: GeneratedStory[] = [];
  const results: Array<{
    idx: number;
    title: string;
    universe: string;
    template: string;
    technician: string;
    client: string;
    room: string;
    tone: string;
    cta: string;
    panelTexts: string[];
    wordCounts: number[];
    bibleViolations: number;
    diversityScore: number;
    valid: boolean;
  }> = [];

  // Generate one story per unique template first, then fill the rest
  const templateKeys = STORY_TEMPLATES.map(t => t.key);
  
  for (let i = 0; i < TOTAL_STORIES; i++) {
    const input: BdStoryGenerationInput = {
      agencyId: AGENCY_ID,
      templateType: i < templateKeys.length ? templateKeys[i] as any : undefined,
      season: (['printemps', 'ete', 'automne', 'hiver'] as const)[i % 4],
      tone: (['rassurant', 'pedagogique', 'reactif', 'proximite'] as const)[i % 4],
      avoidRecentProblemSlugs: stories.slice(-5).map(s => s.problemSlug),
      avoidRecentTechnicianSlugs: stories.slice(-3).map(s => s.assignedCharacters.technician),
      avoidRecentStoryKeys: stories.slice(-10).map(s => s.storyKey),
    };

    const output = generateStory(input, stories);
    const story = output.story;
    stories.push(story);

    const bibleCheck = checkStoryBible(story);
    const wordCounts = story.panels.map(p => p.text.trim().split(/\s+/).length);

    results.push({
      idx: i + 1,
      title: story.title,
      universe: story.universe,
      template: story.templateKey,
      technician: story.assignedCharacters.technician,
      client: story.clientProfileSlug,
      room: story.locationContext.room,
      tone: story.tone,
      cta: story.ctaText,
      panelTexts: story.panels.map(p => p.text),
      wordCounts,
      bibleViolations: bibleCheck.length,
      diversityScore: story.diversityScore.totalScore,
      valid: story.validation.isValid,
    });
  }

  // ============================================================================
  // REPORT
  // ============================================================================

  console.log('📋 HISTOIRES GÉNÉRÉES\n');
  console.log('─'.repeat(120));

  for (const r of results) {
    const status = r.valid ? '✅' : '❌';
    const bible = r.bibleViolations === 0 ? '✅' : `⚠️ ${r.bibleViolations}`;
    
    console.log(`\n${status} #${r.idx} — ${r.title}`);
    console.log(`   Univers: ${r.universe} | Template: ${r.template} | Tech: ${r.technician} | Client: ${r.client}`);
    console.log(`   Pièce: ${r.room} | Ton: ${r.tone} | Bible: ${bible} | Diversité: ${r.diversityScore.toFixed(2)}`);
    console.log(`   CTA: "${r.cta}"`);
    console.log(`   Cases:`);
    for (let p = 0; p < r.panelTexts.length; p++) {
      const wc = r.wordCounts[p];
      const wcFlag = (wc < 3 || wc > 8) ? ' ⚠️' : '';
      console.log(`     ${(p + 1).toString().padStart(2)}. "${r.panelTexts[p]}" (${wc} mots)${wcFlag}`);
    }
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================

  console.log('\n\n═══════════════════════════════════════════════════');
  console.log('  RÉSUMÉ');
  console.log('═══════════════════════════════════════════════════\n');

  const validCount = results.filter(r => r.valid).length;
  const bibleClean = results.filter(r => r.bibleViolations === 0).length;
  const avgDiversity = results.reduce((s, r) => s + r.diversityScore, 0) / results.length;

  console.log(`✅ Histoires valides:      ${validCount}/${TOTAL_STORIES}`);
  console.log(`✅ Bible respectée:        ${bibleClean}/${TOTAL_STORIES}`);
  console.log(`📊 Score diversité moyen:  ${avgDiversity.toFixed(3)}`);

  // Distribution
  const univDist: Record<string, number> = {};
  const techDist: Record<string, number> = {};
  const tmplDist: Record<string, number> = {};
  const roomDist: Record<string, number> = {};
  const toneDist: Record<string, number> = {};

  for (const r of results) {
    univDist[r.universe] = (univDist[r.universe] || 0) + 1;
    techDist[r.technician] = (techDist[r.technician] || 0) + 1;
    tmplDist[r.template] = (tmplDist[r.template] || 0) + 1;
    roomDist[r.room] = (roomDist[r.room] || 0) + 1;
    toneDist[r.tone] = (toneDist[r.tone] || 0) + 1;
  }

  console.log('\n📊 Distribution univers:', JSON.stringify(univDist));
  console.log('📊 Distribution techniciens:', JSON.stringify(techDist));
  console.log('📊 Distribution templates:', JSON.stringify(tmplDist));
  console.log('📊 Distribution pièces:', JSON.stringify(roomDist));
  console.log('📊 Distribution tons:', JSON.stringify(toneDist));

  // Narrative distance between consecutive stories
  console.log('\n📏 Distance narrative entre histoires consécutives:');
  for (let i = 1; i < results.length; i++) {
    const dist = narrativeDistance(results[i - 1].template, results[i].template);
    const bar = '█'.repeat(dist) + '░'.repeat(4 - dist);
    console.log(`   #${i} → #${i + 1}: ${bar} (${dist}/4)`);
  }

  // Word count issues
  const wordIssues = results.flatMap(r => 
    r.wordCounts.map((wc, i) => ({ story: r.idx, panel: i + 1, wc }))
      .filter(x => x.wc < 3 || x.wc > 8)
  );
  
  if (wordIssues.length > 0) {
    console.log(`\n⚠️ Problèmes de longueur de texte (${wordIssues.length}):`);
    for (const issue of wordIssues) {
      console.log(`   Histoire #${issue.story}, case ${issue.panel}: ${issue.wc} mots`);
    }
  } else {
    console.log('\n✅ Toutes les phrases respectent la longueur 3-8 mots');
  }

  // Coverage audit
  const coverage = auditCoverage();
  console.log(`\n📚 Couverture textAtoms: ${coverage.coveragePercent}% (${coverage.coveredCombinations}/${coverage.totalPossibleCombinations})`);
  console.log(`   Total phrases: ${coverage.totalAtoms}`);
  if (coverage.gaps.length > 0) {
    console.log(`   Trous (0 phrase): ${coverage.gaps.length}`);
    for (const gap of coverage.gaps.slice(0, 10)) {
      console.log(`     - ${gap.universe} / ${gap.narrativeFunction} / ${gap.tone}`);
    }
    if (coverage.gaps.length > 10) {
      console.log(`     ... et ${coverage.gaps.length - 10} autres`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  FIN DU TEST');
  console.log('═══════════════════════════════════════════════════');
}

run();
