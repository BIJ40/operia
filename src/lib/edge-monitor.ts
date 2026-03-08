/**
 * Edge Function Monitor — Client-side observability for edge function calls
 * 
 * Measures duration, captures errors, and centralizes logs for
 * all edge function invocations from the frontend.
 * No external dependency required.
 */

import { createLogger } from './observability';

const log = createLogger({ module: 'edge-monitor' });

// ============================================================================
// Types
// ============================================================================

interface EdgeCallMetrics {
  functionName: string;
  durationMs: number;
  status: 'success' | 'error';
  httpStatus?: number;
  error?: string;
  userId?: string;
  agencyId?: string;
}

interface EdgeMonitorOptions {
  /** Log slow calls above this threshold (ms). Default: 3000 */
  slowThresholdMs?: number;
  /** Track metrics in-memory for debugging. Default: true in dev */
  trackHistory?: boolean;
}

// ============================================================================
// In-memory metrics buffer (dev only)
// ============================================================================

const MAX_HISTORY = 100;
const metricsHistory: EdgeCallMetrics[] = [];

function recordMetric(metric: EdgeCallMetrics, trackHistory: boolean) {
  if (trackHistory) {
    metricsHistory.push(metric);
    if (metricsHistory.length > MAX_HISTORY) {
      metricsHistory.shift();
    }
  }
}

// ============================================================================
// Public API
// ============================================================================

const isDev = typeof window !== 'undefined' && 
  (window.location?.hostname === 'localhost' || import.meta.env.DEV);

const defaultOptions: Required<EdgeMonitorOptions> = {
  slowThresholdMs: 3000,
  trackHistory: isDev,
};

/**
 * Wraps an edge function call with monitoring.
 * 
 * @example
 * const result = await monitorEdgeCall('create-user', async () => {
 *   return supabase.functions.invoke('create-user', { body: payload });
 * }, { userId: currentUser.id });
 */
export async function monitorEdgeCall<T>(
  functionName: string,
  fn: () => Promise<T>,
  context?: { userId?: string; agencyId?: string },
  options?: EdgeMonitorOptions
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  const start = performance.now();

  try {
    const result = await fn();
    const durationMs = Math.round(performance.now() - start);

    const metric: EdgeCallMetrics = {
      functionName,
      durationMs,
      status: 'success',
      userId: context?.userId,
      agencyId: context?.agencyId,
    };

    recordMetric(metric, opts.trackHistory);

    if (durationMs > opts.slowThresholdMs) {
      log.warn(`Slow edge call: ${functionName}`, { durationMs });
    } else {
      log.debug(`Edge call: ${functionName}`, { durationMs });
    }

    return result;
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);
    const errorMessage = error instanceof Error ? error.message : String(error);

    const metric: EdgeCallMetrics = {
      functionName,
      durationMs,
      status: 'error',
      error: errorMessage,
      userId: context?.userId,
      agencyId: context?.agencyId,
    };

    recordMetric(metric, opts.trackHistory);
    log.error(`Edge call failed: ${functionName}`, { durationMs, error: errorMessage });

    throw error;
  }
}

/**
 * Get recent edge call metrics (dev debugging).
 */
export function getEdgeMetrics(): readonly EdgeCallMetrics[] {
  return metricsHistory;
}

/**
 * Get summary stats for edge calls.
 */
export function getEdgeMetricsSummary() {
  if (metricsHistory.length === 0) return null;

  const byFunction = new Map<string, { count: number; errors: number; totalMs: number }>();

  for (const m of metricsHistory) {
    const entry = byFunction.get(m.functionName) ?? { count: 0, errors: 0, totalMs: 0 };
    entry.count++;
    entry.totalMs += m.durationMs;
    if (m.status === 'error') entry.errors++;
    byFunction.set(m.functionName, entry);
  }

  return Object.fromEntries(
    Array.from(byFunction.entries()).map(([fn, stats]) => [
      fn,
      {
        calls: stats.count,
        errors: stats.errors,
        avgMs: Math.round(stats.totalMs / stats.count),
      },
    ])
  );
}
