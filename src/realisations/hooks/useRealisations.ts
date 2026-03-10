/**
 * Hook — List & filter realisations
 * Note: Uses 'any' cast because realisations table is not yet in generated types
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import type { Realisation, RealisationFilters, RealisationWithMeta } from '../types';

// Helper to bypass strict typing for new tables
const db = supabase as any;

export function useRealisations(filters: RealisationFilters = {}) {
  const { agencyId } = useEffectiveAuth();

  return useQuery({
    queryKey: ['realisations', agencyId, filters],
    queryFn: async (): Promise<RealisationWithMeta[]> => {
      if (!agencyId) return [];

      let query = db
        .from('realisations')
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false });

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,city.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters.city) query = query.ilike('city', `%${filters.city}%`);
      if (filters.department) query = query.eq('department', filters.department);
      if (filters.service_family) query = query.eq('service_family', filters.service_family);
      if (filters.service_type) query = query.eq('service_type', filters.service_type);
      if (filters.technician_name) query = query.ilike('technician_name', `%${filters.technician_name}%`);
      if (filters.client_type) query = query.eq('client_type', filters.client_type);
      if (filters.validation_status) query = query.eq('validation_status', filters.validation_status);
      if (filters.publication_status) query = query.eq('publication_status', filters.publication_status);
      if (filters.article_status) query = query.eq('article_status', filters.article_status);
      if (filters.quality_score_min) query = query.gte('quality_score', filters.quality_score_min);
      if (filters.seo_score_min) query = query.gte('seo_score', filters.seo_score_min);
      if (filters.date_from) query = query.gte('intervention_date', filters.date_from);
      if (filters.date_to) query = query.lte('intervention_date', filters.date_to);

      const { data, error } = await query;
      if (error) throw error;

      const items = (data || []) as Realisation[];
      const ids = items.map(r => r.id);
      if (ids.length === 0) return [];

      const { data: mediaStats } = await db
        .from('realisation_media')
        .select('realisation_id, media_role')
        .in('realisation_id', ids);

      const mediaMap = new Map<string, { count: number; hasBefore: boolean; hasAfter: boolean }>();
      ((mediaStats || []) as any[]).forEach((m) => {
        const existing = mediaMap.get(m.realisation_id) || { count: 0, hasBefore: false, hasAfter: false };
        existing.count++;
        if (m.media_role === 'before') existing.hasBefore = true;
        if (m.media_role === 'after') existing.hasAfter = true;
        mediaMap.set(m.realisation_id, existing);
      });

      return items.map((r) => {
        const stats = mediaMap.get(r.id);
        return {
          ...r,
          media_count: stats?.count || 0,
          has_before: stats?.hasBefore || false,
          has_after: stats?.hasAfter || false,
        } as RealisationWithMeta;
      });
    },
    enabled: !!agencyId,
    staleTime: 1000 * 30,
  });
}

export function useRealisation(id: string | undefined) {
  return useQuery({
    queryKey: ['realisation', id],
    queryFn: async (): Promise<Realisation | null> => {
      if (!id) return null;
      const { data, error } = await db
        .from('realisations')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Realisation;
    },
    enabled: !!id,
  });
}
