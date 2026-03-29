/**
 * useModuleRegistry — CRUD hook for the module_registry table
 * 
 * Loads the full tree from Supabase, computes effective values client-side.
 * Provides mutations for is_deployed and required_plan.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

export type NodeType = 'module' | 'section' | 'screen' | 'feature';
export type PlanLevel = 'STARTER' | 'PRO' | 'NONE';

export interface RegistryRow {
  key: string;
  label: string;
  parent_key: string | null;
  node_type: NodeType;
  sort_order: number;
  is_deployed: boolean;
  required_plan: PlanLevel;
  min_role: number;
}

export interface RegistryNode extends RegistryRow {
  depth: number;
  children: RegistryNode[];
  // Effective values (computed from parent inheritance)
  effectiveDeployed: boolean;
  effectivePlan: PlanLevel;
  // Override indicators
  isDeployOverridden: boolean; // stored ≠ effective for deploy
  isPlanOverridden: boolean;   // stored ≠ effective for plan
  // min_role is stored per-node (no inheritance, like required_plan)
}

// ============================================================================
// Tree building + effective value computation
// ============================================================================

function buildTree(rows: RegistryRow[]): RegistryNode[] {
  const byKey = new Map<string, RegistryRow>();
  const childrenMap = new Map<string, RegistryRow[]>();

  for (const row of rows) {
    byKey.set(row.key, row);
    const parentKey = row.parent_key ?? '__root__';
    if (!childrenMap.has(parentKey)) childrenMap.set(parentKey, []);
    childrenMap.get(parentKey)!.push(row);
  }

  function buildNode(
    row: RegistryRow,
    depth: number,
    parentEffectiveDeployed: boolean,
    parentEffectivePlan: PlanLevel
  ): RegistryNode {
    // Rule 1: parent OFF → child effectively OFF
    const effectiveDeployed = parentEffectiveDeployed && row.is_deployed;
    // Rule 2: each node uses its OWN required_plan (no parent inheritance)
    const effectivePlan: PlanLevel = row.required_plan;

    const rawChildren = childrenMap.get(row.key) ?? [];
    rawChildren.sort((a, b) => a.sort_order - b.sort_order || a.key.localeCompare(b.key));

    const children = rawChildren.map(child =>
      buildNode(child, depth + 1, effectiveDeployed, effectivePlan)
    );

    return {
      ...row,
      depth,
      children,
      effectiveDeployed,
      effectivePlan,
      isDeployOverridden: row.is_deployed !== effectiveDeployed,
      isPlanOverridden: row.required_plan !== effectivePlan,
    };
  }

  const roots = (childrenMap.get('__root__') ?? [])
    .sort((a, b) => a.sort_order - b.sort_order || a.key.localeCompare(b.key));

  return roots.map(r => buildNode(r, 0, true, 'STARTER'));
}

/** Flatten tree to a list for table rendering */
export function flattenTree(nodes: RegistryNode[]): RegistryNode[] {
  const result: RegistryNode[] = [];
  function walk(node: RegistryNode) {
    result.push(node);
    for (const child of node.children) walk(child);
  }
  for (const root of nodes) walk(root);
  return result;
}

/** Get all descendant keys of a node (recursive) */
export function getDescendantKeys(node: RegistryNode): string[] {
  const keys: string[] = [];
  function walk(n: RegistryNode) {
    for (const child of n.children) {
      keys.push(child.key);
      walk(child);
    }
  }
  walk(node);
  return keys;
}

// ============================================================================
// Query hook
// ============================================================================

const QUERY_KEY = ['module-registry'];

export function useModuleRegistry() {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<RegistryNode[]> => {
      const { data, error } = await supabase
        .from('module_registry' as any)
        .select('*')
        .order('sort_order')
        .order('key');

      if (error) throw error;
      return buildTree((data as unknown as RegistryRow[]) ?? []);
    },
    staleTime: 1000 * 60,
  });

  return {
    tree: query.data ?? [],
    flatNodes: query.data ? flattenTree(query.data) : [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

// ============================================================================
// Auto-sync plan_tier_modules
// ============================================================================

/**
 * Sync plan_tier_modules rows when is_deployed or required_plan changes.
 *
 * Rules:
 * - deployed=false OR plan=NONE → delete all plan_tier_modules for this key
 * - plan=STARTER → upsert STARTER + PRO (enabled=true)
 * - plan=PRO → delete STARTER, upsert PRO (enabled=true)
 */
async function syncPlanTierModules(
  moduleKey: string,
  isDeployed: boolean,
  requiredPlan: PlanLevel
): Promise<void> {
  if (!isDeployed || requiredPlan === 'NONE') {
    // Remove all tier entries
    await (supabase
      .from('plan_tier_modules' as any) as any)
      .delete()
      .eq('module_key', moduleKey);
    return;
  }

  if (requiredPlan === 'STARTER') {
    // Upsert both STARTER and PRO
    await (supabase
      .from('plan_tier_modules' as any) as any)
      .upsert(
        [
          { tier_key: 'STARTER', module_key: moduleKey, enabled: true },
          { tier_key: 'PRO', module_key: moduleKey, enabled: true },
        ],
        { onConflict: 'tier_key,module_key' }
      );
  } else if (requiredPlan === 'PRO') {
    // Delete STARTER, upsert PRO
    await (supabase
      .from('plan_tier_modules' as any) as any)
      .delete()
      .eq('module_key', moduleKey)
      .eq('tier_key', 'STARTER');

    await (supabase
      .from('plan_tier_modules' as any) as any)
      .upsert(
        [{ tier_key: 'PRO', module_key: moduleKey, enabled: true }],
        { onConflict: 'tier_key,module_key' }
      );
  }
}

// ============================================================================
// Mutations
// ============================================================================

export function useUpdateModuleNode() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      key: string;
      updates: { is_deployed?: boolean; required_plan?: PlanLevel; min_role?: number; label?: string };
    }) => {
      const { error } = await supabase
        .from('module_registry' as any)
        .update(params.updates as any)
        .eq('key', params.key);

      if (error) throw error;

      // Auto-sync plan_tier_modules when deploy or plan changes
      if (params.updates.is_deployed !== undefined || params.updates.required_plan !== undefined) {
        // Fetch current state of the node to get both values
        const { data: current } = await supabase
          .from('module_registry' as any)
          .select('is_deployed, required_plan')
          .eq('key', params.key)
          .single();

        if (current) {
          const row = current as unknown as { is_deployed: boolean; required_plan: PlanLevel };
          await syncPlanTierModules(params.key, row.is_deployed, row.required_plan);
        }
      }
    },
    onSuccess: (_, params) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: ['plan-tiers'] });
      toast.success(`Nœud "${params.key}" mis à jour`);
    },
    onError: (err: Error) => {
      toast.error(`Erreur: ${err.message}`);
    },
  });
}

export function usePropagateToChildren() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      keys: string[];
      updates: { is_deployed?: boolean; required_plan?: PlanLevel; min_role?: number };
    }) => {
      // Batch update all descendants in module_registry
      const { error } = await supabase
        .from('module_registry' as any)
        .update(params.updates as any)
        .in('key', params.keys);

      if (error) throw error;

      // Auto-sync plan_tier_modules for each descendant
      if (params.updates.is_deployed !== undefined || params.updates.required_plan !== undefined) {
        // Fetch current state of all affected nodes
        const { data: rows } = await supabase
          .from('module_registry' as any)
          .select('key, is_deployed, required_plan')
          .in('key', params.keys);

        if (Array.isArray(rows)) {
          for (const row of rows as unknown as Array<{ key: string; is_deployed: boolean; required_plan: PlanLevel }>) {
            await syncPlanTierModules(row.key, row.is_deployed, row.required_plan);
          }
        }
      }
    },
    onSuccess: (_, params) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: ['plan-tiers'] });
      toast.success(`${params.keys.length} nœuds mis à jour`);
    },
    onError: (err: Error) => {
      toast.error(`Erreur propagation: ${err.message}`);
    },
  });
}
