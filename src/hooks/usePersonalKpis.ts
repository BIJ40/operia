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

export function usePersonalKpis() {
  const { user, agence } = useAuth();
  
  return useQuery({
    queryKey: ['personal-kpis', user?.id, agence],
    queryFn: async () => {
      if (!user?.id || !agence) return null;

      // Récupérer le profil avec apogee_user_id
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: profile } = await supabase
        .from('profiles')
        .select('apogee_user_id, global_role, role_agence')
        .eq('id', user.id)
        .single();

      if (!profile?.apogee_user_id) {
        return { type: 'not_linked' as const };
      }

      const apogeeUserId = profile.apogee_user_id;
      const roleAgence = (profile.role_agence || '').toLowerCase();
      
      // Déterminer le type d'utilisateur
      const isTechnicien = roleAgence.includes('technic') || roleAgence.includes('tech');
      const isAssistante = roleAgence.includes('assist') || roleAgence.includes('secr') || roleAgence.includes('admin');

      console.log('[usePersonalKpis] Profile:', { apogeeUserId, roleAgence, isTechnicien, isAssistante });

      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Charger les données via DataService (même source que StatIA)
      const apiData = await DataService.loadAllData(true);
      
      console.log('[usePersonalKpis] Data loaded:', {
        factures: apiData.factures?.length || 0,
        interventions: apiData.interventions?.length || 0,
        projects: apiData.projects?.length || 0,
        users: apiData.users?.length || 0,
      });

      if (isTechnicien) {
        return {
          type: 'technicien' as const,
          data: calculateTechnicienKpisStatia(apiData, apogeeUserId, monthStart, monthEnd),
        };
      }

      if (isAssistante) {
        return {
          type: 'assistante' as const,
          data: calculateAssistanteKpis(apiData, apogeeUserId, monthStart, monthEnd),
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

  // === 1. CA du mois (utilise le moteur StatIA) ===
  const statiaParams: CaParTechnicienParams = {
    dateRange: { start: monthStart, end: monthEnd },
  };
  const caResult = computeCaParTechnicienCore(
    { factures, projects, interventions, users },
    statiaParams
  );
  
  // Extraire le CA du technicien spécifique depuis le ranking
  const techRanking = caResult.ranking || [];
  const myTechData = techRanking.find((t: any) => t.id === apogeeUserId);
  const caMonth = myTechData?.value || 0;
  
  console.log('[usePersonalKpis] Technician CA extraction:', { 
    apogeeUserId, 
    myTechData,
    caMonth,
    totalRanking: techRanking.length 
  });

  // Convertir l'ID en string et number pour comparaison flexible
  const apogeeUserIdStr = String(apogeeUserId);
  const apogeeUserIdNum = Number(apogeeUserId);

  // === 2. Interventions ce mois (assignées OU visites avec participation) ===
  const techInterventions = (interventions || []).filter((inter: any) => {
    // Vérifier assignation directe OU participation à une visite (comparaison flexible)
    const interUserId = inter.userId;
    const isAssigned = interUserId === apogeeUserId || 
                       interUserId === apogeeUserIdStr || 
                       Number(interUserId) === apogeeUserIdNum;
    
    const hasVisiteParticipation = (inter.visites || []).some((v: any) => 
      (v.usersIds || []).some((uid: any) => 
        uid === apogeeUserId || uid === apogeeUserIdStr || Number(uid) === apogeeUserIdNum
      )
    );
    
    if (!isAssigned && !hasVisiteParticipation) return false;

    // Vérifier la date
    const dateStr = inter.dateReelle || inter.date;
    if (!dateStr) return false;
    
    try {
      const interDate = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
      return isWithinInterval(interDate, interval);
    } catch {
      return false;
    }
  });

  console.log('[usePersonalKpis] Interventions:', { 
    apogeeUserId, 
    techInterventionsCount: techInterventions.length,
    totalInterventions: (interventions || []).length,
    sampleIntervention: (interventions || [])[0]
  });

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
  
  console.log('[usePersonalKpis] Dossiers:', { 
    techProjectIds: techProjectIds.size, 
    monthFactures: monthFactures.length,
    facturedProjectIds: facturedProjectIds.size,
    dossiersTraites
  });

  // === 4. Heures travaillées (via créneaux ou durée des visites) ===
  let heuresProductives = 0;
  let heuresTotales = 0;
  
  for (const inter of techInterventions) {
    const visites = inter.visites || [];
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
          // Fallback sur durée déclarée
          duree = visite.duree || visite.tempsPrevu || 2;
        }
        
        heuresTotales += duree;
        if (isProductive) heuresProductives += duree;
      }
    }
    
    // Si pas de visites mais technicien assigné directement
    if (visites.length === 0) {
      const interUserId = inter.userId;
      const isDirectAssign = interUserId === apogeeUserId || 
                             interUserId === apogeeUserIdStr || 
                             Number(interUserId) === apogeeUserIdNum;
      if (isDirectAssign) {
        const duree = inter.duree || inter.tempsPrevu || 2;
        heuresTotales += duree;
        if (isProductive) heuresProductives += duree;
      }
    }
  }

  console.log('[usePersonalKpis] Heures:', { 
    heuresTotales, 
    heuresProductives,
    interventionsCount: techInterventions.length
  });

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
