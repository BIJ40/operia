import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAppFeatureFlag(key: string): boolean {
  const { data } = useQuery({
    queryKey: ['app_feature_flag', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_feature_flags')
        .select('enabled')
        .eq('key', key)
        .single();
      if (error) return false;
      return data?.enabled ?? false;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  return data ?? false;
}
