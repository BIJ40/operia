/**
 * Moteur de calcul de la charge de travail TRAVAUX à venir
 * Basé sur les RT (Relevé Technique) par univers
 */

// Mapping des états API vers labels affichés
const STATE_MAPPING: Record<string, string> = {
  'to_planify_tvx': 'À planifier TVX',
  'devis_to_order': 'À commander',
  'wait_fourn': 'En attente fournitures'
};

// États éligibles (clés API)
const ETATS_ELIGIBLES = ['to_planify_tvx', 'devis_to_order', 'wait_fourn'];

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
}

export interface ChargeTravauxUniversStats {
  univers: string;
  nbDossiers: number;
  totalHeuresRdv: number;
  totalHeuresTech: number;
  totalHeuresTech_A_planifier_TVX: number;
  totalHeuresTech_A_commander: number;
  totalHeuresTech_En_attente_fournitures: number;
}

export interface ChargeParEtatStats {
  etat: string;
  etatLabel: string;
  nbDossiers: number;
  totalHeuresRdv: number;
  totalHeuresTech: number;
  totalNbTechs: number;
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
  };
  debug: {
    totalProjects: number;
    projectsEligibleState: number;
    projectsAvecRT: number;
    rtBlocksCount: number;
  };
}

/**
 * Vérifie si un projet est annulé
 */
function isProjectCanceled(project: any): boolean {
  const state = project?.state?.toLowerCase?.();
  return state === 'canceled' || state === 'cancelled';
}

/**
 * Extrait les données de chiffrage depuis le chemin correct:
 * intervention.data.chiffrage.postes[].items[].data.nbHeures/nbTechs
 */
function extractRTDataFromIntervention(intervention: any): { heuresRdv: number; heuresTech: number; nbTechs: number; blocksCount: number } {
  let totalHeuresRdv = 0;
  let totalHeuresTech = 0;
  let maxNbTechs = 0;
  let blocksCount = 0;
  
  try {
    const chiffrage = intervention?.data?.chiffrage;
    if (!chiffrage?.postes || !Array.isArray(chiffrage.postes)) {
      return { heuresRdv: 0, heuresTech: 0, nbTechs: 0, blocksCount: 0 };
    }
    
    for (const poste of chiffrage.postes) {
      if (!poste?.items || !Array.isArray(poste.items)) continue;
      
      for (const item of poste.items) {
        // Vérifier que c'est un bloc chiffrage avec slug="chiffrage"
        if (item?.IS_BLOCK && item?.slug === 'chiffrage' && item?.data) {
          const rawNbHeures = item.data.nbHeures;
          const rawNbTechs = item.data.nbTechs;
          
          // nbHeures peut être string ou number
          const nbHeures = typeof rawNbHeures === 'string' 
            ? parseFloat(rawNbHeures) 
            : (typeof rawNbHeures === 'number' ? rawNbHeures : 0);
            
          // nbTechs est généralement un number, défaut 1
          const nbTechs = typeof rawNbTechs === 'number' && rawNbTechs >= 1 
            ? rawNbTechs 
            : 1;
          
          if (!isNaN(nbHeures) && nbHeures > 0) {
            totalHeuresRdv += nbHeures;
            totalHeuresTech += nbHeures * nbTechs;
            maxNbTechs = Math.max(maxNbTechs, nbTechs);
            blocksCount++;
          }
        }
      }
    }
  } catch {
    // Ignorer les erreurs de parsing
  }
  
  return { heuresRdv: totalHeuresRdv, heuresTech: totalHeuresTech, nbTechs: maxNbTechs, blocksCount };
}

/**
 * Normalise un nom d'univers
 */
function normalizeUnivers(univers: string): string {
  const mapping: Record<string, string> = {
    'ame_logement': 'PMR',
    'amelioration_logement': 'PMR',
    'pmr': 'PMR',
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
 * Calcule la charge de travaux à venir par univers
 */
export function computeChargeTravauxAvenirParUnivers(
  projects: any[],
  interventions: any[]
): ChargeTravauxResult {
  const debug = {
    totalProjects: projects.length,
    projectsEligibleState: 0,
    projectsAvecRT: 0,
    rtBlocksCount: 0
  };

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
      totalNbTechs: 0
    });
  }

  // Index des interventions par projectId
  const interventionsByProject = new Map<string | number, any[]>();
  for (const interv of interventions) {
    const pid = interv?.projectId ?? interv?.project_id;
    if (pid) {
      if (!interventionsByProject.has(pid)) {
        interventionsByProject.set(pid, []);
      }
      interventionsByProject.get(pid)!.push(interv);
    }
  }

  for (const project of projects) {
    // Vérifier si le projet est annulé
    if (isProjectCanceled(project)) continue;

    // Filtrer par state direct (API values)
    const state = project?.state?.toLowerCase?.() || '';
    if (!ETATS_ELIGIBLES.includes(state)) continue;

    debug.projectsEligibleState++;

    const etatLabel = STATE_MAPPING[state] || state;

    // Récupérer les interventions du projet
    const projectInterventions = interventionsByProject.get(project.id) || [];
    
    let totalHeuresRdv = 0;
    let totalHeuresTech = 0;
    let maxNbTechs = 0;

    for (const interv of projectInterventions) {
      const rtData = extractRTDataFromIntervention(interv);
      if (rtData.blocksCount > 0) {
        debug.rtBlocksCount += rtData.blocksCount;
      }
      totalHeuresRdv += rtData.heuresRdv;
      totalHeuresTech += rtData.heuresTech;
      maxNbTechs = Math.max(maxNbTechs, rtData.nbTechs);
    }

    // Même sans RT, on compte le dossier (charge = 0)
    const universes = (project?.data?.universes as string[]) || ['Non classé'];
    const normalizedUniverses = universes.map(normalizeUnivers);

    if (totalHeuresRdv > 0 || totalHeuresTech > 0) {
      debug.projectsAvecRT++;
    }

    parProjet.push({
      projectId: project.id,
      reference: project.ref || project.reference,
      label: project.label || project.name,
      etatWorkflow: state,
      etatWorkflowLabel: etatLabel,
      universes: normalizedUniverses,
      totalHeuresRdv,
      totalHeuresTech,
      nbTechs: maxNbTechs
    });

    // Mise à jour des stats par état
    const etatStats = etatMap.get(state);
    if (etatStats) {
      etatStats.nbDossiers++;
      etatStats.totalHeuresRdv += totalHeuresRdv;
      etatStats.totalHeuresTech += totalHeuresTech;
      etatStats.totalNbTechs += maxNbTechs;
    }

    // Ventilation par univers (répartition égale si multiple)
    const universeCount = normalizedUniverses.length || 1;
    const heuresRdvShare = totalHeuresRdv / universeCount;
    const heuresTechShare = totalHeuresTech / universeCount;

    for (const univers of normalizedUniverses) {
      if (!universMap.has(univers)) {
        universMap.set(univers, {
          univers,
          nbDossiers: 0,
          totalHeuresRdv: 0,
          totalHeuresTech: 0,
          totalHeuresTech_A_planifier_TVX: 0,
          totalHeuresTech_A_commander: 0,
          totalHeuresTech_En_attente_fournitures: 0
        });
      }

      const stats = universMap.get(univers)!;
      stats.nbDossiers++;
      stats.totalHeuresRdv += heuresRdvShare;
      stats.totalHeuresTech += heuresTechShare;

      // Ventilation par état
      if (state === 'to_planify_tvx') {
        stats.totalHeuresTech_A_planifier_TVX += heuresTechShare;
      } else if (state === 'devis_to_order') {
        stats.totalHeuresTech_A_commander += heuresTechShare;
      } else if (state === 'wait_fourn') {
        stats.totalHeuresTech_En_attente_fournitures += heuresTechShare;
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
    nbDossiers: parProjet.length
  };

  return {
    parUnivers,
    parEtat,
    parProjet,
    totaux,
    debug
  };
}
