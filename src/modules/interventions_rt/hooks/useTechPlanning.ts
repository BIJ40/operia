// Hook pour récupérer le planning du technicien
// Connecté à l'API Apogée via proxy sécurisé

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TechIntervention, RtStatus } from '../types';
import { format, addDays, parseISO, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { apogeeProxy } from '@/services/apogeeProxy';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type DateFilter = 'today' | 'tomorrow' | 'all';

interface UseTechPlanningResult {
  interventions: TechIntervention[];
  isLoading: boolean;
  error: Error | null;
  dateFilter: DateFilter;
  setDateFilter: (filter: DateFilter) => void;
  updateRtStatus: (interventionId: string, status: RtStatus) => void;
  getIntervention: (id: string) => TechIntervention | undefined;
  refetch: () => void;
  technicienName: string | null;
  apogeeUserId: number | null;
}

// Mapping de l'intervention API vers TechIntervention
function mapApiInterventionToTech(apiIntervention: any, project?: any, client?: any): TechIntervention {
  // Extraire les heures de début et fin
  const startTime = apiIntervention.techTimeStart 
    ? apiIntervention.techTimeStart.substring(0, 5) 
    : apiIntervention.data?.heureDebut || '08:00';
  const endTime = apiIntervention.techTimeEnd 
    ? apiIntervention.techTimeEnd.substring(0, 5) 
    : apiIntervention.data?.heureFin || '10:00';

  // Déterminer le type d'intervention
  let type = apiIntervention.type2 || apiIntervention.type || 'Intervention';
  if (type === 'A DEFINIR') {
    // Résolution selon les règles métier
    if (apiIntervention.data?.biDepan?.Items?.IsValidated) type = 'Dépannage';
    else if (apiIntervention.data?.biTvx?.Items?.IsValidated) type = 'Travaux';
    else if (apiIntervention.data?.biRt?.Items?.IsValidated) type = 'RT';
    else type = 'Intervention';
  }

  // Extraire l'univers
  const univers = (apiIntervention.universes && apiIntervention.universes[0]) 
    || (project?.universes && project.universes[0]) 
    || 'Non classé';

  return {
    id: String(apiIntervention.id),
    projectId: apiIntervention.projectId || apiIntervention.project_id,
    clientName: client?.nom 
      ? `${client.civilite || ''} ${client.nom} ${client.prenom || ''}`.trim()
      : project?.clientName || 'Client inconnu',
    clientPhone: client?.tel || project?.clientPhone || '',
    address: apiIntervention.adresse || project?.adresse || '',
    city: apiIntervention.ville || project?.ville || '',
    postalCode: apiIntervention.cp || project?.codePostal || '',
    startTime,
    endTime,
    univers,
    type,
    dossierRef: project?.ref || `DOS-${apiIntervention.projectId}`,
    rtStatus: 'not_started', // Sera enrichi plus tard via rt_sessions
    date: apiIntervention.date || apiIntervention.dateIntervention,
  };
}

// Normaliser une chaîne pour comparaison (sans accents, lowercase)
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Trouver l'ID Apogée du technicien en matchant par nom
function findApogeeUserId(
  users: any[],
  firstName: string,
  lastName: string
): number | null {
  const normalizedFirst = normalizeString(firstName);
  const normalizedLast = normalizeString(lastName);

  for (const user of users) {
    const userFirst = normalizeString(user.firstname || '');
    const userLast = normalizeString(user.name || '');
    
    // Match exact ou partiel
    if (
      (userFirst === normalizedFirst && userLast === normalizedLast) ||
      (userFirst.includes(normalizedFirst) && userLast.includes(normalizedLast)) ||
      (normalizedFirst.includes(userFirst) && normalizedLast.includes(userLast))
    ) {
      return user.id;
    }
  }
  return null;
}

export function useTechPlanning(): UseTechPlanningResult {
  const { agence, user } = useAuth();
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [rtStatuses, setRtStatuses] = useState<Record<string, RtStatus>>({});

  // Récupérer le profil utilisateur avec first_name, last_name
  const { data: profileData } = useQuery({
    queryKey: ['tech-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Récupérer les interventions via l'API
  const { data: apiData, isLoading, error, refetch } = useQuery({
    queryKey: ['tech-interventions', agence],
    queryFn: async () => {
      if (!agence) {
        return { interventions: [], projects: [], clients: [], users: [] };
      }

      // Récupérer interventions, projets, clients et users en parallèle
      const [interventions, projects, clients, users] = await Promise.all([
        apogeeProxy.getInterventions(),
        apogeeProxy.getProjects(),
        apogeeProxy.getClients(),
        apogeeProxy.getUsers(),
      ]);

      return { interventions, projects, clients, users };
    },
    enabled: !!agence,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Trouver l'ID Apogée du technicien connecté
  const apogeeUserId = useMemo(() => {
    if (!profileData?.first_name || !profileData?.last_name || !apiData?.users) {
      return null;
    }
    return findApogeeUserId(
      apiData.users,
      profileData.first_name,
      profileData.last_name
    );
  }, [profileData, apiData?.users]);

  const technicienName = profileData 
    ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() 
    : null;

  // Transformer et filtrer les interventions
  const interventions = useMemo(() => {
    if (!apiData?.interventions) return [];

    // Créer des maps pour lookup rapide
    const projectsMap = new Map(
      (apiData.projects || []).map((p: any) => [String(p.id), p])
    );
    const clientsMap = new Map(
      (apiData.clients || []).map((c: any) => [String(c.id), c])
    );

    // Filtrer par date et technicien
    const today = startOfDay(new Date());
    const tomorrow = startOfDay(addDays(new Date(), 1));

    const mapped = apiData.interventions
      .filter((int: any) => {
        // Exclure les interventions annulées
        if (int.state === 'cancelled' || int.state === 'canceled') return false;
        
        // Filtrer par technicien connecté
        if (apogeeUserId) {
          const intUserId = int.userId || int.user_id;
          if (intUserId !== apogeeUserId) return false;
        }
        
        const intDate = int.date || int.dateIntervention;
        if (!intDate) return false;

        const interventionDate = startOfDay(parseISO(intDate));

        switch (dateFilter) {
          case 'today':
            return interventionDate.getTime() === today.getTime();
          case 'tomorrow':
            return interventionDate.getTime() === tomorrow.getTime();
          case 'all':
            return interventionDate.getTime() >= today.getTime();
        }
      })
      .map((int: any) => {
        const project = projectsMap.get(String(int.projectId || int.project_id));
        const clientId = project?.clientId || int.clientId || int.client_id;
        const client = clientsMap.get(String(clientId));
        
        return mapApiInterventionToTech(int, project, client);
      })
      .sort((a: TechIntervention, b: TechIntervention) => {
        // Tri par heure de début
        return a.startTime.localeCompare(b.startTime);
      });

    // Appliquer les statuts RT locaux
    return mapped.map((int: TechIntervention) => ({
      ...int,
      rtStatus: rtStatuses[int.id] || int.rtStatus,
    }));
  }, [apiData, dateFilter, rtStatuses, apogeeUserId]);

  const updateRtStatus = (interventionId: string, status: RtStatus) => {
    setRtStatuses(prev => ({ ...prev, [interventionId]: status }));
  };

  const getIntervention = (id: string): TechIntervention | undefined => {
    return interventions.find(int => int.id === id);
  };

  return {
    interventions,
    isLoading,
    error: error as Error | null,
    dateFilter,
    setDateFilter,
    updateRtStatus,
    getIntervention,
    refetch,
    technicienName,
    apogeeUserId,
  };
}

export function getDateLabel(filter: DateFilter): string {
  switch (filter) {
    case 'today':
      return `Aujourd'hui - ${format(new Date(), 'EEEE d MMMM', { locale: fr })}`;
    case 'tomorrow':
      return `Demain - ${format(addDays(new Date(), 1), 'EEEE d MMMM', { locale: fr })}`;
    case 'all':
      return 'Toutes les interventions';
  }
}

export function getRtStatusLabel(status: RtStatus): string {
  switch (status) {
    case 'not_started':
      return 'RT non démarré';
    case 'in_progress':
      return 'RT en cours';
    case 'completed':
      return 'RT terminé';
    case 'pdf_sent':
      return 'PDF envoyé';
  }
}

export function getRtStatusColor(status: RtStatus): string {
  switch (status) {
    case 'not_started':
      return 'bg-muted text-muted-foreground';
    case 'in_progress':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'pdf_sent':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  }
}

export default useTechPlanning;
