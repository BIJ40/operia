/**
 * MaintenanceRepository — Typed Supabase queries for maintenance events.
 */
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';
import { DEFAULT_LIST_LIMIT } from '@/services/BaseQueryService';

const MAINTENANCE_SELECT = `
  *,
  vehicle:fleet_vehicles!vehicle_id(id, name, registration),
  tool:tools!tool_id(id, label, category),
  plan_item:maintenance_plan_items!plan_item_id(id, label, frequency_unit, frequency_value),
  completed_by_collaborator:collaborators!completed_by(id, first_name, last_name)
` as const;

export interface MaintenanceFilters {
  agencyId?: string;
  targetType?: string;
  vehicleId?: string;
  toolId?: string;
  status?: string;
  limit?: number;
}

export async function listMaintenanceEvents(filters: MaintenanceFilters = {}) {
  const limit = filters.limit ?? DEFAULT_LIST_LIMIT;

  let query = supabase
    .from('maintenance_events')
    .select(MAINTENANCE_SELECT)
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (filters.agencyId) query = query.eq('agency_id', filters.agencyId);
  if (filters.targetType) query = query.eq('target_type', filters.targetType);
  if (filters.vehicleId) query = query.eq('vehicle_id', filters.vehicleId);
  if (filters.toolId) query = query.eq('tool_id', filters.toolId);
  if (filters.status) query = query.eq('status', filters.status);

  const { data, error } = await query;

  if (error) {
    logError('[maintenanceRepository.listMaintenanceEvents]', error);
    throw error;
  }
  return data ?? [];
}

export async function getMaintenanceEventById(id: string) {
  const { data, error } = await supabase
    .from('maintenance_events')
    .select(MAINTENANCE_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    logError('[maintenanceRepository.getMaintenanceEventById]', error);
    throw error;
  }
  return data;
}

export async function createMaintenanceEvent(payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('maintenance_events')
    .insert(payload)
    .select(MAINTENANCE_SELECT)
    .single();

  if (error) {
    logError('[maintenanceRepository.createMaintenanceEvent]', error);
    throw error;
  }
  return data;
}

export async function updateMaintenanceEvent(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('maintenance_events')
    .update(payload)
    .eq('id', id)
    .select(MAINTENANCE_SELECT)
    .single();

  if (error) {
    logError('[maintenanceRepository.updateMaintenanceEvent]', error);
    throw error;
  }
  return data;
}

export async function deleteMaintenanceEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('maintenance_events')
    .delete()
    .eq('id', id);

  if (error) {
    logError('[maintenanceRepository.deleteMaintenanceEvent]', error);
    throw error;
  }
}
