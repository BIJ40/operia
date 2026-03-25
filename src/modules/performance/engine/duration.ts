/**
 * Performance Terrain — Duration resolution
 * Hiérarchie stricte de résolution des durées avec traçabilité
 */

import type { DurationSource } from './types';
import { MAX_DURATION_MINUTES, DEFAULT_THRESHOLDS } from './rules';

export interface DurationResult {
  minutes: number;
  source: DurationSource;
  isAberrant: boolean;
}

/**
 * Resolve the duration of a raw intervention/visite/creneau.
 * Follows strict hierarchy: explicit > computed > planning > business_default > unknown
 */
export function resolveDuration(raw: {
  duration?: number;
  dureeMinutes?: number;
  duree?: number;
  start?: Date | string;
  end?: Date | string;
  heureDebut?: string;
  heureFin?: string;
  planningDuree?: number;
}, defaultTaskDuration: number = DEFAULT_THRESHOLDS.defaultTaskDurationMinutes): DurationResult {
  // 1. Explicit duration
  const explicit = raw.duration ?? raw.dureeMinutes ?? raw.duree;
  if (explicit != null && explicit > 0) {
    return checkAberrant({ minutes: explicit, source: 'explicit', isAberrant: false }, defaultTaskDuration);
  }

  // 2. Computed from start/end
  if (raw.start && raw.end) {
    const s = raw.start instanceof Date ? raw.start : new Date(String(raw.start));
    const e = raw.end instanceof Date ? raw.end : new Date(String(raw.end));
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      const diff = (e.getTime() - s.getTime()) / 60000;
      if (diff > 0) {
        return checkAberrant({ minutes: diff, source: 'computed', isAberrant: false }, defaultTaskDuration);
      }
    }
  }

  // 2b. Computed from heureDebut/heureFin
  if (raw.heureDebut && raw.heureFin) {
    const s = new Date(`2000-01-01T${raw.heureDebut}`);
    const e = new Date(`2000-01-01T${raw.heureFin}`);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      const diff = (e.getTime() - s.getTime()) / 60000;
      if (diff > 0) {
        return checkAberrant({ minutes: diff, source: 'computed', isAberrant: false }, defaultTaskDuration);
      }
    }
  }

  // 3. Planning duration
  if (raw.planningDuree != null && raw.planningDuree > 0) {
    return checkAberrant({ minutes: raw.planningDuree, source: 'planning', isAberrant: false }, defaultTaskDuration);
  }

  // 4. Business default — traced explicitly
  return { minutes: defaultTaskDuration, source: 'business_default', isAberrant: false };
}

function checkAberrant(result: DurationResult, defaultDuration: number): DurationResult {
  if (result.minutes > MAX_DURATION_MINUTES || result.minutes < 0) {
    return { minutes: defaultDuration, source: result.source, isAberrant: true };
  }
  return result;
}
