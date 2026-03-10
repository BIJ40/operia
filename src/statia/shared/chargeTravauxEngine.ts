/**
 * Moteur de calcul de la charge de travail TRAVAUX à venir
 * Croisement projets ↔ interventions ↔ devis via projectId
 */

// Mapping des états API vers labels affichés
const STATE_MAPPING: Record<string, string> = {
  'to_planify_tvx': 'À planifier TVX',
  'devis_to_order': 'À commander',
  'wait_fourn': 'En attente fournitures'
};

// États éligibles (clés API)
const ETATS_ELIGIBLES = new Set(['to_planify_tvx', 'devis_to_order', 'wait_fourn']);

// États de devis éligibles (on exclut draft, rejected, canceled)
const DEVIS_ETATS_EXCLUS = new Set(['draft', 'rejected', 'canceled']);

export interface ChargeTravauxProjet {
  projectId: number | string;
  reference?: string;
  label?: string;
  etatWorkflow: string;
  etatWorkflowLabel: string;
  universes: string[];
  totalHeuresRdv: number;
  totalHeuresTech: number;
  nbTechs: number;
  devisHT: number;
}

export interface ChargeTravauxUniversStats {
  univers: string;
  nbDossiers: number;
  totalHeuresRdv: number;
  totalHeuresTech: number;
  totalHeuresTech_A_planifier_TVX: number;
  totalHeuresTech_A_commander: number;
  totalHeuresTech_En_attente_fournitures: number;
  devisHTTotal: number;
  devisHT_A_planifier_TVX: number;
  devisHT_A_commander: number;
  devisHT_En_attente_fournitures: number;
}

export interface ChargeParEtatStats {
  etat: string;
  etatLabel: string;
  nbDossiers: number;
  totalHeuresRdv: number;
  totalHeuresTech: number;
  totalNbTechs: number;
  devisHT: number;
}

export interface ChargeTravauxResult {
  parUnivers: ChargeTravauxUniversStats[];
  parEtat: ChargeParEtatStats[];
  parProjet: ChargeTravauxProjet[];
  totaux: {
    totalHeuresRdv: number;
    totalHeuresTech: number;
    totalNbTechs: number;
    nbDossiers: number;
    totalDevisHT: number;
    caPlanifie: number; // CA des devis "to order" uniquement (dossiers planifiés)
  };
  debug: {
    totalProjects: number;
    projectsEligibleState: number;
    projectsAvecRT: number;
    rtBlocksCount: number;
    interventionsTotal: number;
    interventionsIndexed: number;
    devisTotal: number;
    devisIndexed: number;
    devisMatchedToProjects: number;
    devisHTCalculated: number;
    caPlanifieDevisCount: number;
    sampleDevis: any;
  };
}

/**
 * Indexe les interventions par projectId (gère string et number)
 */
function groupInterventionsByProjectId(interventions: any[]): Map<number, any[]> {
  const map = new Map<number, any[]>();

  for (const itv of interventions) {
    const pid = itv?.projectId ?? itv?.project_id;
    if (!pid) continue;

    const key = Number(pid);
    if (isNaN(key)) continue;
    
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(itv);
  }

  return map;
}

/**
 * Indexe les devis par projectId
 */
function groupDevisByProjectId(devis: any[]): Map<number, any[]> {
  const map = new Map<number, any[]>();

  for (const d of devis) {
    const pid = d?.projectId ?? d?.project_id;
    if (!pid) continue;

    const key = Number(pid);
    if (isNaN(key)) continue;
    
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  }

  return map;
}

/**
 * Extrait les heures depuis le chiffrage d'une intervention
 * Chemin: intervention.data.chiffrage.postes[].items[].data.nbHeures/nbTechs
 * Fallback: dFields avec EXPORT_generiqueSlug "nombre_de techniciens" / "temps_total d'intervention"
 */
function extractHoursFromIntervention(intervention: any): { heuresRdv: number; heuresTech: number; nbTechs: number; blocksCount: number } {
  const chiffrage = intervention?.data?.chiffrage;
  if (!chiffrage?.postes || !Array.isArray(chiffrage.postes)) {
    return { heuresRdv: 0, heuresTech: 0, nbTechs: 0, blocksCount: 0 };
  }

  let totalHeures = 0;
  let totalHeuresTech = 0;
  let maxNbTechs = 0;
  let blocksCount = 0;

  for (const poste of chiffrage.postes) {
    const items = poste?.items || [];
    
    for (const item of items) {
      if (!item?.IS_BLOCK || item?.slug !== 'chiffrage') continue;
      
      const data = item.data || {};
      blocksCount++;

      // 1) Lecture directe nbHeures / nbTechs
      let nbHeures = parseNumericValue(data.nbHeures);
      let nbTechs = parseNumericValue(data.nbTechs);

      // 2) Fallback: chercher dans les dFields si valeurs vides ou nulles
      if (nbHeures === 0 || nbTechs === 0) {
        const subItems = data.subItems || [];
        
        for (const sub of subItems) {
          if (!sub?.IS_BLOCK || sub?.slug !== 'dfields') continue;
          
          const dFields = sub.data?.dFields || [];
          
          for (const df of dFields) {
            const slug = String(df.EXPORT_generiqueSlug || '').toLowerCase();
            
            if (slug.includes('nombre_de techniciens') || slug.includes('nombre_de_techniciens')) {
              const val = parseNumericValue(df.value);
              if (val > 0 && nbTechs === 0) nbTechs = val;
            }
            
            if (slug.includes("temps_total d'intervention") || slug.includes("temps_total_d'intervention") || slug.includes('temps_total')) {
              const val = parseNumericValue(df.value);
              if (val > 0 && nbHeures === 0) nbHeures = val;
            }
          }
        }
      }

      // Validation finale
      if (nbHeures <= 0) continue;
      if (nbTechs <= 0) nbTechs = 1;

      totalHeures += nbHeures;
      totalHeuresTech += nbHeures * nbTechs; // 2 tech × 6h = 12h main d'œuvre
      maxNbTechs = Math.max(maxNbTechs, nbTechs);
    }
  }

  return { heuresRdv: totalHeures, heuresTech: totalHeuresTech, nbTechs: maxNbTechs, blocksCount };
}

/**
 * Parse une valeur numérique (string ou number)
 */
function parseNumericValue(value: any): number {
  if (value == null) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (typeof value === 'string') {
    const cleaned = value.replace(',', '.').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

/**
 * Normalise un nom d'univers
 */
function normalizeUnivers(univers: string): string {
  const mapping: Record<string, string> = {
    'ame_logement': 'Aménagement PMR',
    'amelioration_logement': 'Aménagement PMR',
    'pmr': 'Aménagement PMR',
    'renovation': 'Rénovation',
    'plomberie': 'Plomberie',
    'electricite': 'Électricité',
    'serrurerie': 'Serrurerie',
    'recherche_fuite': 'Recherche de fuite',
    'vitrerie': 'Vitrerie',
    'multiservice': 'Multiservice',
  };
  
  const normalized = univers.toLowerCase().trim();
  return mapping[normalized] || univers;
}

/**
 * Calcule le montant HT total des devis éligibles pour un projet
 */
function calculateDevisHTForProject(projectDevis: any[]): number {
  let total = 0;

  for (const d of projectDevis) {
    const devisState = String(d.state || '').toLowerCase();
    
    // Exclure les devis non "vivants"
    if (DEVIS_ETATS_EXCLUS.has(devisState)) continue;

    // Priorité: data.totalHT (structure API) > totalHT (racine) > amount
    const montant =
      parseNumericValue(d.data?.totalHT) ||
      parseNumericValue(d.data?.totalTTC) ||
      parseNumericValue(d.totalHT) ||
      parseNumericValue(d.amount) ||
      0;

    if (montant > 0) {
      total += montant;
    }
  }

  return total;
}

/**
 * Vérifie si un devis est "to order" (accepté/commandé)
 */
function isDevisToOrder(d: any): boolean {
  const state = String(d?.state ?? d?.status ?? d?.data?.state ?? '').trim().toLowerCase();
  return state === 'to order' || state === 'to_order' || state === 'order';
}

/**
 * Calcule le CA Planifié (devis "to order" uniquement) pour un projet
 * Règle métier: 1 seul devis "to order" max par dossier
 */
function calculateCAPlanifieForProject(projectDevis: any[]): number {
  for (const d of projectDevis) {
    if (!isDevisToOrder(d)) continue;

    const montant =
      parseNumericValue(d.data?.totalHT) ||
      parseNumericValue(d.totalHT) ||
      parseNumericValue(d.amount) ||
      0;

    if (montant > 0) {
      return montant; // 1 seul devis "to order" max par dossier
    }
  }

  return 0;
}

/**
 * Calcule la charge de travaux à venir par univers
 * Croisement: projects.id ↔ interventions.projectId ↔ devis.projectId
 */
export function computeChargeTravauxAvenirParUnivers(
  projects: any[],
  interventions: any[],
  devis: any[] = []
): ChargeTravauxResult {
  // Index des interventions et devis par projectId
  const byProjectId = groupInterventionsByProjectId(interventions);
  const devisByProjectId = groupDevisByProjectId(devis);

  const debug = {
    totalProjects: projects.length,
    projectsEligibleState: 0,
    projectsAvecRT: 0,
    rtBlocksCount: 0,
    interventionsTotal: interventions.length,
    interventionsIndexed: Array.from(byProjectId.values()).flat().length,
    devisTotal: devis.length,
    devisIndexed: Array.from(devisByProjectId.values()).flat().length,
    devisMatchedToProjects: 0,
    devisHTCalculated: 0,
    caPlanifieDevisCount: 0,
    sampleDevis: devis.length > 0 ? { 
      id: devis[0]?.id, 
      projectId: devis[0]?.projectId, 
      state: devis[0]?.state, 
      totalHT: devis[0]?.totalHT,
      dataTotalHT: devis[0]?.data?.totalHT,
      keys: Object.keys(devis[0] || {}).slice(0, 10)
    } : null
  };

  // Calcul CA Planifié (devis "to order" uniquement)
  let totalCAPlanifie = 0;
  const projectsWithToOrderDevis = new Set<number>();

  const parProjet: ChargeTravauxProjet[] = [];
  const universMap = new Map<string, ChargeTravauxUniversStats>();
  const etatMap = new Map<string, ChargeParEtatStats>();

  // Initialiser les stats par état
  for (const [etat, label] of Object.entries(STATE_MAPPING)) {
    etatMap.set(etat, {
      etat,
      etatLabel: label,
      nbDossiers: 0,
      totalHeuresRdv: 0,
      totalHeuresTech: 0,
      totalNbTechs: 0,
      devisHT: 0
    });
  }

  for (const project of projects) {
    // Filtrer par state (API values)
    const state = String(project?.state || '').toLowerCase();
    if (!ETATS_ELIGIBLES.has(state)) continue;

    debug.projectsEligibleState++;

    const projectId = Number(project.id);
    const etatLabel = STATE_MAPPING[state] || state;

    // Récupérer les interventions du projet via le croisement projectId
    const intervs = byProjectId.get(projectId) || [];

    let heuresRdv = 0;
    let heuresTech = 0;
    let maxNbTechs = 0;

    for (const itv of intervs) {
      const { heuresRdv: hRdv, heuresTech: hTech, nbTechs: nTech, blocksCount } = extractHoursFromIntervention(itv);
      heuresRdv += hRdv;
      heuresTech += hTech;
      maxNbTechs = Math.max(maxNbTechs, nTech);
      debug.rtBlocksCount += blocksCount;
    }

    if (heuresRdv > 0 || heuresTech > 0) {
      debug.projectsAvecRT++;
    }

    // Calcul du CA devis pour ce projet
    const projectDevis = devisByProjectId.get(projectId) || [];
    if (projectDevis.length > 0) {
      debug.devisMatchedToProjects += projectDevis.length;
    }
    const totalDevisHTProjet = calculateDevisHTForProject(projectDevis);
    if (totalDevisHTProjet > 0) {
      debug.devisHTCalculated += totalDevisHTProjet;
    }

    // Calcul CA Planifié (devis "to order" uniquement)
    const caPlanifieProjet = calculateCAPlanifieForProject(projectDevis);
    if (caPlanifieProjet > 0 && !projectsWithToOrderDevis.has(projectId)) {
      totalCAPlanifie += caPlanifieProjet;
      projectsWithToOrderDevis.add(projectId);
      debug.caPlanifieDevisCount++;
    }

    // Univers du projet
    const universes = (project?.data?.universes as string[]) || ['Non classé'];
    const normalizedUniverses = universes.map(normalizeUnivers);

    parProjet.push({
      projectId,
      reference: project.ref || project.reference,
      label: project.label || project.name,
      etatWorkflow: state,
      etatWorkflowLabel: etatLabel,
      universes: normalizedUniverses,
      totalHeuresRdv: heuresRdv,
      totalHeuresTech: heuresTech,
      nbTechs: maxNbTechs,
      devisHT: totalDevisHTProjet
    });

    // Mise à jour des stats par état
    const etatStats = etatMap.get(state);
    if (etatStats) {
      etatStats.nbDossiers++;
      etatStats.totalHeuresRdv += heuresRdv;
      etatStats.totalHeuresTech += heuresTech;
      etatStats.totalNbTechs += maxNbTechs;
      etatStats.devisHT += totalDevisHTProjet;
    }

    // Ventilation par univers (répartition égale si multiple)
    const universeCount = normalizedUniverses.length || 1;
    const heuresRdvShare = heuresRdv / universeCount;
    const heuresTechShare = heuresTech / universeCount;
    const devisHTShare = totalDevisHTProjet / universeCount;

    for (const univers of normalizedUniverses) {
      if (!universMap.has(univers)) {
        universMap.set(univers, {
          univers,
          nbDossiers: 0,
          totalHeuresRdv: 0,
          totalHeuresTech: 0,
          totalHeuresTech_A_planifier_TVX: 0,
          totalHeuresTech_A_commander: 0,
          totalHeuresTech_En_attente_fournitures: 0,
          devisHTTotal: 0,
          devisHT_A_planifier_TVX: 0,
          devisHT_A_commander: 0,
          devisHT_En_attente_fournitures: 0
        });
      }

      const stats = universMap.get(univers)!;
      stats.nbDossiers++;
      stats.totalHeuresRdv += heuresRdvShare;
      stats.totalHeuresTech += heuresTechShare;
      stats.devisHTTotal += devisHTShare;

      // Ventilation par état
      if (state === 'to_planify_tvx') {
        stats.totalHeuresTech_A_planifier_TVX += heuresTechShare;
        stats.devisHT_A_planifier_TVX += devisHTShare;
      } else if (state === 'devis_to_order') {
        stats.totalHeuresTech_A_commander += heuresTechShare;
        stats.devisHT_A_commander += devisHTShare;
      } else if (state === 'wait_fourn') {
        stats.totalHeuresTech_En_attente_fournitures += heuresTechShare;
        stats.devisHT_En_attente_fournitures += devisHTShare;
      }
    }
  }

  const parUnivers = Array.from(universMap.values())
    .sort((a, b) => b.totalHeuresTech - a.totalHeuresTech);

  const parEtat = Array.from(etatMap.values())
    .filter(e => e.nbDossiers > 0)
    .sort((a, b) => b.nbDossiers - a.nbDossiers);

  const totaux = {
    totalHeuresRdv: parProjet.reduce((sum, p) => sum + p.totalHeuresRdv, 0),
    totalHeuresTech: parProjet.reduce((sum, p) => sum + p.totalHeuresTech, 0),
    totalNbTechs: parProjet.reduce((sum, p) => sum + p.nbTechs, 0),
    nbDossiers: parProjet.length,
    totalDevisHT: parProjet.reduce((sum, p) => sum + p.devisHT, 0),
    caPlanifie: totalCAPlanifie
  };

  return {
    parUnivers,
    parEtat,
    parProjet,
    totaux,
    debug
  };
}
