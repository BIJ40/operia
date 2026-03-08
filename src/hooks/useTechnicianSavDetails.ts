/**
 * Hook pour charger les détails des SAV d'un technicien
 * Permet de visualiser et valider/invalider les SAV
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { DataService } from '@/apogee-connect/services/dataService';
import { supabase } from '@/integrations/supabase/client';
import { logDebug, logError } from '@/lib/logger';
import { toast } from 'sonner';

export interface SavDetail {
  interventionId: string;
  projectId: string;
  projectRef: string;
  clientName: string;
  date: string;
  type: string;
  type2: string;
  description: string;
  source: 'type2' | 'visite' | 'picto'; // Comment le SAV a été détecté
  isValidated?: boolean; // null = non vérifié, true = confirmé SAV, false = faux positif
  validatedAt?: string;
  validatedBy?: string;
}

interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Détecte les SAV et leur source de détection
 */
function detectSavSource(intervention: Record<string, unknown>, project: Record<string, unknown> | undefined): { isSav: boolean; source?: 'type2' | 'visite' | 'picto' } {
  // 1. intervention.type2 === 'sav'
  const interData = (intervention?.data ?? {}) as Record<string, unknown>;
  const type2 = (String(intervention?.type2 || interData?.type2 || '')).toLowerCase().trim();
  if (type2 === 'sav') return { isSav: true, source: 'type2' };
  
  // 2. Visites avec type2 === 'sav'
  const visites = (intervention?.visites || interData?.visites || []) as Record<string, unknown>[];
  for (const v of visites) {
    const vType2 = String(v.type2 || '').toLowerCase().trim();
    if (vType2 === 'sav') return { isSav: true, source: 'visite' };
  }
  
  // 3. Pictos du projet
  const projData = (project?.data ?? {}) as Record<string, unknown>;
  const pictos = (projData?.pictosInterv || project?.pictosInterv || []) as unknown[];
  if (Array.isArray(pictos) && pictos.some((p) => String(p || '').toLowerCase().trim() === 'sav')) {
    return { isSav: true, source: 'picto' };
  }
  
  return { isSav: false };
}

/**
 * Hook pour charger les SAV d'un technicien
 */
export function useTechnicianSavDetails(technicianId: string | null, dateRange: DateRange) {
  const { agence, agencyId } = useProfile();
  const { currentAgency } = useAgency();
  
  const agencySlug = currentAgency?.slug || currentAgency?.id || agence || '';
  const effectiveAgencyId = currentAgency?.id || agencyId;

  return useQuery<SavDetail[]>({
    queryKey: ['technician-sav-details', technicianId, agencySlug, dateRange.start.toISOString(), dateRange.end.toISOString()],
    enabled: !!technicianId && !!agencySlug,
    staleTime: 2 * 60 * 1000,
    
    queryFn: async (): Promise<SavDetail[]> => {
      if (!technicianId) return [];
      
      logDebug('SAV_DETAILS', `Chargement SAV pour tech ${technicianId}`);
      
      try {
        const loaded = await DataService.loadAllData(true, false, agencySlug);
        const interventions = loaded?.interventions || [];
        const projects = loaded?.projects || [];
        const clients = loaded?.clients || [];
        
        // Indexer projets et clients
        const projectsById = new Map<string, Record<string, unknown>>();
        for (const p of projects) projectsById.set(String(p.id), p as Record<string, unknown>);
        
        const clientsById = new Map<string, Record<string, unknown>>();
        for (const c of clients) clientsById.set(String(c.id), c as Record<string, unknown>);
        
        const startTs = dateRange.start.getTime();
        const endTs = dateRange.end.getTime();
        
        // Charger validations existantes
        const { data: validations } = await supabase
          .from('sav_validations')
          .select('*')
          .eq('agency_id', effectiveAgencyId)
          .limit(1000);
        
        const validationsMap = new Map<string, Record<string, unknown>>();
        for (const v of validations || []) {
          validationsMap.set(v.intervention_id, v);
        }
        
        const savDetails: SavDetail[] = [];
        
        for (const intervention of interventions as Record<string, unknown>[]) {
          // Vérifier si ce technicien est impliqué
          const interData = (intervention?.data ?? {}) as Record<string, unknown>;
          const visites = (interData?.visites || intervention?.visites || []) as Record<string, unknown>[];
          const techIds = new Set<string>();
          
          for (const v of visites) {
            const dateStr = String(v?.date || v?.dateIntervention || '');
            if (dateStr) {
              const ts = new Date(dateStr).getTime();
              if (ts >= startTs && ts <= endTs) {
                const usersIds = (v?.usersIds || v?.userIds || []) as unknown[];
                for (const uid of usersIds) techIds.add(String(uid));
              }
            }
          }
          
          // Fallback: usersIds de l'intervention
          const interventionUsers = (intervention?.usersIds || []) as unknown[];
          if (Array.isArray(interventionUsers)) {
            for (const uid of interventionUsers) techIds.add(String(uid));
          }
          
          if (!techIds.has(technicianId)) continue;
          
          const projectId = intervention?.projectId;
          const project = projectId ? projectsById.get(String(projectId)) : undefined;
          const { isSav, source } = detectSavSource(intervention, project);
          
          if (!isSav) continue;
          
          const client = project?.clientId ? clientsById.get(String(project.clientId)) : undefined;
          const validation = validationsMap.get(String(intervention.id));
          
          savDetails.push({
            interventionId: String(intervention.id),
            projectId: String(projectId || ''),
            projectRef: project?.ref || `#${projectId}`,
            clientName: client?.name || project?.data?.client?.name || 'Client inconnu',
            date: visites[0]?.date || intervention?.date || '',
            type: intervention?.type || '',
            type2: intervention?.type2 || intervention?.data?.type2 || '',
            description: project?.label || intervention?.data?.label || '',
            source: source!,
            isValidated: validation?.is_valid_sav,
            validatedAt: validation?.validated_at,
            validatedBy: validation?.validated_by,
          });
        }
        
        return savDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      } catch (error) {
        logError('SAV_DETAILS', 'Erreur chargement', { error });
        return [];
      }
    },
  });
}

/**
 * Mutation pour valider/invalider un SAV
 */
export function useValidateSav() {
  const queryClient = useQueryClient();
  const { user } = useAuthCore();
  const { agencyId, firstName, lastName } = useProfile();
  
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Utilisateur';
  
  return useMutation({
    mutationFn: async ({ interventionId, isValidSav }: { interventionId: string; isValidSav: boolean }) => {
      if (!agencyId) throw new Error('Agence non définie');
      
      // Upsert dans sav_validations
      const { error } = await supabase
        .from('sav_validations')
        .upsert({
          agency_id: agencyId,
          intervention_id: interventionId,
          is_valid_sav: isValidSav,
          validated_at: new Date().toISOString(),
          validated_by: user?.id,
          validated_by_name: displayName,
        }, {
          onConflict: 'agency_id,intervention_id',
        });
      
      if (error) throw error;
      
      return { interventionId, isValidSav };
    },
    onSuccess: (data) => {
      toast.success(data.isValidSav ? 'SAV confirmé' : 'Marqué comme faux positif');
      queryClient.invalidateQueries({ queryKey: ['technician-sav-details'] });
      queryClient.invalidateQueries({ queryKey: ['performance-terrain'] });
    },
    onError: (error) => {
      logError('SAV_VALIDATE', 'Erreur validation', { error });
      toast.error('Erreur lors de la validation');
    },
  });
}
