/**
 * Hook pour récupérer les KPIs personnels basés sur l'apogee_user_id
 * Utilise les métriques StatIA existantes avec filtre userId
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { computeCaParTechnicienCore, CaParTechnicienParams } from '@/statia/engines/caParTechnicienCore';
import { DataService } from '@/apogee-connect/services/dataService';

interface TechnicienKpis {
  caMonth: number;
  dossiersTraites: number;
  interventionsRealisees: number;
  heuresTravaillees: number;
  tauxProductivite: number;
}

interface AssistanteKpis {
  devisCrees: number;
  facturesCrees: number;
  dossiersCrees: number;
  rdvPlanifies: number;
  dossiersEnCours: number;
  clientsContactes: number;
}

interface UsePersonalKpisOptions {
  dateRange?: { start: Date; end: Date };
}

export function usePersonalKpis(options?: UsePersonalKpisOptions) {
  const { user, agence } = useAuth();
  
  // Utiliser dateRange fourni ou le mois courant par défaut
  const now = new Date();
  const dateRange = options?.dateRange || {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
  
  return useQuery({
    queryKey: ['personal-kpis', user?.id, agence, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!user?.id || !agence) return null;

      // Récupérer le profil ET le collaborator associé (apogee_user_id est dans collaborators)
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: profile } = await supabase
        .from('profiles')
        .select('global_role, role_agence')
        .eq('id', user.id)
        .single();

      // Récupérer apogee_user_id depuis collaborators (c'est là qu'il est stocké)
      const { data: collaborator } = await supabase
        .from('collaborators')
        .select('apogee_user_id, type')
        .eq('user_id', user.id)
        .single();

      const apogeeUserId = collaborator?.apogee_user_id;
      
      if (!apogeeUserId) {
        if (import.meta.env.DEV) console.log('[usePersonalKpis] Pas d\'apogee_user_id trouvé dans collaborators');
        return { type: 'not_linked' as const };
      }

      const roleAgence = (profile?.role_agence || collaborator?.type || '').toLowerCase();
      
      // Déterminer le type d'utilisateur
      const isTechnicien = roleAgence.includes('technic') || roleAgence.includes('tech');
      const isAssistante = roleAgence.includes('assist') || roleAgence.includes('secr') || roleAgence.includes('admin');

      if (import.meta.env.DEV) {
        console.log('[usePersonalKpis] Profile:', { apogeeUserId, roleAgence, isTechnicien, isAssistante });
        console.log('[usePersonalKpis] DateRange:', { start: dateRange.start.toISOString(), end: dateRange.end.toISOString() });
      }

      // Charger les données via DataService (même source que StatIA)
      const apiData = await DataService.loadAllData(true, false, agence);
      
      if (import.meta.env.DEV) {
        console.log('[usePersonalKpis] Data loaded:', {
          factures: apiData.factures?.length || 0,
          interventions: apiData.interventions?.length || 0,
          projects: apiData.projects?.length || 0,
          users: apiData.users?.length || 0,
        });
      }

      if (isTechnicien) {
        return {
          type: 'technicien' as const,
          data: calculateTechnicienKpisStatia(apiData, apogeeUserId, dateRange.start, dateRange.end),
        };
      }

      if (isAssistante) {
        return {
          type: 'assistante' as const,
          data: calculateAssistanteKpis(apiData, apogeeUserId, dateRange.start, dateRange.end),
        };
      }

      return { type: 'unknown' as const };
    },
    enabled: !!user?.id && !!agence,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Calcule les KPIs technicien en utilisant le moteur StatIA
 */
function calculateTechnicienKpisStatia(
  apiData: any,
  apogeeUserId: number,
  monthStart: Date,
  monthEnd: Date
): TechnicienKpis {
  const { factures, interventions, projects, users } = apiData;
  const interval = { start: monthStart, end: monthEnd };

  // Types productifs (dépannage, travaux - pas RT/SAV/diagnostic)
  const PRODUCTIVE_TYPES = ['depannage', 'travaux', 'work', 'repair', 'recherche de fuite'];
  const isProductiveType = (type: string) => 
    PRODUCTIVE_TYPES.some(t => (type || '').toLowerCase().includes(t));

  // === 0. Trouver le technicien dans la liste des users ===
  const myUser = (users || []).find((u: any) => u.id === apogeeUserId);
  const myTechName = myUser ? `${myUser.firstname || ''} ${myUser.name || ''}`.trim().toUpperCase() : null;
  
  if (import.meta.env.DEV) console.log('[usePersonalKpis] Technicien trouvé:', { apogeeUserId, myUser: myUser?.name, myTechName });

  // === 1. CA du mois (utilise le moteur StatIA) ===
  const statiaParams: CaParTechnicienParams = {
    dateRange: { start: monthStart, end: monthEnd },
    topN: 100, // Récupérer tous les techniciens pour trouver le nôtre
  };
  const caResult = computeCaParTechnicienCore(
    { factures, projects, interventions, users },
    statiaParams
  );
  
  // Extraire le CA par NOM (le ranking utilise les noms, pas les IDs)
  const techRanking = caResult.ranking || [];
  const myTechData = techRanking.find((t: any) => {
    const rankName = (t.label || t.name || '').toUpperCase();
    return rankName === myTechName || rankName.includes(myTechName || 'IMPOSSIBLE');
  });
  const caMonth = myTechData?.value || 0;
  
  if (import.meta.env.DEV) {
    console.log('[usePersonalKpis] CA extraction:', { apogeeUserId, myTechName, caMonth });
  }

  // Convertir l'ID pour comparaison flexible
  const apogeeUserIdStr = String(apogeeUserId);
  const apogeeUserIdNum = Number(apogeeUserId);

  // Debug: examiner la structure des interventions (champs réels de l'API Apogée)
  if (import.meta.env.DEV) {
    const sampleInter = (interventions || [])[0];
    console.log('[usePersonalKpis] Sample intervention:', {
      apogeeUserId, usersIds: sampleInter?.usersIds, type: sampleInter?.type,
    });
  }

  // Helper pour vérifier si technicien est dans l'intervention
  const isTechInIntervention = (inter: any): boolean => {
    // 1. Vérifier usersIds (tableau des techniciens assignés)
    const usersIds = inter.usersIds || [];
    const isInUsersIds = usersIds.some((uid: any) => 
      uid === apogeeUserId || uid === apogeeUserIdStr || Number(uid) === apogeeUserIdNum
    );
    if (isInUsersIds) return true;
    
    // 2. Vérifier data.visites
    const visites = inter.data?.visites || [];
    const isInVisites = visites.some((v: any) => 
      (v.usersIds || []).some((uid: any) => 
        uid === apogeeUserId || uid === apogeeUserIdStr || Number(uid) === apogeeUserIdNum
      )
    );
    if (isInVisites) return true;
    
    // 3. Fallback: userId simple (certaines APIs)
    const userId = inter.userId || inter.user_id;
    if (userId === apogeeUserId || userId === apogeeUserIdStr || Number(userId) === apogeeUserIdNum) {
      return true;
    }
    
    return false;
  };

  // === 2. Interventions ce mois ===
  const techInterventions = (interventions || []).filter((inter: any) => {
    if (!isTechInIntervention(inter)) return false;

    // Vérifier la date
    const dateStr = inter.dateReelle || inter.date || inter.dateIntervention;
    if (!dateStr) return false;
    
    try {
      const interDate = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
      return isWithinInterval(interDate, interval);
    } catch {
      return false;
    }
  });

  if (import.meta.env.DEV) {
    const allTechInterventions = (interventions || []).filter(isTechInIntervention);
    console.log('[usePersonalKpis] Interventions:', { total: (interventions || []).length, sansFiltre: allTechInterventions.length, avecDate: techInterventions.length });
  }

  // === 3. Dossiers traités = projets FACTURÉS où technicien a intervenu ===
  const techProjectIds = new Set(techInterventions.map((i: any) => i.projectId));
  
  // Filtrer les factures du mois
  const monthFactures = (factures || []).filter((f: any) => {
    const dateStr = f.dateReelle || f.date;
    if (!dateStr) return false;
    try {
      const fDate = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
      return isWithinInterval(fDate, interval);
    } catch {
      return false;
    }
  });
  
  // Projets avec factures où technicien a intervenu
  const facturedProjectIds = new Set(monthFactures.map((f: any) => f.projectId));
  const dossiersTraites = [...techProjectIds].filter(pid => facturedProjectIds.has(pid)).length;
  
  if (import.meta.env.DEV) {
    console.log('[usePersonalKpis] Dossiers:', { techProjectIds: techProjectIds.size, dossiersTraites });
  }

  // === 4. Heures travaillées (via créneaux ou durée des visites) ===
  let heuresProductives = 0;
  let heuresTotales = 0;
  
  for (const inter of techInterventions) {
    // Visites sont dans data.visites selon l'interface Intervention
    const visites = inter.data?.visites || inter.visites || [];
    const type = (inter.type || inter.type2 || '').toLowerCase();
    const isProductive = isProductiveType(type);
    
    for (const visite of visites) {
      const visiteUserIds = visite.usersIds || [];
      const isTechInVisite = visiteUserIds.some((uid: any) => 
        uid === apogeeUserId || uid === apogeeUserIdStr || Number(uid) === apogeeUserIdNum
      );
      
      if (isTechInVisite) {
        // Durée depuis créneaux ou estimation
        let duree = 0;
        
        if (visite.creneaux && Array.isArray(visite.creneaux)) {
          // Calculer depuis les créneaux (format: [{debut: "08:00", fin: "12:00"}])
          for (const creneau of visite.creneaux) {
            if (creneau.debut && creneau.fin) {
              const [dh, dm] = creneau.debut.split(':').map(Number);
              const [fh, fm] = creneau.fin.split(':').map(Number);
              duree += (fh * 60 + fm - dh * 60 - dm) / 60;
            }
          }
        } else {
          // Fallback sur durée déclarée (en minutes dans l'API)
          duree = (visite.duree || visite.tempsPrevu || 0) / 60;
        }
        
        heuresTotales += duree;
        if (isProductive) heuresProductives += duree;
      }
    }
    
    // Si pas de visites mais technicien assigné directement via usersIds
    if (visites.length === 0) {
      const usersIds = inter.usersIds || [];
      const isDirectAssign = usersIds.some((uid: any) => 
        uid === apogeeUserId || uid === apogeeUserIdStr || Number(uid) === apogeeUserIdNum
      );
      if (isDirectAssign) {
        const duree = (inter.duree || inter.tempsPrevu || 0) / 60; // Minutes → heures
        heuresTotales += duree;
        if (isProductive) heuresProductives += duree;
      }
    }
  }

  if (import.meta.env.DEV) {
    console.log('[usePersonalKpis] Heures:', { heuresTotales, heuresProductives });
  }

  // === 5. Taux de productivité = heures productives / heures totales ===
  const tauxProductivite = heuresTotales > 0 
    ? (heuresProductives / heuresTotales) * 100 
    : 0;

  return {
    caMonth: Math.round(caMonth * 100) / 100,
    dossiersTraites,
    interventionsRealisees: techInterventions.length,
    heuresTravaillees: Math.round(heuresTotales * 10) / 10,
    tauxProductivite: Math.round(tauxProductivite * 10) / 10,
  };
}

/**
 * Calcule les KPIs assistante
 */
function calculateAssistanteKpis(
  apiData: any,
  apogeeUserId: number,
  monthStart: Date,
  monthEnd: Date
): AssistanteKpis {
  const { factures, devis, projects, interventions } = apiData;
  const interval = { start: monthStart, end: monthEnd };

  // Devis créés par l'utilisateur ce mois
  const devisCrees = (devis || []).filter((d: any) => {
    if (d.createdBy !== apogeeUserId && d.userId !== apogeeUserId) return false;
    
    const dateStr = d.dateReelle || d.date || d.createdAt;
    if (!dateStr) return false;
    
    try {
      const devisDate = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
      return isWithinInterval(devisDate, interval);
    } catch {
      return false;
    }
  }).length;

  // Factures créées par l'utilisateur ce mois
  const facturesCrees = (factures || []).filter((f: any) => {
    if (f.createdBy !== apogeeUserId && f.userId !== apogeeUserId) return false;
    
    const dateStr = f.dateReelle || f.date || f.createdAt;
    if (!dateStr) return false;
    
    try {
      const factDate = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
      return isWithinInterval(factDate, interval);
    } catch {
      return false;
    }
  }).length;

  // Dossiers créés ce mois
  const dossiersCrees = (projects || []).filter((p: any) => {
    const history = p.history || [];
    const creationEntry = history.find((h: any) => 
      h.kind === 0 || h.labelKind?.toLowerCase().includes('création')
    );
    
    if (creationEntry?.userId !== apogeeUserId && p.createdBy !== apogeeUserId) {
      return false;
    }
    
    const dateStr = p.date || p.createdAt;
    if (!dateStr) return false;
    
    try {
      const projDate = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
      return isWithinInterval(projDate, interval);
    } catch {
      return false;
    }
  }).length;

  // RDV planifiés ce mois
  const rdvPlanifies = (interventions || []).filter((i: any) => {
    const dateStr = i.dateReelle || i.date;
    if (!dateStr) return false;
    
    try {
      const interDate = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
      return isWithinInterval(interDate, interval);
    } catch {
      return false;
    }
  }).length;

  // Dossiers en cours
  const dossiersEnCours = (projects || []).filter((p: any) => {
    const state = (p.state || '').toLowerCase();
    return !['clos', 'closed', 'cancelled', 'annule'].includes(state);
  }).length;

  // Clients contactés
  const clientsContactes = new Set(
    (projects || [])
      .filter((p: any) => {
        const dateStr = p.date;
        if (!dateStr) return false;
        try {
          const projDate = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
          return isWithinInterval(projDate, interval);
        } catch {
          return false;
        }
      })
      .map((p: any) => p.clientId)
      .filter(Boolean)
  ).size;

  return {
    devisCrees,
    facturesCrees,
    dossiersCrees,
    rdvPlanifies,
    dossiersEnCours,
    clientsContactes,
  };
}
