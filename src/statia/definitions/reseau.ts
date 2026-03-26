/**
 * StatIA V2 - Définitions des métriques Réseau Franchiseur
 * Métriques consolidées multi-agences pour le niveau réseau
 */

import { StatDefinition, LoadedData, StatParams, StatResult } from './types';
import { parseISO, isWithinInterval, differenceInDays } from 'date-fns';
import { extractFactureMeta } from '../rules/rules';
import { 
  isFactureStateIncluded,
  isValidInterventionState,
  isProductiveInterventionType,
  normalizeInterventionType
} from '../engine/normalizers';
import { indexProjectsById, indexUsersById } from '../engine/loaders';
import { isExcludedUserType, normalizeIsOn } from '@/apogee-connect/utils/techTools';

function isFieldTechnician(user: any): boolean {
  if (!user) return false;

  const userType = String(user?.type || '').trim();
  if (isExcludedUserType(userType)) return false;

  const skills = user?.data?.skills ?? user?.skills;
  const hasSkills = Array.isArray(skills) && skills.length > 0;
  const isActive = normalizeIsOn(user?.is_on) || normalizeIsOn(user?.isActive);

  return isActive && hasSkills;
}

function collectAssignedTechnicianIds(intervention: any): Array<string | number> {
  const ids = new Set<string | number>();

  const addOne = (value: unknown) => {
    if (value === null || value === undefined) return;
    const normalized = typeof value === 'number' ? value : String(value).trim();
    if (normalized === '') return;
    ids.add(normalized);
  };

  const addMany = (values: unknown) => {
    if (!Array.isArray(values)) return;
    values.forEach(addOne);
  };

  addOne(intervention?.userId ?? intervention?.user_id);
  addMany(intervention?.usersIds ?? intervention?.userIds ?? intervention?.users_ids ?? intervention?.data?.usersIds ?? intervention?.data?.userIds ?? intervention?.data?.users_ids);

  const visites = Array.isArray(intervention?.data?.visites)
    ? intervention.data.visites
    : Array.isArray(intervention?.visites)
      ? intervention.visites
      : [];

  for (const visite of visites) {
    addOne(visite?.userId ?? visite?.user_id);
    addMany(visite?.usersIds ?? visite?.userIds ?? visite?.users_ids ?? visite?.data?.usersIds ?? visite?.data?.userIds ?? visite?.data?.users_ids);

    const creneaux = Array.isArray(visite?.creneaux) ? visite.creneaux : [];
    for (const creneau of creneaux) {
      addOne(creneau?.userId ?? creneau?.user_id);
      addMany(creneau?.usersIds ?? creneau?.userIds ?? creneau?.users_ids ?? creneau?.data?.usersIds ?? creneau?.data?.userIds ?? creneau?.data?.users_ids);
    }
  }

  const biV3Items = Array.isArray(intervention?.data?.biV3?.items) ? intervention.data.biV3.items : [];
  for (const item of biV3Items) {
    addMany(item?.usersIds ?? item?.userIds ?? item?.users_ids);
  }

  return Array.from(ids);
}

/**
 * CA par Agence sur période
 * Ventilation du CA par agence
 */
export const caParAgence: StatDefinition = {
  id: 'ca_par_agence',
  label: 'CA par Agence',
  description: 'Chiffre d\'affaires HT ventilé par agence',
  category: 'reseau',
  source: 'factures',
  dimensions: ['agence'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    const byAgence: Record<string, { ca: number; count: number; label: string }> = {};
    let totalCA = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      const factureState = facture.state || facture.status || facture.data?.state || '';
      if (!isFactureStateIncluded(factureState)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      // Identifier l'agence (depuis le contexte de chargement ou la facture)
      const agenceId = facture.agencyId || facture.agency_id || 'default';
      const agenceLabel = facture.agencyLabel || facture.agency_label || `Agence ${agenceId}`;
      
      if (!byAgence[agenceId]) {
        byAgence[agenceId] = { ca: 0, count: 0, label: agenceLabel };
      }
      
      byAgence[agenceId].ca += meta.montantNetHT;
      byAgence[agenceId].count++;
      totalCA += meta.montantNetHT;
    }
    
    const result: Record<string, number> = {};
    const labels: Record<string, string> = {};
    
    for (const [id, data] of Object.entries(byAgence)) {
      result[id] = Math.round(data.ca * 100) / 100;
      labels[id] = data.label;
    }
    
    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: Object.keys(byAgence).length,
      },
      breakdown: {
        total: Math.round(totalCA * 100) / 100,
        labels,
        agenceCount: Object.keys(byAgence).length,
      }
    };
  }
};

/**
 * Nombre d'interventions sur période
 */
export const nbInterventionsPeriode: StatDefinition = {
  id: 'nb_interventions_periode',
  label: 'Interventions sur période',
  description: 'Nombre d\'interventions réalisées sur la période',
  category: 'reseau',
  source: 'interventions',
  aggregation: 'count',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions } = data;

    // NOTE: Cette métrique est utilisée côté agence (onglet Général) pour alimenter
    // la tuile "RT". On expose donc un breakdown.byType (dont byType.rt).
    const byType: Record<string, number> = {};

    // Résolution robuste du type réel d'une intervention (compatible données Apogée)
    // - type2="A DEFINIR" => regarder biDepan/biTvx/biRt et leurs validations
    // - sinon => utiliser type2/type
    const resolveInterventionTypeForStats = (intervention: any): string => {
      const rawType2 = (intervention.data?.type2 ?? intervention.type2 ?? '') as string;
      const rawType = (intervention.data?.type ?? intervention.type ?? '') as string;

      const type2 = String(rawType2 || '').trim();

      const isADefinir = type2.toLowerCase() === 'a definir' || type2.toLowerCase() === 'à definir' || type2.toLowerCase() === 'a définir' || type2.toLowerCase() === 'à définir' || type2.toUpperCase() === 'A DEFINIR' || type2.toUpperCase() === 'A DÉFINIR';

      const isValidatedFromBI = (bi: any): boolean => {
        if (!bi) return false;

        // Cas où le bloc expose directement isValidated / IsValidated
        if (bi.isValidated === true || bi.IsValidated === true) return true;

        // Cas items[] ou Items[]
        const items = bi.items ?? bi.Items;
        if (Array.isArray(items)) {
          return items.some((it: any) => it?.isValidated === true || it?.IsValidated === true);
        }

        // Cas Items = { isValidated: true }
        if (items && typeof items === 'object') {
          return (items as any).isValidated === true || (items as any).IsValidated === true;
        }

        return false;
      };

      if (isADefinir) {
        const biDepan = intervention.data?.biDepan ?? intervention.biDepan;
        const biTvx = intervention.data?.biTvx ?? intervention.biTvx;
        const biRt = intervention.data?.biRt ?? intervention.biRt;

        // Ordre de résolution aligné sur rules.json (biDepan -> biTvx -> biRt)
        if (isValidatedFromBI(biDepan)) return 'depannage';
        if (isValidatedFromBI(biTvx)) return 'travaux';
        if (isValidatedFromBI(biRt)) return 'rt';

        return 'non_defini';
      }

      // type2 prioritaire, sinon type
      return type2 || String(rawType || '').trim() || 'autre';
    };

    let count = 0;

    for (const intervention of interventions) {
      // Vérifier l'état
      if (!isValidInterventionState(intervention.state)) continue;

      const dateStr = intervention.dateReelle || intervention.date || intervention.created_at;
      if (!dateStr) continue;

      try {
        const date = parseISO(dateStr);
        if (!isWithinInterval(date, { start: params.dateRange.start, end: params.dateRange.end })) {
          continue;
        }
      } catch {
        continue;
      }

      count++;

      const resolvedType = resolveInterventionTypeForStats(intervention);
      const typeKey = normalizeInterventionType(resolvedType);
      byType[typeKey] = (byType[typeKey] || 0) + 1;
    }

    return {
      value: count,
      metadata: {
        computedAt: new Date(),
        source: 'interventions',
        recordCount: count,
      },
      breakdown: {
        byType,
        rt: byType.rt ?? 0,
      },
    };
  }
};

/**
 * CA moyen par dossier facturé
 */
export const caMoyenParDossier: StatDefinition = {
  id: 'ca_moyen_par_dossier',
  label: 'CA moyen par dossier',
  description: 'Chiffre d\'affaires moyen par dossier facturé',
  category: 'reseau',
  source: 'factures',
  aggregation: 'avg',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures } = data;
    
    const caParProjet = new Map<string | number, number>();
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      const factureState = facture.state || facture.status || facture.data?.state || '';
      if (!isFactureStateIncluded(factureState)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      const projectId = facture.projectId || facture.project_id;
      if (!projectId) continue;
      
      const current = caParProjet.get(projectId) || 0;
      caParProjet.set(projectId, current + meta.montantNetHT);
    }
    
    const nbDossiers = caParProjet.size;
    const totalCA = Array.from(caParProjet.values()).reduce((a, b) => a + b, 0);
    const moyenne = nbDossiers > 0 ? totalCA / nbDossiers : 0;
    
    return {
      value: Math.round(moyenne * 100) / 100,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: nbDossiers,
      },
      breakdown: {
        totalCA: Math.round(totalCA * 100) / 100,
        nbDossiersfactures: nbDossiers,
      }
    };
  }
};

/**
 * CA moyen par intervention
 */
export const caMoyenParIntervention: StatDefinition = {
  id: 'ca_moyen_par_intervention',
  label: 'CA moyen par intervention',
  description: 'CA moyen = CA période / nb interventions réalisées',
  category: 'reseau',
  source: ['factures', 'interventions'],
  aggregation: 'avg',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, interventions } = data;
    
    // Calculer le CA total
    let totalCA = 0;
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      const factureState = facture.state || facture.status || facture.data?.state || '';
      if (!isFactureStateIncluded(factureState)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      totalCA += meta.montantNetHT;
    }
    
    // Compter les interventions
    let nbInterventions = 0;
    for (const intervention of interventions) {
      if (!isValidInterventionState(intervention.state)) continue;
      
      const dateStr = intervention.dateReelle || intervention.date || intervention.created_at;
      if (!dateStr) continue;
      
      try {
        const date = parseISO(dateStr);
        if (isWithinInterval(date, { start: params.dateRange.start, end: params.dateRange.end })) {
          nbInterventions++;
        }
      } catch {
        continue;
      }
    }
    
    const moyenne = nbInterventions > 0 ? totalCA / nbInterventions : 0;
    
    return {
      value: Math.round(moyenne * 100) / 100,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: nbInterventions,
      },
      breakdown: {
        totalCA: Math.round(totalCA * 100) / 100,
        nbInterventions,
      }
    };
  }
};

/**
 * Taux SAV par Agence
 */
export const tauxSavParAgence: StatDefinition = {
  id: 'taux_sav_par_agence',
  label: 'Taux SAV par Agence',
  description: 'Taux de SAV ventilé par agence',
  category: 'reseau',
  source: ['interventions', 'projects'],
  dimensions: ['agence'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { interventions, projects } = data;
    
    const projectsById = indexProjectsById(projects);
    
    // Stats par agence: { total dossiers, dossiers avec SAV }
    const statsByAgence = new Map<string, { total: number; sav: number; label: string }>();
    const dossiersParAgence = new Map<string, Set<string | number>>();
    const dossiersSAVParAgence = new Map<string, Set<string | number>>();
    
    for (const intervention of interventions) {
      const dateStr = intervention.dateReelle || intervention.date || intervention.created_at;
      if (dateStr) {
        try {
          const date = parseISO(dateStr);
          if (!isWithinInterval(date, { start: params.dateRange.start, end: params.dateRange.end })) {
            continue;
          }
        } catch {
          continue;
        }
      }
      
      const projectId = intervention.projectId || intervention.project_id;
      if (!projectId) continue;
      
      const project = projectsById.get(projectId);
      const agenceId = intervention.agencyId || project?.agencyId || 'default';
      const agenceLabel = intervention.agencyLabel || project?.agencyLabel || `Agence ${agenceId}`;
      
      // Initialiser
      if (!dossiersParAgence.has(agenceId)) {
        dossiersParAgence.set(agenceId, new Set());
        dossiersSAVParAgence.set(agenceId, new Set());
        statsByAgence.set(agenceId, { total: 0, sav: 0, label: agenceLabel });
      }
      
      dossiersParAgence.get(agenceId)!.add(projectId);
      
      // Détecter SAV
      const type2 = (intervention.data?.type2 || intervention.type2 || '').toLowerCase();
      const type = (intervention.data?.type || intervention.type || '').toLowerCase();
      const isSAV = type2.includes('sav') || type.includes('sav');
      
      if (isSAV) {
        dossiersSAVParAgence.get(agenceId)!.add(projectId);
      }
    }
    
    // Calculer les taux
    const result: Record<string, number> = {};
    const labels: Record<string, string> = {};
    
    for (const [agenceId, stats] of statsByAgence) {
      const totalDossiers = dossiersParAgence.get(agenceId)?.size || 0;
      const dossiersSAV = dossiersSAVParAgence.get(agenceId)?.size || 0;
      
      const taux = totalDossiers > 0 ? (dossiersSAV / totalDossiers) * 100 : 0;
      result[agenceId] = Math.round(taux * 10) / 10;
      labels[agenceId] = stats.label;
    }
    
    return {
      value: result,
      metadata: {
        computedAt: new Date(),
        source: 'interventions',
        recordCount: statsByAgence.size,
      },
      breakdown: { labels }
    };
  }
};

/**
 * Coût SAV Réseau
 * CA des factures SAV + devis SAV validés
 */
export const coutSavReseau: StatDefinition = {
  id: 'cout_sav_reseau',
  label: 'Coût SAV Réseau',
  description: 'Coût total du SAV (factures + devis SAV)',
  category: 'reseau',
  source: ['factures', 'devis'],
  aggregation: 'sum',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, devis } = data;
    
    let coutFactures = 0;
    let coutDevis = 0;
    let nbFactures = 0;
    let nbDevis = 0;
    
    // Factures SAV
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      // Détecter SAV via type ou flag
      const isSAV = facture.typeSAV || facture.type_sav || 
        (facture.data?.type || '').toLowerCase().includes('sav');
      
      if (isSAV) {
        coutFactures += Math.abs(meta.montantNetHT);
        nbFactures++;
      }
    }
    
    // Devis SAV validés
    for (const d of devis) {
      const state = (d.state || '').toLowerCase();
      if (!['validated', 'signed', 'order', 'accepted'].includes(state)) continue;
      
      const dateStr = d.dateReelle || d.date || d.created_at;
      if (dateStr) {
        try {
          const date = parseISO(dateStr);
          if (!isWithinInterval(date, { start: params.dateRange.start, end: params.dateRange.end })) {
            continue;
          }
        } catch {
          continue;
        }
      }
      
      const isSAV = d.typeSAV || d.type_sav || 
        (d.data?.type || '').toLowerCase().includes('sav');
      
      if (isSAV) {
        const montant = d.totalHT || d.data?.totalHT || 0;
        coutDevis += montant;
        nbDevis++;
      }
    }
    
    const total = coutFactures + coutDevis;
    
    return {
      value: Math.round(total * 100) / 100,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: nbFactures + nbDevis,
      },
      breakdown: {
        coutFactures: Math.round(coutFactures * 100) / 100,
        coutDevis: Math.round(coutDevis * 100) / 100,
        nbFactures,
        nbDevis,
      }
    };
  }
};

/**
 * Nombre de techniciens actifs
 * = tous les users actifs avec des compétences (skills), sans filtre sur interventions
 */
export const nbTechniciensActifs: StatDefinition = {
  id: 'nb_techniciens_actifs',
  label: 'Techniciens actifs',
  description: 'Nombre de techniciens actifs avec compétences renseignées',
  category: 'reseau',
  source: ['users'],
  aggregation: 'count',
  compute: (data: LoadedData, _params: StatParams): StatResult => {
    const { users } = data;
    
    let count = 0;
    for (const user of users) {
      if (isFieldTechnician(user)) {
        count++;
      }
    }
    
    return {
      value: count,
      metadata: {
        computedAt: new Date(),
        source: 'users',
        recordCount: count,
      }
    };
  }
};

/**
 * CA moyen par technicien actif
 */
export const caMoyenParTechnicienActif: StatDefinition = {
  id: 'ca_moyen_par_technicien_actif',
  label: 'CA moyen par technicien actif',
  description: 'CA moyen attribué par technicien actif sur la période',
  category: 'reseau',
  source: ['factures', 'interventions', 'projects', 'users'],
  aggregation: 'avg',
  unit: '€',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, interventions, projects, users } = data;
    
    const projectsById = indexProjectsById(projects);
    const usersById = indexUsersById(users);
    
    // 1. Calculer le temps par technicien par projet
    const dureeTechParProjet = new Map<string, Map<string | number, number>>();
    const dureeTotaleParProjet = new Map<string, number>();
    const techniciensActifs = new Set<string | number>();
    
    for (const intervention of interventions) {
      if (!isValidInterventionState(intervention.state)) continue;
      
      const dateStr = intervention.dateReelle || intervention.date || intervention.created_at;
      if (dateStr) {
        try {
          const date = parseISO(dateStr);
          if (!isWithinInterval(date, { start: params.dateRange.start, end: params.dateRange.end })) {
            continue;
          }
        } catch {
          continue;
        }
      }
      
      const type = normalizeInterventionType(intervention.type || intervention.type2);
      if (!isProductiveInterventionType(type)) continue;
      
      const projectId = String(intervention.projectId || intervention.project_id);
      if (!projectId) continue;
      
      const visites = intervention.data?.visites || intervention.visites || [];
      for (const visite of visites) {
        if (visite.state !== 'validated' && visite.state !== 'done') continue;
        
        const duree = visite.duree || visite.duration || 60; // minutes
        const techIds = visite.usersIds || [intervention.userId];
        
        for (const techId of techIds) {
          if (!techId) continue;
          
          const user = usersById.get(techId);
          if (!user || !isFieldTechnician(user)) continue;
          
          techniciensActifs.add(techId);
          
          if (!dureeTechParProjet.has(projectId)) {
            dureeTechParProjet.set(projectId, new Map());
          }
          const projectTechMap = dureeTechParProjet.get(projectId)!;
          projectTechMap.set(techId, (projectTechMap.get(techId) || 0) + duree);
          
          dureeTotaleParProjet.set(projectId, (dureeTotaleParProjet.get(projectId) || 0) + duree);
        }
      }
    }
    
    // 2. Répartir le CA entre techniciens
    const caParTech = new Map<string | number, number>();
    let totalCA = 0;
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      
      const factureState = facture.state || facture.status || facture.data?.state || '';
      if (!isFactureStateIncluded(factureState)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      const projectId = String(facture.projectId || facture.project_id);
      const projectTechTime = dureeTechParProjet.get(projectId);
      const totalProjectTime = dureeTotaleParProjet.get(projectId) || 0;
      
      if (!projectTechTime || totalProjectTime === 0) continue;
      
      totalCA += meta.montantNetHT;
      
      // Répartir proportionnellement
      for (const [techId, techTime] of projectTechTime.entries()) {
        const proportion = techTime / totalProjectTime;
        const techCA = meta.montantNetHT * proportion;
        caParTech.set(techId, (caParTech.get(techId) || 0) + techCA);
      }
    }
    
    const nbTechActifs = techniciensActifs.size;
    const moyenne = nbTechActifs > 0 ? totalCA / nbTechActifs : 0;
    
    return {
      value: Math.round(moyenne * 100) / 100,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: nbTechActifs,
      },
      breakdown: {
        totalCA: Math.round(totalCA * 100) / 100,
        nbTechniciensActifs: nbTechActifs,
      }
    };
  }
};

/**
 * Taux One-Shot (dossiers facturés en 1 seule visite)
 */
export const tauxOneShot: StatDefinition = {
  id: 'taux_one_shot',
  label: 'Taux One-Shot',
  description: 'Pourcentage de dossiers facturés avec une seule intervention',
  category: 'reseau',
  source: ['factures', 'interventions'],
  aggregation: 'ratio',
  unit: '%',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, interventions } = data;
    
    // Identifier les dossiers facturés
    const dossiersFactures = new Set<string | number>();
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      const factureState = facture.state || facture.status || facture.data?.state || '';
      if (!isFactureStateIncluded(factureState)) continue;
      
      const date = meta.date ? new Date(meta.date) : null;
      if (!date || date < params.dateRange.start || date > params.dateRange.end) continue;
      
      const projectId = facture.projectId || facture.project_id;
      if (projectId) {
        dossiersFactures.add(projectId);
      }
    }
    
    // Compter les interventions par dossier facturé
    const interventionsParDossier = new Map<string | number, number>();
    
    for (const intervention of interventions) {
      if (!isValidInterventionState(intervention.state)) continue;
      
      const projectId = intervention.projectId || intervention.project_id;
      if (!projectId || !dossiersFactures.has(projectId)) continue;
      
      const current = interventionsParDossier.get(projectId) || 0;
      interventionsParDossier.set(projectId, current + 1);
    }
    
    // Calculer le taux one-shot
    let nbOneShot = 0;
    for (const [projectId, nbInterv] of interventionsParDossier) {
      if (nbInterv === 1) {
        nbOneShot++;
      }
    }
    
    const totalDossiers = dossiersFactures.size;
    const taux = totalDossiers > 0 ? (nbOneShot / totalDossiers) * 100 : 0;
    
    return {
      value: Math.round(taux * 10) / 10,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: totalDossiers,
      },
      breakdown: {
        nbDossiersFactures: totalDossiers,
        nbOneShot,
        nbMultiVisites: totalDossiers - nbOneShot,
      }
    };
  }
};

/**
 * Délai ouverture dossier (création → 1ère intervention)
 */
export const delaiOuvertureDossier: StatDefinition = {
  id: 'delai_ouverture_dossier',
  label: 'Délai ouverture dossier',
  description: 'Délai moyen entre création du dossier et première intervention',
  category: 'reseau',
  source: ['projects', 'interventions'],
  aggregation: 'avg',
  unit: 'jours',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { projects, interventions } = data;
    
    // Indexer les premières interventions par projet
    const premiereIntervParProjet = new Map<string | number, Date>();
    
    for (const intervention of interventions) {
      if (!isValidInterventionState(intervention.state)) continue;
      
      const projectId = intervention.projectId || intervention.project_id;
      if (!projectId) continue;
      
      const dateStr = intervention.dateReelle || intervention.date;
      if (!dateStr) continue;
      
      try {
        const date = parseISO(dateStr);
        const current = premiereIntervParProjet.get(projectId);
        if (!current || date < current) {
          premiereIntervParProjet.set(projectId, date);
        }
      } catch {
        continue;
      }
    }
    
    const delais: number[] = [];
    
    for (const project of projects) {
      const dateCreationStr = project.created_at || project.date;
      if (!dateCreationStr) continue;
      
      try {
        const dateCreation = parseISO(dateCreationStr);
        
        if (!isWithinInterval(dateCreation, { start: params.dateRange.start, end: params.dateRange.end })) {
          continue;
        }
        
        const dateInterv = premiereIntervParProjet.get(project.id);
        if (!dateInterv) continue;
        
        const delai = differenceInDays(dateInterv, dateCreation);
        if (delai >= 0) {
          delais.push(delai);
        }
      } catch {
        continue;
      }
    }
    
    const moyenne = delais.length > 0 
      ? delais.reduce((a, b) => a + b, 0) / delais.length 
      : null;
    
    return {
      value: moyenne !== null ? Math.round(moyenne * 10) / 10 : null,
      metadata: {
        computedAt: new Date(),
        source: 'projects',
        recordCount: delais.length,
      },
      breakdown: {
        nbDossiers: delais.length,
        min: delais.length > 0 ? Math.min(...delais) : null,
        max: delais.length > 0 ? Math.max(...delais) : null,
      }
    };
  }
};

/**
 * Délai traitement dossier (1ère intervention → facture)
 */
export const delaiTraitementDossier: StatDefinition = {
  id: 'delai_traitement_dossier',
  label: 'Délai traitement dossier',
  description: 'Délai moyen entre première intervention et facturation',
  category: 'reseau',
  source: ['factures', 'interventions'],
  aggregation: 'avg',
  unit: 'jours',
  compute: (data: LoadedData, params: StatParams): StatResult => {
    const { factures, interventions } = data;
    
    // Indexer les premières interventions par projet
    const premiereIntervParProjet = new Map<string | number, Date>();
    
    for (const intervention of interventions) {
      if (!isValidInterventionState(intervention.state)) continue;
      
      const projectId = intervention.projectId || intervention.project_id;
      if (!projectId) continue;
      
      const dateStr = intervention.dateReelle || intervention.date;
      if (!dateStr) continue;
      
      try {
        const date = parseISO(dateStr);
        const current = premiereIntervParProjet.get(projectId);
        if (!current || date < current) {
          premiereIntervParProjet.set(projectId, date);
        }
      } catch {
        continue;
      }
    }
    
    // Indexer les premières factures par projet
    const premiereFactureParProjet = new Map<string | number, Date>();
    
    for (const facture of factures) {
      const meta = extractFactureMeta(facture);
      if (meta.isAvoir) continue;
      
      const factureState = facture.state || facture.status || facture.data?.state || '';
      if (!isFactureStateIncluded(factureState)) continue;
      
      const projectId = facture.projectId || facture.project_id;
      if (!projectId || !meta.date) continue;
      
      const date = new Date(meta.date);
      if (!isWithinInterval(date, { start: params.dateRange.start, end: params.dateRange.end })) {
        continue;
      }
      
      const current = premiereFactureParProjet.get(projectId);
      if (!current || date < current) {
        premiereFactureParProjet.set(projectId, date);
      }
    }
    
    const delais: number[] = [];
    
    for (const [projectId, dateFacture] of premiereFactureParProjet) {
      const dateInterv = premiereIntervParProjet.get(projectId);
      if (!dateInterv) continue;
      
      const delai = differenceInDays(dateFacture, dateInterv);
      if (delai >= 0) {
        delais.push(delai);
      }
    }
    
    const moyenne = delais.length > 0 
      ? delais.reduce((a, b) => a + b, 0) / delais.length 
      : null;
    
    return {
      value: moyenne !== null ? Math.round(moyenne * 10) / 10 : null,
      metadata: {
        computedAt: new Date(),
        source: 'factures',
        recordCount: delais.length,
      },
      breakdown: {
        nbDossiers: delais.length,
        min: delais.length > 0 ? Math.min(...delais) : null,
        max: delais.length > 0 ? Math.max(...delais) : null,
      }
    };
  }
};

export const reseauDefinitions = {
  ca_par_agence: caParAgence,
  nb_interventions_periode: nbInterventionsPeriode,
  ca_moyen_par_dossier: caMoyenParDossier,
  ca_moyen_par_intervention: caMoyenParIntervention,
  taux_sav_par_agence: tauxSavParAgence,
  cout_sav_reseau: coutSavReseau,
  nb_techniciens_actifs: nbTechniciensActifs,
  ca_moyen_par_technicien_actif: caMoyenParTechnicienActif,
  taux_one_shot: tauxOneShot,
  delai_ouverture_dossier: delaiOuvertureDossier,
  delai_traitement_dossier: delaiTraitementDossier,
};
