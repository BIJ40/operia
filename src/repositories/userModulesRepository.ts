/**
 * UserModulesRepository — Typed Supabase queries for user_modules.
 */
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';

export interface UserModuleRow {
  id: string;
  user_id: string;
  module_key: string;
  options: Record<string, boolean> | null;
  enabled_at: string | null;
  enabled_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function listUserModules(userId: string): Promise<UserModuleRow[]> {
  const { data, error } = await supabase
    .from('user_modules')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    logError('[userModulesRepository.listUserModules]', error);
    throw error;
  }
  return (data ?? []) as UserModuleRow[];
}

export async function upsertUserModule(params: {
  userId: string;
  moduleKey: string;
  options?: Record<string, boolean> | null;
  enabledBy?: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from('user_modules')
    .upsert({
      user_id: params.userId,
      module_key: params.moduleKey,
      options: params.options || null,
      enabled_at: new Date().toISOString(),
      enabled_by: params.enabledBy || null,
    }, { onConflict: 'user_id,module_key' });

  if (error) {
    logError('[userModulesRepository.upsertUserModule]', error);
    throw error;
  }
}

export async function deleteUserModule(userId: string, moduleKey: string): Promise<void> {
  const { error } = await supabase
    .from('user_modules')
    .delete()
    .eq('user_id', userId)
    .eq('module_key', moduleKey);

  if (error) {
    logError('[userModulesRepository.deleteUserModule]', error);
    throw error;
  }
}

export async function deleteAllUserModules(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_modules')
    .delete()
    .eq('user_id', userId);

  if (error) {
    logError('[userModulesRepository.deleteAllUserModules]', error);
    throw error;
  }
}

export async function bulkInsertUserModules(
  rows: Array<{
    user_id: string;
    module_key: string;
    options: Record<string, boolean> | null;
    enabled_at: string;
    enabled_by: string | null;
  }>
): Promise<void> {
  if (rows.length === 0) return;

  const { error } = await supabase
    .from('user_modules')
    .insert(rows);

  if (error) {
    logError('[userModulesRepository.bulkInsertUserModules]', error);
    throw error;
  }
}
