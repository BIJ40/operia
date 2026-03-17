/**
 * ProfitabilityRepository — Typed Supabase queries for the profitability module.
 */
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';
import { DEFAULT_LIST_LIMIT } from '@/services/BaseQueryService';
import type {
  EmployeeCostProfile,
  SalaryDocument,
  ProjectCost,
  ProjectCostDocument,
  AgencyOverheadRule,
  ProfitabilitySnapshot,
} from '@/types/projectProfitability';

// ─── employee_cost_profiles ──────────────────────────────────

export async function listCostProfiles(
  agencyId: string,
  options?: { limit?: number },
): Promise<EmployeeCostProfile[]> {
  const { limit = DEFAULT_LIST_LIMIT } = options ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('employee_cost_profiles')
    .select('*')
    .eq('agency_id', agencyId)
    .order('effective_from', { ascending: false })
    .limit(limit);

  if (error) { logError('[profitabilityRepo.listCostProfiles]', error); throw error; }
  return (data ?? []) as EmployeeCostProfile[];
}

export async function getCostProfileByCollaborator(
  collaboratorId: string,
): Promise<EmployeeCostProfile | null> {
  const today = new Date().toISOString().slice(0, 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('employee_cost_profiles')
    .select('*')
    .eq('collaborator_id', collaboratorId)
    .lte('effective_from', today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) { logError('[profitabilityRepo.getCostProfileByCollaborator]', error); throw error; }
  return data as EmployeeCostProfile | null;
}

export async function upsertCostProfile(
  profile: Partial<EmployeeCostProfile> & { agency_id: string; collaborator_id: string },
): Promise<EmployeeCostProfile> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('employee_cost_profiles')
    .upsert({ ...profile, updated_at: new Date().toISOString() })
    .select('*')
    .single();

  if (error) { logError('[profitabilityRepo.upsertCostProfile]', error); throw error; }
  return data as EmployeeCostProfile;
}

// ─── employee_salary_documents ───────────────────────────────

export async function listSalaryDocuments(
  agencyId: string,
  collaboratorId?: string,
): Promise<SalaryDocument[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('employee_salary_documents')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(DEFAULT_LIST_LIMIT);

  if (collaboratorId) query = query.eq('collaborator_id', collaboratorId);

  const { data, error } = await query;
  if (error) { logError('[profitabilityRepo.listSalaryDocuments]', error); throw error; }
  return (data ?? []) as SalaryDocument[];
}

export async function insertSalaryDocument(
  doc: Omit<SalaryDocument, 'id' | 'created_at'>,
): Promise<SalaryDocument> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('employee_salary_documents')
    .insert(doc)
    .select('*')
    .single();

  if (error) { logError('[profitabilityRepo.insertSalaryDocument]', error); throw error; }
  return data as SalaryDocument;
}

// ─── project_costs ───────────────────────────────────────────

export async function listProjectCosts(
  agencyId: string,
  projectId: string,
): Promise<ProjectCost[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('project_costs')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('project_id', projectId)
    .order('cost_date', { ascending: false })
    .limit(DEFAULT_LIST_LIMIT);

  if (error) { logError('[profitabilityRepo.listProjectCosts]', error); throw error; }
  return (data ?? []) as ProjectCost[];
}

export async function insertProjectCost(
  cost: Omit<ProjectCost, 'id' | 'created_at' | 'updated_at'>,
): Promise<ProjectCost> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('project_costs')
    .insert(cost)
    .select('*')
    .single();

  if (error) { logError('[profitabilityRepo.insertProjectCost]', error); throw error; }
  return data as ProjectCost;
}

export async function updateProjectCost(
  id: string,
  updates: Partial<ProjectCost>,
): Promise<ProjectCost> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('project_costs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) { logError('[profitabilityRepo.updateProjectCost]', error); throw error; }
  return data as ProjectCost;
}

// ─── project_cost_documents ──────────────────────────────────

export async function listProjectCostDocuments(
  agencyId: string,
  projectId: string,
): Promise<ProjectCostDocument[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('project_cost_documents')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(DEFAULT_LIST_LIMIT);

  if (error) { logError('[profitabilityRepo.listProjectCostDocuments]', error); throw error; }
  return (data ?? []) as ProjectCostDocument[];
}

export async function insertProjectCostDocument(
  doc: Omit<ProjectCostDocument, 'id' | 'created_at'>,
): Promise<ProjectCostDocument> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('project_cost_documents')
    .insert(doc)
    .select('*')
    .single();

  if (error) { logError('[profitabilityRepo.insertProjectCostDocument]', error); throw error; }
  return data as ProjectCostDocument;
}

// ─── agency_overhead_rules ───────────────────────────────────

export async function listOverheadRules(
  agencyId: string,
): Promise<AgencyOverheadRule[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('agency_overhead_rules')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(DEFAULT_LIST_LIMIT);

  if (error) { logError('[profitabilityRepo.listOverheadRules]', error); throw error; }
  return (data ?? []) as AgencyOverheadRule[];
}

export async function upsertOverheadRule(
  rule: Partial<AgencyOverheadRule> & { agency_id: string; cost_type: string },
): Promise<AgencyOverheadRule> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('agency_overhead_rules')
    .upsert({ ...rule, updated_at: new Date().toISOString() })
    .select('*')
    .single();

  if (error) { logError('[profitabilityRepo.upsertOverheadRule]', error); throw error; }
  return data as AgencyOverheadRule;
}

// ─── project_profitability_snapshots ─────────────────────────

export async function getSnapshot(
  agencyId: string,
  projectId: string,
): Promise<ProfitabilitySnapshot | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('project_profitability_snapshots')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) { logError('[profitabilityRepo.getSnapshot]', error); throw error; }
  return data as ProfitabilitySnapshot | null;
}

export async function upsertSnapshot(
  snapshot: Omit<ProfitabilitySnapshot, 'id' | 'created_at'>,
): Promise<ProfitabilitySnapshot> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('project_profitability_snapshots')
    .upsert(snapshot, { onConflict: 'agency_id,project_id' })
    .select('*')
    .single();

  if (error) { logError('[profitabilityRepo.upsertSnapshot]', error); throw error; }
  return data as ProfitabilitySnapshot;
}

export async function listSnapshots(
  agencyId: string,
  options?: { limit?: number },
): Promise<ProfitabilitySnapshot[]> {
  const { limit = DEFAULT_LIST_LIMIT } = options ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('project_profitability_snapshots')
    .select('*')
    .eq('agency_id', agencyId)
    .order('computed_at', { ascending: false })
    .limit(limit);

  if (error) { logError('[profitabilityRepo.listSnapshots]', error); throw error; }
  return (data ?? []) as ProfitabilitySnapshot[];
}
