/**
 * Hook Performance Terrain - Calculs productivité techniciens
 * Utilise les règles StatIA pour classification temps productif/non-productif
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { STATIA_RULES } from '@/statia/domain/rules';
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
  const t1 = (type || '').toLowerCase().trim();
  const t2 = (type2 || '').toLowerCase().trim();
  
  // Non productif si explicitement RT, diagnostic, SAV
  if (NON_PRODUCTIVE_TYPES.some(np => t1.includes(np) || t2.includes(np))) {
    return false;
  }
  
  // Productif si dépannage, travaux, etc.
  return PRODUCTIVE_TYPES.some(p => t1.includes(p) || t2.includes(p));
}

// Estimer la durée d'une intervention en minutes
function estimateDuration(intervention: any): number {
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

// Détecter si c'est un SAV
function isSavIntervention(intervention: any, project: any): boolean {
  const type2 = (intervention.type2 || '').toLowerCase();
  if (type2 === 'sav') return true;
  
  // Vérifier les visites
  const visites = intervention.visites || [];
  for (const v of visites) {
    if ((v.type2 || '').toLowerCase() === 'sav') return true;
  }
  
  // Vérifier les pictos
  const pictos = project?.data?.pictosInterv || [];
  if (pictos.some((p: string) => p.toLowerCase() === 'sav')) return true;
  
  return false;
}

/**
 * Hook principal Performance Terrain
 */
export function usePerformanceTerrain(dateRange: DateRange) {
  const { agence } = useAuth();
  const { isAgencyReady, currentAgency } = useAgency();
  
  const agencySlug = currentAgency?.id || agence || '';
  const services = getGlobalApogeeDataServices();

  return useQuery<PerformanceTerrainData | null>({
    queryKey: [
      'performance-terrain',
      agencySlug,
      dateRange.start.toISOString(),
      dateRange.end.toISOString()
    ],
    enabled: !!agencySlug && isAgencyReady,
    staleTime: 5 * 60 * 1000,
    
    queryFn: async (): Promise<PerformanceTerrainData | null> => {
      logDebug('PERF_TERRAIN', `Calcul pour ${agencySlug}`, { dateRange });
      
      try {
        // Charger les données nécessaires
        const [interventions, projects, users] = await Promise.all([
          services.getInterventions(agencySlug, dateRange),
          services.getProjects(agencySlug, dateRange),
          services.getUsers(agencySlug),
        ]);

        // Indexer projets par ID
        const projectsById = new Map<number, any>();
        for (const p of projects) {
          projectsById.set(p.id, p);
        }

        // Indexer users techniciens par ID
        const techsById = new Map<string, any>();
        for (const u of users) {
          const type = (u.type || '').toLowerCase();
          if (type === 'technicien' || type === 'utilisateur') {
            techsById.set(String(u.id), u);
          }
        }

        // Filtrer interventions par période
        const startTs = dateRange.start.getTime();
        const endTs = dateRange.end.getTime();
        
        const filteredInterventions = interventions.filter((i: any) => {
          const d = new Date(i.dateReelle || i.date);
          return d.getTime() >= startTs && d.getTime() <= endTs;
        });

        // Agréger par technicien
        const techStats = new Map<string, {
          timeTotal: number;
          timeProductive: number;
          timeNonProductive: number;
          interventionsCount: number;
          savCount: number;
          caGenerated: number;
          dossiersSet: Set<number>;
        }>();

        for (const intervention of filteredInterventions) {
          // Récupérer les techniciens impliqués
          const techIds: string[] = [];
          
          if (intervention.userId) {
            techIds.push(String(intervention.userId));
          }
          
          const visites = intervention.visites || [];
          for (const v of visites) {
            const userIds = v.usersIds || v.userIds || [];
            for (const uid of userIds) {
              if (!techIds.includes(String(uid))) {
                techIds.push(String(uid));
              }
            }
          }

          if (techIds.length === 0) continue;

          const duration = estimateDuration(intervention);
          const isProductive = isProductiveIntervention(intervention.type, intervention.type2);
          const project = projectsById.get(intervention.projectId);
          const isSav = isSavIntervention(intervention, project);

          // Répartir le temps entre techniciens
          const durationPerTech = duration / techIds.length;

          for (const techId of techIds) {
            if (!techsById.has(techId)) continue; // Ignorer non-techniciens
            
            if (!techStats.has(techId)) {
              techStats.set(techId, {
                timeTotal: 0,
                timeProductive: 0,
                timeNonProductive: 0,
                interventionsCount: 0,
                savCount: 0,
                caGenerated: 0,
                dossiersSet: new Set(),
              });
            }

            const stats = techStats.get(techId)!;
            stats.timeTotal += durationPerTech;
            stats.interventionsCount += 1;
            
            if (isProductive) {
              stats.timeProductive += durationPerTech;
            } else {
              stats.timeNonProductive += durationPerTech;
            }
            
            if (isSav) {
              stats.savCount += 1;
            }
            
            if (intervention.projectId) {
              stats.dossiersSet.add(intervention.projectId);
            }
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

          const name = `${user.firstname || ''} ${user.lastname || ''}`.trim() || `Tech ${techId}`;
          const capacityMinutes = 420; // 7h par défaut, pourrait venir de technician_capacity_config
          
          const productivityRate = stats.timeTotal > 0 
            ? stats.timeProductive / stats.timeTotal 
            : 0;
          
          const loadRatio = capacityMinutes > 0 
            ? stats.timeTotal / capacityMinutes 
            : 0;
          
          const savRate = stats.interventionsCount > 0 
            ? stats.savCount / stats.interventionsCount 
            : 0;

          const perf: TechnicianPerformance = {
            id: techId,
            name,
            color: user.color,
            
            timeTotal: Math.round(stats.timeTotal),
            timeProductive: Math.round(stats.timeProductive),
            timeNonProductive: Math.round(stats.timeNonProductive),
            
            productivityRate,
            productivityZone: getProductivityZone(productivityRate),
            
            interventionsCount: stats.interventionsCount,
            savCount: stats.savCount,
            savRate,
            savZone: getSavZone(savRate),
            
            capacityMinutes,
            loadRatio,
            loadZone: getLoadZone(loadRatio),
            
            caGenerated: stats.caGenerated,
            dossiersCount: stats.dossiersSet.size,
          };

          technicians.push(perf);
          totalProductivity += productivityRate;
          totalLoad += loadRatio;
          totalSav += stats.savCount;
          totalInterventions += stats.interventionsCount;
          totalCA += stats.caGenerated;
        }

        const count = technicians.length || 1;

        return {
          technicians: technicians.sort((a, b) => b.productivityRate - a.productivityRate),
          teamStats: {
            avgProductivityRate: totalProductivity / count,
            avgLoadRatio: totalLoad / count,
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
