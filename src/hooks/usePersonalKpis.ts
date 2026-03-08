/**
 * Hook pour récupérer les KPIs personnels basés sur l'apogee_user_id
 * Utilise les métriques StatIA existantes avec filtre userId
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { useProfile } from '@/contexts/ProfileContext';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { computeCaParTechnicienCore, CaParTechnicienParams } from '@/statia/engines/caParTechnicienCore';
import { DataService } from '@/apogee-connect/services/dataService';
import { logDebug } from '@/lib/logger';
// ApogeeLoadedData type available in src/types/apogee.ts for future typed migrations

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

// Types productifs (dépannage, travaux - pas RT/SAV/diagnostic)
const PRODUCTIVE_TYPES = ['depannage', 'travaux', 'work', 'repair', 'recherche de fuite'];

function isProductiveType(type: string): boolean {
  return PRODUCTIVE_TYPES.some(t => (type || '').toLowerCase().includes(t));
}

/** Checks if a date string falls within interval */
function isInInterval(dateStr: string | null | undefined, interval: { start: Date; end: Date }): boolean {
  if (!dateStr) return false;
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    return isWithinInterval(d, interval);
  } catch {
    return false;
  }
}

/** Checks if a user ID matches an apogee user (flexible comparison) */
function matchesUserId(uid: string | number | null | undefined, apogeeUserId: number): boolean {
  return uid === apogeeUserId || uid === String(apogeeUserId) || Number(uid) === apogeeUserId;
}

/** Checks if a tech is assigned to an intervention */
function isTechInIntervention(inter: Record<string, unknown>, apogeeUserId: number): boolean {
  // 1. usersIds array
  const usersIds = (inter.usersIds || []) as Array<string | number>;
  if (usersIds.some((uid) => matchesUserId(uid, apogeeUserId))) return true;

  // 2. data.visites
  const data = inter.data as Record<string, unknown> | undefined;
  const visites = (data?.visites || []) as Array<Record<string, unknown>>;
  if (visites.some((v) =>
    ((v.usersIds || []) as Array<string | number>).some((uid) => matchesUserId(uid, apogeeUserId))
  )) return true;

  // 3. userId simple
  const userId = (inter.userId || inter.user_id) as string | number | undefined;
  if (matchesUserId(userId, apogeeUserId)) return true;

  return false;
}

export function usePersonalKpis(options?: UsePersonalKpisOptions) {
  const { user } = useAuthCore();
  const { agence } = useProfile();

  const now = new Date();
  const dateRange = useMemo(() => options?.dateRange || {
    start: startOfMonth(now),
    end: endOfMonth(now),
  }, [options?.dateRange?.start?.getTime(), options?.dateRange?.end?.getTime()]);

  return useQuery({
    queryKey: ['personal-kpis', user?.id, agence, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!user?.id || !agence) return null;

      const { supabase } = await import('@/integrations/supabase/client');
      
      const [{ data: profile }, { data: collaborator }] = await Promise.all([
        supabase.from('profiles').select('global_role, role_agence').eq('id', user.id).single(),
        supabase.from('collaborators').select('apogee_user_id, type').eq('user_id', user.id).single(),
      ]);

      const apogeeUserId = collaborator?.apogee_user_id;
      if (!apogeeUserId) {
        logDebug('[usePersonalKpis] No apogee_user_id found');
        return { type: 'not_linked' as const };
      }

      const roleAgence = (profile?.role_agence || collaborator?.type || '').toLowerCase();
      const isTechnicien = roleAgence.includes('technic') || roleAgence.includes('tech');
      const isAssistante = roleAgence.includes('assist') || roleAgence.includes('secr') || roleAgence.includes('admin');

      logDebug('[usePersonalKpis] Profile:', { apogeeUserId, roleAgence, isTechnicien, isAssistante });

      const apiData = await DataService.loadAllData(true, false, agence);
      
      logDebug('[usePersonalKpis] Data loaded:', {
        factures: apiData.factures?.length || 0,
        interventions: apiData.interventions?.length || 0,
      });

      if (isTechnicien) {
        return {
          type: 'technicien' as const,
          data: calculateTechnicienKpis(apiData, apogeeUserId, dateRange.start, dateRange.end),
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
function calculateTechnicienKpis(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- External Apogée API data is untyped
  apiData: any,
  apogeeUserId: number,
  monthStart: Date,
  monthEnd: Date
): TechnicienKpis {
  const { factures, interventions, projects, users } = apiData;
  const interval = { start: monthStart, end: monthEnd };

  // Find tech name for CA matching
  const myUser = (users || []).find((u) => u.id === apogeeUserId);
  const myTechName = myUser ? `${myUser.firstname || ''} ${myUser.name || ''}`.trim().toUpperCase() : null;

  // === 1. CA du mois via StatIA ===
  const statiaParams: CaParTechnicienParams = {
    dateRange: { start: monthStart, end: monthEnd },
    topN: 100,
  };
  const caResult = computeCaParTechnicienCore(
    { factures, projects, interventions, users },
    statiaParams
  );
  const techRanking = caResult.ranking || [];
  const myTechData = techRanking.find((t: any) => {
    const rankName = (t.label || t.name || '').toUpperCase();
    return rankName === myTechName || rankName.includes(myTechName || 'IMPOSSIBLE');
  });
  const caMonth = myTechData?.value || 0;

  // === 2. Interventions du mois ===
  const techInterventions = (interventions || []).filter((inter: any) => {
    if (!isTechInIntervention(inter, apogeeUserId)) return false;
    const dateStr = inter.dateReelle || inter.date || inter.dateIntervention;
    return isInInterval(dateStr, interval);
  });

  // === 3. Dossiers traités ===
  const techProjectIds = new Set(techInterventions.map((i: any) => i.projectId));
  const monthFactures = (factures || []).filter((f: any) =>
    isInInterval(f.dateReelle || f.date, interval)
  );
  const facturedProjectIds = new Set(monthFactures.map((f: any) => f.projectId));
  const dossiersTraites = [...techProjectIds].filter(pid => facturedProjectIds.has(pid)).length;

  // === 4. Heures travaillées ===
  let heuresProductives = 0;
  let heuresTotales = 0;

  for (const inter of techInterventions) {
    const visites = inter.data?.visites || inter.visites || [];
    const type = (inter.type || inter.type2 || '').toLowerCase();
    const isProductive = isProductiveType(type);

    for (const visite of visites) {
      const visiteUserIds = visite.usersIds || [];
      if (!visiteUserIds.some((uid: any) => matchesUserId(uid, apogeeUserId))) continue;

      let duree = 0;
      if (visite.creneaux && Array.isArray(visite.creneaux)) {
        for (const creneau of visite.creneaux) {
          if (creneau.debut && creneau.fin) {
            const [dh, dm] = creneau.debut.split(':').map(Number);
            const [fh, fm] = creneau.fin.split(':').map(Number);
            duree += (fh * 60 + fm - dh * 60 - dm) / 60;
          }
        }
      } else {
        duree = (visite.duree || visite.tempsPrevu || 0) / 60;
      }

      heuresTotales += duree;
      if (isProductive) heuresProductives += duree;
    }

    // Direct assignment (no visites)
    if (visites.length === 0) {
      const usersIds = inter.usersIds || [];
      if (usersIds.some((uid: any) => matchesUserId(uid, apogeeUserId))) {
        const duree = (inter.duree || inter.tempsPrevu || 0) / 60;
        heuresTotales += duree;
        if (isProductive) heuresProductives += duree;
      }
    }
  }

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- External Apogée API data is untyped
  apiData: any,
  apogeeUserId: number,
  monthStart: Date,
  monthEnd: Date
): AssistanteKpis {
  const { factures, devis, projects, interventions } = apiData;
  const interval = { start: monthStart, end: monthEnd };

  const devisCrees = (devis || []).filter((d: any) => {
    if (d.createdBy !== apogeeUserId && d.userId !== apogeeUserId) return false;
    return isInInterval(d.dateReelle || d.date || d.createdAt, interval);
  }).length;

  const facturesCrees = (factures || []).filter((f: any) => {
    if (f.createdBy !== apogeeUserId && f.userId !== apogeeUserId) return false;
    return isInInterval(f.dateReelle || f.date || f.createdAt, interval);
  }).length;

  const dossiersCrees = (projects || []).filter((p: any) => {
    const history = p.history || [];
    const creationEntry = history.find((h: any) =>
      h.kind === 0 || h.labelKind?.toLowerCase().includes('création')
    );
    if (creationEntry?.userId !== apogeeUserId && p.createdBy !== apogeeUserId) return false;
    return isInInterval(p.date || p.createdAt, interval);
  }).length;

  const rdvPlanifies = (interventions || []).filter((i: any) =>
    isInInterval(i.dateReelle || i.date, interval)
  ).length;

  const dossiersEnCours = (projects || []).filter((p: any) => {
    const state = (p.state || '').toLowerCase();
    return !['clos', 'closed', 'cancelled', 'annule'].includes(state);
  }).length;

  const clientsContactes = new Set(
    (projects || [])
      .filter((p: any) => isInInterval(p.date, interval))
      .map((p: any) => p.clientId)
      .filter(Boolean)
  ).size;

  return { devisCrees, facturesCrees, dossiersCrees, rdvPlanifies, dossiersEnCours, clientsContactes };
}
