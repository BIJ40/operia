/**
 * Performance Terrain — Consolidation pipeline
 * Unifie interventions + créneaux en WorkItems, avec matching/déduplication
 */

import type { WorkItem, MatchOutcome } from './types';
import { resolveDuration } from './duration';
import { classifyWorkItem, isSavIntervention } from './classification';
import { normalizeWorkItemDates, shouldMergeWorkItems, mergeWorkItems, scoreWorkItemSimilarity } from './matching';
import type { MatchDecision } from './matching';

export interface ConsolidationResult {
  items: WorkItem[];
  matchLog: MatchDecision[];
}

/**
 * Build unified work items from raw API data.
 * Pipeline: extract visites → extract créneaux → match by score → merge or keep separate → trace
 */
export function buildUnifiedWorkItems(
  interventions: Record<string, unknown>[],
  creneaux: Record<string, unknown>[],
  projectsById: Map<string, Record<string, unknown>>,
  period: { start: Date; end: Date },
  defaultTaskDuration: number
): ConsolidationResult {
  const startTs = period.start.getTime();
  const endTs = period.end.getTime();

  // 1. Extract work items from intervention visites
  const visiteItems: WorkItem[] = [];
  for (const intervention of interventions) {
    const interventionId = intervention.id != null ? String(intervention.id) : undefined;
    const projectId = intervention.projectId != null ? String(intervention.projectId) : undefined;
    const project = projectId ? projectsById.get(projectId) : undefined;

    const visites = (
      (intervention.data as Record<string, unknown>)?.visites as unknown[] ||
      intervention.visites as unknown[] || []
    );

    if (Array.isArray(visites) && visites.length > 0) {
      for (const v of visites as Record<string, unknown>[]) {
        const dateStr = (v.date || v.dateIntervention || '') as string;
        if (!dateStr) continue;
        const ts = new Date(dateStr).getTime();
        if (isNaN(ts) || ts < startTs || ts > endTs) continue;

        const usersRaw = (v.usersIds || v.userIds || []) as unknown[];
        const techIds = Array.isArray(usersRaw) ? usersRaw.map(x => String(x)) : [];
        if (techIds.length === 0) continue;

        const vType = (v.type || intervention.type || '') as string;
        const vType2 = (v.type2 || intervention.type2 || (intervention.data as Record<string, unknown>)?.type2 || '') as string;

        const dur = resolveDuration({
          duration: Number(v.duree) || undefined,
          dureeMinutes: Number(v.dureeMinutes) || undefined,
          duree: Number(intervention.duree) || Number(intervention.duration) || undefined,
          heureDebut: v.heureDebut as string,
          heureFin: v.heureFin as string,
        }, defaultTaskDuration);

        const { category } = classifyWorkItem(vType, vType2);
        const isSav = isSavIntervention(intervention, project || null);

        const start = new Date(dateStr);
        const item: WorkItem = normalizeWorkItemDates({
          id: `visite-${interventionId}-${dateStr}-${techIds.join(',')}`,
          source: 'visite',
          start,
          end: new Date(start.getTime() + dur.minutes * 60000),
          durationMinutes: dur.minutes,
          durationSource: dur.source,
          technicians: techIds,
          category: isSav ? 'sav' : category,
          interventionId,
          projectId,
          type: vType,
          type2: vType2,
          isSav,
        }, defaultTaskDuration);

        visiteItems.push(item);
      }
    } else {
      // Fallback: intervention without visites
      const dateStr = (intervention.date || intervention.dateIntervention || '') as string;
      const ts = dateStr ? new Date(dateStr).getTime() : NaN;
      if (!dateStr || isNaN(ts) || ts < startTs || ts > endTs) continue;

      const uid = intervention.userId != null ? String(intervention.userId) : undefined;
      if (!uid) continue;

      const iType = (intervention.type || '') as string;
      const iType2 = (intervention.type2 || (intervention.data as Record<string, unknown>)?.type2 || '') as string;

      const dur = resolveDuration({
        duration: Number(intervention.duree) || Number(intervention.duration) || undefined,
      }, defaultTaskDuration);

      const { category } = classifyWorkItem(iType, iType2);
      const isSav = isSavIntervention(intervention, project || null);

      const start = new Date(dateStr);
      visiteItems.push(normalizeWorkItemDates({
        id: `interv-${interventionId}-${dateStr}`,
        source: 'intervention',
        start,
        end: new Date(start.getTime() + dur.minutes * 60000),
        durationMinutes: dur.minutes,
        durationSource: dur.source,
        technicians: [uid],
        category: isSav ? 'sav' : category,
        interventionId,
        projectId,
        type: iType,
        type2: iType2,
        isSav,
      }, defaultTaskDuration));
    }
  }

  // 2. Extract work items from créneaux
  const creneauItems: WorkItem[] = [];
  const interventionsById = new Map<string, Record<string, unknown>>();
  for (const i of interventions) {
    if (i.id != null) interventionsById.set(String(i.id), i);
  }

  for (const c of creneaux) {
    const dateStr = (c.date || '') as string;
    const ts = dateStr ? new Date(dateStr).getTime() : NaN;
    if (!dateStr || isNaN(ts) || ts < startTs || ts > endTs) continue;

    const usersRaw = (c.usersIds || []) as unknown[];
    const techIds = Array.isArray(usersRaw) ? usersRaw.map(x => String(x)) : [];
    if (techIds.length === 0) continue;

    const interventionId = c.interventionId != null ? String(c.interventionId) : undefined;
    const intervention = interventionId ? interventionsById.get(interventionId) : undefined;
    const projectId = intervention?.projectId != null ? String(intervention.projectId) : undefined;
    const project = projectId ? projectsById.get(projectId) : undefined;

    const cType = (intervention?.type || '') as string;
    const cType2 = (intervention?.type2 || (intervention?.data as Record<string, unknown>)?.type2 || '') as string;

    const dur = resolveDuration({
      planningDuree: Number(c.duree) || undefined,
    }, defaultTaskDuration);

    const { category } = classifyWorkItem(cType, cType2);
    const isSav = isSavIntervention(intervention || null, project || null);

    const start = new Date(dateStr);
    creneauItems.push(normalizeWorkItemDates({
      id: `creneau-${c.id || dateStr}-${techIds.join(',')}`,
      source: 'planning',
      start,
      end: new Date(start.getTime() + dur.minutes * 60000),
      durationMinutes: dur.minutes,
      durationSource: dur.source,
      technicians: techIds,
      category: isSav ? 'sav' : category,
      interventionId,
      projectId,
      type: cType,
      type2: cType2,
      isSav,
    }, defaultTaskDuration));
  }

  // 3. Match and merge
  const matchLog: MatchDecision[] = [];

  // If we have visite items, try to match creneaux against them
  if (visiteItems.length > 0 && creneauItems.length > 0) {
    const mergedCreneauIds = new Set<string>();

    for (const cItem of creneauItems) {
      let bestMatch: WorkItem | null = null;
      let bestScore = 0;

      for (const vItem of visiteItems) {
        const score = scoreWorkItemSimilarity(vItem, cItem);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = vItem;
        }
      }

      if (bestMatch && shouldMergeWorkItems(bestMatch, cItem)) {
        // Merge: visite takes priority, enrich with créneau data
        const idx = visiteItems.indexOf(bestMatch);
        if (idx >= 0) {
          visiteItems[idx] = mergeWorkItems(bestMatch, cItem);
        }
        mergedCreneauIds.add(cItem.id);
        matchLog.push({ aId: bestMatch.id, bId: cItem.id, score: bestScore, outcome: 'merged' });
      } else {
        matchLog.push({
          aId: bestMatch?.id || '',
          bId: cItem.id,
          score: bestScore,
          outcome: bestScore > 0.3 ? 'discarded_as_duplicate' : 'kept_separate',
        });

        // Keep créneau only if low similarity (truly separate activity)
        if (bestScore <= 0.3) {
          visiteItems.push(cItem);
        }
      }
    }

    return { items: visiteItems, matchLog };
  }

  // If no visites, use creneaux directly
  if (visiteItems.length === 0) {
    return { items: creneauItems, matchLog };
  }

  return { items: visiteItems, matchLog };
}
