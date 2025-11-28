import { supabase } from '@/integrations/supabase/client';
import { 
  type SystemRole, 
  SYSTEM_ROLE_LEVELS, 
  getSystemRoleCeiling 
} from '@/types/permissions';

// Re-export pour compatibilité
export type { SystemRole };
export { SYSTEM_ROLE_LEVELS, getSystemRoleCeiling };

export interface Group {
  id: string;
  label: string;
  description: string | null;
  type: 'franchise' | 'franchiseur';
  system_role_limit: SystemRole;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface GroupPermission {
  id: string;
  group_id: string;
  scope_id: string;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface Scope {
  id: string;
  slug: string;
  label: string;
  area: string;
  description: string | null;
  default_level: number | null;
  is_active: boolean | null;
  display_order: number | null;
}

export interface UserPermissionOverride {
  id: string;
  user_id: string;
  scope_id: string;
  level: number | null;
  deny: boolean | null;
}

// Labels de permissions pour l'UI
export const PERMISSION_LEVELS_UI = [
  { value: 0, label: 'Aucun', color: 'bg-muted text-muted-foreground' },
  { value: 1, label: 'Lecture', color: 'bg-blue-100 text-blue-800' },
  { value: 2, label: 'Écriture', color: 'bg-green-100 text-green-800' },
  { value: 3, label: 'Gestion', color: 'bg-orange-100 text-orange-800' },
  { value: 4, label: 'Admin', color: 'bg-red-100 text-red-800' },
];

// Alias pour compatibilité
export const PERMISSION_LEVELS = PERMISSION_LEVELS_UI;

// ========== GROUPS ==========

export async function fetchGroups(): Promise<Group[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('display_order');
  
  if (error) throw error;
  return data as Group[];
}

export async function createGroup(group: Partial<Group>): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .insert([{
      label: group.label!,
      description: group.description,
      type: group.type,
      system_role_limit: group.system_role_limit,
      is_active: group.is_active ?? true,
      display_order: group.display_order ?? 0,
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data as Group;
}

export async function updateGroup(id: string, updates: Partial<Group>): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as Group;
}

export async function deleteGroup(id: string): Promise<void> {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

export async function cloneGroup(id: string, newLabel: string): Promise<Group> {
  // Get the original group
  const { data: original, error: fetchError } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .single();
  
  if (fetchError) throw fetchError;
  
  // Create new group
  const { data: newGroup, error: createError } = await supabase
    .from('groups')
    .insert({
      label: newLabel,
      description: original.description,
      type: original.type,
      system_role_limit: original.system_role_limit,
      is_active: true,
      display_order: (original.display_order || 0) + 1,
    })
    .select()
    .single();
  
  if (createError) throw createError;
  
  // Copy permissions
  const { data: permissions } = await supabase
    .from('group_permissions')
    .select('*')
    .eq('group_id', id);
  
  if (permissions && permissions.length > 0) {
    await supabase
      .from('group_permissions')
      .insert(permissions.map(p => ({
        group_id: newGroup.id,
        scope_id: p.scope_id,
        level: p.level,
      })));
  }
  
  return newGroup as Group;
}

// ========== GROUP PERMISSIONS ==========

export async function fetchGroupPermissions(groupId: string): Promise<GroupPermission[]> {
  const { data, error } = await supabase
    .from('group_permissions')
    .select('*')
    .eq('group_id', groupId);
  
  if (error) throw error;
  return data as GroupPermission[];
}

export async function upsertGroupPermission(
  groupId: string, 
  scopeId: string, 
  level: number
): Promise<void> {
  const { error } = await supabase
    .from('group_permissions')
    .upsert({
      group_id: groupId,
      scope_id: scopeId,
      level,
    }, {
      onConflict: 'group_id,scope_id'
    });
  
  if (error) throw error;
}

export async function deleteGroupPermission(groupId: string, scopeId: string): Promise<void> {
  const { error } = await supabase
    .from('group_permissions')
    .delete()
    .eq('group_id', groupId)
    .eq('scope_id', scopeId);
  
  if (error) throw error;
}

// ========== SCOPES ==========

export async function fetchScopes(): Promise<Scope[]> {
  const { data, error } = await supabase
    .from('scopes')
    .select('*')
    .eq('is_active', true)
    .order('display_order');
  
  if (error) throw error;
  return data as Scope[];
}

// ========== USER PERMISSIONS ==========

export async function fetchUserPermissions(userId: string): Promise<UserPermissionOverride[]> {
  const { data, error } = await supabase
    .from('user_permissions')
    .select('*')
    .eq('user_id', userId);
  
  if (error) throw error;
  return data as UserPermissionOverride[];
}

export async function upsertUserPermission(
  userId: string,
  scopeId: string,
  level: number | null,
  deny: boolean = false
): Promise<void> {
  // Find existing block_id for this scope (backward compatibility)
  const { data: scope } = await supabase
    .from('scopes')
    .select('slug')
    .eq('id', scopeId)
    .single();
  
  const { error } = await supabase
    .from('user_permissions')
    .upsert({
      user_id: userId,
      scope_id: scopeId,
      block_id: scope?.slug || scopeId, // Backward compatibility
      level: level ?? 0,
      deny,
      can_access: !deny && (level ?? 0) > 0,
    }, {
      onConflict: 'user_id,scope_id'
    });
  
  if (error) throw error;
}

export async function deleteUserPermission(userId: string, scopeId: string): Promise<void> {
  const { error } = await supabase
    .from('user_permissions')
    .delete()
    .eq('user_id', userId)
    .eq('scope_id', scopeId);
  
  if (error) throw error;
}

// ========== USERS WITH PERMISSIONS ==========

export interface UserWithPermissions {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  agence: string | null;
  role_agence: string | null;
  group_id: string | null;
  system_role: SystemRole | null;
  support_level: number | null;
  group?: Group | null;
  overrides: UserPermissionOverride[];
}

export async function fetchUsersWithPermissions(): Promise<UserWithPermissions[]> {
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .order('first_name');
  
  if (profilesError) throw profilesError;
  
  const { data: groups } = await supabase
    .from('groups')
    .select('*');
  
  const { data: overrides } = await supabase
    .from('user_permissions')
    .select('*');
  
  const groupsMap = new Map(groups?.map(g => [g.id, g]) || []);
  const overridesMap = new Map<string, UserPermissionOverride[]>();
  
  overrides?.forEach(o => {
    const existing = overridesMap.get(o.user_id) || [];
    existing.push(o as UserPermissionOverride);
    overridesMap.set(o.user_id, existing);
  });
  
  return profiles.map(p => ({
    id: p.id,
    email: p.email,
    first_name: p.first_name,
    last_name: p.last_name,
    agence: p.agence,
    role_agence: p.role_agence,
    group_id: p.group_id,
    system_role: p.system_role as SystemRole | null,
    support_level: p.support_level,
    group: p.group_id ? groupsMap.get(p.group_id) as Group | null : null,
    overrides: overridesMap.get(p.id) || [],
  }));
}

export async function updateUserGroup(userId: string, groupId: string | null): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ group_id: groupId })
    .eq('id', userId);
  
  if (error) throw error;
}

export async function updateUserSystemRole(userId: string, systemRole: SystemRole): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ system_role: systemRole })
    .eq('id', userId);
  
  if (error) throw error;
}

// ========== EFFECTIVE PERMISSION CALCULATION ==========

/**
 * Calcule la permission effective pour un utilisateur sur un scope.
 * 
 * HIÉRARCHIE (par ordre de priorité) :
 * 1. Override utilisateur : Si existe, appliqué TEL QUEL (sans plafond system_role)
 *    - deny = true → niveau 0
 *    - sinon → override.level (0-4) directement
 * 2. Permission de groupe : Appliquée avec plafonds
 *    - min(group_level, group_system_role_limit, user_system_role)
 * 3. Défaut du scope : Appliqué avec plafond
 *    - min(scope.default_level, user_system_role)
 */
export function calculateEffectivePermission(
  user: UserWithPermissions,
  scope: Scope,
  groupPermissions: Map<string, GroupPermission[]>
): { level: number; source: 'deny' | 'override' | 'group' | 'default'; groupLevel?: number; ceiling: number } {
  const systemRoleCeiling = SYSTEM_ROLE_LEVELS[user.system_role || 'utilisateur'];
  
  // 1. Check user override - PRIORITÉ ABSOLUE (sans plafond)
  const override = user.overrides.find(o => o.scope_id === scope.id);
  
  if (override?.deny) {
    // DENY bloque totalement
    return { level: 0, source: 'deny', ceiling: systemRoleCeiling };
  }
  
  if (override && override.level !== null) {
    // Override SANS plafond system_role - l'admin peut donner le niveau qu'il veut
    const overrideLevel = Math.max(0, Math.min(4, override.level)); // Borné 0-4 uniquement
    return { 
      level: overrideLevel, 
      source: 'override',
      ceiling: systemRoleCeiling 
    };
  }
  
  // 2. Check group permission (avec plafonds)
  if (user.group_id) {
    const groupPerms = groupPermissions.get(user.group_id);
    const groupPerm = groupPerms?.find(gp => gp.scope_id === scope.id);
    
    if (groupPerm) {
      const groupCeiling = user.group ? SYSTEM_ROLE_LEVELS[user.group.system_role_limit] : systemRoleCeiling;
      const effectiveLevel = Math.min(groupPerm.level, groupCeiling, systemRoleCeiling);
      return { 
        level: effectiveLevel, 
        source: 'group', 
        groupLevel: groupPerm.level,
        ceiling: systemRoleCeiling 
      };
    }
  }
  
  // 3. Default du scope (avec plafond)
  const defaultLevel = Math.min(scope.default_level || 0, systemRoleCeiling);
  return { level: defaultLevel, source: 'default', ceiling: systemRoleCeiling };
}
