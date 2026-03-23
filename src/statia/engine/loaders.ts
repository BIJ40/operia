/**
 * StatIA V1 - Data Loaders
 * Chargement des données Apogée pour le moteur StatIA
 */

import { StatParams, LoadedData, DateRange } from '../definitions/types';

/**
 * Interface pour les services de données Apogée
 * Compatible avec les hooks existants
 */
export interface ApogeeDataServices {
  getFactures: (agencySlug: string, dateRange: DateRange) => Promise<any[]>;
  getDevis: (agencySlug: string, dateRange: DateRange) => Promise<any[]>;
  getInterventions: (agencySlug: string, dateRange: DateRange) => Promise<any[]>;
  getProjects: (agencySlug: string, dateRange: DateRange) => Promise<any[]>;
  getUsers: (agencySlug: string) => Promise<any[]>;
  getClients: (agencySlug: string) => Promise<any[]>;
  getCreneaux?: (agencySlug: string, dateRange?: DateRange) => Promise<any[]>;
}

/**
 * Loader principal qui charge toutes les données nécessaires
 */
export async function loadAllData(
  params: StatParams,
  services: ApogeeDataServices
): Promise<LoadedData> {
  if (!params.agencySlug) {
    throw new Error('agencySlug is required for data loading');
  }

  const [factures, devis, interventions, projects, users, clients] = await Promise.all([
    services.getFactures(params.agencySlug, params.dateRange),
    services.getDevis(params.agencySlug, params.dateRange),
    services.getInterventions(params.agencySlug, params.dateRange),
    services.getProjects(params.agencySlug, params.dateRange),
    services.getUsers(params.agencySlug),
    services.getClients(params.agencySlug),
  ]);

  return {
    factures: factures || [],
    devis: devis || [],
    interventions: interventions || [],
    projects: projects || [],
    users: users || [],
    clients: clients || [],
  };
}

/**
 * Loader optimisé qui ne charge que les sources nécessaires
 */
export async function loadDataForSources(
  sources: string[],
  params: StatParams,
  services: ApogeeDataServices
): Promise<Partial<LoadedData>> {
  if (!params.agencySlug) {
    throw new Error('agencySlug is required for data loading');
  }

  const result: Partial<LoadedData> = {};
  const promises: Promise<void>[] = [];

  if (sources.includes('factures')) {
    promises.push(
      services.getFactures(params.agencySlug, params.dateRange)
        .then(data => { result.factures = data || []; })
    );
  }

  if (sources.includes('devis')) {
    promises.push(
      services.getDevis(params.agencySlug, params.dateRange)
        .then(data => { result.devis = data || []; })
    );
  }

  if (sources.includes('interventions')) {
    promises.push(
      services.getInterventions(params.agencySlug, params.dateRange)
        .then(data => { result.interventions = data || []; })
    );
  }

  if (sources.includes('projects')) {
    promises.push(
      services.getProjects(params.agencySlug, params.dateRange)
        .then(data => { result.projects = data || []; })
    );
  }

  // Users et clients sont souvent nécessaires pour les jointures
  if (sources.includes('users') || sources.includes('interventions') || sources.includes('technicien')) {
    promises.push(
      services.getUsers(params.agencySlug)
        .then(data => { result.users = data || []; })
    );
  }

  if (sources.includes('clients') || sources.includes('apporteur') || sources.includes('type_apporteur')) {
    promises.push(
      services.getClients(params.agencySlug)
        .then(data => { result.clients = data || []; })
    );
  }

  await Promise.all(promises);

  return result;
}

/**
 * Crée un index des projets par ID pour les jointures rapides
 * Index par BOTH string et number pour garantir le matching
 */
export function indexProjectsById(projects: any[]): Map<string | number, any> {
  const index = new Map<string | number, any>();
  
  for (const project of projects) {
    if (project.id !== undefined && project.id !== null) {
      // Index par les deux types pour éviter les problèmes de type-mismatch
      index.set(project.id, project);
      index.set(String(project.id), project);
      if (typeof project.id === 'string' && !isNaN(Number(project.id))) {
        index.set(Number(project.id), project);
      }
    }
  }
  
  return index;
}

/**
 * Crée un index des users par ID pour les jointures rapides
 * Triple indexation pour éviter les type mismatch
 */
export function indexUsersById(users: any[]): Map<string | number, any> {
  const index = new Map<string | number, any>();
  
  for (const user of users) {
    if (user.id !== undefined && user.id !== null) {
      index.set(user.id, user);
      index.set(String(user.id), user);
      const numId = Number(user.id);
      if (!isNaN(numId)) {
        index.set(numId, user);
      }
    }
  }
  
  return index;
}

/**
 * Crée un index des clients par ID pour les jointures rapides
 * Triple indexation pour éviter les type mismatch (commanditaireId peut être string ou number)
 */
export function indexClientsById(clients: any[]): Map<string | number, any> {
  const index = new Map<string | number, any>();
  
  for (const client of clients) {
    if (client.id !== undefined && client.id !== null) {
      index.set(client.id, client);
      index.set(String(client.id), client);
      const numId = Number(client.id);
      if (!isNaN(numId)) {
        index.set(numId, client);
      }
    }
  }
  
  return index;
}

/**
 * Filtre les données par période
 */
export function filterByDateRange<T extends { date?: string; dateReelle?: string; created_at?: string }>(
  items: T[],
  dateRange: DateRange
): T[] {
  return items.filter(item => {
    const dateStr = item.dateReelle || item.date || item.created_at;
    if (!dateStr) return false;
    
    const date = new Date(dateStr);
    return date >= dateRange.start && date <= dateRange.end;
  });
}
