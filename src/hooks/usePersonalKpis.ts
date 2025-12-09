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

      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Charger les données via DataService (même source que StatIA)
      const apiData = await DataService.loadAllData(true);

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

  // Utiliser le moteur StatIA pour le CA (SOURCE DE VÉRITÉ)
  const statiaParams: CaParTechnicienParams = {
    dateRange: { start: monthStart, end: monthEnd },
    filters: {
      technicienId: apogeeUserId,
    },
  };
  
  const caResult = computeCaParTechnicienCore(
    { factures, projects, interventions, users },
    statiaParams
  );
  const caMonth = caResult.value || 0;

  // Interventions du technicien ce mois (logique simple)
  const techInterventions = (interventions || []).filter((inter: any) => {
    // Vérifier si le technicien est assigné
    const isAssigned = inter.userId === apogeeUserId || 
      (inter.visites || []).some((v: any) => 
        (v.usersIds || []).includes(apogeeUserId)
      );
    
    if (!isAssigned) return false;

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

  // Dossiers traités (projets avec interventions)
  const projectIds = new Set(techInterventions.map((i: any) => i.projectId));
  const dossiersTraites = projectIds.size;

  // Heures travaillées (estimation basée sur les créneaux)
  let heuresTravaillees = 0;
  for (const inter of techInterventions) {
    const visites = inter.visites || [];
    for (const visite of visites) {
      if ((visite.usersIds || []).includes(apogeeUserId)) {
        const duree = visite.duree || visite.tempsPrevu || 2;
        heuresTravaillees += duree;
      }
    }
    if (visites.length === 0 && inter.userId === apogeeUserId) {
      heuresTravaillees += 2;
    }
  }

  // Taux de productivité (interventions terminées/validées)
  const interventionsValidees = techInterventions.filter((i: any) => 
    ['validated', 'done', 'finished', 'completed'].includes((i.state || '').toLowerCase())
  ).length;
  
  const tauxProductivite = techInterventions.length > 0 
    ? (interventionsValidees / techInterventions.length) * 100 
    : 0;

  return {
    caMonth: Math.round(caMonth * 100) / 100,
    dossiersTraites,
    interventionsRealisees: techInterventions.length,
    heuresTravaillees: Math.round(heuresTravaillees * 10) / 10,
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
