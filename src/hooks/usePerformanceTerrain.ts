/**
 * Hook Performance Terrain - Calculs productivité techniciens
 * Utilise les règles StatIA pour classification temps productif/non-productif
 * Capacité calculée depuis weekly_hours des contrats RH (employment_contracts)
 */

import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/contexts/ProfileContext';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { STATIA_RULES } from '@/statia/domain/rules';
import { DataService } from '@/apogee-connect/services/dataService';
import { supabase } from '@/integrations/supabase/client';
import { logDebug, logError } from '@/lib/logger';

// Types
export interface TechnicianPerformance {
  id: string;
  name: string;
  color?: string;
  
  // Temps en minutes
  timeTotal: number;
  timeProductive: number;
  timeNonProductive: number;
  
  // Taux
  productivityRate: number; // 0-1
  productivityZone: 'critical' | 'warning' | 'optimal';
  
  // SAV
  interventionsCount: number;
  savCount: number;
  savRate: number; // 0-1
  savZone: 'optimal' | 'warning' | 'critical';
  
  // Charge
  capacityMinutes: number;
  loadRatio: number; // 0-X
  loadZone: 'underload' | 'balanced' | 'overload';
  
  // Heures hebdo (depuis contrat RH)
  weeklyHours: number;
  weeklyHoursSource: 'contract' | 'default'; // 'contract' = RH, 'default' = 35h par défaut
  
  // Absence / Arrêt
  isAbsent: boolean;
  absenceLabel?: string; // ex: "Arrêt maladie"
  
  // CA
  caGenerated: number;
  dossiersCount: number;
}

export interface PerformanceTerrainData {
  technicians: TechnicianPerformance[];
  teamStats: {
    avgProductivityRate: number;
    avgLoadRatio: number;
    totalSavCount: number;
    totalInterventions: number;
    totalCA: number;
  };
  period: { start: Date; end: Date };
}

interface DateRange {
  start: Date;
  end: Date;
}

// Zones de productivité (non punitif)
function getProductivityZone(rate: number): 'critical' | 'warning' | 'optimal' {
  if (rate < 0.5) return 'critical';
  if (rate < 0.65) return 'warning';
  return 'optimal';
}

// Zones SAV
function getSavZone(rate: number): 'optimal' | 'warning' | 'critical' {
  if (rate <= 0.03) return 'optimal';
  if (rate <= 0.08) return 'warning';
  return 'critical';
}

// Zones de charge
function getLoadZone(ratio: number): 'underload' | 'balanced' | 'overload' {
  if (ratio < 0.8) return 'underload';
  if (ratio <= 1.1) return 'balanced';
  return 'overload';
}

// Types productifs selon StatIA Rules
const PRODUCTIVE_TYPES = STATIA_RULES.technicians?.productiveTypes || [
  'depannage', 'travaux', 'repair', 'work', 'recherche de fuite'
];

const NON_PRODUCTIVE_TYPES = STATIA_RULES.technicians?.nonProductiveTypes || [
  'rt', 'rdv', 'rdvtech', 'sav', 'diagnostic', 'releve technique'
];

// Vérifier si une intervention est productive
function isProductiveIntervention(type: string | undefined, type2: string | undefined): boolean {
  const norm = (s: string | undefined) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const t1 = norm(type);
  const t2 = norm(type2);
  const nonProd = NON_PRODUCTIVE_TYPES.map((x) => norm(String(x)));
  const prod = PRODUCTIVE_TYPES.map((x) => norm(String(x)));
  
  // Non productif si explicitement RT, diagnostic, SAV
  if (nonProd.some(np => t1.includes(np) || t2.includes(np))) {
    return false;
  }
  
  // Productif si dépannage, travaux, etc.
  return prod.some(p => t1.includes(p) || t2.includes(p));
}

// Estimer la durée d'une intervention en minutes
function estimateDuration(intervention: any): number {
  if (!intervention) return 60;
  // Priorité: durée explicite, sinon créneaux, sinon défaut
  if (intervention.duration) return intervention.duration;
  
  const visites = intervention.visites || [];
  let totalMinutes = 0;
  
  for (const visite of visites) {
    if (visite.dureeMinutes) {
      totalMinutes += visite.dureeMinutes;
    } else if (visite.heureDebut && visite.heureFin) {
      // Calcul depuis heures
      const debut = new Date(`2000-01-01T${visite.heureDebut}`);
      const fin = new Date(`2000-01-01T${visite.heureFin}`);
      totalMinutes += (fin.getTime() - debut.getTime()) / 60000;
    } else {
      // Durée par défaut selon type
      totalMinutes += isProductiveIntervention(intervention.type, intervention.type2) ? 90 : 45;
    }
  }
  
  return totalMinutes || 60; // Défaut 1h
}

// Détecter si c'est un SAV (règles strictes selon memory/security/sav-detection-business-rules)
function isSavIntervention(intervention: any, project: any): boolean {
  if (!intervention) return false;
  
  // 1. intervention.type2 === 'sav' (case-insensitive)
  const type2 = (intervention.type2 || intervention.data?.type2 || '').toLowerCase().trim();
  if (type2 === 'sav') return true;
  
  // 2. Vérifier les visites - chercher dans intervention.visites ET intervention.data.visites
  const visites = intervention.visites || intervention.data?.visites || [];
  for (const v of visites) {
    const vType2 = (v.type2 || '').toLowerCase().trim();
    if (vType2 === 'sav') return true;
  }
  
  // 3. Vérifier les pictos du projet
  const pictos = project?.data?.pictosInterv || project?.pictosInterv || [];
  if (Array.isArray(pictos) && pictos.some((p: string) => (p || '').toLowerCase().trim() === 'sav')) {
    return true;
  }
  
  return false;
}

/**
 * Hook principal Performance Terrain
 */
export function usePerformanceTerrain(dateRange: DateRange) {
  const { agence, agencyId } = useAuth();
  const { isAgencyReady, currentAgency } = useAgency();
  
  const agencySlug = currentAgency?.slug || currentAgency?.id || agence || '';
  const effectiveAgencyId = currentAgency?.id || agencyId;

  return useQuery<PerformanceTerrainData | null>({
    queryKey: [
      'performance-terrain',
      agencySlug,
      effectiveAgencyId,
      dateRange.start.toISOString(),
      dateRange.end.toISOString()
    ],
    enabled: !!agencySlug && isAgencyReady,
    staleTime: 5 * 60 * 1000,
    
    queryFn: async (): Promise<PerformanceTerrainData | null> => {
      logDebug('PERF_TERRAIN', `Calcul pour ${agencySlug}`, { dateRange });
      
      try {
        // IMPORTANT: pour le prévisionnel / planifié, la source fiable est getInterventionsCreneaux
        // (c'est ce que consomment déjà les pages de planning).
        // On charge donc le bundle DataService (incluant creneaux) et on calcule à partir de ces créneaux.
        const loaded = await DataService.loadAllData(true, false, agencySlug);
        const interventions = loaded?.interventions || [];
        const projects = loaded?.projects || [];
        const users = loaded?.users || [];
        const creneaux = loaded?.creneaux || [];

        // === CHARGER LES HEURES HEBDO DES COLLABORATEURS ===
        // On récupère les collaborateurs avec leur contrat actif pour avoir weekly_hours
        const weeklyHoursByApogeeId = new Map<string, number>();
        
        if (effectiveAgencyId) {
          // Charger collaborateurs avec apogee_user_id
          const { data: collaborators } = await supabase
            .from('collaborators')
            .select('id, apogee_user_id')
            .eq('agency_id', effectiveAgencyId)
            .not('apogee_user_id', 'is', null);
          
          if (collaborators && collaborators.length > 0) {
            const collabIds = collaborators.map(c => c.id);
            
            // Charger contrats actifs avec weekly_hours
            const { data: contracts } = await supabase
              .from('employment_contracts')
              .select('collaborator_id, weekly_hours')
              .in('collaborator_id', collabIds)
              .eq('is_current', true);
            
            if (contracts) {
              // Mapper collaborator_id -> weekly_hours
              const weeklyByCollabId = new Map<string, number>();
              for (const c of contracts) {
                if (c.weekly_hours) {
                  weeklyByCollabId.set(c.collaborator_id, c.weekly_hours);
                }
              }
              
              // Mapper apogee_user_id -> weekly_hours
              for (const collab of collaborators) {
                if (collab.apogee_user_id && weeklyByCollabId.has(collab.id)) {
                  weeklyHoursByApogeeId.set(
                    String(collab.apogee_user_id), 
                    weeklyByCollabId.get(collab.id)!
                  );
                }
              }
            }
          }
          
          logDebug('PERF_TERRAIN', 'Heures hebdo chargées', { 
            count: weeklyHoursByApogeeId.size,
            sample: Array.from(weeklyHoursByApogeeId.entries()).slice(0, 3)
          });
        }

        // Index interventions par ID pour lookup des types
        const interventionsById = new Map<string, any>();
        for (const i of interventions) {
          if (i?.id != null) interventionsById.set(String(i.id), i);
        }

        // Indexer projets par ID
        const projectsById = new Map<string, any>();
        for (const p of projects) {
          projectsById.set(String(p.id), p);
        }

        // Indexer users techniciens par ID
        const techsById = new Map<string, any>();
        for (const u of users) {
          const type = (u.type || '').toLowerCase();
          if (type === 'technicien' || type === 'utilisateur') {
            techsById.set(String(u.id), u);
          }
        }

        const startTs = dateRange.start.getTime();
        const endTs = dateRange.end.getTime();

        type Slot = {
          date: string;
          duree: number;
          usersIds: string[];
          interventionId?: string;
          projectId?: string;
          type?: string;
          type2?: string;
        };

        // 1) SOURCE PRINCIPALE (comme le planning): extraire les visites des interventions
        const slotsFromVisites: Slot[] = [];
        for (const intervention of interventions as any[]) {
          const interventionId = intervention?.id != null ? String(intervention.id) : undefined;
          const projectId = intervention?.projectId != null ? String(intervention.projectId) : undefined;

          const visites = intervention?.data?.visites || intervention?.visites || [];
          if (Array.isArray(visites) && visites.length > 0) {
            for (const v of visites) {
              const dateStr = v?.date || v?.dateIntervention || '';
              if (!dateStr) continue;
              const ts = new Date(dateStr).getTime();
              if (isNaN(ts) || ts < startTs || ts > endTs) continue;

              const usersRaw = v?.usersIds || v?.userIds || [];
              const usersIds = Array.isArray(usersRaw) ? usersRaw.map((x: any) => String(x)) : [];
              if (usersIds.length === 0) continue;

              const duree =
                Number(v?.duree) ||
                Number(v?.dureeMinutes) ||
                Number(v?.duration) ||
                Number(intervention?.duree) ||
                Number(intervention?.duration) ||
                60;

              slotsFromVisites.push({
                date: dateStr,
                duree,
                usersIds,
                interventionId,
                projectId,
                type: v?.type || intervention?.type,
                type2: v?.type2 || intervention?.type2 || intervention?.data?.type2,
              });
            }
          } else {
            // Fallback: intervention sans visites (rare) -> utiliser date + userId
            const dateStr = intervention?.date || intervention?.dateIntervention || '';
            const ts = dateStr ? new Date(dateStr).getTime() : NaN;
            if (!dateStr || isNaN(ts) || ts < startTs || ts > endTs) continue;

            const uid = intervention?.userId != null ? String(intervention.userId) : undefined;
            if (!uid) continue;

            const duree = Number(intervention?.duree) || Number(intervention?.duration) || 60;
            slotsFromVisites.push({
              date: dateStr,
              duree,
              usersIds: [uid],
              interventionId,
              projectId,
              type: intervention?.type,
              type2: intervention?.type2 || intervention?.data?.type2,
            });
          }
        }

        // 2) SOURCE SECONDAIRE: getInterventionsCreneaux (si aucune visite exploitable)
        const slotsFromCreneaux: Slot[] = (creneaux || [])
          .map((c: any) => {
            const dateStr = c?.date || '';
            const ts = dateStr ? new Date(dateStr).getTime() : NaN;
            if (!dateStr || isNaN(ts) || ts < startTs || ts > endTs) return null;

            const usersRaw = c?.usersIds || [];
            const usersIds = Array.isArray(usersRaw) ? usersRaw.map((x: any) => String(x)) : [];
            if (usersIds.length === 0) return null;

            const interventionId = c?.interventionId != null ? String(c.interventionId) : undefined;
            const intervention = interventionId ? interventionsById.get(interventionId) : undefined;

            return {
              date: dateStr,
              duree: Number(c?.duree) || 60,
              usersIds,
              interventionId,
              projectId: intervention?.projectId != null ? String(intervention.projectId) : undefined,
              type: intervention?.type,
              type2: intervention?.type2 || intervention?.data?.type2,
            } as Slot;
          })
          .filter((x: Slot | null): x is Slot => x !== null);

        const slots: Slot[] = slotsFromVisites.length > 0 ? slotsFromVisites : slotsFromCreneaux;

        // === DÉTECTER LES ABSENCES (arrêt maladie, etc.) ===
        // Les absences apparaissent comme des créneaux avec un type contenant "arrêt" ou "maladie" ou "absence"
        const absentTechs = new Map<string, string>(); // techId -> label
        const allSlotSources = [...(creneaux || []), ...(interventions as any[])];
        for (const item of allSlotSources) {
          const type = ((item?.type || item?.data?.type || '') as string).toLowerCase();
          const type2 = ((item?.type2 || item?.data?.type2 || '') as string).toLowerCase();
          const label = (item?.label || item?.data?.label || '') as string;
          const combined = `${type} ${type2} ${label.toLowerCase()}`;
          
          if (combined.includes('arret') || combined.includes('arrêt') || 
              combined.includes('maladie') || combined.includes('absence') ||
              combined.includes('conge') || combined.includes('congé')) {
            const usersRaw = item?.usersIds || item?.data?.usersIds || [];
            const userId = item?.userId != null ? String(item.userId) : undefined;
            const ids = Array.isArray(usersRaw) ? usersRaw.map((x: any) => String(x)) : [];
            if (userId) ids.push(userId);
            
            // Determine the best label
            const absLabel = combined.includes('maladie') ? 'Arrêt maladie' 
              : combined.includes('arret') || combined.includes('arrêt') ? 'En arrêt'
              : combined.includes('conge') || combined.includes('congé') ? 'En congé'
              : 'Absent';
            
            for (const id of ids) {
              if (!absentTechs.has(id)) absentTechs.set(id, absLabel);
            }
          }
        }
        
        logDebug('PERF_TERRAIN', 'Absences détectées', { 
          count: absentTechs.size,
          techs: Array.from(absentTechs.entries())
        });

        // Agréger par technicien
        const techStats = new Map<string, {
          timeTotal: number;
          timeProductive: number;
          timeNonProductive: number;
          interventionsSet: Set<string>;
          savInterventionsSet: Set<string>;
          caGenerated: number;
          dossiersSet: Set<string>;
        }>();

        for (const slot of slots) {
          const interventionId = slot.interventionId;
          const intervention = interventionId ? interventionsById.get(interventionId) : undefined;

          const techIds = slot.usersIds;
          if (!techIds || techIds.length === 0) continue;

          const duration = Number(slot.duree) || estimateDuration(intervention);
          if (!duration || duration <= 0) continue;

          const isProductive = isProductiveIntervention(slot.type, slot.type2);
          const projectId = slot.projectId || (intervention?.projectId != null ? String(intervention.projectId) : undefined);
          const project = projectId ? projectsById.get(String(projectId)) : undefined;
          const isSav = isSavIntervention(intervention, project);

          for (const techId of techIds) {
            if (!techsById.has(techId)) continue; // Ignorer non-techniciens

            if (!techStats.has(techId)) {
              techStats.set(techId, {
                timeTotal: 0,
                timeProductive: 0,
                timeNonProductive: 0,
                interventionsSet: new Set(),
                savInterventionsSet: new Set(),
                caGenerated: 0,
                dossiersSet: new Set(),
              });
            }

            const stats = techStats.get(techId)!;
            // IMPORTANT: un créneau correspond à du temps planifié pour CHAQUE technicien (pas de division)
            stats.timeTotal += duration;
            if (isProductive) stats.timeProductive += duration;
            else stats.timeNonProductive += duration;

            if (interventionId) stats.interventionsSet.add(interventionId);
            if (isSav && interventionId) stats.savInterventionsSet.add(interventionId);
            if (projectId) stats.dossiersSet.add(String(projectId));
          }
        }

        // Construire résultat
        const technicians: TechnicianPerformance[] = [];
        let totalProductivity = 0;
        let totalLoad = 0;
        let totalSav = 0;
        let totalInterventions = 0;
        let totalCA = 0;

        for (const [techId, stats] of techStats) {
          const user = techsById.get(techId);
          if (!user) continue;

          const name = `${user.firstname || ''} ${user.lastname || user.name || ''}`.trim() || `Tech ${techId}`;

          // === CAPACITÉ DEPUIS WEEKLY_HOURS DU CONTRAT RH ===
          // Priorité: heures hebdo du contrat, sinon défaut 35h
          const contractWeeklyHours = weeklyHoursByApogeeId.get(techId);
          const weeklyHours = contractWeeklyHours || 35;
          const weeklyHoursSource: 'contract' | 'default' = contractWeeklyHours ? 'contract' : 'default';
          const dailyMinutes = (weeklyHours / 5) * 60; // Heures/jour en minutes
          
          const dayMs = 24 * 60 * 60 * 1000;
          const days = Math.max(1, Math.ceil((dateRange.end.getTime() - dateRange.start.getTime() + 1) / dayMs));
          const capacityMinutes = Math.round(dailyMinutes * days);
          
          const productivityRate = stats.timeTotal > 0 
            ? stats.timeProductive / stats.timeTotal 
            : 0;
          
          const loadRatio = capacityMinutes > 0 
            ? stats.timeTotal / capacityMinutes 
            : 0;
          
          const savCount = stats.savInterventionsSet.size;
          const interventionsCount = stats.interventionsSet.size;
          const savRate = interventionsCount > 0 ? savCount / interventionsCount : 0;

          const isAbsent = absentTechs.has(techId);
          const absenceLabel = absentTechs.get(techId);

          const perf: TechnicianPerformance = {
            id: techId,
            name,
            color: user.color,
            
            timeTotal: Math.round(stats.timeTotal),
            timeProductive: Math.round(stats.timeProductive),
            timeNonProductive: Math.round(stats.timeNonProductive),
            
            productivityRate,
            productivityZone: getProductivityZone(productivityRate),
            
            interventionsCount: stats.interventionsSet.size,
            savCount,
            savRate,
            savZone: getSavZone(savRate),
            
            capacityMinutes,
            loadRatio,
            loadZone: getLoadZone(loadRatio),
            
            weeklyHours,
            weeklyHoursSource,
            
            isAbsent,
            absenceLabel,
            
            caGenerated: stats.caGenerated,
            dossiersCount: stats.dossiersSet.size,
          };

          technicians.push(perf);
          // Exclure les absents des moyennes d'équipe
          if (!isAbsent) {
            totalProductivity += productivityRate;
            totalLoad += loadRatio;
          }
          totalSav += savCount;
          totalInterventions += interventionsCount;
          totalCA += stats.caGenerated;
        }

        const activeTechs = technicians.filter(t => !t.isAbsent);
        const activeCount = activeTechs.length || 1;

        return {
          technicians: technicians.sort((a, b) => b.productivityRate - a.productivityRate),
          teamStats: {
            avgProductivityRate: totalProductivity / activeCount,
            avgLoadRatio: totalLoad / activeCount,
            totalSavCount: totalSav,
            totalInterventions,
            totalCA,
          },
          period: dateRange,
        };
      } catch (error) {
        logError('PERF_TERRAIN', 'Erreur calcul', { error });
        return null;
      }
    },
  });
}

/**
 * Hook pour un technicien spécifique
 */
export function useTechnicianPerformance(technicianId: string, dateRange: DateRange) {
  const { data } = usePerformanceTerrain(dateRange);
  
  return {
    data: data?.technicians.find(t => t.id === technicianId) || null,
    teamStats: data?.teamStats,
  };
}
