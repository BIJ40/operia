/**
 * Hook pour l'analyse automatique des bulletins de paie
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PayslipData, PayslipExtractedData } from '@/types/payslipData';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';
import { logError } from '@/lib/logger';

// Helper pour convertir Json en PayslipExtractedData
function parseRawData(raw: Json): PayslipExtractedData {
  return raw as unknown as PayslipExtractedData;
}

// Helper pour mapper les données DB vers le type PayslipData
function mapToPayslipData(row: any): PayslipData {
  return {
    ...row,
    raw_data: parseRawData(row.raw_data),
  };
}

/**
 * Déclenche l'analyse d'un bulletin de paie
 */
export function useAnalyzePayslip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      filePath,
      collaboratorId,
      agencyId,
    }: {
      documentId: string;
      filePath: string;
      collaboratorId: string;
      agencyId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('analyze-payslip', {
        body: { documentId, filePath, collaboratorId, agencyId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data as { success: boolean; data: PayslipExtractedData; warnings: string[] };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payslip-data', variables.collaboratorId] });
      queryClient.invalidateQueries({ queryKey: ['payslip-data-document', variables.documentId] });
      
      if (data.warnings && data.warnings.length > 0) {
        toast.warning(`Bulletin analysé avec ${data.warnings.length} avertissement(s)`);
      } else {
        toast.success('Bulletin de paie analysé avec succès');
      }
    },
    onError: (error: Error) => {
      logError('[usePayslipAnalysis] Erreur analyse:', error);
      toast.error(`Erreur d'analyse: ${error.message}`);
    },
  });
}

/**
 * Récupère les données extraites d'un bulletin spécifique
 */
export function usePayslipDataByDocument(documentId: string | undefined) {
  return useQuery({
    queryKey: ['payslip-data-document', documentId],
    queryFn: async () => {
      if (!documentId) return null;

      const { data, error } = await supabase
        .from('payslip_data')
        .select('*')
        .eq('document_id', documentId)
        .maybeSingle();

      if (error) throw error;
      return data ? mapToPayslipData(data) : null;
    },
    enabled: !!documentId,
  });
}

/**
 * Récupère tous les bulletins analysés d'un collaborateur
 */
export function usePayslipDataByCollaborator(collaboratorId: string | undefined) {
  return useQuery({
    queryKey: ['payslip-data', collaboratorId],
    queryFn: async () => {
      if (!collaboratorId) return [];

      const { data, error } = await supabase
        .from('payslip_data')
        .select('*')
        .eq('collaborator_id', collaboratorId)
        .eq('extraction_status', 'success')
        .order('periode_annee', { ascending: false })
        .order('periode_mois', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapToPayslipData);
    },
    enabled: !!collaboratorId,
  });
}

/**
 * Récupère tous les bulletins analysés d'une agence (pour stats)
 */
export function usePayslipDataByAgency(agencyId: string | undefined, filters?: {
  annee?: number;
  moisDebut?: number;
  moisFin?: number;
}) {
  return useQuery({
    queryKey: ['payslip-data-agency', agencyId, filters],
    queryFn: async () => {
      if (!agencyId) return [];

      let query = supabase
        .from('payslip_data')
        .select(`
          *,
          collaborators:collaborator_id (
            id,
            first_name,
            last_name,
            type
          )
        `)
        .eq('agency_id', agencyId)
        .eq('extraction_status', 'success');

      if (filters?.annee) {
        query = query.eq('periode_annee', filters.annee);
      }

      if (filters?.moisDebut) {
        query = query.gte('periode_mois', filters.moisDebut);
      }

      if (filters?.moisFin) {
        query = query.lte('periode_mois', filters.moisFin);
      }

      const { data, error } = await query
        .order('periode_annee', { ascending: false })
        .order('periode_mois', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!agencyId,
  });
}

/**
 * Statistiques agrégées des bulletins
 */
export function usePayslipStats(collaboratorId: string | undefined, annee?: number) {
  const { data: payslips } = usePayslipDataByCollaborator(collaboratorId);

  const filteredPayslips = annee 
    ? payslips?.filter(p => p.periode_annee === annee) 
    : payslips;

  if (!filteredPayslips || filteredPayslips.length === 0) {
    return {
      count: 0,
      avgTauxHoraire: null,
      avgNetAPayer: null,
      totalBrutCumule: null,
      evolution: [],
    };
  }

  const validTaux = filteredPayslips.filter(p => p.taux_horaire_brut != null);
  const validNet = filteredPayslips.filter(p => p.net_a_payer != null);

  return {
    count: filteredPayslips.length,
    avgTauxHoraire: validTaux.length > 0 
      ? validTaux.reduce((sum, p) => sum + (p.taux_horaire_brut || 0), 0) / validTaux.length 
      : null,
    avgNetAPayer: validNet.length > 0 
      ? validNet.reduce((sum, p) => sum + (p.net_a_payer || 0), 0) / validNet.length 
      : null,
    totalBrutCumule: filteredPayslips[0]?.brut_cumule || null,
    evolution: filteredPayslips
      .sort((a, b) => {
        if (a.periode_annee !== b.periode_annee) return (a.periode_annee || 0) - (b.periode_annee || 0);
        return (a.periode_mois || 0) - (b.periode_mois || 0);
      })
      .map(p => ({
        periode: `${p.periode_mois}/${p.periode_annee}`,
        tauxHoraire: p.taux_horaire_brut,
        netAPayer: p.net_a_payer,
        totalBrut: p.total_brut,
      })),
  };
}
