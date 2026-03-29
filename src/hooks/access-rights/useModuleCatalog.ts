import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ModuleCatalogEntry {
  key: string;
  label: string;
  parent_key: string | null;
  node_type: 'section' | 'screen' | 'feature';
  sort_order: number;
  is_deployed: boolean;
  is_core: boolean;
  min_role: number;
  category: string | null;
  description: string | null;
  is_delegatable: boolean;
  // Depuis module_distribution_rules
  via_plan: boolean;
  via_agency_option: boolean;
  via_user_assignment: boolean;
  assignable_by_scope: string;
}

export interface ModuleCatalogTree extends ModuleCatalogEntry {
  children: ModuleCatalogTree[];
  depth: number;
  effective_is_deployed: boolean;
}

function buildTree(
  modules: ModuleCatalogEntry[],
  parentKey: string | null = null,
  depth = 0
): ModuleCatalogTree[] {
  return modules
    .filter(m => m.parent_key === parentKey)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(m => {
      const children = buildTree(modules, m.key, depth + 1);
      const effective_is_deployed =
        m.is_deployed &&
        (depth === 0 || modules.find(p => p.key === m.parent_key)?.is_deployed !== false);
      return { ...m, children, depth, effective_is_deployed };
    });
}

/** Filtre récursif : ne garde que les nœuds déployés, en élagant les enfants non déployés */
export function filterDeployedOnly(nodes: ModuleCatalogTree[]): ModuleCatalogTree[] {
  return nodes
    .filter(n => n.is_deployed)
    .map(n => ({ ...n, children: filterDeployedOnly(n.children) }));
}

export function useModuleCatalog() {
  const queryClient = useQueryClient();

  const { data: modules = [], isLoading, error } = useQuery({
    queryKey: ['module_catalog_v2'],
    queryFn: async (): Promise<ModuleCatalogEntry[]> => {
      const { data: catalog, error: catalogError } = await supabase
        .from('module_catalog')
        .select('key,label,parent_key,node_type,sort_order,is_deployed,is_core,min_role,category,description,is_delegatable')
        .order('sort_order');

      if (catalogError) throw catalogError;

      const { data: rules, error: rulesError } = await supabase
        .from('module_distribution_rules')
        .select('module_key,via_plan,via_agency_option,via_user_assignment,assignable_by_scope');

      if (rulesError) throw rulesError;

      const rulesMap = new Map(rules?.map(r => [r.module_key, r]) ?? []);

      return (catalog ?? []).map(m => ({
        key: m.key,
        label: m.label,
        parent_key: m.parent_key,
        node_type: m.node_type as 'section' | 'screen' | 'feature',
        sort_order: m.sort_order,
        is_deployed: m.is_deployed,
        is_core: m.is_core,
        min_role: m.min_role,
        category: m.category,
        description: m.description,
        is_delegatable: m.is_delegatable,
        via_plan: rulesMap.get(m.key)?.via_plan ?? false,
        via_agency_option: rulesMap.get(m.key)?.via_agency_option ?? false,
        via_user_assignment: rulesMap.get(m.key)?.via_user_assignment ?? false,
        assignable_by_scope: rulesMap.get(m.key)?.assignable_by_scope ?? 'none',
      }));
    },
    staleTime: 2 * 60 * 1000,
  });

  const tree = buildTree(modules);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['module_catalog_v2'] });

  const toggleDeployed = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { error } = await supabase
        .from('module_catalog')
        .update({ is_deployed: value })
        .eq('key', key);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleCore = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { error } = await supabase
        .from('module_catalog')
        .update({ is_core: value })
        .eq('key', key);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateMinRole = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: number }) => {
      const { error } = await supabase
        .from('module_catalog')
        .update({ min_role: value })
        .eq('key', key);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateLabel = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('module_catalog')
        .update({ label: value })
        .eq('key', key);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleDistribution = useMutation({
    mutationFn: async ({
      key,
      field,
      value,
    }: {
      key: string;
      field: 'via_plan' | 'via_agency_option' | 'via_user_assignment';
      value: boolean;
    }) => {
      const { error } = await supabase
        .from('module_distribution_rules')
        .update({ [field]: value })
        .eq('module_key', key);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    modules,
    tree,
    isLoading,
    error,
    toggleDeployed,
    toggleCore,
    updateMinRole,
    updateLabel,
    toggleDistribution,
  };
}
