/**
 * Module Prospection - Exports centralisés
 */

// Hooks
export { useApporteurListMetrics } from './hooks/useApporteurListMetrics';
export { useApporteurDashboard } from './hooks/useApporteurDashboard';
export { useApporteurComparison } from './hooks/useApporteurComparison';
export { useApporteurAlerts } from './hooks/useApporteurAlerts';
export { useProspectingFollowups, useCreateFollowup, useUpdateFollowup } from './hooks/useProspectingFollowups';
export { useProspectingMeetings, useCreateMeeting } from './hooks/useProspectingMeetings';

// Engine
export { aggregateDailyMetrics, aggregateUniversMetrics, aggregateByMonth } from './engine/aggregators';
export { generateApporteurInsights, generateAlerts } from './engine/insights';
export type { Insight, InsightLevel } from './engine/insights';
export type { AggregatedKPIs, UniversAggregated, DailyMetricRow, UniversDailyRow } from './engine/aggregators';
