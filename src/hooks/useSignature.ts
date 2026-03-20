/**
 * useSignature — hooks for signature profile & configs CRUD
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SignatureProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  job_title: string;
  agency_name: string;
  phone: string;
  email: string;
  website: string | null;
  logo_url: string | null;
  validated: boolean;
  validated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignatureConfig {
  id: string;
  user_id: string;
  name: string;
  region: string;
  season: string;
  temporal_event: string | null;
  agency_status: string;
  theme: string;
  style: string;
  typography: string;
  color_palette: { primary: string; accent: string; text?: string; bg?: string };
  auto_mode: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useSignatureProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['signature-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_signature_profiles' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as any) as SignatureProfile | null;
    },
    enabled: !!user,
  });
}

export function useUpsertSignatureProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: Partial<SignatureProfile>) => {
      if (!user) throw new Error('Non authentifié');
      const { data, error } = await supabase
        .from('user_signature_profiles' as any)
        .upsert({ ...payload, user_id: user.id }, { onConflict: 'user_id' })
        .select()
        .single();
      if (error) throw error;
      return (data as any) as SignatureProfile;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signature-profile'] });
      toast.success('Profil signature sauvegardé');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useSignatureConfigs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['signature-configs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('signature_configs' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return ((data || []) as any) as SignatureConfig[];
    },
    enabled: !!user,
  });
}

export function useUpsertSignatureConfig() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: Partial<SignatureConfig> & { id?: string }) => {
      if (!user) throw new Error('Non authentifié');
      const { data, error } = await supabase
        .from('signature_configs' as any)
        .upsert({ ...payload, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return (data as any) as SignatureConfig;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signature-configs'] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteSignatureConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('signature_configs' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signature-configs'] });
      toast.success('Configuration supprimée');
    },
  });
}

export function getAutoSeason(): string {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

export function getAutoEvent(): string | null {
  const now = new Date();
  const m = now.getMonth();
  const d = now.getDate();
  if (m === 11 && d >= 1) return 'noel';
  if (m === 9 && d >= 20) return 'halloween';
  if (m === 1 && d >= 10 && d <= 14) return 'saint_valentin';
  if (m === 8) return 'rentree';
  return null;
}
