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
  CostValidation,
  ValidationStatus,
} from '@/types/projectProfitability';

// ─── employee_cost_profiles ──────────────────────────────────

/**
 * Lists cost profiles enriched with apogee_user_id from the collaborators join.
 */
export async function listCostProfiles(
  agencyId: string,
  options?: { limit?: number },
): Promise<EmployeeCostProfile[]> {
  const { limit = DEFAULT_LIST_LIMIT } = options ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('employee_cost_profiles')
    .select('*, collaborators!inner(apogee_user_id)')
    .eq('agency_id', agencyId)
    .order('effective_from', { ascending: false })
    .limit(limit);

  if (error) { logError('[profitabilityRepo.listCostProfiles]', error); throw error; }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const collaborators = row.collaborators as { apogee_user_id: number | null } | null;
    const { collaborators: _discard, ...rest } = row;
    return {
      ...rest,
      apogee_user_id: collaborators?.apogee_user_id ?? null,
    } as EmployeeCostProfile;
  });
}

export async function getCostProfileByCollaborator(
  collaboratorId: string,
): Promise<EmployeeCostProfile | null> {
  const today = new Date().toISOString().slice(0, 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('employee_cost_profiles')
    .select('*, collaborators!inner(apogee_user_id)')
    .eq('collaborator_id', collaboratorId)
    .lte('effective_from', today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) { logError('[profitabilityRepo.getCostProfileByCollaborator]', error); throw error; }
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const collaborators = row.collaborators as { apogee_user_id: number | null } | null;
  const { collaborators: _discard, ...rest } = row;
  return {
    ...rest,
    apogee_user_id: collaborators?.apogee_user_id ?? null,
  } as EmployeeCostProfile;
}

export async function upsertCostProfile(
  profile: Partial<EmployeeCostProfile> & { agency_id: string; collaborator_id: string },
): Promise<Omit<EmployeeCostProfile, 'apogee_user_id'>> {
  const { apogee_user_id: _strip, ...dbFields } = profile;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('employee_cost_profiles')
    .upsert({ ...dbFields, updated_at: new Date().toISOString() })
    .select('*')
    .single();

  if (error) { logError('[profitabilityRepo.upsertCostProfile]', error); throw error; }
  return data as Omit<EmployeeCostProfile, 'apogee_user_id'>;
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

/**
 * Update salary document validation status with traceability.
 */
export async function updateSalaryDocumentValidation(
  id: string,
  status: ValidationStatus,
  userId: string,
): Promise<SalaryDocument> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('employee_salary_documents')
    .update({
      validation_status: status,
      validated_by: status === 'validated' ? userId : null,
      validated_at: status === 'validated' ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) { logError('[profitabilityRepo.updateSalaryDocumentValidation]', error); throw error; }
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

export async function deleteProjectCost(id: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('project_costs')
    .delete()
    .eq('id', id);

  if (error) { logError('[profitabilityRepo.deleteProjectCost]', error); throw error; }
}

/**
 * Update validation status with traceability (validated_by + validated_at).
 */
export async function updateProjectCostValidation(
  id: string,
  status: CostValidation,
  userId: string,
): Promise<ProjectCost> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('project_costs')
    .update({
      validation_status: status,
      validated_by: status === 'validated' ? userId : null,
      validated_at: status === 'validated' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) { logError('[profitabilityRepo.updateProjectCostValidation]', error); throw error; }
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

/**
 * Update project cost document validation status.
 * Note: project_cost_documents only has validation_status (no validated_by/validated_at).
 */
export async function updateProjectCostDocumentValidation(
  id: string,
  status: ValidationStatus,
): Promise<ProjectCostDocument> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('project_cost_documents')
    .update({ validation_status: status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) { logError('[profitabilityRepo.updateProjectCostDocumentValidation]', error); throw error; }
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

export async function deleteOverheadRule(id: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('agency_overhead_rules')
    .delete()
    .eq('id', id);

  if (error) { logError('[profitabilityRepo.deleteOverheadRule]', error); throw error; }
}

/**
 * Update overhead rule validation status.
 * Status-only — no validated_by/validated_at on agency_overhead_rules.
 */
export async function updateOverheadRuleValidation(
  id: string,
  status: CostValidation,
): Promise<AgencyOverheadRule> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('agency_overhead_rules')
    .update({
      validation_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) { logError('[profitabilityRepo.updateOverheadRuleValidation]', error); throw error; }
  return data as AgencyOverheadRule;
}

// ─── project_profitability_snapshots ─────────────────────────

/**
 * Get the most recent snapshot for a project (by version DESC).
 */
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
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) { logError('[profitabilityRepo.getSnapshot]', error); throw error; }
  return data as ProfitabilitySnapshot | null;
}

/**
 * Upsert a snapshot with versioning protection:
 * - If a draft exists → update it in-place
 * - If last snapshot is validated → insert new version (preserving the validated one)
 * - If none exists → insert version 1
 * 
 * IMPORTANT: Always creates/updates as 'draft'. Never auto-validates.
 */
export async function upsertSnapshot(
  snapshot: Omit<ProfitabilitySnapshot, 'id' | 'created_at'>,
): Promise<ProfitabilitySnapshot> {
  const { agency_id, project_id } = snapshot;

  // Force draft status — recalculate never auto-validates
  const snapshotData = {
    ...snapshot,
    validation_status: 'draft' as CostValidation,
    validated_by: null,
    validated_at: null,
  };

  // 1. Find latest snapshot for this project
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lastSnapshot, error: fetchError } = await (supabase as any)
    .from('project_profitability_snapshots')
    .select('id, version, validation_status')
    .eq('agency_id', agency_id)
    .eq('project_id', project_id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) { logError('[profitabilityRepo.upsertSnapshot] fetch last', fetchError); throw fetchError; }

  const nextVersion = (lastSnapshot?.version ?? 0) + 1;

  // 2. Check if there's an existing draft to update
  if (lastSnapshot?.validation_status === 'draft') {
    // Update draft in-place
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('project_profitability_snapshots')
      .update({
        ...snapshotData,
        version: lastSnapshot.version, // keep same version for draft update
      })
      .eq('id', lastSnapshot.id)
      .select('*')
      .single();

    if (error) { logError('[profitabilityRepo.upsertSnapshot] update draft', error); throw error; }
    return data as ProfitabilitySnapshot;
  }

  // 3. Last snapshot is validated (or none exists) → insert new version
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('project_profitability_snapshots')
    .insert({
      ...snapshotData,
      version: lastSnapshot ? nextVersion : 1,
      previous_snapshot_id: lastSnapshot?.id ?? null,
    })
    .select('*')
    .single();

  if (error) { logError('[profitabilityRepo.upsertSnapshot] insert new version', error); throw error; }
  return data as ProfitabilitySnapshot;
}

/**
 * Update snapshot validation status with traceability.
 */
export async function updateSnapshotValidation(
  id: string,
  status: CostValidation,
  userId: string,
): Promise<ProfitabilitySnapshot> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('project_profitability_snapshots')
    .update({
      validation_status: status,
      validated_by: status === 'validated' ? userId : null,
      validated_at: status === 'validated' ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) { logError('[profitabilityRepo.updateSnapshotValidation]', error); throw error; }
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

// ─── Collaborator resolution ─────────────────────────────────

export interface CollaboratorMinimal {
  id: string;
  first_name: string;
  last_name: string;
  apogee_user_id: number | null;
}

/**
 * List collaborators for an agency (minimal fields for mapping).
 */
export async function listCollaboratorsMinimal(
  agencyId: string,
): Promise<CollaboratorMinimal[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('collaborators')
    .select('id, first_name, last_name, apogee_user_id')
    .eq('agency_id', agencyId)
    .order('last_name', { ascending: true })
    .limit(500);

  if (error) { logError('[profitabilityRepo.listCollaboratorsMinimal]', error); throw error; }
  return (data ?? []) as CollaboratorMinimal[];
}
