/**
 * salaryCostSync — Bidirectional sync between employee_cost_profiles and salary_history.
 * 
 * When a cost profile is saved → upsert salary_history entry
 * When a salary history entry is saved → upsert employee_cost_profiles entry
 */

import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';

/**
 * After saving a cost profile, sync salary_gross_monthly → salary_history.monthly_salary
 */
export async function syncCostProfileToSalaryHistory(params: {
  collaboratorId: string;
  salaryGrossMonthly: number | null;
  loadedHourlyCost: number | null;
  effectiveDate: string;
}): Promise<void> {
  const { collaboratorId, salaryGrossMonthly, loadedHourlyCost, effectiveDate } = params;
  if (!salaryGrossMonthly && !loadedHourlyCost) return;

  try {
    // Find current contract for collaborator
    const { data: contract } = await supabase
      .from('employment_contracts')
      .select('id')
      .eq('collaborator_id', collaboratorId)
      .eq('is_current', true)
      .maybeSingle();

    if (!contract?.id) return; // No active contract — skip sync

    // Check if a salary_history entry exists for this date
    const { data: existing } = await supabase
      .from('salary_history')
      .select('id')
      .eq('contract_id', contract.id)
      .eq('effective_date', effectiveDate)
      .maybeSingle();

    const payload = {
      contract_id: contract.id,
      effective_date: effectiveDate,
      monthly_salary: salaryGrossMonthly,
      hourly_rate: loadedHourlyCost,
      reason_type: 'cost_profile_sync' as string,
      comment: 'Synchronisé depuis le profil coût',
    };

    if (existing?.id) {
      await supabase
        .from('salary_history')
        .update({
          monthly_salary: salaryGrossMonthly,
          hourly_rate: loadedHourlyCost,
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('salary_history').insert(payload);
    }
  } catch (err) {
    logError('[salaryCostSync] costProfile→salaryHistory', err);
  }
}

/**
 * After saving a salary history entry, sync monthly_salary → employee_cost_profiles.salary_gross_monthly
 */
export async function syncSalaryHistoryToCostProfile(params: {
  collaboratorId: string;
  agencyId: string;
  monthlySalary: number | null;
  hourlyRate: number | null;
  effectiveDate: string;
}): Promise<void> {
  const { collaboratorId, agencyId, monthlySalary, hourlyRate, effectiveDate } = params;
  if (!monthlySalary && !hourlyRate) return;

  try {
    // Check if cost profile exists for this collaborator
    const { data: existing } = await (supabase as any)
      .from('employee_cost_profiles')
      .select('id, salary_gross_monthly, employer_charges_rate, monthly_productive_hours, employer_monthly_cost, vehicle_monthly_cost, fuel_monthly_cost, equipment_monthly_cost, other_monthly_costs')
      .eq('collaborator_id', collaboratorId)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    const chargeRate = existing?.employer_charges_rate ?? 45;
    const employerCost = monthlySalary ? monthlySalary * (1 + chargeRate / 100) : (existing?.employer_monthly_cost ?? null);
    const productiveHours = existing?.monthly_productive_hours ?? 130;

    // Compute loaded hourly cost
    const totalMonthlyCost = (employerCost || 0)
      + (existing?.vehicle_monthly_cost || 0)
      + (existing?.fuel_monthly_cost || 0)
      + (existing?.equipment_monthly_cost || 0)
      + (existing?.other_monthly_costs || 0);
    const computedHourly = productiveHours > 0 ? Math.round((totalMonthlyCost / productiveHours) * 100) / 100 : null;

    const payload: Record<string, any> = {
      agency_id: agencyId,
      collaborator_id: collaboratorId,
      salary_gross_monthly: monthlySalary,
      effective_from: effectiveDate,
      cost_source: 'salary_sync',
      updated_at: new Date().toISOString(),
    };

    if (employerCost != null) payload.employer_monthly_cost = Math.round(employerCost * 100) / 100;
    if (computedHourly != null) payload.loaded_hourly_cost = computedHourly;

    if (existing?.id) {
      // Update existing profile
      await (supabase as any)
        .from('employee_cost_profiles')
        .update(payload)
        .eq('id', existing.id);
    } else {
      // Create new profile with defaults
      await (supabase as any)
        .from('employee_cost_profiles')
        .insert({
          ...payload,
          employer_charges_rate: chargeRate,
          monthly_paid_hours: 151.67,
          monthly_productive_hours: productiveHours,
        });
    }
  } catch (err) {
    logError('[salaryCostSync] salaryHistory→costProfile', err);
  }
}